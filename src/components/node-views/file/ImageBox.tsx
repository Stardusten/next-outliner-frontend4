import { Button, ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import { AttachmentStorage } from "@/lib/app/attachment/storage";
import { FileAttrs } from "@/lib/tiptap/nodes/file";
import { Node } from "@tiptap/pm/model";
import { MoreHorizontal, Repeat, Trash2 } from "lucide-solid";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  Switch,
  Match,
} from "solid-js";

// image path -> image url
const imageCache = new Map<string, string>();

function getImageWidthFromNode(node: Node): number | null {
  const { extraInfo } = node.attrs as FileAttrs;
  if (
    !extraInfo ||
    (typeof extraInfo === "string" && extraInfo.trim().length === 0)
  ) {
    return null;
  }
  try {
    const info =
      typeof extraInfo === "string" ? JSON.parse(extraInfo) : extraInfo;
    const width = (info?.width ?? null) as number | null;
    return typeof width === "number" ? width : null;
  } catch (_e) {
    return null;
  }
}

export const ResizableBox = (props: {
  initialWidth?: number | null;
  onResizeEnd?: (newWidth: number) => void;
  class?: string;
  style?: Record<string, string>;
  enable?: boolean;
  children: any;
}) => {
  let containerRef: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal<number | undefined>(
    typeof props.initialWidth === "number" ? props.initialWidth : undefined
  );

  createEffect(() => {
    const w = props.initialWidth;
    if (typeof w === "number") {
      setWidth(w);
    }
  });

  const computedStyle = createMemo(() => {
    const base: Record<string, string> = { ...(props.style || {}) };
    const w = width();
    if (typeof w === "number") {
      base["width"] = `${w}px`;
    }
    return base;
  });

  const handleResizeMouseDown = (e: MouseEvent) => {
    if (!props.enable) return;
    e.preventDefault();
    e.stopPropagation();
    let dragging = true;
    const startX = e.clientX;
    const startWidth = containerRef?.offsetWidth || 0;

    const onMove = (ev: MouseEvent) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const newWidth = Math.max(100, Math.min(1200, startWidth + dx));
      setWidth(newWidth);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const finalWidth = containerRef?.offsetWidth ?? startWidth;
      if (props.onResizeEnd) props.onResizeEnd(finalWidth);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={(el) => (containerRef = el)}
      class={props.class}
      style={computedStyle()}
      contentEditable={false}
    >
      {props.children}
      <Show when={props.enable}>
        <div
          class="absolute right-1 top-[20%] bottom-[20%] w-3 cursor-ew-resize z-10"
          onMouseDown={handleResizeMouseDown}
        >
          <div class="absolute right-0 top-0 bottom-0 w-1 rounded bg-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
      </Show>
    </div>
  );
};

export const ImageView = (props: {
  path: string;
  storage?: AttachmentStorage;
}) => {
  const { t } = useI18n();
  const [imgUrl, setImgUrl] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal(false);

  createEffect(() => {
    setLoading(true);
    setLoadError(false);
    setImgUrl(null);
    if (!props.storage || !props.path) {
      setLoading(false);
      setLoadError(true);
      return;
    }

    const cached = imageCache.get(props.path);
    if (cached) {
      setImgUrl(cached);
      setLoading(false);
      return;
    }

    let disposed = false;
    props.storage
      ?.download(props.path)
      .then((blob: Blob) => {
        if (disposed) return;
        const url = URL.createObjectURL(blob);
        imageCache.set(props.path, url);
        setImgUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (disposed) return;
        setLoadError(true);
        setLoading(false);
      });

    onCleanup(() => {
      disposed = true;
    });
  });

  return (
    <div class="block w-full">
      <Show
        when={imgUrl()}
        fallback={
          <div class="p-4 text-center text-muted-foreground text-sm">
            <Switch fallback={t("file.preview.loadingImage")}>
              <Match when={loading()}>{t("file.preview.loadingImage")}</Match>
              <Match when={loadError()}>
                {t("file.preview.loadImageFailed")}
              </Match>
            </Switch>
          </div>
        }
      >
        <img
          class="block w-full h-auto pointer-events-none select-none"
          src={imgUrl() || undefined}
          alt={props.path}
        />
      </Show>
    </div>
  );
};

export type ImageEmbeddedPreviewProps = {
  node: Node;
  app: App;
  convertToInline: () => void;
  convertToCard: () => void;
  deleteImage: () => void;
  resizeImage: (newWidth: number) => void;
};

export const ImageEmbeddedPreview = (props: ImageEmbeddedPreviewProps) => {
  const { t } = useI18n();
  const [showToolbar, setShowToolbar] = createSignal(false);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const width = createMemo(() => getImageWidthFromNode(props.node));

  // 工具栏显示逻辑
  let timer: number;
  createEffect(() => {
    if (dropdownOpen()) {
      clearTimeout(timer);
      setShowToolbar(true);
    } else {
      timer = setTimeout(() => setShowToolbar(false), 500);
    }
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
    <ResizableBox
      initialWidth={width() ?? undefined}
      onResizeEnd={props.resizeImage}
      enable={true}
      class="file-preview inline-block my-1 rounded-lg border border-border bg-muted relative select-none group"
      style={{ "max-width": "100%" }}
    >
      <ImageView
        path={(props.node.attrs as FileAttrs).path}
        storage={props.app.attachmentStorage || undefined}
      />

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
    </ResizableBox>
  );
};

export type ImageFloatingPreviewProps = {
  node: Node;
  app: App;
};

export const ImageFloatingPreview = (props: ImageFloatingPreviewProps) => {
  const path = () => (props.node.attrs as FileAttrs).path;
  const storage = () => props.app.attachmentStorage;
  const width = createMemo(() => getImageWidthFromNode(props.node));

  return (
    <div class="inline-block select-none" contentEditable={false}>
      <ResizableBox
        initialWidth={width() ?? undefined}
        enable={true}
        class="relative group rounded-md [&_img]:rounded-md"
        style={{ "max-width": "420px" }}
      >
        <ImageView path={path()} storage={storage() || undefined} />
      </ResizableBox>
    </div>
  );
};
