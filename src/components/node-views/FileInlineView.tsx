import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { Loader2, XCircle } from "lucide-solid";
import { createMemo, createSignal, Match, Signal, Switch } from "solid-js";
import { render } from "solid-js/web";
import { parseFileStatus } from "@/lib/tiptap/nodes/file";
import { useI18n } from "@/composables/useI18n";

type FileInlineViewProps = {
  editor: Editor;
  node: Node;
  selected: boolean;
};

const FileInlineView = (props: FileInlineViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const status = () => (props.node.attrs.status as string) ?? "uploaded";
  const statusParsed = createMemo(() => parseFileStatus(status()));

  const st = () => statusParsed();

  return (
    <span
      class="file-inline cursor-pointer text-[var(--color-block-ref)] rounded-sm leading-none"
      classList={{
        "outline-[1px] outline-offset-[1px]": props.selected,
      }}
      contentEditable={false}
    >
      <Switch>
        <Match when={st().type === "uploading"}>
          <Loader2 class="inline-block mr-1 h-[1em] w-[1em] animate-spin align-[-2px]" />
        </Match>
        <Match when={st().type === "failed"}>
          <XCircle class="inline-block mr-1 h-[1em] w-[1em] align-[-2px]" />
        </Match>
      </Switch>
      <span>{filename()}</span>
      <Switch>
        <Match when={st().type === "uploading"}>
          <span class="opacity-70">
            {t("file.inline.uploadingSuffix", { progress: st().progress ?? 0 })}
          </span>
        </Match>
        <Match when={st().type === "failed"}>
          <span class="opacity-70">{t("file.inline.failedSuffix")}</span>
        </Match>
      </Switch>
    </span>
  );
};

class FileInlineViewAdapter implements NodeView {
  dom: HTMLSpanElement;
  dispose: () => void;
  selected: Signal<boolean>;
  nodeSignal: Signal<Node>;

  constructor(props: NodeViewRendererProps) {
    this.dom = document.createElement("span");
    this.selected = createSignal(false);
    this.nodeSignal = createSignal<Node>(props.node);
    this.dispose = render(
      () => (
        <FileInlineView
          editor={props.editor}
          node={this.nodeSignal[0]()}
          selected={this.selected[0]()}
        />
      ),
      this.dom
    );
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }

  selectNode() {
    const [, setSelected] = this.selected;
    setSelected(true);
  }

  deselectNode() {
    const [, setSelected] = this.selected;
    setSelected(false);
  }

  update(node: Node) {
    const [getNode, setNode] = this.nodeSignal;
    if (node.type !== getNode().type) return false;
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

export const fileInlineViewRenderer: NodeViewRenderer = (props) =>
  new FileInlineViewAdapter(props);
