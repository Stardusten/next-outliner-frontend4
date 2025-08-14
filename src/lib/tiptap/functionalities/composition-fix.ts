import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const COMPOSITION_FIX_PLUGIN = "compositionFix";

export const CompositionFix = Extension.create({
  name: COMPOSITION_FIX_PLUGIN,
  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey(COMPOSITION_FIX_PLUGIN),
        props: {
          handleDOMEvents: {
            compositionend: (e) => {
              editor.appView.deferredContentSyncTask?.();
            },
          },
        },
      }),
    ];
  },
});
