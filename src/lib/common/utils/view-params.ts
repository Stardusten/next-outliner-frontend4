import { ViewParams } from "../types/app-view";
import { BlockId } from "../types/block";

export function applyIdMappingToViewParams(
  mapping: Record<BlockId, BlockId> | ((blockId: BlockId) => BlockId),
  viewParams: ViewParams
): ViewParams {
  if (viewParams.selection) {
    const sel = viewParams.selection;
    sel.blockId =
      typeof mapping === "function"
        ? mapping(sel.blockId)
        : mapping[sel.blockId] ?? sel.blockId;
  }
  if (viewParams.rootBlockIds) {
    const newRootBlockIds = <BlockId[]>[];
    for (const rootBlockId of viewParams.rootBlockIds) {
      newRootBlockIds.push(
        typeof mapping === "function"
          ? mapping(rootBlockId)
          : mapping[rootBlockId] ?? rootBlockId
      );
    }
    viewParams.rootBlockIds = newRootBlockIds;
  }
  return viewParams;
}
