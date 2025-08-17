import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import { clipboard } from "@/lib/common/clipboard";
import { BlockId } from "@/lib/common/types";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { NodeView } from "@tiptap/pm/view";
import { AtSign, Link } from "lucide-solid";
import { createMemo, createSignal, Signal } from "solid-js";
import { render } from "solid-js/web";
import { showToast } from "../ui/toast";

type BlockRefViewProps = {
  editor: Editor;
  blockId: BlockId;
  selected: boolean;
};

const BlockRefView = (props: BlockRefViewProps) => {
  const blockNode = createMemo(() => {
    const app = props.editor.appView.app;
    const getter = app.getReactiveBlockNode(props.blockId);
    return getter();
  });
  const isTag = () => blockNode()?.getData()?.type === "tag";
  const textContent = () => blockNode()?.getTextContent() ?? "";

  const tagColor = createMemo(() => {
    const data = blockNode()?.getData();
    if (!data || data.type !== "tag") return "";
    const schema = props.editor.appView.app.detachedSchema;
    try {
      const json = JSON.parse(data.content);
      const snode = schema.nodeFromJSON(json);
      return (snode.attrs?.color as string) || "";
    } catch {
      return "";
    }
  });

  const handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const { open } = useContextMenu();
    const { t } = useI18n();
    open(e, [
      {
        type: "item",
        label: t("blockRefContextMenu.editAlias"),
        icon: AtSign,
        action: () => {},
      },
      {
        type: "item",
        label: t("blockRefContextMenu.copyBlockRefId"),
        icon: Link,
        action: () => {
          clipboard.writeText(props.blockId);
          showToast({
            title: t("blockRefContextMenu.copyBlockRefIdSuccess"),
            variant: "success",
          });
        },
      },
    ]);
  };

  return (
    <span
      class="block-ref cursor-pointer leading-none transition-opacity"
      classList={{
        tag: isTag(),
        selected: props.selected,
        "outline-[1px] outline-offset-[1px]": props.selected,
        [`tag-color-${tagColor()}`]: isTag() && !!tagColor(),
      }}
      oncontextmenu={handleRightClick}
    >
      {isTag() ? "#" + textContent() : textContent()}
    </span>
  );
};

class BlockRefViewAdapter implements NodeView {
  dom: HTMLSpanElement;
  dispose: () => void;
  selected: Signal<boolean>; // TODO dispose it

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("span");
    this.selected = createSignal(false);
    this.dispose = render(
      () => (
        <BlockRefView
          editor={props.editor}
          blockId={props.node.attrs.blockId}
          selected={this.selected[0]()}
        />
      ),
      container
    );

    this.dom = container.firstChild as HTMLSpanElement;
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }

  selectNode() {
    const [_, setSelected] = this.selected;
    setSelected(true);
  }

  deselectNode() {
    const [_, setSelected] = this.selected;
    setSelected(false);
  }
}

export const blockRefViewRenderer: NodeViewRenderer = (props) =>
  new BlockRefViewAdapter(props);
