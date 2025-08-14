import type { NodeViewRenderer } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { NodeView } from "@tiptap/pm/view";
import { FastListItem } from "../../nodes/fast-list-item";

// - list-item-content
class FastListItemNodeView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  constructor(node: ProseMirrorNode) {
    if (node.type.name !== FastListItem.name) {
      throw new Error("impossible. list item nodeview get a node" + node);
    }

    const containerEl = document.createElement("div");
    containerEl.classList.add("list-item-x");
    containerEl.dataset.level = node.attrs.level;
    containerEl.dataset.blockId = node.attrs.blockId;
    containerEl.dataset.folded = String(node.attrs.folded);
    containerEl.dataset.type = node.attrs.type;

    const contentEl = document.createElement("div");
    contentEl.classList.add("list-item-content");
    containerEl.appendChild(contentEl);

    this.dom = containerEl;
    this.contentDOM = contentEl;
  }

  destroy() {
    this.dom.remove();
  }
}

export const fastListItemNodeViewRenderer: NodeViewRenderer = (props) => {
  return new FastListItemNodeView(props.node);
};
