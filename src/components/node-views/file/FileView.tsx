import { Editor, NodeViewRenderer } from "@tiptap/core";
import { NodeViewRendererProps } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { createRoot, createSignal, Match, Signal, Switch } from "solid-js";
import { render } from "solid-js/web";
import { FilePreviewView } from "./FilePreviewView";
import { FileInlineView } from "./FileInlineView";

export type FileViewProps = {
  editor: Editor;
  node: Node;
  getPos: () => number;
  selected: boolean;
};

export const fileTypeToText = (
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

const Unsupported = () => {
  return <div>Unsupported</div>;
};

const FileView = (props: FileViewProps) => {
  return (
    <Switch fallback={<Unsupported />}>
      <Match when={props.node.attrs.displayMode === "preview"}>
        <FilePreviewView {...props} />
      </Match>
      <Match when={props.node.attrs.displayMode === "inline"}>
        <FileInlineView {...props} />
      </Match>
    </Switch>
  );
};

class FileViewAdapter implements NodeView {
  dom: HTMLElement;
  dispose: (() => void)[];
  node: Signal<Node>;
  selected: Signal<boolean>;
  getPos: () => number;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("div");
    this.getPos = props.getPos as () => number;
    const disposers = [];

    this.node = createRoot((dispose) => {
      const signal = createSignal<Node>(props.node);
      disposers.push(dispose);
      return signal;
    });

    this.selected = createRoot((dispose) => {
      const signal = createSignal(false);
      disposers.push(dispose);
      return signal;
    });

    const getNode = this.node[0];
    const getSelected = this.selected[0];
    const disposer = render(
      () => (
        <FileView
          editor={props.editor}
          node={getNode()}
          selected={getSelected()}
          getPos={this.getPos}
        />
      ),
      container
    );
    disposers.push(disposer);

    this.dispose = disposers;
    this.dom = container.firstChild as HTMLElement;
  }

  stopEvent() {
    return true;
  }

  ignoreMutation(e: ViewMutationRecord) {
    return true;
  }
}

export const fileViewRenderer: NodeViewRenderer = (props) =>
  new FileViewAdapter(props);
