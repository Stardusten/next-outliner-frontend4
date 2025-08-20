import type { AppEvents } from "@/lib/app/app";
import type { TxExecutedOperation } from "@/lib/app/tx";
import { Node } from "@tiptap/pm/model";
import type { EditableOutlineView } from "../editable-outline";
import { FullRenderer } from "./full";
import { RenderOptions } from "./types";
import { Transaction } from "@tiptap/pm/state";

// 增量渲染器
export class Patcher {
  #view: EditableOutlineView;

  private constructor(view: EditableOutlineView) {
    this.#view = view;
  }

  static create(view: EditableOutlineView) {
    return new Patcher(view);
  }

  updateView(tx: AppEvents["tx-committed"]) {
    updateView(this.#view, tx);
  }
}

function updateView(view: EditableOutlineView, tx: AppEvents["tx-committed"]) {
  const hasMoreThanOneDeleteOp =
    tx.executedOps.filter((op) => op.type === "block:delete").length > 1;
  if (hasMoreThanOneDeleteOp) {
    throw new Error("More than one delete op, fallback to full update");
  }
  for (const op of tx.executedOps) {
    if (op.type === "block:create") {
      handleBlockCreateOp(
        view,
        op as TxExecutedOperation & { type: "block:create" }
      );
    } else if (op.type === "block:update") {
      handleBlockUpdateOp(
        view,
        op as TxExecutedOperation & { type: "block:update" }
      );
    } else if (op.type === "block:delete") {
      handleBlockDeleteOp(
        view,
        op as TxExecutedOperation & { type: "block:delete" }
      );
    } else if (op.type === "block:move") {
      handleBlockMoveOp(
        view,
        op as TxExecutedOperation & { type: "block:move" }
      );
    } else {
      throw new Error((op as any).type + " not implemented");
    }
  }
}

interface BlockPosition {
  pos: number;
  index: number;
}

interface ParentInfo {
  pos: number;
  index: number;
  level: number;
}

/**
 * 查找块的位置信息
 */
function findBlockPosition(
  content: readonly Node[],
  blockId: string
): BlockPosition | null {
  for (let i = 0, p = 0; i < content.length; i++) {
    const listItem = content[i]!;
    if (listItem.attrs.blockId === blockId) {
      return { pos: p, index: i };
    }
    p += listItem.nodeSize;
  }
  return null;
}

/**
 * 查找父块信息
 */
function findParentInfo(
  content: readonly Node[],
  parentId: string | null
): ParentInfo {
  if (!parentId) {
    return { pos: 0, index: -1, level: -1 };
  }

  for (let i = 0, p = 0; i < content.length; i++) {
    const listItem = content[i]!;
    const { blockId, level } = listItem.attrs;
    if (blockId === parentId) {
      return {
        pos: p + listItem.nodeSize, // 指向父块末尾
        index: i,
        level,
      };
    }
    p += listItem.nodeSize;
  }

  throw new Error(`Parent block not found: ${parentId}`);
}

/**
 * 计算插入位置
 * @param content 文档内容
 * @param parentInfo 父块信息
 * @param targetIndex 目标索引
 * @returns 插入位置
 */
function calculateInsertPosition(
  content: readonly Node[],
  parentInfo: ParentInfo,
  targetIndex: number
): number {
  const { pos: startPos, index: parentIndex, level: parentLevel } = parentInfo;
  const targetLevel = parentLevel + 1;

  let skipped = 0;
  let i = parentIndex + 1;
  let p = startPos;

  while (i < content.length) {
    const listItem = content[i]!;
    const { level } = listItem.attrs;

    if (level === targetLevel) {
      // 检查是否要在这个块前面插入
      if (skipped === targetIndex) {
        return p;
      }

      // 跳过这个直接子块
      skipped++;

      // 跳过后再检查是否已达到目标位置
      if (skipped === targetIndex) {
        // 需要移动到这个块（及其子块）的末尾
        return calculateBlockEndPosition(content, i, targetLevel);
      }
    } else if (level <= parentLevel) {
      // 遇到同级或更高级，停止
      break;
    }
    // 其他情况：level > targetLevel，跳过后代块

    p += listItem.nodeSize;
    i++;
  }

  // 如果循环结束还没达到目标位置，插入到最后
  return p;
}

/**
 * 计算块（及其子块）的结束位置
 */
function calculateBlockEndPosition(
  content: readonly Node[],
  blockIndex: number,
  blockLevel: number
): number {
  const listItem = content[blockIndex];
  let endPos = 0;

  // 计算到这个块的位置
  for (let i = 0; i <= blockIndex; i++) {
    endPos += content[i]!.nodeSize;
  }

  // 跳过所有子级
  for (let i = blockIndex + 1; i < content.length; i++) {
    const childItem = content[i]!;
    if (childItem.attrs.level <= blockLevel) break;
    endPos += childItem.nodeSize;
  }

  return endPos;
}

/**
 * 计算子树范围（用于删除操作）
 */
function calculateSubtreeRange(
  content: readonly Node[],
  blockIndex: number
): { start: number; end: number } {
  const listItem = content[blockIndex]!;
  const level = listItem.attrs.level;

  // 计算起始位置
  let start = 0;
  for (let i = 0; i < blockIndex; i++) {
    start += content[i]!.nodeSize;
  }

  // 计算结束位置
  let end = start + listItem.nodeSize;
  for (let i = blockIndex + 1; i < content.length; i++) {
    const childItem = content[i]!;
    if (childItem.attrs.level <= level) break;
    end += childItem.nodeSize;
  }

  return { start, end };
}

// ================== 关联更新处理 ==================

/**
 * 更新块的关联属性（如 hasChildren）
 */
function updateRelatedBlocks(
  view: EditableOutlineView,
  tr: Transaction,
  affectedParentIds: Set<string>
) {
  if (affectedParentIds.size === 0) return tr;

  const content = tr.doc.content.content;

  // 为每个受影响的父块重新渲染（只渲染父块本身）
  for (const parentId of affectedParentIds) {
    const blockPos = findBlockPosition(content, parentId);
    if (!blockPos) continue; // 父块可能已被删除或不存在

    const listItem = content[blockPos.index]!;
    const level = listItem.attrs.level;

    // 只重新渲染父块本身，不渲染子块
    const blockNode = view.app.getBlockNode(parentId as any);
    if (blockNode == null) continue;

    const [newParentNode] = view.fullRenderer.renderBlock(
      blockNode,
      level,
      { rootOnly: true } // 只渲染根节点，不渲染子树
    );

    // 只替换父块本身，保留所有子块
    const parentEndPos = blockPos.pos + listItem.nodeSize;
    tr = tr.replaceWith(blockPos.pos, parentEndPos, newParentNode!);
  }

  return tr;
}

/**
 * 收集受影响的父块ID
 */
function collectAffectedParents(operations: {
  oldParents?: (string | null)[];
  newParents?: (string | null)[];
}): Set<string> {
  const affectedParents = new Set<string>();

  // 添加旧父块
  if (operations.oldParents) {
    for (const parentId of operations.oldParents) {
      if (parentId) affectedParents.add(parentId);
    }
  }

  // 添加新父块
  if (operations.newParents) {
    for (const parentId of operations.newParents) {
      if (parentId) affectedParents.add(parentId);
    }
  }

  return affectedParents;
}

// ================== 操作处理函数 ==================

function handleBlockCreateOp(
  view: EditableOutlineView,
  op: TxExecutedOperation & { type: "block:create" }
) {
  if (!view.tiptap) return;
  let tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  const parentInfo = findParentInfo(content, op.parent);
  const insertPos = calculateInsertPosition(content, parentInfo, op.index);

  const blockNode = view.app.getBlockNode(op.blockId);
  if (blockNode == null) throw new Error("Block not found: " + op.blockId);

  const [node] = view.fullRenderer.renderBlock(
    blockNode,
    parentInfo.level + 1,
    {}
  );

  tr = tr.insert(insertPos, node!);

  // 更新受影响的父块
  const affectedParents = collectAffectedParents({
    newParents: [op.parent],
  });
  tr = updateRelatedBlocks(view, tr, affectedParents);

  view.tiptap.view.dispatch(tr);
}

function handleBlockUpdateOp(
  view: EditableOutlineView,
  op: TxExecutedOperation & { type: "block:update" }
) {
  if (!view.tiptap) return;
  let tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  const blockPos = findBlockPosition(content, op.blockId);
  if (!blockPos) {
    throw new Error("Block not found for update: " + op.blockId);
  }

  const listItem = content[blockPos.index]!;
  const level = listItem.attrs.level;

  const blockNode = view.app.getBlockNode(op.blockId);
  if (blockNode == null) throw new Error("Block not found: " + op.blockId);

  // 仅当 folded 状态发生变化时，才重新渲染子树
  // 其他时候都只渲染当前块
  const needRerenderSubtree = op.oldData.folded !== op.newData.folded;
  if (needRerenderSubtree) {
    // 重新渲染整个子树
    const range = calculateSubtreeRange(content, blockPos.index);

    const newNodes = view.fullRenderer.renderBlock(blockNode, level, {});
    tr = tr.replaceWith(range.start, range.end, newNodes);
  } else {
    // 仅渲染当前块
    const [newNode] = view.fullRenderer.renderBlock(blockNode, level, {
      rootOnly: true,
    });
    tr = tr.replaceWith(
      blockPos.pos,
      blockPos.pos + listItem.nodeSize,
      newNode!
    );
  }

  view.tiptap.view.dispatch(tr);
}

function handleBlockDeleteOp(
  view: EditableOutlineView,
  op: TxExecutedOperation & { type: "block:delete" }
) {
  if (!view.tiptap) return;
  let tr = view.tiptap.state.tr;
  const content = tr.doc.content.content;

  const blockPos = findBlockPosition(content, op.blockId);
  if (!blockPos) {
    throw new Error("Block not found for delete: " + op.blockId);
  }

  // 获取被删除块的父块信息（用于后续更新）
  const deletedBlock = content[blockPos.index];
  const deletedBlockParent = getBlockParentId(content, blockPos.index);

  const listItem = content[blockPos.index]!;
  tr = tr.delete(blockPos.pos, blockPos.pos + listItem.nodeSize);

  // 更新受影响的父块
  const affectedParents = collectAffectedParents({
    oldParents: [deletedBlockParent],
  });
  tr = updateRelatedBlocks(view, tr, affectedParents);

  view.tiptap.view.dispatch(tr);
}

function handleBlockMoveOp(
  view: EditableOutlineView,
  op: TxExecutedOperation & { type: "block:move" }
) {
  if (!view.tiptap) return;
  let tr = view.tiptap.state.tr;
  let content = tr.doc.content.content;

  // 第一步：删除原位置的块（包括所有子级）
  const blockPos = findBlockPosition(content, op.blockId);
  if (!blockPos) {
    throw new Error("Block not found for move: " + op.blockId);
  }

  const range = calculateSubtreeRange(content, blockPos.index);
  tr = tr.delete(range.start, range.end);

  // 第二步：检查新父块是否折叠，如果折叠则跳过插入
  if (op.parent) {
    const parentBlockData = view.app.getBlockData(op.parent);
    if (parentBlockData && parentBlockData.folded) {
      // 父块是折叠的，只更新受影响的父块但不插入新节点
      const affectedParents = collectAffectedParents({
        oldParents: [op.oldParent],
        newParents: [op.parent],
      });
      tr = updateRelatedBlocks(view, tr, affectedParents);
      view.tiptap.view.dispatch(tr);
      return;
    }
  }

  // 第三步：在新位置插入块（只有当父块未折叠时才执行）
  content = tr.doc.content.content;
  const parentInfo = findParentInfo(content, op.parent);
  const insertPos = calculateInsertPosition(content, parentInfo, op.index);

  const blockNode = view.app.getBlockNode(op.blockId);
  if (blockNode == null) throw new Error("Block not found: " + op.blockId);

  const newNodes = view.fullRenderer.renderBlock(
    blockNode,
    parentInfo.level + 1,
    {}
  );

  tr = tr.insert(insertPos, newNodes);

  // 第四步：更新受影响的父块
  const affectedParents = collectAffectedParents({
    oldParents: [op.oldParent],
    newParents: [op.parent],
  });
  tr = updateRelatedBlocks(view, tr, affectedParents);

  view.tiptap.view.dispatch(tr);
}

/**
 * 获取块的父块ID
 */
function getBlockParentId(
  content: readonly Node[],
  blockIndex: number
): string | null {
  const targetBlock = content[blockIndex];
  const targetLevel = targetBlock!.attrs.level;

  if (targetLevel === 0) return null; // 根级块没有父块

  // 向前查找父级
  for (let i = blockIndex - 1; i >= 0; i--) {
    const block = content[i]!;
    if (block.attrs.level === targetLevel - 1) {
      return block.attrs.blockId;
    }
  }

  return null;
}
