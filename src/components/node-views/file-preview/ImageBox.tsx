import { MoreHorizontal, Repeat, Trash2 } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Setter,
  Show,
} from "solid-js";
import { Button, ButtonProps } from "@/components/ui/button";
import { useI18n } from "@/composables/useI18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { App } from "@/lib/app/app";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAttachment } from "@/composables/useAttachment";
import { Node } from "@tiptap/pm/model";
import { FileAttrs } from "@/lib/tiptap/nodes/file";

// 简单的内存 URL 缓存
const imageUrlCache = new Map<string, string>();

export type ImageBoxProps = {
  node: Node;
  app: App;
  convertToInline: () => void;
  convertToCard: () => void;
  deleteImage: () => void;
  resizeImage: (newWidth: number) => void;
};

export const ImageBox = (props: ImageBoxProps) => {
  const { t } = useI18n();
  const [imgUrl, setImgUrl] = createSignal<string | null>(null);
  const [loadError, setLoadError] = createSignal(false);
  const [showToolbar, setShowToolbar] = createSignal(false);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const storage = () => props.app.attachmentStorage;

  const width = createMemo(() => {
    const { extraInfo } = props.node.attrs as FileAttrs;
    if (!extraInfo || extraInfo.trim().length === 0) return null;
    try {
      const info = JSON.parse(extraInfo) ?? null;
      return info.width as number | null;
    } catch (e) {
      return null;
    }
  });

  // 图片工具栏显示，如果：
  // 1. 图片 hover
  // 2. showToolbar 为 true
  // 之所以不用 dropdownOpen，是因为 dropdown 关闭时有动画
  // 会导致工具栏闪烁
  let timer;
  createEffect(() => {
    if (dropdownOpen()) {
      clearTimeout(timer);
      setShowToolbar(true);
    } else {
      timer = setTimeout(() => setShowToolbar(false), 500);
    }
  });

  // 图片加载逻辑
  createEffect(() => {
    const { path } = props.node.attrs as FileAttrs;

    setLoadError(false);
    setImgUrl(null);
    if (!storage() || !path) return;

    const cached = imageUrlCache.get(path);
    if (cached) {
      setImgUrl(cached);
      return;
    }

    let disposed = false;
    storage()
      .download(path)
      .then((blob: Blob) => {
        if (disposed) return;
        const url = URL.createObjectURL(blob);
        imageUrlCache.set(path, url);
        setImgUrl(url);
      })
      .catch(() => {
        if (disposed) return;
        setLoadError(true);
      });

    onCleanup(() => {
      disposed = true;
    });
  });

  // 拖拽调整宽度逻辑
  const handleResizeMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let dragging = true;
    const startX = e.clientX;
    const container = (e.currentTarget as HTMLElement).closest(
      ".file-preview"
    ) as HTMLElement | null;
    if (!container) return;
    const startWidth = container.offsetWidth;

    const onMove = (ev: MouseEvent) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const newWidth = Math.max(100, Math.min(1200, startWidth + dx));
      container.style.width = `${newWidth}px`;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const finalWidth = container?.offsetWidth ?? startWidth;
      props.resizeImage(finalWidth);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      class="file-preview inline-block my-1 rounded-lg border border-border bg-muted relative select-none group"
      style={{
        width: width() ? `${width()}px` : undefined,
        "max-width": "100%",
      }}
      contentEditable={false}
    >
      {/* 图片 */}
      <img
        class="block w-full h-auto pointer-events-none select-none rounded-lg"
        src={imgUrl() || undefined}
        alt={props.node.attrs.filename}
      />

      {/* 加载失败提示 */}
      <Show when={loadError()}>
        <div class="p-4 text-center text-muted-foreground text-sm">
          {t("file.preview.loadImageFailed")}
        </div>
      </Show>

      {/* 图片工具栏 */}
      <div
        class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity z-20"
        classList={{
          "opacity-100": showToolbar(),
          "group-hover:opacity-100": true,
        }}
      >
        {/* 命令列表 */}
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger
            as={(p: ButtonProps) => (
              <Tooltip>
                <TooltipTrigger
                  as={(p: ButtonProps) => (
                    <Button variant="outline" size="xs-icon" {...p}>
                      <MoreHorizontal class="w-[14px] h-[14px]" />
                    </Button>
                  )}
                  {...p}
                />
                <TooltipContent>{t("file.preview.imageMenu")}</TooltipContent>
              </Tooltip>
            )}
          />
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={props.convertToInline}>
              <Repeat class="size-[14px]" />
              {t("file.contextMenu.convertToInline")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={props.convertToCard}>
              <Repeat class="size-[14px]" />
              {t("file.contextMenu.convertToCard")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 删除按钮 */}
        <Tooltip>
          <TooltipTrigger
            as={(p: ButtonProps) => (
              <Button
                {...p}
                variant="destructiveOutline"
                size="xs-icon"
                onClick={props.deleteImage}
              >
                <Trash2 class="w-[14px] h-[14px]" />
              </Button>
            )}
          />
          <TooltipContent>{t("file.preview.deleteImage")}</TooltipContent>
        </Tooltip>
      </div>

      <div
        class="absolute right-1 top-[20%] bottom-[20%] w-3 cursor-ew-resize z-10"
        onMouseDown={handleResizeMouseDown}
      >
        <div class="absolute right-0 top-0 bottom-0 w-1 rounded bg-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-60" />
      </div>
    </div>
  );
};
