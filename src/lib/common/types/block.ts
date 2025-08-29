import type { LoroMap, LoroTreeNode, TreeID, VersionVector } from "loro-crdt";
import { BlockField } from "./block-field";

export type ViewOptions = {
  number?: string;
  paragraph?: boolean;
};

export type BlockDataInner = {
  folded: boolean;
  type: BlockType;
  content: string;
  vo?: ViewOptions;
  fields?: Record<string, BlockField>;
  fieldValues?: Record<string, any>;
};

export type BlockData = LoroMap<BlockDataInner>;
export type BlockId = TreeID;
export type BlockNode = LoroTreeNode;
export type BlocksVersion = VersionVector;
export type BlockType = "text" | "code" | "search" | "tag";
