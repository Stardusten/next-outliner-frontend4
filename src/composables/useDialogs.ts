import { BlockId, SelectionInfo } from "@/lib/common/types";
import { createSignal } from "solid-js";

const _deleteBlockConfirm = {
  openSignal: createSignal(false),
  blockId: null as BlockId | null,
  selection: undefined as SelectionInfo | undefined,
};

export const useDialogs = () => {
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
