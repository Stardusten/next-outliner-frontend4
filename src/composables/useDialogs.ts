import { App } from "@/lib/app/app";
import { BlockId, SelectionInfo } from "@/lib/common/types";
import type { Node } from "@tiptap/pm/model";
import { batch } from "solid-js";

export const useDialogs = (app: App) => {
  const _deleteBlockConfirm = app.deleteBlockConfirm;
  const _imageRename = app.imageRename;

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

  return {
    _deleteBlockConfirm,
    _imageRename,
    openDeleteBlockConfirm,
    openImageRename,
  };
};
