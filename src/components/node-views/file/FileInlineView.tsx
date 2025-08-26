import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import {
  inferFileTypeFromFilename,
  parseFileStatus,
  type FileStatus,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { FileViewProps } from "./FileView";
import { createFileMenuItems } from "./fileMenuUtils";
import { ImageFloatingPreview } from "./ImageBox";

// 前缀图标组件 - 显示状态或文件类型图标
const FileIconPrefix = (props: { status: FileStatus; filetype: string }) => {
  return (
    <Switch>
      {/* 状态图标优先级更高 */}
      <Match when={props.status.type === "uploading"}>
        <Loader2 class="inline-block mr-1 h-[1em] w-[1em] animate-spin align-[-2px]" />
      </Match>
      <Match when={props.status.type === "failed"}>
        <XCircle class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
      {/* 文件类型图标 */}
      <Match when={props.filetype === "image"}>
        <Image class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
      <Match when={props.filetype === "video"}>
        <Video class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
      <Match when={props.filetype === "audio"}>
        <Music class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
      <Match when={props.filetype === "text"}>
        <FileText class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
      <Match when={props.filetype === "archive"}>
        <FileArchive class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
      </Match>
    </Switch>
  );
};

// 文件名主体组件
const FileName = (props: { filename: string }) => {
  return <span>{props.filename}</span>;
};

// 后缀状态组件 - 显示上传进度或失败信息
const FileStatusSuffix = (props: { status: FileStatus }) => {
  const { t } = useI18n();

  return (
    <Switch>
      <Match when={props.status.type === "uploading"}>
        <span class="opacity-70">
          {t("file.inline.uploadingSuffix", {
            progress: props.status.progress ?? 0,
          })}
        </span>
      </Match>
      <Match when={props.status.type === "failed"}>
        <span class="opacity-70">{t("file.inline.failedSuffix")}</span>
      </Match>
    </Switch>
  );
};

// 预览浮窗组件
const FilePreviewTooltip = (props: {
  filetype: string;
  status: FileStatus;
  editor: FileViewProps["editor"];
  node: FileViewProps["node"];
}) => {
  return (
    <Switch>
      {/* 只有图片且已上传成功才显示预览 */}
      <Match
        when={props.filetype === "image" && props.status.type === "uploaded"}
      >
        <TooltipContent class="p-[4px] rounded-md">
          <ImageFloatingPreview
            app={props.editor.appView.app}
            node={props.node}
          />
        </TooltipContent>
      </Match>
    </Switch>
  );
};

export const FileInlineView = (props: FileViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const status = () => (props.node.attrs.status as string) ?? "uploaded";
  const statusParsed = createMemo(() => parseFileStatus(status()));
  const filetype = () => inferFileTypeFromFilename(filename());
  const st = () => statusParsed();

  const handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const { open } = useContextMenu(props.editor.appView.app);

    const menuItems = createFileMenuItems({
      editor: props.editor,
      node: props.node,
      getPos: props.getPos,
      showConvertToInline: false, // 已经是 inline 模式
      showDelete: false, // inline 模式不显示删除按钮
    });

    open(e, menuItems);
  };

  return (
    // 必须加上 wrapper，否则 tooltip 不会正常显示
    <span class="file-inline-wrapper">
      {/* 这里设置一个较大的 delay，一定程度上防止与右键菜单打架 */}
      <Tooltip openDelay={1000}>
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
              onContextMenu={handleRightClick}
            >
              <FileIconPrefix status={st()} filetype={filetype()} />
              <FileName filename={filename()} />
              <FileStatusSuffix status={st()} />
            </span>
          )}
        />

        <FilePreviewTooltip
          filetype={filetype()}
          status={st()}
          editor={props.editor}
          node={props.node}
        />
      </Tooltip>
    </span>
  );
};
