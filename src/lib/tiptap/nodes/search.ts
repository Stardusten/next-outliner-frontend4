import { searchViewRenderer } from "@/components/node-views/SearchView";
import { mergeAttributes, Node } from "@tiptap/core";

export type SearchAttrs = {
  query: string;
  showPath: boolean;
};

export const Search = Node.create({
  name: "search",
  group: "block",
  content: "inline*",
  addAttributes() {
    return {
      query: {},
      // 搜索的结果块是否显示路径
      showPath: { default: false },
      // undefined - 折叠的查询
      // "invalid" - 查询错误
      // number - 查询结果条数
      status: { isRequired: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.search",
        getAttrs: (dom: HTMLElement) => ({
          query: dom.dataset.query,
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", 0];
  },
  addNodeView() {
    return searchViewRenderer;
  },
});
