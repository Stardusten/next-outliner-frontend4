import { useI18n } from "@/composables/useI18n";
import {
  inferFileTypeFromFilename,
  parseFileStatus,
} from "@/lib/tiptap/nodes/file";
import {
  FileArchive,
  FileText,
  Image,
  Loader2,
  Music,
  Video,
  XCircle,
} from "lucide-solid";
import { createMemo, Match, Switch } from "solid-js";
import { FileViewProps } from "./FileView";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { ButtonProps } from "../../ui/button";
import { ImageFloatingPreview } from "./ImageBox";

export const FileInlineView = (props: FileViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const status = () => (props.node.attrs.status as string) ?? "uploaded";
  const statusParsed = createMemo(() => parseFileStatus(status()));
  const filetype = () =>
    inferFileTypeFromFilename(props.node.attrs.filename as string);
  const st = () => statusParsed();

  return (
    // 必须加上 wrapper，否则 tooltip 不会正常显示
    <span class="file-inline-wrapper">
      <Tooltip>
        <TooltipTrigger
          as={(p: any) => (
            <span
              class="file-inline"
              classList={{
                selected: props.selected,
                [`type-${filetype()}`]: true,
                [`status-${st().type}`]: true,
              }}
              data-filename={filename()}
              contentEditable={false}
              {...p}
            >
              <Switch>
                {/* 上传中和上传失败，图标指示状态 */}
                <Match when={st().type === "uploading"}>
                  <Loader2 class="inline-block mr-1 h-[1em] w-[1em] animate-spin align-[-2px]" />
                </Match>
                <Match when={st().type === "failed"}>
                  <XCircle class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
                {/* 图标指示文件类型 */}
                <Match when={filetype() === "image"}>
                  <Image class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
                <Match when={filetype() === "video"}>
                  <Video class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
                <Match when={filetype() === "audio"}>
                  <Music class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
                <Match when={filetype() === "text"}>
                  <FileText class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
                <Match when={filetype() === "archive"}>
                  <FileArchive class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
                </Match>
              </Switch>
              <span>{filename()}</span>
              <Switch>
                <Match when={st().type === "uploading"}>
                  <span class="opacity-70">
                    {t("file.inline.uploadingSuffix", {
                      progress: st().progress ?? 0,
                    })}
                  </span>
                </Match>
                <Match when={st().type === "failed"}>
                  <span class="opacity-70">
                    {t("file.inline.failedSuffix")}
                  </span>
                </Match>
              </Switch>
            </span>
          )}
        />

        <Switch>
          {/* 图片预览 */}
          <Match when={filetype() === "image" && st().type === "uploaded"}>
            <TooltipContent class="p-[4px] rounded-md">
              <ImageFloatingPreview
                app={props.editor.appView.app}
                node={props.node}
              />
            </TooltipContent>
          </Match>
        </Switch>
      </Tooltip>
    </span>
  );
};
