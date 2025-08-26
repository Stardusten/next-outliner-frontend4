import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import { AttachmentStorage } from "@/lib/app/attachment/storage";
import { FileAttrs } from "@/lib/tiptap/nodes/file";
import { Node } from "@tiptap/pm/model";
import { MoreHorizontal, Trash2 } from "lucide-solid";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  Switch,
  Match,
} from "solid-js";
import { createFileMenuItems } from "./fileMenuUtils";

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
          class="absolute right-0.5 top-[20%] bottom-[20%] w-2 cursor-ew-resize z-10"
          onMouseDown={handleResizeMouseDown}
        >
          <div class="absolute right-0 top-0 bottom-0 w-1.5 rounded bg-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-60" />
        </div>
      </Show>
    </div>
  );
};

export type ImageLoadStatus = "loading" | "loaded" | "failed";

export const ImageView = (props: {
  path: string;
  filter?: string;
  storage?: AttachmentStorage;
  onLoadStatusChange?: (status: ImageLoadStatus, url?: string) => void;
  variant?: "embedded" | "floating";
}) => {
  const { t } = useI18n();
  const [imgUrl, setImgUrl] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [loadError, setLoadError] = createSignal(false);

  createEffect(() => {
    batch(() => {
      setLoading(true);
      setLoadError(false);
      setImgUrl(null);
    });

    // 通知父组件开始加载
    props.onLoadStatusChange?.("loading");

    if (!props.storage || !props.path) {
      batch(() => {
        setLoading(false);
        setLoadError(true);
      });
      props.onLoadStatusChange?.("failed");
      return;
    }

    const cached = imageCache.get(props.path);
    if (cached) {
      batch(() => {
        setImgUrl(cached);
        setLoading(false);
      });
      props.onLoadStatusChange?.("loaded", cached);
      return;
    }

    let disposed = false;
    props.storage
      ?.download(props.path)
      .then((blob: Blob) => {
        if (disposed) return;
        const url = URL.createObjectURL(blob);
        imageCache.set(props.path, url);
        batch(() => {
          setImgUrl(url);
          setLoading(false);
        });
        props.onLoadStatusChange?.("loaded", url);
      })
      .catch(() => {
        if (disposed) return;
        batch(() => {
          setLoadError(true);
          setLoading(false);
        });
        props.onLoadStatusChange?.("failed");
      });

    onCleanup(() => {
      disposed = true;
    });
  });

  return (
    <Show
      when={imgUrl()}
      fallback={
        <div
          class="inline-block text-center align-middle text-xs"
          classList={{
            // 嵌入视图样式（有边框背景）
            "px-2 py-1.5 my-0.5 rounded border bg-muted border-border text-muted-foreground":
              props.variant !== "floating" && loading(),
            "px-2 py-1.5 my-0.5 rounded border bg-destructive/10 border-destructive/20 text-destructive/70":
              props.variant !== "floating" && loadError(),
            // 悬浮视图样式（无边框背景）
            "text-muted-foreground px-2 py-1.5":
              props.variant === "floating" && loading(),
            "text-destructive px-2 py-1.5":
              props.variant === "floating" && loadError(),
            [`filter-${props.filter}`]: !!props.filter,
          }}
        >
          <Switch fallback={t("file.preview.loadingImage")}>
            <Match when={loading()}>{t("file.preview.loadingImage")}</Match>
            <Match when={loadError()}>
              {t("file.preview.loadImageFailed")}
            </Match>
          </Switch>
        </div>
      }
    >
      <div
        class="inline-block my-0.5 rounded border border-border bg-background overflow-hidden"
        classList={{
          [`filter-${props.filter}`]: !!props.filter,
        }}
      >
        <img
          class="block w-full h-auto pointer-events-none select-none"
          src={imgUrl() || undefined}
          alt={props.path}
        />
      </div>
    </Show>
  );
};

export type ImageEmbeddedPreviewProps = {
  node: Node;
  app: App;
  editor: any;
  getPos: () => number;
  convertToInline: () => void;
  convertToCard: () => void;
  deleteImage: () => void;
  resizeImage: (newWidth: number) => void;
};

