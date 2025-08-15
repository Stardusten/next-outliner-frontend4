import { Node as PMNode } from "@tiptap/pm/model";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { NodeView } from "@tiptap/pm/view";
import { render } from "solid-js/web";
import { createMemo } from "solid-js";
import { useContextMenu } from "@/composables/useContextMenu";
import {
  fileIcon,
  getStatusIcon,
  parseFileStatus,
  getFileType,
  getFileTypeText,
  formatFileSize,
} from "@/lib/tiptap/nodes/file";
import { changeFileDisplayMode } from "@/lib/app-views/editable-outline/commands";
import { ArrowRight, Download, Info } from "lucide-solid";
import { useI18n } from "@/composables/useI18n";
import { showToast } from "@/components/ui/toast";

type FileInlineProps = {
  node: PMNode;
  editor: Editor;
  getPos: () => number;
};

const FileInlineView = (props: FileInlineProps) => {
  const attrs = () => props.node.attrs as any;

  const parsedStatus = createMemo(() => parseFileStatus(attrs().status));

  const textContent = createMemo(() => {
    const s = parsedStatus();
    if (s.type === "uploading") {
      return `${attrs().filename} (上传中 ${s.progress || 0}%)`;
    }
    if (s.type === "failed") {
      return `${attrs().filename} (上传失败)`;
    }
    return attrs().filename as string;
  });

  const iconSvg = createMemo(() => {
    const s = parsedStatus();
    if (s.type === "uploading" || s.type === "failed") {
      return getStatusIcon(s, 15);
    }
    return fileIcon(attrs().filename, attrs().type, 15);
  });

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { open } = useContextMenu();
    const { t } = useI18n();
    const { filename, path, size } = attrs();

    open(e, [
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
    <span
      class={`file-inline ${attrs().status}`}
      style={{ cursor: "pointer", "user-select": "none" }}
      onContextMenu={onContextMenu}
      contentEditable={false}
    >
      <span
        style={{
          display: "inline-block",
          transform: "translateY(1px)",
          "margin-right": "2px",
        }}
        innerHTML={iconSvg()}
      />
      <span>{textContent()}</span>
    </span>
  );
};

class FileInlineViewAdapter implements NodeView {
  dom: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const dom = document.createElement("span");
    this.dispose = render(
      () => (
        <FileInlineView
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

export const fileInlineNodeViewRenderer: NodeViewRenderer = (props) =>
  new FileInlineViewAdapter(props);
