import { EditableOutlineView } from "../app-views/editable-outline/editable-outline";
import { AsyncTaskQueue } from "../common/taskQueue";
import type { BlockDataInner, BlockId, SelectionInfo } from "../common/types";
import type { AppStep10 } from "./app";

export type TxExecutedOperation =
  | {
      type: "block:create";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      data: BlockDataInner;
    }
  | {
      type: "block:delete";
      blockId: BlockId;
      oldData: BlockDataInner;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:move";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
      oldParent: BlockId | null;
      oldIndex: number;
    }
  | {
      type: "block:update";
      blockId: BlockId;
      newData: BlockDataInner;
      oldData: BlockDataInner;
    };

export type TxOpParams =
  | {
      type: "block:create";
      parent: BlockId | null;
      index: number;
      data: BlockDataInner;
      tempId: BlockId;
    }
  | {
      type: "block:delete";
      blockId: BlockId;
    }
  | {
      type: "block:move";
      blockId: BlockId;
      parent: BlockId | null;
      index: number;
    }
  | {
      type: "block:update";
      blockId: BlockId;
      patch: Partial<BlockDataInner>;
    };

export type TxMeta = {
  origin: string;
  beforeSelection?: SelectionInfo;
  selection?: SelectionInfo;
};

export type TxStatus = "notCommit" | "pending" | "committed" | "rollbacked";

export type Transaction = {
  ops: TxOpParams[];
  executedOps: TxExecutedOperation[];
  meta: TxMeta;
  status: TxStatus;
};

export type TxObj = {
  getStatus(): TxStatus;
  createBlockUnder: (
    parent: BlockId | null,
    index: number,
    data: BlockDataInner
  ) => BlockId;
  deleteBlock: (blockId: BlockId) => void;
  moveBlock: (blockId: BlockId, parent: BlockId | null, index: number) => void;
  updateBlock: (blockId: BlockId, newData: Partial<BlockDataInner>) => void;
  setBeforeSelection: (selection: SelectionInfo) => void;
  setSelection: (selection: SelectionInfo) => void;
  setOrigin: (origin: string) => void;
  getIndex: (blockId: BlockId) => number | null;
  getChildrenIds: (blockId: BlockId | null) => BlockId[];
  getDescendants: (blockId: BlockId) => BlockId[];
  getParentId: (blockId: BlockId) => BlockId | null;
  getBlockPath: (blockId: BlockId) => BlockId[] | null;
  getBlockData: (blockId: BlockId) => BlockDataInner | null;
  createBlockAfter: (baseId: BlockId, data: BlockDataInner) => BlockId;
  createBlockBefore: (baseId: BlockId, data: BlockDataInner) => BlockId;
};

type AppWithTx = AppStep10 & {
  txQueue: AsyncTaskQueue;
};

/**
 * 初始化事务管理器
 */
export function initTransactionManager(app: AppStep10) {
  const txQueue = new AsyncTaskQueue();
  const ret = Object.assign(app, {
    txQueue,
    withTx: (fn: (tx: TxObj) => void) => withTx(ret, fn),
  });
  return ret;
}

let tempIdCounter = 0;
function generateTempId(): BlockId {
  return `temp_${tempIdCounter++}` as BlockId;
}

function addCreateOpToTx(
  tx: Transaction,
  parent: BlockId | null,
  index: number,
  data: BlockDataInner
): BlockId {
  const op = {
    type: "block:create",
    parent,
    index,
    data,
    tempId: generateTempId(),
  } as const;
  tx.ops.push(op);
  return op.tempId;
}

function addDeleteOpToTx(tx: Transaction, blockId: BlockId) {
  const op = {
    type: "block:delete",
    blockId,
  } as const;
  tx.ops.push(op);
}

function addMoveOpToTx(
  tx: Transaction,
  blockId: BlockId,
  parent: BlockId | null,
  index: number
) {
  const op = {
    type: "block:move",
    blockId,
    parent,
    index,
  } as const;
  tx.ops.push(op);
}