export const ImageEmbeddedPreview = (props: ImageEmbeddedPreviewProps) => {
  const { t } = useI18n();
  const [showToolbar, setShowToolbar] = createSignal(false);
  const [imageStatus, setImageStatus] =
    createSignal<ImageLoadStatus>("loading");
  const width = createMemo(() => getImageWidthFromNode(props.node));
  const path = () => (props.node.attrs as FileAttrs).path;
  const storage = () => props.app.attachmentStorage;
  const extraInfos = createMemo(() => {
    const { extraInfo } = props.node.attrs as FileAttrs;
    try {
      return JSON.parse(extraInfo || "{}");
    } catch (_e) {
      return {};
    }
  });

  // 获取当前图片滤镜
  const currentFilter = createMemo(() => {
    return extraInfos().filter;
  });

  const filename = () => (props.node.attrs as FileAttrs).filename;

  const handleLoadStatusChange = (status: ImageLoadStatus) => {
    setImageStatus(status);
  };

  // 处理菜单点击
  const handleMenuClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { open } = useContextMenu(props.app);

    const menuItems = createFileMenuItems({
      editor: props.editor,
      node: props.node,
      getPos: props.getPos,
      showConvertToPreview: false, // 已经是 preview 模式
      showDelete: false, // 删除按钮单独显示
    });

    // 使用按钮作为锚点
    const button = e.target as HTMLElement;
    open(button, menuItems);
  };

  // 工具栏显示逻辑（简化版）
  // 现在使用悬停来控制工具栏显示

  return (
    <ResizableBox
      initialWidth={
        imageStatus() === "loaded" ? width() ?? undefined : undefined
      }
      onResizeEnd={props.resizeImage}
      enable={imageStatus() === "loaded"}
      class="file-preview inline-block relative select-none group"
      style={{ "max-width": "100%" }}
    >
      <ImageView
        path={path()}
        filter={extraInfos().filter}
        storage={storage() || undefined}
        onLoadStatusChange={handleLoadStatusChange}
      />

      {/* 图片工具栏 - 只在加载成功时显示 */}
      <Show when={imageStatus() === "loaded"}>
        <div class="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity z-20 group-hover:opacity-100">
          {/* 命令列表 */}
          <Tooltip>
            <TooltipTrigger
              as={(p: ButtonProps) => (
                <Button
                  variant="outline"
                  size="xs-icon"
                  class="bg-background/95 border-border/70 shadow-md hover:bg-background hover:border-border"
                  {...p}
                  onClick={handleMenuClick}
                >
                  <MoreHorizontal class="w-[14px] h-[14px]" />
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
                  variant="destructiveOutline"
                  size="xs-icon"
                  class="bg-background/95 border-destructive/70 shadow-md hover:bg-destructive/10 hover:border-destructive"
                  onClick={props.deleteImage}
                >
                  <Trash2 class="w-[14px] h-[14px]" />
                </Button>
              )}
            />
            <TooltipContent>{t("file.preview.deleteImage")}</TooltipContent>
          </Tooltip>
        </div>
      </Show>
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
  const extraInfos = createMemo(() => {
    const { extraInfo } = props.node.attrs as FileAttrs;
    try {
      return JSON.parse(extraInfo);
    } catch (_e) {
      return {};
    }
  });
  const [imageStatus, setImageStatus] =
    createSignal<ImageLoadStatus>("loading");

  const handleLoadStatusChange = (status: ImageLoadStatus) => {
    setImageStatus(status);
  };

  return (
    <div class="inline-block select-none" contentEditable={false}>
      <ResizableBox
        initialWidth={
          imageStatus() === "loaded" ? width() ?? undefined : undefined
        }
        enable={imageStatus() === "loaded"}
        class="relative group rounded [&_img]:rounded-sm"
        style={{ "max-width": "420px" }}
      >
        <ImageView
          path={path()}
          filter={extraInfos().filter}
          storage={storage() || undefined}
          onLoadStatusChange={handleLoadStatusChange}
          variant="floating"
        />
      </ResizableBox>
    </div>
  );
};
