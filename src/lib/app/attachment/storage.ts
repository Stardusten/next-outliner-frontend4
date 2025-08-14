export interface ProgressInfo {
  /** 已处理字节数 */
  loaded: number;
  /** 总字节数（可能未知） */
  total?: number;
  /** 完成百分比 (0-100) */
  percentage?: number;
}

export type ProgressCallback = (info: ProgressInfo) => void;

// 任务事件类型
export type AttachmentTaskType = "upload" | "download" | "delete";
export type AttachmentTaskStatus = "pending" | "progress" | "success" | "error";

export interface AttachmentTaskInfo {
  id: string;
  type: AttachmentTaskType;
  filename: string;
  size: number;
  status: AttachmentTaskStatus;
  progress?: number;
  error?: string;
  prefix: string;
  path: string;
  startTime: number;
  endTime?: number;
}

// 附件存储事件
export type AttachmentStorageEvents = {
  "task:created": AttachmentTaskInfo;
  "task:started": AttachmentTaskInfo;
  "task:progress": AttachmentTaskInfo;
  "task:completed": AttachmentTaskInfo;
  "task:failed": AttachmentTaskInfo;
};

export interface UploadOptions {
  /** 当上传进度变化时的回调 */
  onProgress?: ProgressCallback;
  /** 覆盖内容类型 */
  contentType?: string;
  /** 指定父目录前缀，如 "images/2024/"，可为空 */
  prefix?: string;
}

export interface DownloadOptions {
  /** 当下载进度变化时的回调 */
  onProgress?: ProgressCallback;
}

export interface AttachmentMeta {
  /** 完整路径（prefix + 生成文件名） */
  path: string;
  /** 原始文件名 */
  filename?: string;
  size?: number;
  contentType?: string;
  etag?: string;
}

export interface AttachmentStorage {
  /**
   * 上传一个附件。
   * @param file 要上传的文件/数据
   * @param options 额外选项
   * @returns 上传后附件的元信息
   */
  upload(
    file: Blob | File | ArrayBuffer | Uint8Array,
    options?: UploadOptions
  ): Promise<AttachmentMeta>;

  /**
   * 下载一个附件。
   * @param path 完整路径（prefix+文件名）
   * @param options 下载选项
   * @returns 下载得到的 Blob
   */
  download(path: string, options?: DownloadOptions): Promise<Blob>;

  /**
   * 删除一个附件
   */
  delete(path: string): Promise<void>;

  /**
   * 列出指定前缀下所有文件
   */
  listAll(prefix?: string): Promise<AttachmentMeta[]>;

  /**
   * 事件系统 - 监听任务事件
   */
  on<T extends keyof AttachmentStorageEvents>(
    type: T,
    handler: (event: AttachmentStorageEvents[T]) => void
  ): void;

  /**
   * 事件系统 - 移除事件监听器
   */
  off<T extends keyof AttachmentStorageEvents>(
    type: T,
    handler?: (event: AttachmentStorageEvents[T]) => void
  ): void;

  /**
   * 获取所有进行中的任务
   */
  getActiveTasks(): AttachmentTaskInfo[];

  /**
   * 获取指定任务信息
   */
  getTask(taskId: string): AttachmentTaskInfo | undefined;
}
