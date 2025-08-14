import type { LoroDoc, LoroTree } from "loro-crdt";

/**
 * 一个 Persistence 实例负责一个 Doc 的持久化
 * Persistence 只管如何更新（写入 update 和 snapshot，都是 Uint8Array）
 */
export type Persistence = {
  /** 返回这个 Persistence 负责的 Doc ID */
  getDocId(): string;
  /** 从存储加载 LoroDoc */
  load(): [LoroDoc, LoroTree];
  /** 清空所有存储 */
  clear(): void;
  /** 写入更新 */
  writeUpdate(docId: string, update: Uint8Array): void;
  /** 写入状态（snapshot） */
  writeState(docId: string, state: Uint8Array): void;
  /** 执行压缩操作 */
  compact(docId: string): void;
  /** 清空操作记录（危险！） */
  clearHistory(docId: string): void;
  /** 获取存储统计信息 */
  getStorageStats(docId: string): {
    stateSize: number;
    updatesSize: number;
    updatesCount: number;
    totalSize: number;
  };
};
