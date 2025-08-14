import { Node } from "@tiptap/core";

export const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",
  renderHTML() {
    return ["p", 0];
  },
  parseHTML() {
    return [{ tag: "p" }];
  },
});
