import { chainCommands, toggleMark } from "@tiptap/pm/commands";
import { keymap } from "@tiptap/pm/keymap";
import type { Command, EditorState } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import {
  addToBlockClipboard,
  backspaceAfterCharBeforeExpandedFile,
  codeblockIndent,
  codeblockInsertLineBreak,
  codeblockMoveToLineEnd,
  codeblockMoveToLineStart,
  codeblockOutdent,
  codeblockSelectAll,
  copyBlockRef,
  deleteBeforeCharBeforeExpandedFile,
  deleteCharAfter,
  deleteCharBefore,
  deleteEmptyListItem,
  deleteSelected,
  demoteSelected,
  insertLineBreak,
  mergeWithPreviousBlock,
  moveBlockDown,
  moveBlockUp,
  promoteSelected,
  redoCommand,
  selectCurrentListItem,
  splitListItemText,
  toggleFoldState,
  convertToSearchBlock,
  undoCommand,
  splitListItemSpecial,
  stopOnListItemBegin,
  stopOnListItemEnd,
} from "../../../app-views/editable-outline/commands";
import { findCurrListItem } from "../../utils";

export const NormalKeymap = Extension.create({
  name: "normalKeymap",
  addProseMirrorPlugins() {
    const { editor } = this;
    const schema = editor.schema;

    const dispatchByBlockType =
      (cmds: Record<string, Command>) =>
      (state: EditorState, ...args: any[]) => {
        if (!editor.view) return false;
        const currListItem = findCurrListItem(state);
        if (currListItem == null) return false;

        const type = currListItem.node.attrs.type;
        let cmd = cmds[type];

        // 支持通配符 *
        if (cmd == null) cmd = cmds["*"];
        if (cmd == null) return false;
        return cmd(state, ...args);
      };

    const toggleFoldTrue = toggleFoldState(editor, true, undefined);
    const toggleFoldFalse = toggleFoldState(editor, false, undefined);

    return [
      keymap({
        Tab: dispatchByBlockType({
          text: chainCommands(demoteSelected(editor), stop),
          code: codeblockIndent(),
          tag: chainCommands(demoteSelected(editor), stop),
          search: chainCommands(demoteSelected(editor), stop),
        }),
        "Shift-Tab": dispatchByBlockType({
          text: chainCommands(promoteSelected(editor), stop),
          code: codeblockOutdent(),
          tag: chainCommands(promoteSelected(editor), stop),
          search: chainCommands(promoteSelected(editor), stop),
        }),
        Enter: dispatchByBlockType({
          text: chainCommands(splitListItemText(editor), stop),
          code: codeblockInsertLineBreak(),
          tag: chainCommands(splitListItemSpecial(editor), stop),
          search: chainCommands(splitListItemSpecial(editor), stop),
        }),
        Backspace: dispatchByBlockType({
          text: chainCommands(
            deleteEmptyListItem(editor),
            mergeWithPreviousBlock(editor),
            deleteSelected(),
            backspaceAfterCharBeforeExpandedFile(),
            stopOnListItemBegin()
          ),
          code: chainCommands(
            deleteEmptyListItem(editor),
            deleteSelected(),
            backspaceAfterCharBeforeExpandedFile(),
            stopOnListItemBegin()
          ),
          tag: chainCommands(
            deleteEmptyListItem(editor, "backward", true),
            stopOnListItemBegin()
          ),
          search: chainCommands(
            deleteEmptyListItem(editor, "backward", true),
            stopOnListItemBegin()
          ),
        }),
        Delete: dispatchByBlockType({
          text: chainCommands(
            deleteEmptyListItem(editor, "forward"),
            deleteSelected(),
            deleteBeforeCharBeforeExpandedFile(),
            stopOnListItemEnd()
          ),
          code: chainCommands(
            deleteEmptyListItem(editor),
            deleteSelected(),
            deleteBeforeCharBeforeExpandedFile(),
            stopOnListItemEnd()
          ),
          tag: chainCommands(
            deleteEmptyListItem(editor, "forward", true),
            stopOnListItemEnd()
          ),
          search: chainCommands(
            deleteEmptyListItem(editor, "forward", true),
            stopOnListItemEnd()
          ),
        }),
        "Mod-a": dispatchByBlockType({
          text: selectCurrentListItem(editor),
          code: codeblockSelectAll(editor),
          tag: selectCurrentListItem(editor),
          search: selectCurrentListItem(editor),
        }),
        "Mod-ArrowUp": chainCommands(toggleFoldTrue, stop),
        "Mod-ArrowDown": chainCommands(toggleFoldFalse, stop),
        "Alt-ArrowUp": chainCommands(moveBlockUp(editor), stop),
        "Alt-ArrowDown": chainCommands(moveBlockDown(editor), stop),
        "Mod-b": toggleMark(schema.marks.bold!),
        "Mod-i": toggleMark(schema.marks.italic!),
        "Mod-u": toggleMark(schema.marks.underline!),
        "Mod-`": toggleMark(schema.marks.code!),
        "Mod-Shift-l": copyBlockRef(editor),
        // 代码块中的行首/行尾导航
        Home: dispatchByBlockType({
          codeblock: codeblockMoveToLineStart(editor),
        }),
        End: dispatchByBlockType({
          codeblock: codeblockMoveToLineEnd(),
        }),
        "Shift-Enter": insertLineBreak(),
        "Mod-z": undoCommand(editor),
        "Mod-Shift-z": redoCommand(editor),
        "Mod-Shift-x": addToBlockClipboard(editor),
      }),
    ];
  },
});

const stop = () => true;
