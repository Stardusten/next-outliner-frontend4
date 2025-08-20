import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const SELECT_NODE_VIEW = "select-node-view";

/**
 * ProseMirror NodeView 默认无法与选区交互 —— 就算选区包含一个 NodeView
 * 也不会显示被选中的样式。这个插件在选区改变时，使用 Decoration 给选区内
 * 所有 blockRef 加上 selected class
 */
export const SelectNodeView = Extension.create({
  name: SELECT_NODE_VIEW,
  addProseMirrorPlugins() {
    const plugin: Plugin<DecorationSet> = new Plugin({
      key: new PluginKey(SELECT_NODE_VIEW),
      state: {
        init() {
          return DecorationSet.empty;
        },
        apply(tr) {
          const schema = tr.doc.type.schema;
          const blockRefType = schema.nodes.blockRef!;

          const sel = tr.selection;

          if (sel.empty) return DecorationSet.empty;
          const decorations = <Decoration[]>[];
          tr.doc.content.nodesBetween(sel.from, sel.to, (node, pos) => {
            if (node.type.name === blockRefType.name) {
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: "selected",
                })
              );
            }
          });
          return DecorationSet.create(tr.doc, decorations);
        },
      },
      props: {
        decorations(state) {
          return plugin.getState(state);
        },
      },
    });
    return [plugin];
  },
});
