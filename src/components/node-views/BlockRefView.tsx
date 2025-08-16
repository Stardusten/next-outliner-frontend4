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

  const tagColorClasses = createMemo(() => {
    const base = "px-1.5 py-[1px] rounded-md ";
    const map: Record<string, string> = {
      magenta: `${base} bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-600/20 dark:text-fuchsia-300`,
      orange: `${base} bg-orange-50 text-orange-600 dark:bg-orange-600/20 dark:text-orange-300`,
      amber: `${base} bg-amber-50 text-amber-600 dark:bg-amber-600/20 dark:text-amber-300`,
      yellow: `${base} bg-yellow-50 text-yellow-600 dark:bg-yellow-600/20 dark:text-yellow-300`,
      lime: `${base} bg-lime-50 text-lime-600 dark:bg-lime-600/20 dark:text-lime-300`,
      green: `${base} bg-emerald-50 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-300`,
      teal: `${base} bg-teal-50 text-teal-600 dark:bg-teal-600/20 dark:text-teal-300`,
      blue: `${base} bg-blue-50 text-blue-600 dark:bg-blue-600/20 dark:text-blue-300`,
      indigo: `${base} bg-indigo-50 text-indigo-600 dark:bg-indigo-600/20 dark:text-indigo-300`,
      violet: `${base} bg-violet-50 text-violet-600 dark:bg-violet-600/20 dark:text-violet-300`,
      pink: `${base} bg-pink-50 text-pink-600 dark:bg-pink-600/20 dark:text-pink-300`,
    } as const;
    const color = tagColor() || "blue";
    return map[color] ?? (map.blue as string);
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
      class="block-ref cursor-pointer text-[var(--color-block-ref)] rounded-sm leading-none"
      classList={{
        "text-[length:var(--tag-font-size)] opacity-80 hover:opacity-100 transition-opacity":
          isTag(),
        [tagColorClasses()]: isTag(),
        "outline-[1px] outline-offset-[1px]": props.selected,
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
