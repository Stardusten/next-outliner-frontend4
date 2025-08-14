import { Mark } from "@tiptap/core";

export const Code = Mark.create({
  name: "code",
  parseHTML() {
    return [{ tag: "code" }];
  },
  renderHTML() {
    return ["code", { spellcheck: false }, 0];
  },
});
