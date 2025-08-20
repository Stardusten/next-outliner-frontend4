import { Extension } from "@tiptap/core";
import { inputRules, InputRule } from "@tiptap/pm/inputrules";
import { TextSelection } from "@tiptap/pm/state";
import { findCurrListItem } from "../utils";

const TO_CODEBLOCK = "to-codeblock";

export const ToCodeblock = Extension.create({
  name: TO_CODEBLOCK,
  addProseMirrorPlugins() {
    const schema = this.editor.schema;
    const codeblock = schema.nodes.codeblock!;

    return [
      inputRules({
        rules: [
          new InputRule(/^[·`]{3}([a-z]+) $/, (state, match) => {
            const currListItem = findCurrListItem(state);
            if (currListItem == null) return null;

            // 检查光标是否在列表项末尾
            const { $from } = state.selection;
            const paragraph = $from.parent;
            if ($from.parentOffset !== paragraph.content.size) return null;

            // 将 currentListItem 的内容换成空 codeblock
            let tr = state.tr;
            const lang = match[1];
            const codeblockNode = codeblock.create({ lang });

            // 更新列表项的类型为 code
            tr = tr.setNodeMarkup(currListItem.pos, null, {
              ...currListItem.node.attrs,
              type: "code",
            });

            // 替换内容为代码块
            tr = tr.replaceWith(
              currListItem.pos + 1,
              currListItem.pos + currListItem.node.nodeSize - 1,
              codeblockNode
            );

            // 将光标移动到代码块的第一个字符
            tr = tr.setSelection(
              TextSelection.create(tr.doc, currListItem.pos + 2)
            );

            return tr;
          }),
        ],
      }),
    ];
  },
});
