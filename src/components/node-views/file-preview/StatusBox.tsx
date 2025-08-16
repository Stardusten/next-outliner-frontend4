import { Loader2, XCircle } from "lucide-solid";
import { Match, Switch } from "solid-js";
import { useI18n } from "@/composables/useI18n";
import type { FileStatus } from "@/lib/tiptap/nodes/file";

export const StatusBox = (props: { filename: string; status: FileStatus }) => {
  const { t } = useI18n();
  const isUploading = () => props.status.type === "uploading";
  const isFailed = () => props.status.type === "failed";

  return (
    <div
      class="inline-block px-5 py-4 my-1 rounded-lg border text-center align-middle"
      classList={{
        "bg-muted border-border text-foreground": isUploading(),
        "border-destructive/20 text-destructive": isFailed(),
      }}
      contentEditable={false}
    >
      <div class="flex items-center justify-center gap-2">
        {isUploading() && (
          <Loader2 class="inline-block h-5 w-5 animate-spin align-[-2px]" />
        )}
        {isFailed() && <XCircle class="inline-block h-5 w-5 align-[-2px]" />}

        <span>
          {props.filename} (
          <Switch>
            <Match when={isUploading()}>
              {t("file.preview.uploading", {
                progress: props.status.progress ?? 0,
              })}
            </Match>
            <Match when={isFailed()}>{t("file.preview.failed")}</Match>
          </Switch>
          )
        </span>
      </div>
    </div>
  );
};
