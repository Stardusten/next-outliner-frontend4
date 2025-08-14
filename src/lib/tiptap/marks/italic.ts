import { Mark } from "@tiptap/core";

export const Italic = Mark.create({
  name: "italic",
  parseHTML() {
    return [
      { tag: "i" },
      { tag: "em" },
      { style: "font-style=italic" },
      { style: "font-style=normal", clearMark: (m) => m.type.name == "em" },
    ];
  },
  renderHTML() {
    return ["em", 0];
  },
});
