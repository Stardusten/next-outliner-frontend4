import { Mark } from "@tiptap/core";

export const StrikeThrough = Mark.create({
  name: "strikethrough",
  parseHTML() {
    return [
      { tag: "s" },
      { tag: "del" },
      { style: "text-decoration: line-through" },
    ];
  },
  renderHTML() {
    return ["s", 0];
  },
});
