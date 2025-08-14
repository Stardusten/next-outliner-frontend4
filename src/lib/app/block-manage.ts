import type { Frontiers } from "loro-crdt";
import type {
  BlockData,
  BlockDataInner,
  BlockId,
  BlockNode,
} from "../common/types";
import type { AppStep2 } from "./app";
import { createSignal, type Accessor, type Setter } from "solid-js";

type Signal<T> = [Accessor<T>, Setter<T>];
type ReactiveBlockData = Signal<BlockDataInner | null>;

export function initBlockManageApis(app: AppStep2) {
  const ret = Object.assign(app, {
    reactiveBlockDataMap: new Map<BlockId, ReactiveBlockData>(),
    getRootBlockNodes: () => app.tree.roots(),
    getRootBlockIds: () => app.tree.roots().map((node) => node.id),
    getBlockNode: (id: BlockId, allowDeleted = false, vv?: Frontiers) =>
      getBlockNode(app, id, allowDeleted, vv),
    getBlockPath: (blockId: BlockId) => getBlockPath(app, blockId),
    getBlockDataMap: (id: BlockId, allowDeleted = false, vv?: Frontiers) =>
      getBlockDataMap(app, id, allowDeleted, vv),
    getBlockData: (id: BlockId, allowDeleted = false, vv?: Frontiers) =>
      getBlockData(app, id, allowDeleted, vv),
    getAllNodes: (withDeleted = false) => getAllNodes(app, withDeleted),
    getReactiveBlockData: (id: BlockId) => getReactiveBlockData(ret, id),
    disposeReactiveBlockData: (id: BlockId) =>
      disposeReactiveBlockData(ret, id),
  });

  app.on("tx-committed", (e) => {
    for (const op of e.executedOps) {
      if (op.type === "block:delete") {
        const blockDataRef = ret.reactiveBlockDataMap.get(op.blockId);
        if (blockDataRef) {
          const [, set] = blockDataRef;
          set(null);
        }
      } else if (op.type === "block:update") {
        const blockDataRef = ret.reactiveBlockDataMap.get(op.blockId);
        if (blockDataRef) {
          const [, set] = blockDataRef;
          set(op.newData);
        }
      }
    }
  });

  return ret;
}

type AppWithBlockManageApis = AppStep2 & {
  reactiveBlockDataMap: Map<BlockId, ReactiveBlockData>;
  getBlockData: (
    id: BlockId,
    allowDeleted?: boolean,
    vv?: Frontiers
  ) => BlockDataInner | null;
};

function getReactiveBlockData(app: AppWithBlockManageApis, id: BlockId) {
  let blockDataRef = app.reactiveBlockDataMap.get(id);
  if (!blockDataRef) {
    const data = app.getBlockData(id);
    blockDataRef = createSignal(data);
    app.reactiveBlockDataMap.set(id, blockDataRef);
  }
  return blockDataRef;
}

function disposeReactiveBlockData(app: AppWithBlockManageApis, id: BlockId) {
  const blockDataRef = app.reactiveBlockDataMap.get(id);
  if (blockDataRef) {
    app.reactiveBlockDataMap.delete(id);
    const [, set] = blockDataRef;
    set(null);
  }
}

/**
 * @deprecated
 * 请改用 `app.getRootBlockNodes()`
 */
export function getRootBlockNodes(app: AppStep2) {
  return app.tree.roots();
}

/**
 * @deprecated
 * 请改用 `app.getRootBlockIds()`
 */
export function getRootBlockIds(app: AppStep2) {
  return app.tree.roots().map((node) => node.id);
}

/**
 * @deprecated
 * 根据 ID 获取块节点
 * @param id 块 ID
 * @param allowDeleted 是否允许获取已删除的块
 */
export function getBlockNode(
  app: AppStep2,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
) {
  if (vv) {
    try {
      app.doc.checkout(vv);
      const node = app.tree.getNodeByID(id);
      if (!node || (!allowDeleted && node.isDeleted())) return null;
      return node;
    } finally {
      app.doc.checkoutToLatest();
    }
  } else {
    const node = app.tree.getNodeByID(id);
    if (!node || (!allowDeleted && node.isDeleted())) return null;
    return node;
  }
}

/**
 * 获取从根块到指定块的完整路径
 * @param blockId 目标块的 ID
 * @returns 返回从根块到目标块的完整路径数组，包含目标块本身。
 * 数组顺序是从根块开始，到目标块结束。如果块不存在则返回 null。
 * 例如: [rootId, parent2Id, parent1Id, blockId]
 */
/**
 * @deprecated 请改用 `app.getBlockPath(blockId)`
 */
export function getBlockPath(
  app: AppStep2,
  blockId: BlockId
): BlockId[] | null {
  const targetNode = getBlockNode(app, blockId);
  if (!targetNode) return null;

  // 从目标块向上遍历，收集所有祖先块的 ID
  const path: BlockId[] = [blockId];
  let curr = targetNode.parent();

  while (curr != null) {
    path.unshift(curr.id);
    curr = curr.parent();
  }

  return path;
}

/**
 * @deprecated 请改用 `app.getBlockDataMap(id, allowDeleted?, vv?)`
 */
export function getBlockDataMap(
  app: AppStep2,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
): BlockData | null {
  const node = getBlockNode(app, id, allowDeleted, vv);
  if (!node) return null;
  return node.data as BlockData;
}

/**
 * @deprecated 请改用 `app.getBlockData(id, allowDeleted?, vv?)`
 */
export function getBlockData(
  app: AppStep2,
  id: BlockId,
  allowDeleted = false,
  vv?: Frontiers
): BlockDataInner | null {
  const node = getBlockNode(app, id, allowDeleted, vv);
  if (!node) return null;
  return node.data.toJSON() as BlockDataInner;
}

/**
 * @deprecated 请改用 `app.getAllNodes(withDeleted?)`
 */
export function getAllNodes(app: AppStep2, withDeleted = false): BlockNode[] {
  return app.tree.getNodes({ withDeleted });
}
