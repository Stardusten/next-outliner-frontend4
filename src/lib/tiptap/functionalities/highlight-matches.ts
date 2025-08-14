import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { removeDiacritics } from "@/lib/app/index/tokenize";

const HIGHLIGHT_MATCHES_PLUGIN = "highlightMatches";
const HIGHLIGHT_TERMS_KEY = "highlightTerms";

export const HighlightMatches = Extension.create({
  name: HIGHLIGHT_MATCHES_PLUGIN,
  addOptions() {
    return {
      highlightClass: "highlight-keep",
      ignoreDiacritics: false,
    };
  },
  addProseMirrorPlugins() {
    const { highlightClass, ignoreDiacritics } = this.options;

    return [
      new Plugin({
        key: new PluginKey(HIGHLIGHT_MATCHES_PLUGIN),
        state: {
          init() {
            return [] as string[];
          },
          apply(tr, oldValue) {
            const terms = tr.getMeta(HIGHLIGHT_TERMS_KEY);
            if (terms != null) return terms;
            return oldValue;
          },
        },
        props: {
          decorations(state) {
            const terms = this.getState(state);
            if (!terms || terms.length === 0) return null;

            let index;
            const decorations: Decoration[] = [];
            state.doc.content.descendants((node, pos) => {
              if (!node.isText) return true;
              const str = ignoreDiacritics
                ? removeDiacritics(node.textContent.toLocaleLowerCase())
                : node.textContent.toLocaleLowerCase();
              for (const term of terms) {
                index = -1;
                while ((index = str.indexOf(term, index + 1)) != -1) {
                  const d = Decoration.inline(
                    pos + index,
                    pos + index + term.length,
                    {
                      class: highlightClass,
                    }
                  );
                  decorations.push(d);
                }
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
