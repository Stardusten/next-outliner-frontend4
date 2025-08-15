import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import type {
  AttachmentMeta,
  AttachmentStorage,
  UploadOptions,
  DownloadOptions,
  ProgressInfo,
  AttachmentStorageEvents,
  AttachmentTaskInfo,
} from "./storage";
import { nanoid } from "nanoid";
import mitt, { type Emitter } from "mitt";

export interface R2BrowserConfig {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  useSSL?: boolean;
  region?: string;
}

const SEP = "__";

/**
 * 去除 prefix 首尾 / 并保持空串合法，比如 "/images/2024/" => "images/2024"
 * @param prefix 前缀
 * @returns 去除首尾 / 后的前缀
 */
function normalizePrefix(prefix?: string): string {
  return prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";
}

function buildPath(prefix: string | undefined, objectName: string): string {
  const p = normalizePrefix(prefix);
  return p ? `${p}/${objectName}` : objectName;
}

function encodeFilename(name: string): string {
  return encodeURIComponent(name);
}

function decodeFilename(encoded: string): string {
  return decodeURIComponent(encoded);
}

function buildObjectName(originalName: string): string {
  const encoded = encodeFilename(originalName);
  return `${encoded}${SEP}${Date.now()}${SEP}${nanoid()}`;
}

function parseObjectName(objectName: string) {
  const [encoded, ts, id] = objectName.split(SEP);
  return {
    filename: decodeFilename(encoded),
    timestamp: ts ? Number(ts) : undefined,
    id,
  } as const;
}

export class R2AttachmentStorage implements AttachmentStorage {
  private client: S3Client;
  private cfg: R2BrowserConfig;
  private eventBus: Emitter<AttachmentStorageEvents>;
  private tasks: Map<string, AttachmentTaskInfo> = new Map();

  constructor(cfg: R2BrowserConfig) {
    this.cfg = cfg;
    this.client = new S3Client({
      region: cfg.region ?? "auto",
      endpoint: cfg.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
    this.eventBus = mitt<AttachmentStorageEvents>();
  }

  // 事件系统实现
  on<T extends keyof AttachmentStorageEvents>(
    type: T,
    handler: (event: AttachmentStorageEvents[T]) => void
  ): void {
    this.eventBus.on(type, handler);
  }

  off<T extends keyof AttachmentStorageEvents>(
    type: T,
    handler?: (event: AttachmentStorageEvents[T]) => void
  ): void {
    this.eventBus.off(type, handler);
  }

  getActiveTasks(): AttachmentTaskInfo[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.status === "pending" || task.status === "progress"
    );
  }

  getTask(taskId: string): AttachmentTaskInfo | undefined {
    return this.tasks.get(taskId);
  }

  // 任务管理辅助方法
  private createTask(
    type: AttachmentTaskInfo["type"],
    filename: string,
    size: number,
    prefix?: string,
    path?: string
  ): AttachmentTaskInfo {
    const normalizedPrefix = normalizePrefix(prefix);
    let taskPath: string;

    if (path) {
      // 对于 download 和 delete，path 是已知的
      taskPath = path;
    } else {
      // 对于 upload，通过 buildObjectName 和 buildPath 生成 path
      const objectName = buildObjectName(filename);
      taskPath = buildPath(normalizedPrefix, objectName);
    }

    const task: AttachmentTaskInfo = {
      id: nanoid(),
      type,
      filename,
      size,
      status: "pending",
      prefix: normalizedPrefix,
      path: taskPath,
      startTime: Date.now(),
    };
    this.tasks.set(task.id, task);
    this.eventBus.emit("task:created", task);
    return task;
  }

  private updateTaskStatus(
    taskId: string,
    status: AttachmentTaskInfo["status"],
    error?: string
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = status;
    if (error) task.error = error;
    if (status === "success" || status === "error") {
      task.endTime = Date.now();
      task.progress = status === "success" ? 100 : undefined;
    }

    // 发送对应的事件
    if (status === "progress") {
      this.eventBus.emit("task:started", task);
    } else if (status === "success") {
      this.eventBus.emit("task:completed", task);
    } else if (status === "error") {
      this.eventBus.emit("task:failed", task);
    }
  }

  private updateTaskProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = Math.round(progress);
    this.eventBus.emit("task:progress", task);
  }

  async upload(
    file: Blob | File | ArrayBuffer | Uint8Array,
    opts: UploadOptions = {}
  ): Promise<AttachmentMeta> {
    const originalName = (file as any).name ?? "file";
    const contentType =
      opts.contentType ?? (file as any).type ?? "application/octet-stream";

    // 创建上传任务
    const task = this.createTask(
      "upload",
      originalName,
      (file as any).size,
      opts.prefix
    );

    try {
      // 1. 生成预签名 PUT URL
      const putCmd = new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: task.path,
        ContentType: contentType,
      });
      const signedUrl = await getSignedUrl(this.client, putCmd, {
        expiresIn: 3600,
      });

      // 开始上传任务
      this.updateTaskStatus(task.id, "progress");

