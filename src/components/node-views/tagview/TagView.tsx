import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/composables/useI18n";
import { useDialogs } from "@/composables/useDialogs";
import type { BlockId } from "@/lib/common/types";
import type { TagAttrs } from "@/lib/tiptap/nodes/tag";
import type {
  Editor,
  NodeViewRenderer,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { Settings } from "lucide-solid";
import { createMemo } from "solid-js";
import { render } from "solid-js/web";

type ViewProps = {
  editor: Editor;
  node: ProseNode;
  getPos: () => number | undefined;
};

const TagView = (props: ViewProps) => {
  const { t } = useI18n();
  const { openTagEditor } = useDialogs(props.editor.appView.app);

  const blockId = createMemo<BlockId | null>(() => {
    const pos = props.getPos?.();
    if (pos === undefined) return null;
    const $pos = props.editor.view.state.doc.resolve(pos);
    const listItem = $pos.parent;
    return (listItem?.attrs as any).blockId ?? null;
  });

  const handleOpenSettings = () => {
    const id = blockId();
    if (!id) return;
    const attrs = props.node.attrs as TagAttrs;
    openTagEditor(id, attrs);
  };

  const handleClickPad = () => {
    const pos = props.getPos?.();
    if (pos === undefined) return;
    const tr = props.editor.view.state.tr;
    const $pos = props.editor.view.state.doc.resolve(pos + props.node.nodeSize);
    const end = TextSelection.findFrom($pos, -1);
    if (!end) return;
    tr.setSelection(end);
    props.editor.view.dispatch(tr);
  };

  return (
    <div
      class="tag inline-flex items-center"
      data-inherits={(props.node.attrs as any).inherits?.join?.(",") ?? ""}
      data-color={(props.node.attrs as any).color ?? ""}
      data-fields={JSON.stringify((props.node.attrs as any).fields ?? [])}
    >
      <span class="tag-content" />

      <div class="inline-flex gap-1 items-center ml-1" contentEditable={false}>
        <Tooltip>
          <TooltipTrigger
            as={(p: ButtonProps) => (
              <Button
                {...p}
                variant="secondary"
                size="2xs-icon"
                class="opacity-50 hover:opacity-100 transition-opacity"
                onClick={handleOpenSettings}
              >
                <Settings class="size-[12px]" />
              </Button>
            )}
          />
          <TooltipContent>{t("tag.settings")}</TooltipContent>
        </Tooltip>
      </div>

      <span
        class="cursor-text text-transparent"
        onClick={(e) => {
          e.preventDefault();
          handleClickPad();
        }}
        contentEditable={false}
      >
        &nbsp;
      </span>
    </div>
  );
};

class TagViewAdapter implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("div");
    this.dispose = render(
      () => (
        <TagView
          editor={props.editor}
          node={props.node}
          getPos={props.getPos as any}
        />
      ),
      container
    );
    this.dom = container.firstChild as HTMLDivElement;
    this.contentDOM = container.querySelector(".tag-content") as HTMLElement;
  }

  destroy(): void {
    this.dispose();
    this.dom.remove();
  }

  stopEvent(e: Event) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "tag-content")
    )
      return false;
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (
      mutation.target instanceof HTMLElement &&
      isDescendantOf(mutation.target, "tag-content")
    ) {
      return false;
    }
    return true;
  }
}

function isDescendantOf(el: HTMLElement, className: string) {
  let curr: HTMLElement | null = el;
  while (curr) {
    if (curr.classList.contains(className)) return true;
    curr = curr.parentElement;
  }
  return false;
}

export const tagViewRenderer: NodeViewRenderer = (props) =>
  new TagViewAdapter(props);

export default TagView;
