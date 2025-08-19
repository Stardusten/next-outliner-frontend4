import { listItemNodeViewRenderer } from "@/components/node-views/ListItemView";
import { mergeAttributes, Node } from "@tiptap/core";

export const ListItem = Node.create({
  name: "listItem",
  group: "block",
  content: "paragraph | codeblock | search",
  addAttributes() {
    // 说明：这些属性都是 render only 的，不会被持久化
    // 因为看持久化的代码就知道不管是文本块、代码块还是搜索块
    // content 里存的都是 paragraph、codeblock、search、tag node
    // 节点的内容，list item 的属性是不持久化的
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
      // 块编号
      number: { default: null },
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
