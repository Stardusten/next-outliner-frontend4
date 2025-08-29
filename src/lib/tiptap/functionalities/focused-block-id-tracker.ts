import { Extension } from "@tiptap/core";
import { EditableOutlineView } from "../../app-views/editable-outline/editable-outline";
import { findCurrListItem } from "../../common/utils/tiptap";

const SELECTION_TRACKER = "selectionTracker";

export const FocusedBlockIdTracker = Extension.create({
  name: SELECTION_TRACKER,
  onSelectionUpdate({ editor }) {
    if (editor.appView instanceof EditableOutlineView) {
      const state = editor.state;
      const listItemInfo = findCurrListItem(state);
      const [_, setter] = editor.appView.lastFocusedBlockId;
      setter(listItemInfo?.node.attrs.blockId ?? null);
    }
  },
});
