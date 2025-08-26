import { Extension } from "@tiptap/core";
import { InputRule, inputRules } from "@tiptap/pm/inputrules";
import { contentNodeToStr, findCurrListItem } from "../utils";
import { BlockId } from "@/lib/common/types";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";

const TO_NUMBERED = "to-numbered";

export const ToNumbered = Extension.create({
  name: TO_NUMBERED,
  addProseMirrorPlugins() {
    const re =
      /^((?:\(|（)(?:[1-9]|10|[a-j]|[A-J]|I|II|III|IV|V|VI|VII|VIII|IX|X|i|ii|iii|iv|v|vi|vii|viii|ix|x|一|二|三|四|五|六|七|八|九|十)(?:\)|）)|(?:[1-9]|10|[a-j]|[A-J]|I|II|III|IV|V|VI|VII|VIII|IX|X|i|ii|iii|iv|v|vi|vii|viii|ix|x|一|二|三|四|五|六|七|八|九|十)[\.、]|-)\s/;

    return [
      inputRules({
        rules: [
          new InputRule(re, (state, match) => {
            const appView = this.editor.appView;
            if (!(appView instanceof EditableOutlineView)) return null;

            const currListItem = findCurrListItem(state);
            if (currListItem == null) return null;

            const type = currListItem.node.attrs.type;
            if (type !== "text") return null; // 仅允许对文本块编号

            const pNode = currListItem.node.firstChild!;
            const newContent = pNode.content.cut(match[1]!.length);
            const newPNode = pNode.copy(newContent);

            appView.app.withTx((tx) => {
              const blockId = currListItem.node.attrs.blockId as BlockId;
              const oldData = tx.getBlockData(blockId)!;
              // 如果匹配到 "- "，则清空编号，否则设置编号
              const number = match[1] === "-" ? undefined : match[1];
              tx.updateBlock(blockId, {
                content: contentNodeToStr(newPNode),
                vo: { ...(oldData.vo ?? {}), number },
              });
              tx.setSelection({
                viewId: appView.id,
                blockId,
                anchor: 0, // 光标重置到开头
              });
              tx.setOrigin("localEditorStructural");
            });

            return state.tr; // 返回一个空事务，阻止继续执行
          }),
        ],
      }),
    ];
  },
});
