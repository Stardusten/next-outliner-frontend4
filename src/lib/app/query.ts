import { LoroTreeNode } from "loro-crdt";
import type { BlockId, BlockNode } from "../common/types";
import type { App } from "./app";

export function execQuery(app: App, query: string): BlockNode[] | Error {
  const toBlockNodes = (blockIds: BlockId[]) => {
    const res = <BlockNode[]>[];
    for (const blockId of blockIds) {
      const blockNode = app.getBlockNode(blockId);
      if (blockNode) res.push(blockNode);
    }
    return res;
  };

  const hasRefTo = (blockId: BlockId) => {
    const [getter, _] = app.getInRefs(blockId);
    return toBlockNodes([...getter()]);
  };

  const hasTagTo = (blockId: BlockId) => {
    const [getter, _] = app.getInTags(blockId);
    return toBlockNodes([...getter()]);
  };

  const hasRefOrTagTo = (blockId: BlockId) => {
    const [getter1, _1] = app.getInRefs(blockId);
    const [getter2, _2] = app.getInTags(blockId);
    return toBlockNodes([...getter1(), ...getter2()]);
  };

  const all = () => {
    return app.tree.getNodes();
  };

  const fuzzyMatch = (query: string, limit?: number) => {
    const res = app.searchBlocks(query, limit);
    return toBlockNodes(res);
  };

  try {
    const res = Function(
      "hasRefTo",
      "hasTagTo",
      "hasRefOrTagTo",
      "all",
      "fuzzyMatch",
      `"use strict"; return (${query})`
    )(hasRefTo, hasTagTo, hasRefOrTagTo, all, fuzzyMatch);
    if (!Array.isArray(res))
      throw new Error("Query result should be array of blockId");
    for (const elem of res) {
      if (!(elem instanceof LoroTreeNode))
        throw new Error("Query result should be array of blockId");
    }
    return res;
  } catch (err) {
    return err as Error;
  }
}
