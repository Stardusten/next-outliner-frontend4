import { createMemo, createSignal, onCleanup } from "solid-js";
import type { App } from "@/lib/app/app";
import type {
  AttachmentTaskInfo,
  AttachmentTaskStatus,
  AttachmentTaskType,
  ProgressInfo,
} from "@/lib/app/attachment/storage";

export type { AttachmentTaskType, AttachmentTaskStatus, ProgressInfo };
export type AttachmentTask = AttachmentTaskInfo;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getTaskTypeText = (type: AttachmentTaskType): string => {
  const map: Record<AttachmentTaskType, string> = {
    upload: "上传",
    download: "下载",
    delete: "删除",
  };
  return map[type] ?? type;
};

export const getTaskStatusText = (status: AttachmentTaskStatus): string => {
  const map: Record<AttachmentTaskStatus, string> = {
    pending: "等待中",
    progress: "进行中",
    success: "已完成",
    error: "失败",
  };
  return map[status] ?? status;
};

export const useAttachmentTaskList = (app: App) => {
  const [tasks, setTasks] = createSignal<AttachmentTask[]>([]);

  const taskCounts = createMemo(() => {
    const list = tasks();
    return list.reduce(
      (acc, t) => {
        acc.total++;
        acc[t.status]++;
        return acc;
      },
      { total: 0, pending: 0, progress: 0, success: 0, error: 0 }
    );
  });

  const hasActiveTasks = createMemo(() =>
    tasks().some((t) => t.status === "pending" || t.status === "progress")
  );
  const hasCompletedTasks = createMemo(() =>
    tasks().some((t) => t.status === "success" || t.status === "error")
  );

  // 注册事件
  const storage = app.attachmentStorage;
  if (storage) {
    const onCreated = (task: AttachmentTask) => {
      setTasks((prev) => [...prev, { ...task }]);
    };
    const onStarted = (task: AttachmentTask) => {
      setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...task } : x)));
    };
    const onProgress = (task: AttachmentTask) => {
      setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...task } : x)));
    };
    const onCompleted = (task: AttachmentTask) => {
      setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...task } : x)));
    };
    const onFailed = (task: AttachmentTask) => {
      setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...task } : x)));
    };

    storage.on("task:created", onCreated);
    storage.on("task:started", onStarted);
    storage.on("task:progress", onProgress);
    storage.on("task:completed", onCompleted);
    storage.on("task:failed", onFailed);

    // 初始同步进行中的任务
    const active = storage.getActiveTasks();
    if (active && active.length) setTasks((prev) => [...prev, ...active]);

    onCleanup(() => {
      storage.off("task:created", onCreated);
      storage.off("task:started", onStarted);
      storage.off("task:progress", onProgress);
      storage.off("task:completed", onCompleted);
      storage.off("task:failed", onFailed);
    });
  }

  // 查询与操作
  const getTask = (taskId: string) => tasks().find((t) => t.id === taskId);
  const removeTask = (taskId: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  const clearAllTasks = () => setTasks([]);
  const clearCompletedTasks = () =>
    setTasks((prev) =>
      prev.filter((t) => t.status !== "success" && t.status !== "error")
    );
  const canClearCompletedTasks = createMemo(() =>
    tasks().some((t) => t.status === "success" || t.status === "error")
  );
  const clearTasksByStatus = (status: AttachmentTaskStatus) =>
    setTasks((prev) => prev.filter((t) => t.status !== status));

  return {
    // 状态
    tasks,
    taskCounts,
    hasActiveTasks,
    hasCompletedTasks,

    // 查询
    getTask,

    // 本地管理
    removeTask,
    clearAllTasks,
    clearCompletedTasks,
    canClearCompletedTasks,
    clearTasksByStatus,

    // 工具
    getTaskTypeText,
    getTaskStatusText,
    formatFileSize,
  } as const;
};
