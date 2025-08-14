import { Mark } from "@tiptap/core";

export const Underline = Mark.create({
  name: "underline",
  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration: underline" }];
  },
  renderHTML() {
    return ["u", 0];
  },
});
