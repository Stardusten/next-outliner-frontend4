import { fileViewRenderer } from "@/components/node-views/file/FileView";
import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";
import { App } from "@/lib/app/app";
import { Node } from "@tiptap/core";

export const File = Node.create({
  name: "file",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes() {
    return {
      path: {},
      displayMode: { default: "inline" }, // inline | preview
      filename: {},
      type: {},
      size: {},
      extraInfo: { default: "" },
      status: { default: "uploaded" }, // "uploading-{progress}" | "uploaded" | "failed"
    };
  },
  addNodeView() {
    return fileViewRenderer;
  },
});

export type FileAttrs = {
  path: string;
  displayMode: "inline" | "preview" | "expanded";
  filename: string;
  type: FileType;
  size: number;
  extraInfo: string;
  status: `uploading-${number}` | "uploaded" | `failed-${number}`;
};

export type FileType =
  | "image"
  | "video"
  | "audio"
  | "text"
  | "archive"
  | "unknown";

export function inferFileTypeFromFilename(filename: string): FileType {
  const ext = filename.toLowerCase().split(".").pop() || "";

  // 图片类型
  if (
    ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)
  ) {
    return "image";
  }

  // 视频类型
  if (
    ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp"].includes(
      ext
    )
  ) {
    return "video";
  }

  // 音频类型
  if (["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"].includes(ext)) {
    return "audio";
  }

  // 文本类型
  if (
    [
      "txt",
      "md",
      "doc",
      "docx",
      "pdf",
      "rtf",
      "csv",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "py",
      "java",
      "cpp",
      "c",
      "h",
    ].includes(ext)
  ) {
    return "text";
  }

  // 压缩文件类型
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
    return "archive";
  }

  return "unknown";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// 文件状态解析工具
export interface FileStatus {
  type: "uploading" | "uploaded" | "failed";
  progress?: number; // 0-100，仅在 uploading 时有效
  errorCode?: number; // 仅在 failed 时有效
}

export function parseFileStatus(status: string): FileStatus {
  if (status === "uploaded") {
    return { type: "uploaded" };
  }

  if (status.startsWith("uploading-")) {
    const progress = parseInt(status.split("-")[1], 10);
    return {
      type: "uploading",
      progress: isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
    };
  }

  if (status.startsWith("failed-")) {
    const errorCode = parseInt(status.split("-")[1], 10);
    return {
      type: "failed",
      errorCode: isNaN(errorCode) ? 0 : errorCode,
    };
  }

  // 默认为已上传状态
  return { type: "uploaded" };
}

export function createFileStatus(type: "uploaded"): string;
export function createFileStatus(type: "uploading", progress: number): string;
export function createFileStatus(type: "failed", errorCode: number): string;
export function createFileStatus(
  type: "uploading" | "uploaded" | "failed",
  value?: number
): string {
  if (type === "uploaded") {
    return "uploaded";
  }
  if (type === "uploading") {
    const progress = Math.min(100, Math.max(0, value || 0));
    return `uploading-${progress}`;
  }
  if (type === "failed") {
    return `failed-${value || 0}`;
  }
  return "uploaded";
}

export function getDefaultDisplayMode(
  app: App,
  type: FileType
): FileAttrs["displayMode"] {
  const getCurrentRepo = useCurrRepoConfig(app);
  const currentRepo = getCurrentRepo();
  if (!currentRepo) return "inline";

  switch (type) {
    case "text":
      return currentRepo.editor.textFileDefaultDisplayMode;
    case "archive":
      return currentRepo.editor.archiveFileDefaultDisplayMode;
    case "audio":
      return currentRepo.editor.audioFileDefaultDisplayMode;
    case "video":
      return currentRepo.editor.videoFileDefaultDisplayMode;
    case "image":
      return currentRepo.editor.imageFileDefaultDisplayMode;
    case "unknown":
      return currentRepo.editor.unknownFileDefaultDisplayMode;
    default:
      return "inline";
  }
}
