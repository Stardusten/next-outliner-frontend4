import { blockRefViewRenderer } from "@/components/node-views/BlockRefView";
import { mergeAttributes, Node } from "@tiptap/core";

export const BlockRef = Node.create({
  name: "blockRef",
  group: "inline",
  inline: true,
  selectable: false,
  addAttributes() {
    return {
      blockId: { default: null },
      isTag: { default: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span.block-ref",
        getAttrs(dom: HTMLElement) {
          return {
            blockId: dom.dataset.blockId,
            isTag: dom.dataset.isTag === "true",
          };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      node.attrs.blockId,
    ];
  },
  addNodeView() {
    return blockRefViewRenderer;
  },
});
