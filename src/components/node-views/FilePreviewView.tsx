import { Node as PMNode } from "@tiptap/pm/model";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { NodeView } from "@tiptap/pm/view";
import { render } from "solid-js/web";
import { createMemo, onCleanup } from "solid-js";
import { useContextMenu } from "@/composables/useContextMenu";
import {
  getFileType,
  getFileTypeText,
  fileIcon,
  formatFileSize,
} from "@/lib/tiptap/nodes/file";
import {
  changeFileDisplayMode,
  setImageWidth,
} from "@/lib/app-views/editable-outline/commands";
import { ArrowRight, Download, Info, MoreHorizontal } from "lucide-solid";
import { showToast } from "@/components/ui/toast";
import { useI18n } from "@/composables/useI18n";

type FilePreviewProps = {
  node: PMNode;
  editor: Editor;
  getPos: () => number;
};

// 简单的图片 URL 缓存
const imageUrlCache = new Map<string, string>();

const FilePreviewView = (props: FilePreviewProps) => {
  const attrs = () => props.node.attrs as any;
  const fileType = createMemo(() => getFileType(attrs().filename));
  const { t } = useI18n();

  const widthPx = createMemo(() => {
    try {
      const info = attrs().extraInfo ? JSON.parse(attrs().extraInfo) : {};
      return typeof info.width === "number" ? `${info.width}px` : undefined;
    } catch {
      return undefined;
    }
  });

  const onMore = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { open } = useContextMenu();
    const { filename, path } = attrs();

    open(e, [
      {
        type: "item",
        icon: ArrowRight,
        label: t("file.contextMenu.convertToInline"),
        action: () => {
          const pos = props.getPos();
          const cmd = changeFileDisplayMode(pos, "inline");
          cmd(props.editor.state, props.editor.view.dispatch);
        },
      },
      {
        type: "item",
        icon: ArrowRight,
        label: t("file.contextMenu.convertToCard"),
        action: () => {
          const pos = props.getPos();
          const cmd = changeFileDisplayMode(pos, "expanded");
          cmd(props.editor.state, props.editor.view.dispatch);
        },
      },
      { type: "divider" },
      {
        type: "item",
        icon: Download,
        label: t("file.contextMenu.downloadImage"),
        action: async () => {
          try {
            const url = imageUrlCache.get(path);
            if (!url) throw new Error("no-url");
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
          } catch (err) {
            showToast({
              title: t("file.contextMenu.downloadImage") + "失败",
              variant: "destructive",
            });
          }
        },
      },
      {
        type: "item",
        icon: Info,
        label: t("file.contextMenu.details"),
        action: () => {
          const info = [
            `文件名: ${attrs().filename}`,
            `类型: ${getFileTypeText(getFileType(attrs().filename))}`,
            `大小: ${formatFileSize(attrs().size)}`,
            `路径: ${attrs().path}`,
          ].join("\n");
          alert(info);
        },
      },
    ]);
  };

  let containerRef: HTMLDivElement | undefined;
  let indicatorRef: HTMLDivElement | undefined;
  let imgRef: HTMLImageElement | undefined;

  const setupImage = async () => {
    const { path, filename, type } = attrs();
    const app = props.editor.appView.app;
    if (!app.attachmentStorage || !imgRef) return;
    try {
      let url = imageUrlCache.get(path);
      if (!url) {
        const blob = await app.attachmentStorage.download(path);
        url = URL.createObjectURL(blob);
        imageUrlCache.set(path, url);
      }
      imgRef.src = url;
      imgRef.alt = filename;
    } catch (err) {
      if (!containerRef) return;
      containerRef.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--color-text-muted); font-size: var(--ui-font-size-small)">
          <div style="margin-bottom: 8px;">${fileIcon(
            attrs().filename,
            type,
            24
          )}</div>
          <div>${t("file.preview.loadImageFailed")}</div>
          <div style="margin-top: 4px; font-size: var(--ui-font-size-tiny);">${
            attrs().filename
          }</div>
        </div>
      `;
    }
  };

  const onMouseDownHandle = (e: MouseEvent) => {
    if (!containerRef) return;
    e.preventDefault();
    e.stopPropagation();

    let dragging = true;
    const startX = e.clientX;
    const startWidth = containerRef.offsetWidth;
    if (indicatorRef) indicatorRef.style.opacity = "1";
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging || !containerRef) return;
      const dx = ev.clientX - startX;
      const newWidth = Math.max(100, Math.min(800, startWidth + dx));
      containerRef.style.width = `${newWidth}px`;
    };
    const onUp = () => {
      if (!dragging || !containerRef) return;
      dragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (indicatorRef) indicatorRef.style.opacity = "0.6";

      const finalWidth = containerRef.offsetWidth;
      const pos = props.getPos();
      const cmd = setImageWidth(pos, finalWidth);
      cmd(props.editor.state, props.editor.view.dispatch);

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const isImage = () => fileType() === "image";

  onCleanup(() => {
    // 保留 cache，避免频繁 revoke 造成重复下载；无需额外清理
  });

  if (!isImage()) {
    return (
      <div
        class="file-preview-error"
        style={{
          display: "inline-block",
          padding: "12px 16px",
          background: "var(--color-bg-error)",
          color: "var(--color-text-error)",
          border: "1px solid var(--color-border-error)",
          "border-radius": "6px",
          "font-size": "var(--ui-font-size-small)",
          margin: "4px 0",
        }}
        contentEditable={false}
      >
        {t("file.preview.unsupported", { type: getFileTypeText(fileType()) })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      class="file-preview"
      style={{
        display: "inline-block",
        margin: "8px 0 0 0",
        "border-radius": "8px",
        border: "1px solid var(--border-color-muted)",
        background: "var(--color-bg-muted)",
        position: "relative",
        ...(widthPx() ? { width: widthPx()! } : { "max-width": "100%" }),
      }}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          cursor: "pointer",
          "border-radius": "8px",
          "user-select": "none",
          "pointer-events": "none",
        }}
      />

      <div
        class="image-actions"
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          display: "flex",
          gap: "4px",
          opacity: 0,
          transition: "opacity 0.2s ease",
          "z-index": 20,
        }}
      >
        <button
          class="action-btn more-btn"
          style={{
            width: "24px",
            height: "24px",
            border: "none",
            "border-radius": "4px",
            background: "rgba(0,0,0,0.4)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            opacity: 0.7,
            transition: "opacity 0.2s ease",
          }}
          onClick={onMore}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.opacity = "1")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.opacity = "0.7")
          }
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div
        ref={indicatorRef}
        style={{
          position: "absolute",
          right: "2px",
          top: 0,
          bottom: 0,
          width: "4px",
          background: "var(--color-text-muted)",
          "border-radius": "2px",
          opacity: 0,
          transition: "opacity 0.2s ease",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "4px",
          top: "20%",
          bottom: "20%",
          width: "12px",
          cursor: "ew-resize",
          background: "transparent",
          "z-index": 10,
        }}
        onMouseDown={onMouseDownHandle}
      />

      <div
        style={{ position: "absolute", inset: 0 }}
        onMouseEnter={() => {
          if (indicatorRef) indicatorRef.style.opacity = "0.6";
          const actions =
            (containerRef?.querySelector(".image-actions") as HTMLElement) ||
            null;
          if (actions) actions.style.opacity = "1";
        }}
        onMouseLeave={() => {
          if (indicatorRef) indicatorRef.style.opacity = "0";
          const actions =
            (containerRef?.querySelector(".image-actions") as HTMLElement) ||
            null;
          if (actions) actions.style.opacity = "0";
        }}
      />
    </div>
  );
};

class FilePreviewViewAdapter implements NodeView {
  dom: HTMLDivElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const dom = document.createElement("div");
    this.dispose = render(
      () => (
        <FilePreviewView
          node={props.node as PMNode}
          editor={props.editor}
          getPos={props.getPos}
        />
      ),
      dom
    );
    this.dom = dom;
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }
}

export const filePreviewNodeViewRenderer: NodeViewRenderer = (props) =>
  new FilePreviewViewAdapter(props);
