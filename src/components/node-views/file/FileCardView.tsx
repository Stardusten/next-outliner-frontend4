import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import {
  formatFileSize,
  inferFileTypeFromFilename,
  parseFileStatus,
} from "@/lib/tiptap/nodes/file";
import {
  FileArchive,
  FileText,
  Image,
  MoreHorizontal,
  Music,
  Trash2,
  Video,
} from "lucide-solid";
import { createMemo } from "solid-js";
import { FileViewProps } from "./FileView";
import { createFileMenuItems } from "./fileMenuUtils";

// 文件类型图标组件
const FileTypeIcon = (props: { type: string; class?: string }) => {
  const iconClass = () => props.class || "size-4";

  switch (props.type) {
    case "image":
      return <Image class={iconClass()} />;
    case "video":
      return <Video class={iconClass()} />;
    case "audio":
      return <Music class={iconClass()} />;
    case "text":
      return <FileText class={iconClass()} />;
    case "archive":
      return <FileArchive class={iconClass()} />;
    default:
      return <FileText class={iconClass()} />;
  }
};

// 文件名截断组件
const TruncatedFilename = (props: { filename: string; maxLength?: number }) => {
  const maxLen = () => props.maxLength || 30;

  const displayName = createMemo(() => {
    const name = props.filename;
    if (name.length <= maxLen()) {
      return name;
    }

    // 尝试保留文件扩展名
    const lastDotIndex = name.lastIndexOf(".");
    if (lastDotIndex > 0 && lastDotIndex > name.length - 8) {
      const nameWithoutExt = name.substring(0, lastDotIndex);
      const ext = name.substring(lastDotIndex);
      const availableLength = maxLen() - ext.length - 3; // 3 for "..."

      if (availableLength > 0) {
        return nameWithoutExt.substring(0, availableLength) + "..." + ext;
      }
    }

    // 如果无法保留扩展名，直接截断
    return name.substring(0, maxLen() - 3) + "...";
  });

  return (
    <Tooltip openDelay={500}>
      <TooltipTrigger as="span" class="truncate">
        {displayName()}
      </TooltipTrigger>
      <TooltipContent>{props.filename}</TooltipContent>
    </Tooltip>
  );
};

export const FileCardView = (props: FileViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const type = () => inferFileTypeFromFilename(filename());
  const size = () => props.node.attrs.size as number;
  const status = createMemo(() => {
    const statusString = props.node.attrs.status as string;
    return parseFileStatus(statusString);
  });

  // 处理菜单点击
  const handleMenuClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { open } = useContextMenu(props.editor.appView.app);

    const menuItems = createFileMenuItems({
      editor: props.editor,
      node: props.node,
      getPos: props.getPos,
      showConvertToCard: false, // 已经是 expanded 模式
      showDelete: false, // 删除按钮单独显示
    });

    // 使用按钮作为锚点
    const button = e.target as HTMLElement;
    open(button, menuItems);
  };

  // 处理删除
  const handleDelete = () => {
    const menuItems = createFileMenuItems({
      editor: props.editor,
      node: props.node,
      getPos: props.getPos,
    });

    // 找到删除项并执行
    const deleteItem = menuItems.find(
      (item) =>
        item.type === "item" && item.label === t("file.preview.deleteImage")
    );

    if (deleteItem && deleteItem.type === "item") {
      deleteItem.action();
    }
  };

  return (
    <div
      class="inline-block w-64 px-3 py-2 my-0.5 rounded border bg-muted border-border text-xs"
      classList={{
        "ring-2 ring-ring": props.selected,
      }}
      contentEditable={false}
    >
      <div class="flex items-center gap-3">
        {/* 左侧文件类型图标 */}
        <div class="flex-shrink-0 text-muted-foreground">
          <FileTypeIcon type={type()} class="size-6" />
        </div>

        {/* 中间文件信息 */}
        <div class="flex-grow min-w-0">
          <div class="font-medium text-foreground mb-1">
            <TruncatedFilename filename={filename()} maxLength={25} />
          </div>
          <div class="text-muted-foreground">{formatFileSize(size())}</div>
        </div>

        {/* 右侧操作按钮 */}
        <div class="flex-shrink-0 flex gap-1">
          {/* More 菜单 */}
          <Tooltip>
            <TooltipTrigger
              as={(p: ButtonProps) => (
                <Button
                  variant="ghost"
                  size="xs-icon"
                  class="text-muted-foreground hover:text-foreground"
                  {...p}
                  onClick={handleMenuClick}
                >
                  <MoreHorizontal class="size-4" />
                </Button>
              )}
            />
            <TooltipContent>{t("file.preview.imageMenu")}</TooltipContent>
          </Tooltip>

          {/* 删除按钮 */}
          <Tooltip>
            <TooltipTrigger
              as={(p: ButtonProps) => (
                <Button
                  {...p}
                  variant="ghost"
                  size="xs-icon"
                  class="text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 class="size-4" />
                </Button>
              )}
            />
            <TooltipContent>{t("file.preview.deleteImage")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
