import type { BlockId } from "@/lib/common/types";
import { createSignal, type Accessor, type Setter } from "solid-js";
import type { AppStep4 } from "../app";

type Signal<T> = [Accessor<T>, Setter<T>];
type TextContentCacheItem = readonly [string, string];

export function initTextContent(app: AppStep4) {
  const textContentCache = new Map<BlockId, TextContentCacheItem>();

  const ret = Object.assign(app, {
    textContentCache,
    invalidateTextContent: (blockId?: BlockId) =>
      invalidateTextContent(ret, blockId),
    getTextContent: (id: BlockId, withTag?: boolean) => {
      if (withTag) return getTextContentImpl(ret, id)[0];
      else return getTextContentImpl(ret, id)[1];
    },
  });

  /**
   * 注册一个监听器，当一个块内容更新时
   * 1. 触发文本内容缓存失效
   * 2. 更新对应 ref，如果有
   */
  app.on("tx-committed", (e) => {
    for (const change of e.executedOps) {
      if (change.type === "block:update") {
        ret.invalidateTextContent(change.blockId);
      }
    }
  });

  return ret;
}

type AppWithTextContent = AppStep4 & {
  textContentCache: Map<BlockId, TextContentCacheItem>;
};

function getTextContentImpl(
  app: AppWithTextContent,
  id: BlockId,
  visited?: Set<BlockId>
): TextContentCacheItem {
  // 用于记录已访问的块，避免循环引用
  visited ??= new Set<BlockId>();
  loadTextContentToCache(app, id, visited);
  const res = app.textContentCache.get(id);
  if (!res) return [id, id]; // 如果缓存中没有，则返回块ID
  return res;
}

/**
 * 缓存失效方法，用于触发文本内容缓存失效
 * @deprecated
 */
export function invalidateTextContent(
  app: AppWithTextContent,
  blockId?: BlockId
): void {
  invalidateTextContentCache(app, blockId);
}

/**
 * 让一个块的文本内容缓存失效，注意这同时会递归地
 * 所有引用了这个块的块的文本内容缓存失效
 */
function invalidateTextContentCache(
  app: AppWithTextContent,
  blockId?: BlockId
): void {
  if (blockId) {
    const [getInRefs] = app.getInRefs(blockId);
    for (const ref of getInRefs()) {
      invalidateTextContentCache(app, ref); // 递归
    }
    app.textContentCache.delete(blockId);
  } else {
    app.textContentCache.clear();
  }
}

function loadTextContentToCache(
  app: AppWithTextContent,
  blockId: BlockId,
  visited: Set<BlockId>
): void {
  if (visited.has(blockId)) return;
  visited.add(blockId);

  const schema = app.detachedSchema;
  const blockRefType = schema.nodes.blockRef!.name;

  if (app.textContentCache.has(blockId)) return;

  const blockData = app.getBlockData(blockId);
  if (!blockData) return;

  const nodeJson = JSON.parse(blockData.content);
  const node = schema.nodeFromJSON(nodeJson);

  const arrWithTag: string[] = [];
  const arrWithoutTag: string[] = [];
  node.content.descendants((currNode) => {
    if (currNode.isText) {
      const text = currNode.text ?? "";
      arrWithTag.push(text);
      arrWithoutTag.push(text);
    } else if (currNode.type.name === blockRefType) {
      const blockId = currNode.attrs.blockId;
      const [contentWithTag, contentWithoutTag] = getTextContentImpl(
        app,
        blockId,
        visited
      );
      if (currNode.attrs.isTag) {
        arrWithTag.push("#" + contentWithTag);
      } else {
        arrWithTag.push("[[" + contentWithTag + "]]");
        arrWithoutTag.push("[[" + contentWithoutTag + "]]");
      }
    }
  });

  const res = [
    arrWithTag.join("").trim(),
    arrWithoutTag.join("").trim(),
  ] as const;
  // console.log(res);
  app.textContentCache.set(blockId, res);
}
