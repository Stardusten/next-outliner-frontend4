import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { type CompletionStatus, EditableOutlineView } from "../../app-views/editable-outline/editable-outline";
import type { EditorView } from "@tiptap/pm/view";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";

/**
 * 检查当前状态是否应该显示补全
 */
function checkCompletionStatus(state: EditorState): CompletionStatus | null {
  const { selection } = state;
  const { $from } = selection;

  // 检查是否在文本节点中且光标不在选区中
  if (!selection.empty || !$from.parent.isTextblock) {
    return null;
  }

  // 获取光标位置前的文本
  const textBefore = $from.parent.textBetween(0, $from.parentOffset);

  // 检查是否有未完成的块引用模式 - 支持 [[ 和 【【 两种触发方式
  const blockRefMatch = textBefore.match(/(\[\[|【【)([^\]】]*?)$/);

  if (blockRefMatch) {
    return {
      from: $from.pos - blockRefMatch[0].length,
      to: $from.pos,
      query: blockRefMatch[2] || "",
      trigger: blockRefMatch[1] as "[[" | "【【",
      isTag: false,
    };
  }

  // 检查是否有未完成的标签模式 - 支持 # 触发方式
  const tagMatch = textBefore.match(/#([^\s#]*?)$/);

  if (tagMatch) {
    return {
      from: $from.pos - tagMatch[0].length,
      to: $from.pos,
      query: tagMatch[1] || "",
      trigger: "#",
      isTag: true,
    };
  }

  return null;
}

/**
 * 执行块引用补全
 * @param blockId - 要补全的块 ID
 * @param view - ProseMirror 编辑器视图
 * @returns 是否成功执行补全
 */
export function executeCompletion(blockId: string, view: EditorView): boolean {
  const state = view.state;
  const completionStatus = checkCompletionStatus(state);

  // 如果没有检测到补全状态，则不执行补全
  if (!completionStatus) {
    return false;
  }

  const { from, to, isTag } = completionStatus;
  const blockRefNode = state.schema.nodes.blockRef!.create({
    blockId,
    isTag: isTag || false,
  });
  const tr = state.tr.replaceWith(from, to, blockRefNode);
  view.dispatch(tr);
  return true;
}

const BLOCK_REF_COMPLETION_PLUGIN = "blockRefCompletion";

export const BlockRefCompletion = Extension.create({
  name: BLOCK_REF_COMPLETION_PLUGIN,
  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey(BLOCK_REF_COMPLETION_PLUGIN),
        state: {
          init(_, state) {
            const status = checkCompletionStatus(state);
            // editor.appView.eb.emit("completion", { status });
            return status;
          },
          apply(tr, val, _2, newState) {
            const completion = useBlockRefCompletion(editor.appView.app);
            const status = checkCompletionStatus(newState);
            completion.handleCompletionEvent(editor.appView, status);
            return status;
          },
        },
        view(view) {
          const handleCompositionEnd = () => {
            const completion = useBlockRefCompletion(editor.appView.app);
            const status = checkCompletionStatus(view.state);
            if (status) status.fromCompositionEnd = true;
            completion.handleCompletionEvent(editor.appView, status);
            return status;
          };
          view.dom.addEventListener("compositionend", handleCompositionEnd);

          return {
            destroy() {
              view.dom.removeEventListener(
                "compositionend",
                handleCompositionEnd
              );
            },
          };
        },
        props: {
          handleKeyDown(view, event) {
            const completion = useBlockRefCompletion(editor.appView.app);
            const state = this.getState(view.state);

            // 只在补全激活时处理键盘事件
            if (!state || editor.view.composing) return false;

            switch (event.key) {
              case "ArrowDown":
                event.preventDefault();
                completion.handleCompletionNext();
                return true;
              case "ArrowUp":
                event.preventDefault();
                completion.handleCompletionPrev();
                return true;
              case "Enter":
                event.preventDefault();
                completion.handleCompletionSelect(editor.appView);
                return true;
              case "Escape":
                event.preventDefault();
                completion.handleCompletionEvent(editor.appView, null);
                return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
