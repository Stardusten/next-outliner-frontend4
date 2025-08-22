import type { LoroMap, LoroTreeNode, TreeID, VersionVector } from "loro-crdt";

export type BlockId = TreeID;

export type BlockNode = LoroTreeNode;

export type BlocksVersion = VersionVector;

export type BlockType = "text" | "code" | "search" | "tag";

export const numberFormats = [
  "1.",
  "1)",
  "(1)",
  "a.",
  "a)",
  "(a)",
  "I.",
  "I)",
  "(I)",
  "i.",
  "i)",
  "(i)",
  "一、",
  "(一)",
] as const;

export type NumberFormat = (typeof numberFormats)[number];

export type BlockDataInner = {
  folded: boolean;
  type: BlockType;
  content: string;
  vo?: ViewOptions;
};

export type ViewOptions = {
  number?: string;
  paragraph?: boolean;
};

export type BlockData = LoroMap<BlockDataInner>;

export type SelectionInfo = {
  viewId: string;
  blockId: BlockId;
  anchor: number;
  head?: number;
  scrollIntoView?: boolean;
  highlight?: boolean;
};
