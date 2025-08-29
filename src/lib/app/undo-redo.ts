import type { BlockId } from "../common/types/block";
import type { ViewParams } from "../common/types/app-view";
import type { AppStep11 } from "./app";
import type { TxExecutedOperation } from "./tx";

export type UndoRedoItem = {
  executedOps: TxExecutedOperation[];
  beforeSelection?: ViewParams;
  afterSelection?: ViewParams;
};

export function initUndoRedoManager(app: AppStep11) {
  const ret = Object.assign(app, {
    undoStack: [] as UndoRedoItem[],
    redoStack: [] as UndoRedoItem[],
    idMapping: {} as Record<BlockId, BlockId>,
  });

  app.on("tx-committed", (tx) => {
    if (tx.meta.origin === "undoRedo") return;
    ret.redoStack.length = 0;
    ret.undoStack.push({
      executedOps: tx.executedOps,
      beforeSelection: tx.meta.beforeViewParams,
      afterSelection: tx.meta.viewParams,
    });
  });

  return ret;
}

// 说明：canUndo、canRedo、undo、redo 方法在 editor 里面