function addUpdateOpToTx(
  tx: Transaction,
  blockId: BlockId,
  patch: Partial<BlockDataInner>
) {
  const op = {
    type: "block:update",
    blockId,
    patch,
  } as const;
  tx.ops.push(op);
}

function createBlockAfterToTx(
  app: AppWithTx,
  tx: Transaction,
  baseId: BlockId,
  data: BlockDataInner
) {
  const parentId = getParentIdFromTx(app, tx, baseId);
  const index = getIndexFromTx(app, tx, baseId)!;
  return addCreateOpToTx(tx, parentId, index + 1, data);
}

function createBlockBeforeToTx(
  app: AppWithTx,
  tx: Transaction,
  baseId: BlockId,
  data: BlockDataInner
) {
  const parentId = getParentIdFromTx(app, tx, baseId);
  const index = getIndexFromTx(app, tx, baseId)!;
  return addCreateOpToTx(tx, parentId, index, data);
}

function execTx(
  app: AppWithTx,
  tx: Transaction,
  idMapping: Record<BlockId, BlockId>
) {
  if (tx.status !== "notCommit")
    throw new Error(`Transaction already ${tx.status}`);
  tx.status = "pending";

  // 如果没有指定 beforeSelection，则记录当前选区到 meta.beforeSelection
  const editor = app.getLastFocusedAppView();
  const sel =
    editor instanceof EditableOutlineView ? editor.getSelectionInfo() : null;

  if (!tx.meta.beforeSelection) {
    sel && (tx.meta.beforeSelection = sel);
  }

  // 如果没有指定 selection，则记录当前选区到 meta.selection（保持选区不变）
  if (!tx.meta.selection) {
    sel && (tx.meta.selection = sel);
  }

  try {
    // 执行所有操作
    for (const op of tx.ops) {
      switch (op.type) {
        case "block:create": {
          const parentId = op.parent
            ? idMapping[op.parent] ?? op.parent
            : undefined;
          const newNode = app.tree.createNode(parentId, op.index);
          for (const [k, v] of Object.entries(op.data)) {
            newNode.data.set(k, v);
          }
          idMapping[op.tempId] = newNode.id;
          tx.executedOps.push({
            type: "block:create",
            blockId: newNode.id,
            parent: op.parent,
            index: op.index,
            data: op.data,
          });
          break;
        }

        case "block:delete": {
          const blockId = idMapping[op.blockId] ?? op.blockId;
          const oldBlockNode = app.tree.getNodeByID(blockId);
          if (!oldBlockNode) throw new Error(`要删除的块 ${blockId} 不存在`);
          const children = oldBlockNode.children() ?? [];
          if (children.length > 0)
            throw new Error(`要删除的块 ${blockId} 有子块，不能删除`);
          const oldData = oldBlockNode.data.toJSON() as BlockDataInner;
          const oldParent = oldBlockNode.parent()?.id ?? null;
          const oldIndex = oldBlockNode.index()!;
          app.tree.delete(blockId);
          tx.executedOps.push({
            type: "block:delete",
            blockId,
            oldData,
            oldParent,
            oldIndex,
          });
          break;
        }

        case "block:move": {
          const blockId = idMapping[op.blockId] ?? op.blockId;
          const blockNode = app.tree.getNodeByID(blockId);
          if (!blockNode) throw new Error(`要移动的块 ${blockId} 不存在`);
          const oldParent = blockNode.parent()?.id ?? null;
          const oldIndex = blockNode.index()!;
          const newParent = op.parent
            ? idMapping[op.parent] ?? op.parent
            : undefined;
          const newIndex = op.index;
          app.tree.move(blockId, newParent, newIndex);
          tx.executedOps.push({
            type: "block:move",
            blockId,
            parent: newParent ?? null,
            index: newIndex,
            oldParent,
            oldIndex,
          });
          break;
        }

        case "block:update": {
          const blockId = idMapping[op.blockId] ?? op.blockId;
          const blockNode = app.tree.getNodeByID(blockId);
          if (!blockNode) throw new Error(`要更新的块 ${blockId} 不存在`);
          const oldData = blockNode.data.toJSON() as BlockDataInner;
          // console.log("patch", op.patch);
          for (const [k, v] of Object.entries(op.patch)) {
            blockNode.data.set(k, v);
          }
          const newData = blockNode.data.toJSON() as BlockDataInner;
          tx.executedOps.push({
            type: "block:update",
            blockId,
            newData,
            oldData,
          });
          break;
        }
      }
    }

    // 提交到 loro doc
    app.doc.commit({ origin: tx.meta.origin });

    // 对 selection 应用 idMapping
    if (tx.meta.selection) {
      tx.meta.selection = {
        ...tx.meta.selection,
        blockId:
          idMapping[tx.meta.selection.blockId] ?? tx.meta.selection.blockId,
      };
    }

    // 对 beforeSelection 应用 idMapping
    if (tx.meta.beforeSelection) {
      tx.meta.beforeSelection = {
        ...tx.meta.beforeSelection,
        blockId:
          idMapping[tx.meta.beforeSelection.blockId] ??
          tx.meta.beforeSelection.blockId,
      };
    }

    // 发送事务完成事件
    setTimeout(() => {
      app.emit("tx-committed", {
        executedOps: tx.executedOps,
        meta: tx.meta,
      });
    });

    tx.status = "committed";
  } catch (err) {
    tx.status = "rollbacked";
    console.error("提交事务时出错： ", err);
    throw err; // TODO rollback
  }
}