      // 2. 上传（XHR 以便 progress）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentage = (e.loaded / e.total) * 100;
            this.updateTaskProgress(task.id, percentage);
          }

          // 同时调用传入的回调
          if (opts.onProgress) {
            const info: ProgressInfo = {
              loaded: e.loaded,
              total: e.lengthComputable ? e.total : undefined,
              percentage: e.lengthComputable
                ? (e.loaded / e.total) * 100
                : undefined,
            };
            opts.onProgress(info);
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };
        xhr.send(file as any);
      });

      // 标记任务完成
      this.updateTaskStatus(task.id, "success");

      return {
        path: task.path,
        filename: originalName,
        size: (file as any).size,
        contentType,
      };
    } catch (error) {
      // 标记任务失败
      this.updateTaskStatus(
        task.id,
        "error",
        error instanceof Error ? error.message : "Upload failed"
      );
      throw error;
    }
  }

  async download(path: string, opts: DownloadOptions = {}): Promise<Blob> {
    // 解析文件名
    const { filename } = R2AttachmentStorage.parsePath(path);

    // 创建下载任务
    const task = this.createTask("download", filename, 0, undefined, path);

    try {
      // 1. 获取预签名 GET URL
      const getCmd = new GetObjectCommand({
        Bucket: this.cfg.bucket,
        Key: path,
      });
      const signedUrl = await getSignedUrl(this.client, getCmd, {
        expiresIn: 3600,
      });

      // 开始下载任务
      this.updateTaskStatus(task.id, "progress");

      // 2. fetch 并读取进度
      const res = await fetch(signedUrl);
      if (!res.ok || !res.body)
        throw new Error(`Download failed ${res.status}`);
      const contentLength = Number(res.headers.get("content-length"));

      // 更新任务的文件大小
      const taskUpdated = this.tasks.get(task.id)!;
      taskUpdated.size = !isNaN(contentLength) ? contentLength : 0;

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;

          // 更新任务进度
          if (!isNaN(contentLength)) {
            const percentage = (received / contentLength) * 100;
            this.updateTaskProgress(task.id, percentage);
          }

          // 同时调用传入的回调
          if (opts.onProgress) {
            const info: ProgressInfo = {
              loaded: received,
              total: !isNaN(contentLength) ? contentLength : undefined,
              percentage: !isNaN(contentLength)
                ? (received / contentLength) * 100
                : undefined,
            };
            opts.onProgress(info);
          }
        }
      }

      // 标记任务完成
      this.updateTaskStatus(task.id, "success");

      return new Blob(chunks, {
        type: res.headers.get("content-type") || "application/octet-stream",
      });
    } catch (error) {
      // 标记任务失败
      this.updateTaskStatus(
        task.id,
        "error",
        error instanceof Error ? error.message : "Download failed"
      );
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    // 解析文件名
    const { filename } = R2AttachmentStorage.parsePath(path);

    // 创建删除任务
    const task = this.createTask("delete", filename, 0, undefined, path);

    try {
      // 开始删除任务
      this.updateTaskStatus(task.id, "progress");

      // R2 delete 最简单直接调用 fetch 的 DELETE 预签名
      const cmd = new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: path,
      });
      // S3 DeleteObjectCommand exists but to avoid extra import size we can just create signed url
      const signedUrl = await getSignedUrl(this.client, cmd, {
        expiresIn: 3600,
        signingRegion: "auto",
        signingService: "s3",
      });
      await fetch(signedUrl, { method: "DELETE" });

      // 标记任务完成
      this.updateTaskStatus(task.id, "success");
    } catch (error) {
      // 标记任务失败
      this.updateTaskStatus(
        task.id,
        "error",
        error instanceof Error ? error.message : "Delete failed"
      );
      throw error;
    }
  }

  async listAll(prefix: string = ""): Promise<AttachmentMeta[]> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const safePrefix = normalizePrefix(prefix);
    const listCmd = new ListObjectsV2Command({
      Bucket: this.cfg.bucket,
      Prefix: safePrefix ? safePrefix + "/" : undefined,
    });
    const res = await this.client.send(listCmd);
    const metas: AttachmentMeta[] = [];
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      const { filename } = parseObjectName(obj.Key);
      metas.push({
        path: obj.Key,
        filename,
        size: obj.Size,
        etag: obj.ETag,
      });
    }
    return metas;
  }

  /** 解析 path，提取前缀、原始文件名、上传时间戳等 */
  static parsePath(path: string): {
    prefix: string;
    filename: string;
    timestamp?: number;
    id?: string;
  } {
    const parts = path.split("/");
    const objectName = parts.pop()!;
    const prefix = parts.join("/");
    const { filename, timestamp, id } = parseObjectName(objectName);
    return {
      prefix,
      filename,
      timestamp,
      id,
    };
  }

  /** 测试连接配置是否有效 */
  static async test_conn(cfg: R2BrowserConfig): Promise<{
    success: boolean;
    message: string;
    messageKey?: string;
    params?: Record<string, any>;
  }> {
    try {
      const client = new S3Client({
        region: cfg.region ?? "auto",
        endpoint: cfg.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
        },
      });

      // 尝试列出存储桶中的对象（限制为1个，只是测试连接）
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const listCmd = new ListObjectsV2Command({
        Bucket: cfg.bucket,
        MaxKeys: 1,
      });

      await client.send(listCmd);

      return {
        success: true,
        message: "",
        messageKey: "r2.test.success",
      };
    } catch (error) {
      let message = "";
      let messageKey: string | undefined = "r2.test.failed";

      if (error instanceof Error) {
        // 根据错误类型提供更具体的信息
        if (error.message.includes("NoSuchBucket")) {
          messageKey = "r2.test.noSuchBucket";
        } else if (error.message.includes("InvalidAccessKeyId")) {
          messageKey = "r2.test.invalidAccessKey";
        } else if (error.message.includes("SignatureDoesNotMatch")) {
          messageKey = "r2.test.signatureMismatch";
        } else if (
          error.message.includes("NetworkingError") ||
          error.message.includes("fetch")
        ) {
          messageKey = "r2.test.networkError";
        } else {
          messageKey = "r2.test.failedWithMessage";
          return {
            success: false,
            message: "",
            messageKey,
            params: { message: error.message },
          };
        }
      }

      return {
        success: false,
        message: "",
        messageKey,
      };
    }
  }
}
