import { Mark } from "@tiptap/core";

export const Bold = Mark.create({
  name: "bold",
  parseHTML() {
    return [
      { tag: "strong" },
      {
        tag: "b",
        getAttrs: (node: HTMLElement) =>
          node.style.fontWeight != "normal" && null,
      },
      { style: "font-weight=400", clearMark: (m) => m.type.name == "strong" },
      {
        style: "font-weight",
        getAttrs: (value: string) =>
          /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
      },
    ];
  },
  renderHTML() {
    return ["strong", 0];
  },
});