function getBlockDataFromTx(app: AppWithTx, tx: Transaction, blockId: BlockId) {
  const blockNode = app.tree.getNodeByID(blockId) ?? null;
  let blockData = blockNode?.data.toJSON() as BlockDataInner | null;
  for (const op of tx.ops) {
    if (op.type === "block:create") {
      if (op.tempId === blockId) {
        if (blockData) throw new Error(`block ${blockId} 已经存在`);
        blockData = op.data;
      }
    } else if (op.type === "block:delete") {
      if (op.blockId === blockId) {
        if (!blockData) throw new Error(`block ${blockId} 不存在`);
        blockData = null;
      }
    } else if (op.type === "block:update") {
      if (op.blockId === blockId) {
        if (!blockData) throw new Error(`block ${blockId} 不存在`);
        blockData = { ...blockData, ...op.patch };
      }
    }
  }
  return blockData;
}

function getParentIdFromTx(app: AppWithTx, tx: Transaction, blockId: BlockId) {
  const blockNode = app.tree.getNodeByID(blockId) ?? null;
  let parentId = blockNode?.parent()?.id ?? null;
  for (const op of tx.ops) {
    if (op.type === "block:create") {
      if (op.tempId === blockId) {
        parentId = op.parent ?? null;
      }
    } else if (op.type === "block:delete") {
      if (op.blockId === parentId) {
        parentId = null;
      }
    } else if (op.type === "block:move") {
      if (op.blockId === blockId) {
        parentId = op.parent;
      }
    }
  }
  return parentId;
}

function getBlockPathFromTx(app: AppWithTx, tx: Transaction, blockId: BlockId) {
  const path: BlockId[] = [blockId];
  let curr = getParentIdFromTx(app, tx, blockId);

  while (curr !== null) {
    path.unshift(curr);
    curr = getParentIdFromTx(app, tx, curr);
  }

  return path;
}

/**
 * @deprecated
 */
