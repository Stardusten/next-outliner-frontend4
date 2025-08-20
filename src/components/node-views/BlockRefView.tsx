import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import { clipboard } from "@/lib/common/clipboard";
import { BlockId } from "@/lib/common/types";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { Decoration, NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { AtSign, Link } from "lucide-solid";
import { createMemo, createSignal, Signal } from "solid-js";
import { render } from "solid-js/web";
import { showToast } from "../ui/toast";
import { Node } from "@tiptap/pm/model";

type BlockRefViewProps = {
  editor: Editor;
  blockId: BlockId;
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

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    props.editor.appView.locateBlock(props.blockId);
  };

  const handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const { open } = useContextMenu(props.editor.appView.app);
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
      class="block-ref leading-none"
      classList={{
        tag: isTag(),
        [`tag-color-${tagColor()}`]: isTag() && !!tagColor(),
      }}
      onClick={handleClick}
      oncontextmenu={handleRightClick}
    >
      {isTag() ? "#" + textContent() : textContent()}
    </span>
  );
};

class BlockRefViewAdapter implements NodeView {
  dom: HTMLSpanElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("span");
    this.dispose = render(
      () => (
        <BlockRefView
          editor={props.editor}
          blockId={props.node.attrs.blockId}
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

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === "selection") console.log(mutation);
    return false;
  }
}

export const blockRefViewRenderer: NodeViewRenderer = (props) =>
  new BlockRefViewAdapter(props);
