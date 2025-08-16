import { useI18n } from "@/composables/useI18n";
import {
  changeFileDisplayMode,
  deleteFile,
  setImageWidth,
} from "@/lib/app-views/editable-outline/commands";
import { parseFileStatus } from "@/lib/tiptap/nodes/file";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import {
  createEffect,
  createMemo,
  createSignal,
  Match,
  Signal,
  Switch,
} from "solid-js";
import { render } from "solid-js/web";

import { ImageBox } from "./ImageBox";
import { StatusBox } from "./StatusBox";
import { Unsupported } from "./Unsupported";

type FilePreviewViewProps = {
  editor: Editor;
  node: Node;
  getPos: () => number;
};

const fileTypeToText = (
  t: (key: any, params?: any) => string,
  type: string
): string => {
  switch (type) {
    case "image":
      return t("file.typeText.image");
    case "video":
      return t("file.typeText.video");
    case "audio":
      return t("file.typeText.audio");
    case "text":
      return t("file.typeText.text");
    case "archive":
      return t("file.typeText.archive");
    default:
      return t("file.typeText.unknown");
  }
};

const FilePreviewView = (props: FilePreviewViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const type = () => (props.node.attrs.type as string) || "unknown";
  const status = createMemo(() => {
    const statusString = props.node.attrs.status as string;
    return parseFileStatus(statusString);
  });

  const handleConvertToInline = () => {
    const pos = props.getPos();
    const cmd = changeFileDisplayMode(pos, "inline");
    props.editor.appView.execCommand(cmd, true);
  };

  const handleConvertToCard = () => {
    const pos = props.getPos();
    const cmd = changeFileDisplayMode(pos, "expanded");
    props.editor.appView.execCommand(cmd, true);
  };

  const handleDelete = () => {
    const pos = props.getPos();
    const cmd = deleteFile(pos);
    props.editor.appView.execCommand(cmd, true);
  };

  const handleImageResize = (newWidth: number) => {
    const pos = props.getPos();
    const cmd = setImageWidth(pos, newWidth);
    props.editor.appView.execCommand(cmd, true);
  };

  const showStatusBox = () =>
    status().type === "uploading" || status().type === "failed";
  const showImageBox = () => type() === "image" && status().type === "uploaded";

  return (
    <Switch fallback={<Unsupported typeText={fileTypeToText(t, type())} />}>
      <Match when={showStatusBox()}>
        <StatusBox filename={filename()} status={status()} />
      </Match>
      <Match when={showImageBox()}>
        <ImageBox
          app={props.editor.appView.app}
          node={props.node}
          convertToInline={handleConvertToInline}
          convertToCard={handleConvertToCard}
          deleteImage={handleDelete}
          resizeImage={handleImageResize}
        />
      </Match>
    </Switch>
  );
};

class FilePreviewViewAdapter implements NodeView {
  dom: HTMLElement;
  dispose: () => void;
  node: Signal<Node>;
  getPos: () => number;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("span");
    this.node = createSignal<Node>(props.node);
    this.getPos = props.getPos as () => number;
    this.dispose = render(
      () => (
        <FilePreviewView
          editor={props.editor}
          node={this.node[0]()}
          getPos={this.getPos}
        />
      ),
      container
    );

    this.dom = container; // no firstChild for reactivity
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }

  update(node: Node) {
    const [getNode, setNode] = this.node;
    const oldNode = getNode();
    if (node.attrs.type !== oldNode.attrs.type) return false;
    setNode(node);
    return true;
  }

  stopEvent(_e: Event) {
    return false;
  }

  ignoreMutation(_record: ViewMutationRecord) {
    return true;
  }
}

export const filePreviewViewRenderer: NodeViewRenderer = (props) =>
  new FilePreviewViewAdapter(props);
