import { useContextMenu } from "@/composables/useContextMenu";
import { useDialogs } from "@/composables/useDialogs";
import { useI18n } from "@/composables/useI18n";
import {
  changeFileDisplayMode,
  downloadFile,
  setImageFilter,
} from "@/lib/app-views/editable-outline/commands";
import {
  inferFileTypeFromFilename,
  parseFileStatus,
  type FileAttrs,
  type FileStatus,
} from "@/lib/tiptap/nodes/file";
import { TextSelection } from "@tiptap/pm/state";
import {
  Download,
  Edit3,
  FileArchive,
  FileText,
  Filter,
  Image,
  Info,
  Loader2,
  Music,
  Repeat,
  Video,
  XCircle,
} from "lucide-solid";
import { createMemo, Match, Switch } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { FileViewProps } from "./FileView";
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

  // 获取当前图片滤镜
  const currentFilter = createMemo(() => {
    const { extraInfo } = props.node.attrs as FileAttrs;
    try {
      const parsed = JSON.parse(extraInfo || "{}");
      return parsed.filter;
    } catch (_e) {
      return undefined;
    }
  });

  const handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const { open } = useContextMenu(props.editor.appView.app);
    const { openImageRename } = useDialogs(props.editor.appView.app);

    const menuItems = [
      {
        type: "item" as const,
        label: t("fileContextMenu.download"),
        icon: Download,
        action: () => {
          const cmd = downloadFile(props.editor, props.node.attrs as FileAttrs);
          props.editor.appView.execCommand(cmd, true);
        },
      },
      {
        type: "item" as const,
        label: t("fileContextMenu.rename"),
        icon: Edit3,
        action: () => {
          const handleRename = (newName: string) => {
            const { editor, node, getPos } = props;
            const pos = getPos();
            let tr = editor.state.tr.setNodeAttribute(pos, "filename", newName);
            const sel = TextSelection.create(tr.doc, pos + 1);
            tr = tr.setSelection(sel);
            editor.view.dispatch(tr);
            // 延迟聚焦
            setTimeout(() => editor.view.focus());
          };
          openImageRename(filename(), handleRename);
        },
      },
      // 图片滤镜选项，只在图片文件时显示
      ...(filetype() === "image"
        ? [
            {
              type: "submenu" as const,
              label: t("fileContextMenu.imageFilter"),
              icon: Filter,
              children: [
                {
                  type: "item" as const,
                  label: t("imageFilters.none"),
                  action: () => {
                    const pos = props.getPos();
                    const cmd = setImageFilter(pos, undefined);
                    props.editor.appView.execCommand(cmd, true);
                  },
                  checked: currentFilter() === undefined,
                },
                {
                  type: "item" as const,
                  label: t("imageFilters.imageBlend"),
                  action: () => {
                    const pos = props.getPos();
                    const cmd = setImageFilter(pos, "imageBlend");
                    props.editor.appView.execCommand(cmd, true);
                  },
                  checked: currentFilter() === "imageBlend",
                },
                {
                  type: "item" as const,
                  label: t("imageFilters.imageBlendLuminosity"),
                  action: () => {
                    const pos = props.getPos();
                    const cmd = setImageFilter(pos, "imageBlendLuminosity");
                    props.editor.appView.execCommand(cmd, true);
                  },
                  checked: currentFilter() === "imageBlendLuminosity",
                },
                {
                  type: "item" as const,
                  label: t("imageFilters.imageInvert"),
                  action: () => {
                    const pos = props.getPos();
                    const cmd = setImageFilter(pos, "imageInvert");
                    props.editor.appView.execCommand(cmd, true);
                  },
                  checked: currentFilter() === "imageInvert",
                },
                {
                  type: "item" as const,
                  label: t("imageFilters.imageInvertW"),
                  action: () => {
                    const pos = props.getPos();
                    const cmd = setImageFilter(pos, "imageInvertW");
                    props.editor.appView.execCommand(cmd, true);
                  },
                  checked: currentFilter() === "imageInvertW",
                },
              ],
            },
          ]
        : []),
      {
        type: "item" as const,
        label: t("fileContextMenu.convertToPreview"),
        icon: Repeat,
        action: () => {
          const pos = props.getPos();
          const cmd = changeFileDisplayMode(pos, "preview");
          props.editor.appView.execCommand(cmd, true);
        },
      },
      {
        type: "item" as const,
        label: t("fileContextMenu.convertToCard"),
        icon: Repeat,
        action: () => {
          const pos = props.getPos();
          const cmd = changeFileDisplayMode(pos, "expanded");
          props.editor.appView.execCommand(cmd, true);
        },
      },
      {
        type: "item" as const,
        label: t("fileContextMenu.details"),
        icon: Info,
        action: () => {
          // TODO: 实现详情功能
        },
      },
    ];

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
              oncontextmenu={handleRightClick}
              {...p}
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
