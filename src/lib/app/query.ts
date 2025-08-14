import type { BlockId } from "../common/types";
import type { App } from "./app";

export function execQuery(app: App, query: string): BlockId[] | Error {
  const hasRefTo = (blockId: BlockId) => {
    const [get, _] = app.getInRefs(blockId);
    return [...get()];
  };

  const hasTagTo = (blockId: BlockId) => {
    const [get, _] = app.getInTags(blockId);
    return [...get()];
  };

  const hasRefOrTagTo = (blockId: BlockId) => {
    const [get1, _1] = app.getInRefs(blockId);
    const [get2, _2] = app.getInTags(blockId);
    return [...get1(), ...get2()];
  };

  const all = () => {
    return app.tree.getNodes().map((node) => node.id);
  };

  const fuzzyMatch = (query: string, limit?: number) => {
    const res = app.searchBlocks(query, limit);
    return res;
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
      if (typeof elem != "string")
        throw new Error("Query result should be array of blockId");
    }
    return res;
  } catch (err) {
    return err as Error;
  }
}
