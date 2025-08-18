import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { nanoid } from "nanoid";

const HIGHLIGHT_EPHEMERAL = "highlight-ephemeral";
const HIGHLIGHT_EPHEMERAL_META_KEY = "highlight-ephemeral";

type HighlightEphemeralMeta =
  | {
      type: "add";
      pos: number;
      timeout: number;
    }
  | {
      type: "remove";
    };

export const HighlightEphemeral = Extension.create({
  name: HIGHLIGHT_EPHEMERAL,
  addProseMirrorPlugins() {
    let view: EditorView;
    const plugin: Plugin<DecorationSet> = new Plugin({
      view: (view_) => {
        view = view_;
        return {};
      },
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr, value) {
          if (tr.getMeta(HIGHLIGHT_EPHEMERAL_META_KEY)) {
            const meta = tr.getMeta(
              HIGHLIGHT_EPHEMERAL_META_KEY
            ) as HighlightEphemeralMeta;
            if (meta.type === "add") {
              const node = tr.doc.nodeAt(meta.pos);
              if (!node) return DecorationSet.empty;
              const deco = Decoration.node(meta.pos, meta.pos + node.nodeSize, {
                class: "highlighted",
              });
              setTimeout(() => {
                const tr = view.state.tr.setMeta(HIGHLIGHT_EPHEMERAL_META_KEY, {
                  type: "remove",
                });
                view.dispatch(tr);
              }, meta.timeout);
              return DecorationSet.create(tr.doc, [deco]);
            } else {
              return DecorationSet.empty;
            }
          } else {
            return value.map(tr.mapping, tr.doc);
          }
        },
      },
      props: {
        decorations(state) {
          const pluginState = plugin.getState(state);
          return pluginState;
        },
      },
    });
    return [plugin];
  },
});

export function addHighlightEphemeral(
  view: EditorView,
  pos: number,
  timeout: number
) {
  const tr = view.state.tr.setMeta(HIGHLIGHT_EPHEMERAL_META_KEY, {
    type: "add",
    pos,
    timeout,
  });
  view.dispatch(tr);
}
