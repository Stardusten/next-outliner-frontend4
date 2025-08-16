import { Extension } from "@tiptap/core";
import { imeSpan } from "prosemirror-safari-ime-span";

const SAIRI_IME_SPAN_PLUGIN = "safariImeSpan";

export const SafariImeSpan = Extension.create({
  name: SAIRI_IME_SPAN_PLUGIN,
  addProseMirrorPlugins() {
    return [imeSpan];
  },
});
