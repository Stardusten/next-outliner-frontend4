import type { Frontiers } from "loro-crdt";
import { createRoot, createSignal, Signal, type Accessor } from "solid-js";
import type {
  BlockData,
  BlockDataInner,
  BlockId,
  BlockNode,
} from "../common/types";
import type { App, AppStep2 } from "./app";

type EnhancedBlockNode = BlockNode & {
  getTextContent: () => string;
  getPath: () => BlockId[] | null;
  getData: () => BlockDataInner | null;
  dispose: () => void;
};

type ReactiveBlockNodeInfo = {
  signal: Signal<EnhancedBlockNode | null>;
  dispose: () => void;
  refCount: number;
};

export function initBlockManageApis(app: AppStep2) {
  const ret = Object.assign(app, {
    reactiveBlockNodeMap: new Map<BlockId, ReactiveBlockNodeInfo>(),
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
    getReactiveBlockNode: (id: BlockId) => getReactiveBlockNode(ret, id),
  });

  app.on("tx-committed", (e) => {
    // 更新 reactiveBlockNode
    for (const op of e.executedOps) {
      if (op.type === "block:create") {
        const nodeInfo = ret.reactiveBlockNodeMap.get(op.blockId);
        if (nodeInfo) {
          const [, set] = nodeInfo.signal;
          const rawNode = app.tree.getNodeByID(op.blockId);
          if (!rawNode) set(null);
          else set(enhanceBlockNode(ret, rawNode));
        }
      } else if (op.type === "block:delete") {
        const nodeInfo = ret.reactiveBlockNodeMap.get(op.blockId);
        if (nodeInfo) {
          const [, set] = nodeInfo.signal;
          set(null);
        }
      } else if (op.type === "block:update") {
        const nodeInfo = ret.reactiveBlockNodeMap.get(op.blockId);
        if (nodeInfo) {
          const [, set] = nodeInfo.signal;
          const rawNode = app.tree.getNodeByID(op.blockId);
          if (!rawNode) set(null);
          else set(enhanceBlockNode(ret, rawNode));
        }
      } else if (op.type === "block:move") {
        // 旧 parent
        if (op.oldParent) {
          const nodeInfo = ret.reactiveBlockNodeMap.get(op.oldParent);
          if (nodeInfo) {
            const [, set] = nodeInfo.signal;
            const rawNode = app.tree.getNodeByID(op.oldParent);
            if (!rawNode) set(null);
            else set(enhanceBlockNode(ret, rawNode));
          }
        }
        // 新 parent
        if (op.parent) {
          const nodeInfo = ret.reactiveBlockNodeMap.get(op.parent);
          if (nodeInfo) {
            const [, set] = nodeInfo.signal;
            const rawNode = app.tree.getNodeByID(op.parent);
            if (!rawNode) set(null);
            else set(enhanceBlockNode(ret, rawNode));
          }
        }
        // 这个 block 自己
        {
          const nodeInfo = ret.reactiveBlockNodeMap.get(op.blockId);
          if (nodeInfo) {
            const [, set] = nodeInfo.signal;
            const rawNode = app.tree.getNodeByID(op.blockId);
            if (!rawNode) set(null);
            else set(enhanceBlockNode(ret, rawNode));
          }
        }
      }
    }
  });

  return ret;
}

const x = (() => (Math.random() > 0.5 ? 1 : null)) as Accessor<number | null>;
const y = x();

type AppWithBlockManageApis = AppStep2 & {
  reactiveBlockNodeMap: Map<BlockId, ReactiveBlockNodeInfo>;
  getBlockData: (
    id: BlockId,
    allowDeleted?: boolean,
    vv?: Frontiers
  ) => BlockDataInner | null;
};

function enhanceBlockNode(
  app: AppWithBlockManageApis,
  blockNode: BlockNode
): EnhancedBlockNode {
  const appRef = new WeakRef(app);
  return Object.assign(blockNode, {
    getTextContent: () => {
      const currApp = appRef.deref();
      if (!currApp) throw new Error("app is not alive");
      return (currApp as App).getTextContent(blockNode.id); // XXX
    },
    getPath: () => {
      const currApp = appRef.deref();
      if (!currApp) throw new Error("app is not alive");
      return getBlockPath(currApp, blockNode.id);
    },
    getData: () => blockNode.data.toJSON() as BlockDataInner | null,
    dispose: () => {
      const currApp = appRef.deref();
      if (!currApp) throw new Error("app is not alive");
      disposeReactiveBlockNode(currApp, blockNode.id);
    },
  });
}

function getReactiveBlockNode(app: AppWithBlockManageApis, id: BlockId) {
  let nodeInfo = app.reactiveBlockNodeMap.get(id);
  if (!nodeInfo) {
    let disposeRoot: (() => void) | null = null;
    const signal = createRoot((dispose) => {
      disposeRoot = dispose;
      const node = getBlockNode(app, id);
      return createSignal(node ? enhanceBlockNode(app, node) : null);
    });

    nodeInfo = {
      signal,
      dispose: disposeRoot!,
      refCount: 1,
    };
    app.reactiveBlockNodeMap.set(id, nodeInfo);
  } else {
    nodeInfo.refCount++;
  }
  return nodeInfo.signal[0] as Accessor<EnhancedBlockNode | null>;
}

function disposeReactiveBlockNode(app: AppWithBlockManageApis, id: BlockId) {
  const nodeInfo = app.reactiveBlockNodeMap.get(id);
  if (nodeInfo) {
    nodeInfo.refCount--;
    if (nodeInfo.refCount <= 0) {
      app.reactiveBlockNodeMap.delete(id);
      const [, set] = nodeInfo.signal;
      set(null);
      nodeInfo.dispose();
    }
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
