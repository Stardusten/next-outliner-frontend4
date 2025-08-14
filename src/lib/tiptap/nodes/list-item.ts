import { listItemNodeViewRenderer } from "@/components/node-views/ListItemView";
import { mergeAttributes, Node } from "@tiptap/core";

export const ListItem = Node.create({
  name: "listItem",
  group: "block",
  content: "paragraph | codeblock | search",
  addAttributes() {
    return {
      // 列表项的层级
      level: { default: 0 },
      // 对应块的 ID
      blockId: { default: null },
      // 是否折叠
      folded: { default: false },
      // 是否有子块
      hasChildren: { default: false },
      // 类型
      type: { default: null },
      // 是否显示块路径
      showPath: { default: false },
      // 是否是搜索结果的根节点
      isSearchResultRoot: { default: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.list-item",
        getAttrs: (dom: HTMLElement) => ({
          level: parseInt(dom.dataset.level || "0", 10),
          blockId: dom.dataset.blockId,
          folded: dom.dataset.folded === "true",
          hasChildren: dom.dataset.hasChildren === "true",
          type: dom.dataset.type,
          isSearchResultRoot: dom.dataset.isSearchResultRoot === "true",
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
  addNodeView() {
    return listItemNodeViewRenderer;
  },
});
