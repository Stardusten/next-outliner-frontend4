import { App } from "@/lib/app/app";
import { BlockId, SelectionInfo } from "@/lib/common/types";

export const useDialogs = (app: App) => {
  const _deleteBlockConfirm = app.deleteBlockConfirm;

  const openDeleteBlockConfirm = (
    blockId: BlockId,
    selection?: SelectionInfo
  ) => {
    _deleteBlockConfirm.openSignal[1](true);
    _deleteBlockConfirm.blockId = blockId;
    _deleteBlockConfirm.selection = selection;
  };

  return {
    _deleteBlockConfirm,
    openDeleteBlockConfirm,
  };
};
