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
      class="inline-block px-2 py-1.5 my-0.5 rounded border text-center align-middle text-xs"
      classList={{
        "bg-muted border-border text-muted-foreground": isUploading(),
        "bg-destructive/10 border-destructive/20 text-destructive/70":
          isFailed(),
      }}
      contentEditable={false}
    >
      <div class="flex items-center justify-center gap-1.5">
        {isUploading() && (
          <Loader2 class="inline-block h-3 w-3 animate-spin align-[-1px]" />
        )}
        {isFailed() && <XCircle class="inline-block h-3 w-3 align-[-1px]" />}

        <span class="text-xs">
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
