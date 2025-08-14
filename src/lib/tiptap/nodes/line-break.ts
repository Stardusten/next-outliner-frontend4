import { Node } from "@tiptap/core";

export const LineBreak = Node.create({
  name: "lineBreak",
  group: "inline",
  inline: true,
  renderHTML() {
    return ["br"];
  },
  parseHTML() {
    return [{ tag: "br" }];
  },
});
