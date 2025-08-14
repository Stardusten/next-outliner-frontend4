import { Extension } from "@tiptap/core";
import { EditableOutlineView } from "../../app-views/editable-outline/editable-outline";

const SELECTION_TRACKER = "selectionTracker";

export const FocusedBlockIdTracker = Extension.create({
  name: SELECTION_TRACKER,
  onSelectionUpdate({ editor }) {
    if (editor.appView instanceof EditableOutlineView) {
      const focusedBlockId = editor.appView.getFocusedBlockId();
      const [_, setFocusedBlockId] = editor.appView.focusedBlockId;
      setFocusedBlockId(focusedBlockId);
    }
  },
});
