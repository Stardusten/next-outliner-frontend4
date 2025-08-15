import { Node as PMNode } from "@tiptap/pm/model";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { NodeView } from "@tiptap/pm/view";
import { render } from "solid-js/web";
import { createMemo } from "solid-js";
import { useContextMenu } from "@/composables/useContextMenu";
import {
  fileIcon,
  formatFileSize,
  getFileType,
  getFileTypeText,
} from "@/lib/tiptap/nodes/file";
import { changeFileDisplayMode } from "@/lib/app-views/editable-outline/commands";
import { ArrowRight, Download, Info, Eye, MoreHorizontal } from "lucide-solid";
import { useI18n } from "@/composables/useI18n";
import { showToast } from "@/components/ui/toast";

type FileExpandedProps = {
  node: PMNode;
  editor: Editor;
  getPos: () => number;
};

const FileExpandedView = (props: FileExpandedProps) => {
  const attrs = () => props.node.attrs as any;

  const iconSvg = createMemo(() => fileIcon(attrs().filename, attrs().type));

  const onClickPreviewBtn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = props.getPos();
    const cmd = changeFileDisplayMode(pos, "preview");
    cmd(props.editor.state, props.editor.view.dispatch);
  };

  const onClickMoreBtn = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { open } = useContextMenu();
    const { t } = useI18n();
    const { filename, path, size } = attrs();

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
        label: t("file.contextMenu.convertToPreview"),
        action: () => {
          const pos = props.getPos();
          const cmd = changeFileDisplayMode(pos, "preview");
          cmd(props.editor.state, props.editor.view.dispatch);
        },
      },
      { type: "divider" },
      {
        type: "item",
        icon: Download,
        label: t("file.contextMenu.downloadFile"),
        action: async () => {
          try {
            const app = props.editor.appView.app;
            if (app.attachmentStorage == null) return;
            const blob = await app.attachmentStorage.download(path);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          } catch (err) {
            showToast({
              title: t("file.contextMenu.downloadFile") + "失败",
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

  return (
    <div
      class="file-info"
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "12px",
        padding: "4px 8px",
        background: "var(--color-bg-muted)",
        "border-radius": "6px",
        border: "1px solid var(--border-color-muted)",
        margin: "4px 0",
        cursor: "pointer",
        "max-width": "400px",
      }}
      contentEditable={false}
    >
      <div
        class="file-icon"
        style={{
          "flex-shrink": 1,
          color: "var(--color-block-ref)",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
        }}
        innerHTML={iconSvg()}
      />

      <div class="file-details" style={{ flex: 1, "min-width": 0 }}>
        <div
          class="file-name"
          style={{
            "font-size": "var(--ui-font-size)",
            "font-weight": 500,
            color: "var(--menu-text)",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            "max-width": "150px",
          }}
        >
          {attrs().filename}
        </div>
        <div
          class="file-meta"
          style={{
            display: "flex",
            "align-items": "center",
            gap: "6px",
            "font-size": "var(--ui-font-size-small)",
            color: "var(--menu-text-muted)",
            "line-height": 1.4,
            "margin-bottom": "2px",
          }}
        >
          <span class="file-type">
            {getFileTypeText(getFileType(attrs().filename))}
          </span>
          <span class="file-separator" style={{ color: "var(--border-color)" }}>
            •
          </span>
          <span class="file-size">{formatFileSize(attrs().size)}</span>
        </div>
      </div>

      <div
        class="file-actions"
        style={{
          display: "flex",
          "align-items": "center",
          gap: "4px",
          "flex-shrink": 0,
          "margin-left": "auto",
        }}
      >
        <button
          class="file-action-btn preview-btn"
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            width: "24px",
            height: "24px",
            border: "none",
            background: "transparent",
            "border-radius": "4px",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
          onClick={onClickPreviewBtn}
        >
          <Eye size={14} />
        </button>
        <button
          class="file-action-btn more-btn"
          style={{
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            width: "24px",
            height: "24px",
            border: "none",
            background: "transparent",
            "border-radius": "4px",
            color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
          onClick={onClickMoreBtn}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
};

class FileExpandedViewAdapter implements NodeView {
  dom: HTMLDivElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const dom = document.createElement("div");
    this.dispose = render(
      () => (
        <FileExpandedView
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

export const fileExpandedNodeViewRenderer: NodeViewRenderer = (props) =>
  new FileExpandedViewAdapter(props);
