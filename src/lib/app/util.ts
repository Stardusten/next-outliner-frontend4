import type { BlockId } from "@/lib/common/types";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { BlockRef } from "../tiptap/nodes/block-ref";

export function uint8ArrayToBase64(array: Uint8Array): string {
  // 分块处理大数组，避免栈溢出
  const CHUNK_SIZE = 8192; // 8KB chunks
  let binary = "";

  for (let i = 0; i < array.length; i += CHUNK_SIZE) {
    const chunk = array.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(
    atob(base64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

/**
 * 从一个块的 ProseMirror 节点中获取所有块引用
 */
export function getBlockRefs(
  node: ProseMirrorNode,
  isTag?: boolean
): BlockId[] {
  const res: BlockId[] = [];
  node.descendants((node) => {
    if (node.type.name === BlockRef.name) {
      if (
        isTag === undefined ||
        (isTag === true && node.attrs.isTag === true) ||
        (isTag === false && node.attrs.isTag === false)
      ) {
        const blockId = node.attrs.blockId;
        blockId && res.push(blockId);
      } else {
        return false;
      }
    }
  });
  return res;
}
