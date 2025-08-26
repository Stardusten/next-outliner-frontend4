import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditableOutlineView } from "../../app-views/editable-outline/editable-outline";

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
              if (editor.appView instanceof EditableOutlineView) {
                editor.appView.deferredContentSyncTask?.();
              }
            },
          },
        },
      }),
    ];
  },
});
