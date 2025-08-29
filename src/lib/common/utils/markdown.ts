import type { App } from "../../app/app";
import type { BlockId, BlockNode } from "../types/block";

export function toMarkdown(app: App, rootBlockIds: BlockId[]): string {
  const recur = (rootBlockNode: BlockNode, level: number) => {
    const textContent = app.getTextContent(rootBlockNode.id, true); // TODO 是否标签应该导出为 #tag
    lines.push("  ".repeat(level) + "- " + textContent);

    // 递归处理子节点
    for (const child of rootBlockNode.children() ?? []) {
      recur(child, level + 1);
    }
  };

  const lines: string[] = [];
  for (const rootBlockId of rootBlockIds) {
    const rootBlockNode = app.getBlockNode(rootBlockId);
    if (rootBlockNode == null) {
      throw new Error("Block not found: " + rootBlockId);
    }
    recur(rootBlockNode, 0);
  }
  return lines.join("\n");
}
