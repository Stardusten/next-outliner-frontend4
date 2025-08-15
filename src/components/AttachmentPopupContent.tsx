import { For, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/composables/useI18n";
import { useAttachment } from "@/composables/useAttachment";
import {
  useAttachmentTaskList,
  type AttachmentTask,
} from "@/composables/useAttachmentTaskList";
import {
  Clock,
  CheckCircle2,
  Download,
  FileX,
  Loader2,
  Trash2,
  Upload,
} from "lucide-solid";
import type { App } from "@/lib/app/app";

export function AttachmentPopupContent(props: { app: App }) {
  const { t } = useI18n();
  const attachment = useAttachment(props.app);
  const taskList = useAttachmentTaskList(props.app);

  const handleUpload = async () => {
    const file = await attachment.getFileFromPopWindow();
    if (file) await attachment.upload(file, true);
  };

  const handleBrowse = async () => {
    const file = await attachment.getFileFromPopWindow();
    if (file) console.log("选择的文件:", file.name);
  };

  return (
    <div class="flex flex-col space-y-2">
      <div class="flex items-start">
        <div class="space-y-1 pr-2">
          <div class="font-semibold leading-none tracking-tight">
            {t("attachmentMgr.title")}
          </div>
          <div class="text-xs text-muted-foreground">
            {t("attachmentMgr.nTasks", { n: taskList.tasks().length })}
          </div>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <Button
            variant="destructiveOutline"
            class="h-8"
            onClick={() => taskList.clearCompletedTasks()}
            disabled={!taskList.canClearCompletedTasks()}
          >
            <Trash2 size={16} />
            {t("attachmentMgr.clearCompletedTasks")}
          </Button>
        </div>
      </div>

      <div class="space-y-2 max-h-80 overflow-y-auto">
        <For each={taskList.tasks()}>
          {(task) => (
            <div
              class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              classList={{
                "task-success": task.status === "success",
                "task-error": task.status === "error",
                "task-progress": task.status === "progress",
                "task-pending":
                  task.status !== "success" &&
                  task.status !== "error" &&
                  task.status !== "progress",
              }}
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="text-muted-foreground">
                  <Show when={task.type === "upload"}>
                    <Upload size={16} />
                  </Show>
                  <Show when={task.type === "download"}>
                    <Download size={16} />
                  </Show>
                  <Show when={task.type === "delete"}>
                    <Trash2 size={16} />
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate max-w-36">
                    {task.filename}
                  </div>
                  <div class="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{taskList.getTaskTypeText(task.type)}</span>
                    <span>•</span>
                    <span>{taskList.formatFileSize(task.size)}</span>
                    <span>•</span>
                    <span>{taskList.getTaskStatusText(task.status)}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <Show when={task.status === "progress"}>
                  <div class="flex items-center gap-1.5 min-w-[70px]">
                    <div class="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${task.progress ?? 0}%` }}
                      />
                    </div>
                    <span class="text-xs text-muted-foreground font-mono min-w-7">
                      {(task.progress ?? 0) + "%"}
                    </span>
                  </div>
                </Show>

                <div class="w-4 flex justify-center">
                  <Show when={task.status === "progress"}>
                    <Loader2 class="animate-spin text-primary" size={16} />
                  </Show>
                  <Show when={task.status === "success"}>
                    <CheckCircle2 class="text-green-500" size={16} />
                  </Show>
                  <Show when={task.status === "error"}>
                    <Trash2 class="text-destructive" size={16} />
                  </Show>
                  <Show when={task.status === "pending"}>
                    <Clock class="text-muted-foreground" size={16} />
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      <Show when={taskList.tasks().length === 0}>
        <div class="text-center py-8">
          <FileX size={32} class="text-muted-foreground mx-auto mb-2" />
          <div class="text-sm font-medium mb-1">
            {t("attachmentMgr.noTask")}
          </div>
          <div class="text-xs text-muted-foreground">
            {t("attachmentMgr.noTaskDescription")}
          </div>
        </div>
      </Show>

      <div class="flex items-center gap-2">
        <Button variant="outline" class="h-8 flex-1" onClick={handleUpload}>
          <Upload size={16} />
          {t("attachmentMgr.upload")}
        </Button>
        <Button variant="outline" class="h-8 flex-1" onClick={handleBrowse}>
          <Download size={16} />
          {t("attachmentMgr.browse")}
        </Button>
      </div>
    </div>
  );
}

export default AttachmentPopupContent;
