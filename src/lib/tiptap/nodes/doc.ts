import { Node } from "@tiptap/core";

export const Doc = Node.create({
  name: "doc",
  topNode: true,
  // 其实应该是 listItem* 或者 fastListItem*
  // 但是我们可能不会导入 fastListItem
  // 这里就暂时写成 block* 吧
  content: "block*",
});
