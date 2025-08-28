import { App } from "@/lib/app/app";
import { BlockId, SelectionInfo } from "@/lib/common/types";
import type { Node } from "@tiptap/pm/model";
import { batch } from "solid-js";
import type { TagAttrs } from "@/lib/tiptap/nodes/tag";

export const useDialogs = (app: App) => {
  const _deleteBlockConfirm = app.deleteBlockConfirm;
  const _imageRename = app.imageRename;
  const _tagEditor = app.tagEditor;
  const _blockPropertiesDialog = app.blockPropertiesDialog;

  const openDeleteBlockConfirm = (
    blockId: BlockId,
    selection?: SelectionInfo
  ) => {
    batch(() => {
      _deleteBlockConfirm.openSignal[1](true);
      _deleteBlockConfirm.blockId = blockId;
      _deleteBlockConfirm.selection = selection;
    });
  };

  const openImageRename = (
    currentName: string,
    handleRename: (newName: string) => void
  ) => {
    batch(() => {
      _imageRename.openSignal[1](true);
      _imageRename.currentName = currentName;
      _imageRename.handleRename = handleRename;
    });
  };

  const openTagEditor = (blockId: BlockId, attrs: TagAttrs) => {
    batch(() => {
      _tagEditor.openSignal[1](true);
      _tagEditor.blockId = blockId;
      _tagEditor.attrs = attrs;
    });
  };

  const openBlockPropertiesDialog = (blockId: BlockId) => {
    _blockPropertiesDialog.blockId = blockId;
    _blockPropertiesDialog.openSignal[1](true);
  };

  return {
    _deleteBlockConfirm,
    _imageRename,
    _tagEditor,
    _blockPropertiesDialog,
    openDeleteBlockConfirm,
    openImageRename,
    openTagEditor,
    openBlockPropertiesDialog,
  };
};