export function getChildrenIdsFromTx(
  app: AppWithTx,
  tx: Transaction,
  blockId: BlockId | null
) {
  let childrenIds: BlockId[];
  if (blockId === null) {
    // 根层节点
    childrenIds = app.tree.roots().map((n) => n.id);
  } else {
    const baseNode = app.tree.getNodeByID(blockId);
    childrenIds = baseNode ? (baseNode.children() ?? []).map((n) => n.id) : [];
  }

  // 按顺序应用事务中的操作
  for (const op of tx.ops) {
    switch (op.type) {
      case "block:create": {
        if (op.parent === blockId) {
          const insertIdx = Math.min(op.index, childrenIds.length);
          childrenIds.splice(insertIdx, 0, op.tempId);
        }
        break;
      }
      case "block:delete": {
        const idx = childrenIds.indexOf(op.blockId);
        if (idx !== -1) childrenIds.splice(idx, 1);
        break;
      }
      case "block:move": {
        // 移除旧位置
        const removeIdx = childrenIds.indexOf(op.blockId);
        if (removeIdx !== -1) childrenIds.splice(removeIdx, 1);
        // 插入新位置（若新的父节点是当前 block）
        if (op.parent === blockId) {
          const insertIdx = Math.min(op.index, childrenIds.length);
          childrenIds.splice(insertIdx, 0, op.blockId);
        }
        break;
      }
      case "block:update":
        break;
    }
  }

  return childrenIds;
}

export function getDescendantsFromTx(
  app: AppWithTx,
  tx: Transaction,
  blockId: BlockId
) {
  const res: BlockId[] = [];
  const stack: BlockId[] = [];
  stack.push(blockId);
  res.push(blockId);
  while (stack.length > 0) {
    const curr = stack.pop()!;
    const children = getChildrenIdsFromTx(app, tx, curr);
    res.push(...children);
    stack.push(...children);
  }
  return res;
}

function getIndexFromTx(
  app: AppWithTx,
  tx: Transaction,
  blockId: BlockId
): number | null {
  // 如果该块在事务中被删除，直接返回 null
  for (const op of tx.ops) {
    if (op.type === "block:delete" && op.blockId === blockId) return null;
  }

  const parentId = getParentIdFromTx(app, tx, blockId);
  const siblings = getChildrenIdsFromTx(app, tx, parentId as BlockId | null);
  const idx = siblings.indexOf(blockId);
  return idx === -1 ? null : idx;
}

/**
 * @deprecated
 */
export async function withTx(app: AppWithTx, fn: (tx: TxObj) => void) {
  const idMapping: Record<BlockId, BlockId> = {};
  await app.txQueue.queueTaskAndWait(() => {
    const txObj = createTxObj(app);
    fn(txObj);
    execTx(app, txObj._tx, idMapping);
  });
  return { idMapping };
}

function createTxObj(app: AppWithTx): TxObj & { _tx: Transaction } {
  const tx: Transaction = {
    ops: [],
    executedOps: [],
    meta: { origin: "unknown" },
    status: "notCommit",
  };

  return {
    _tx: tx,
    getStatus: () => tx.status,
    createBlockUnder: (parent, index, data) =>
      addCreateOpToTx(tx, parent, index, data),
    deleteBlock: (blockId) => addDeleteOpToTx(tx, blockId),
    moveBlock: (blockId, parent, index) =>
      addMoveOpToTx(tx, blockId, parent, index),
    updateBlock: (blockId, newData) => addUpdateOpToTx(tx, blockId, newData),
    setBeforeSelection: (selection) => (tx.meta.beforeSelection = selection),
    setSelection: (selection) => (tx.meta.selection = selection),
    setOrigin: (origin) => (tx.meta.origin = origin),
    getBlockData: (blockId) => getBlockDataFromTx(app, tx, blockId),
    getParentId: (blockId) => getParentIdFromTx(app, tx, blockId),
    getChildrenIds: (blockId) => getChildrenIdsFromTx(app, tx, blockId),
    getDescendants: (blockId) => getDescendantsFromTx(app, tx, blockId),
    getBlockPath: (blockId) => getBlockPathFromTx(app, tx, blockId),
    getIndex: (blockId) => getIndexFromTx(app, tx, blockId),
    createBlockAfter: (baseId, data) =>
      createBlockAfterToTx(app, tx, baseId, data),
    createBlockBefore: (baseId, data) =>
      createBlockBeforeToTx(app, tx, baseId, data),
  };
}
