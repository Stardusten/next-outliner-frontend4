import { contentNodeToStrAndType } from "@/lib/common/utils/tiptap";
import { LoroDoc, type LoroTree } from "loro-crdt";
import { nanoid } from "nanoid";
import { base64ToUint8Array, uint8ArrayToBase64 } from "../common/utils/bytes";
import { detachedSchema } from "../tiptap/schema";
import type { Persistence } from "./persistence";

export const BLOCKS_TREE_NAME = "blocks";

function getStateItemKey(docId: string): string {
  return `blocks-${docId}-state`;
}

function getUpdateItemKey(docId: string, updateId: string): string {
  return `blocks-${docId}-update-${updateId}`;
}

function isStateItemKey(key: string, docId: string): boolean {
  return key === getStateItemKey(docId);
}

function isUpdateItemKey(key: string, docId: string): boolean {
  return key.startsWith(`blocks-${docId}-update-`);
}

function readStorageData(docId: string): {
  state: Uint8Array | null;
  updates: Uint8Array[];
} {
  let state: Uint8Array | null = null;
  const updates: Uint8Array[] = [];

  for (const key of Object.keys(localStorage)) {
    if (isStateItemKey(key, docId)) {
      const value = localStorage.getItem(key)!;
      state = base64ToUint8Array(value);
    } else if (isUpdateItemKey(key, docId)) {
      const value = localStorage.getItem(key)!;
      updates.push(base64ToUint8Array(value));
    }
  }

  return { state, updates };
}

export function checkExistsLocalStorage(
  docId: string
): "valid" | "notFound" | "corrupted" {
  const { state, updates } = readStorageData(docId);

  if (state === null) {
    if (updates.length > 0) {
      return "corrupted"; // 有更新但没有状态，数据损坏
    }
    return "notFound"; // 没有状态也没有更新，未找到
  }

  try {
    // 尝试导入数据到 LoroDoc 中验证有效性
    const doc = new LoroDoc();
    doc.importBatch([state, ...updates]);

    // 检查是否有 blocks tree
    const tree = doc.getTree(BLOCKS_TREE_NAME);
    if (!tree) {
      return "corrupted"; // 没有 blocks tree，数据无效
    }

    return "valid"; // 导入成功且有必要的数据
  } catch (error) {
    return "corrupted"; // 导入过程出错，数据损坏
  }
}

export class LocalStoragePersistence implements Persistence {
  private docId: string;

  constructor(docId: string) {
    this.docId = docId;
  }

  private readStorageData(docId: string): {
    state: Uint8Array | null;
    updates: Uint8Array[];
  } {
    return readStorageData(docId);
  }

  getDocId(): string {
    return this.docId;
  }

  load(): [LoroDoc, LoroTree] {
    const { state, updates } = this.readStorageData(this.docId);

    if (state === null) {
      if (updates.length > 0) {
        throw new Error(
          `找到了文档 ${this.docId} 的更新，但找不到状态向量，怀疑文档数据损坏`
        );
      }
      // 创建一个空的文档
      const doc = new LoroDoc();
      const tree = doc.getTree(BLOCKS_TREE_NAME);

      const rootNode = tree.createNode();
      rootNode.data.set("type", "text");
      rootNode.data.set(
        "content",
        contentNodeToStrAndType(detachedSchema.nodes.paragraph.create()).content
      );
      rootNode.data.set("folded", false);
      this.writeState(this.docId, doc.export({ mode: "snapshot" })); // 写入初始状态

      return [doc, tree];
    }

    const doc = new LoroDoc();
    doc.importBatch([state, ...updates]);
    const tree = doc.getTree("blocks");
    return [doc, tree];
  }

  clear(): void {
    localStorage.removeItem(getStateItemKey(this.docId));
    for (const key of Object.keys(localStorage)) {
      if (isUpdateItemKey(key, this.docId)) {
        localStorage.removeItem(key);
      }
    }
  }

  writeUpdate(docId: string, update: Uint8Array): void {
    const updateId = nanoid();
    const key = getUpdateItemKey(docId, updateId);
    const value = uint8ArrayToBase64(update);
    localStorage.setItem(key, value);
  }

  writeState(docId: string, state: Uint8Array): void {
    const key = getStateItemKey(docId);
    const value = uint8ArrayToBase64(state);
    localStorage.setItem(key, value);
  }

  compact(docId: string): void {
    const stateKey = getStateItemKey(docId);
    const stateStr = localStorage.getItem(stateKey);
    if (!stateStr) throw new Error("state 不存在");
    const state = base64ToUint8Array(stateStr);

    const updates: Uint8Array[] = [];
    const updateKeys: string[] = [];
    for (const key of Object.keys(localStorage)) {
      if (isUpdateItemKey(key, docId)) {
        const value = localStorage.getItem(key)!;
        updates.push(base64ToUint8Array(value));
        updateKeys.push(key);
      }
    }

    // 如果没有更新需要压缩，直接返回
    if (updates.length === 0) {
      return;
    }

    const doc = new LoroDoc();
    // 先导入基础状态，再导入所有更新
    doc.importBatch([state, ...updates]);
    const newState = doc.export({ mode: "snapshot" });
    this.writeState(docId, newState);

    // 删除所有更新文件
    for (const key of updateKeys) {
      localStorage.removeItem(key);
    }
  }

  clearHistory(docId: string): void {
    const stateKey = getStateItemKey(docId);
    const stateStr = localStorage.getItem(stateKey);
    if (!stateStr) throw new Error("state 不存在");
    const state = base64ToUint8Array(stateStr);

    const updates: Uint8Array[] = [];
    const updateKeys: string[] = [];
    for (const key of Object.keys(localStorage)) {
      if (isUpdateItemKey(key, docId)) {
        const value = localStorage.getItem(key)!;
        updates.push(base64ToUint8Array(value));
        updateKeys.push(key);
      }
    }

    const doc = new LoroDoc();
    doc.importBatch([state, ...updates]);
    const newState = doc.export({
      mode: "shallow-snapshot",
      frontiers: doc.frontiers(),
    });
    this.writeState(docId, newState);

    // 删除所有更新文件
    for (const key of updateKeys) {
      localStorage.removeItem(key);
    }
  }

  getStorageStats(docId: string) {
    let stateSize = 0;
    let updatesSize = 0;
    let updatesCount = 0;

    for (const key of Object.keys(localStorage)) {
      if (isStateItemKey(key, docId)) {
        stateSize = localStorage.getItem(key)?.length || 0;
      } else if (isUpdateItemKey(key, docId)) {
        updatesSize += localStorage.getItem(key)?.length || 0;
        updatesCount++;
      }
    }

    return {
      stateSize,
      updatesSize,
      updatesCount,
      totalSize: stateSize + updatesSize,
    };
  }
}
