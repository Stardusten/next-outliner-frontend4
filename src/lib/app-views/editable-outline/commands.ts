import type { TagAttrs } from "@/lib/tiptap/nodes/tag";
import { findCurrListItem, getSelectedListItemInfo } from "@/lib/tiptap/utils";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { Node, Schema } from "@tiptap/pm/model";
import { NodeSelection, TextSelection, type Command } from "@tiptap/pm/state";
import type { AttachmentTaskInfo } from "../../app/attachment/storage";
import type {
  BlockDataInner,
  BlockId,
  BlockNode,
  NumberFormat,
  SelectionInfo,
} from "../../common/types";
import { Codeblock } from "../../tiptap/nodes/codeblock";
import {
  File,
  getDefaultDisplayMode,
  inferFileTypeFromPath as inferFileTypeFromFilename,
} from "../../tiptap/nodes/file";
import { ListItem } from "../../tiptap/nodes/list-item";
import { Search, type SearchAttrs } from "../../tiptap/nodes/search";
import {
  buildBlockRefStr,
  contentNodeToStr,
  str2ContentNode,
} from "../../tiptap/utils";
import type { AppViewId } from "../types";
import { useI18n } from "@/composables/useI18n";
import { showToast } from "@/components/ui/toast";
import { useBlockClipboard } from "@/composables/useBlockClipboard";
import { useAttachment } from "@/composables/useAttachment";
import { useDialogs } from "@/composables/useDialogs";

/**
 * 判断一个 List Item Node 内容是不是空的
 */
export function isEmptyListItem(node: Node): boolean {
  const pNode = node.firstChild;
  if (!pNode) return true;
  return pNode.content.size === 0;
}

/**
 * 判断一个块是否是空块
 */
export function isEmptyBlock(
  schema: Schema,
  blockData: BlockDataInner
): boolean {
  const nodeJson = JSON.parse(blockData.content);
  const node = schema.nodeFromJSON(nodeJson);
  return node && node.content.size === 0;
}

export function promoteSelected(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    appview.app.withTx((tx) => {
      const { start, end, cross } = getSelectedListItemInfo(state);
      if (!start || !end || cross) return;

      const { node, pos } = start;
      const { blockId } = node.attrs;
      if (!blockId) return;

      const parentId = tx.getParentId(blockId);
      if (!parentId)
        throw new Error(`target 块 ${blockId} 没有父节点，根块不能反缩进`);
      const parentIndex = tx.getIndex(parentId);
      if (parentIndex === null)
        throw new Error(`找不到父节点 ${parentId} 的 index`);
      const grandParentId = tx.getParentId(parentId);
      tx.moveBlock(blockId, grandParentId, parentIndex + 1);

      // 缩进后，光标位置仍然保持在当前块的相同位置
      const anchor = state.selection.from - (pos + 2);
      tx.setSelection({ viewId: appview.id, blockId, anchor });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function demoteSelected(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    appview.app.withTx((tx) => {
      if (!appview.tiptap) return;
      const { start, end, cross } = getSelectedListItemInfo(state);
      if (!start || !end || cross) return;

      const { node, pos } = start;
      const { blockId } = node.attrs;
      if (!blockId) return;

      const parentId = tx.getParentId(blockId);
      const index = tx.getIndex(blockId)!;
      if (index === 0)
        throw new Error(`target 块 ${blockId} 是第一个块，不能缩进`);
      const prevNodeId = tx.getChildrenIds(parentId)[index - 1]!;
      const newIndex = tx.getChildrenIds(prevNodeId)!.length;
      tx.moveBlock(blockId, prevNodeId, newIndex);

      // 缩进后，光标位置仍然保持在当前块的相同位置
      const anchor = state.selection.from - (pos + 2);
      tx.setSelection({ viewId: appview.id, blockId, anchor });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function splitListItemSpecial(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview, schema } = editor;

    const { $from } = state.selection;
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { node: listItem } = currListItem;
    const currBlockId = listItem.attrs.blockId as BlockId;

    const currBlockNode = appview.app.getBlockNode(currBlockId);
    if (!currBlockNode) return false;

    const pNode = listItem.firstChild;
    if (!pNode) return false;

    if (!dispatch) return true;

    const splitPos = $from.parentOffset;
    if (splitPos === 0) {
      appview.app.withTx((tx) => {
        // 在开头分割：当前块上方创建空的新块，保持当前块内容不变
        const newContent = contentNodeToStr(schema.nodes.paragraph!.create());
        const newBlockId = tx.createBlockBefore(currBlockId, {
          type: "text",
          folded: false,
          content: newContent,
        });
        // 要求聚焦到新块
        tx.setSelection({
          viewId: appview.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    } else if (splitPos === pNode.content.size) {
      appview.app.withTx((tx) => {
        // 在末尾分割：当前块下方创建空的新块，保持当前块内容不变
        const newContent = contentNodeToStr(schema.nodes.paragraph!.create());
        const newBlockId = tx.createBlockAfter(currBlockId, {
          type: "text",
          folded: false,
          content: newContent,
        });
        // 要求聚焦到新块
        tx.setSelection({
          viewId: appview.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    } else {
      const { t } = useI18n();
      showToast({
        title: t("commands.cannotSplitInMiddle"),
        variant: "warning",
      });
    }
    return true;
  };
}

/** 如果光标在 listItem 开头，则阻止 */
export function stopOnListItemBegin(): Command {
  return function (state, dispatch) {
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { $from, empty } = state.selection;
    if (empty && $from.parentOffset === 0) {
      return true;
    }

    return false;
  };
}

/** 如果光标在 listItem 末尾，则阻止 */
export function stopOnListItemEnd(): Command {
  return function (state, dispatch) {
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { $from, empty } = state.selection;
    const pNode = currListItem.node.firstChild!;
    if (empty && $from.parentOffset === pNode.content.size) {
      return true;
    }

    return false;
  };
}

/**
 * 在一个块末尾按 Enter 时，在这个块下面创建一个子块，index 为 0
 * @param enlargeOnly 如果为 true，只在根块被放大时应用这个策略
 */
export function addFirstChild(
  editor: TiptapEditor,
  enlargeOnly?: boolean
): Command {
  return function (state, dispatch) {
    const { appView: appview, schema } = editor;

    const { $from } = state.selection;
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { node: listItem } = currListItem;
    if (listItem.attrs.type !== "text") return false; // 这个方法仅用于文本块

    const currBlockId = listItem.attrs.blockId as BlockId;
    if (!currBlockId) return false;

    const pNode = listItem.firstChild;
    if (!pNode) return false;

    if (enlargeOnly) {
      const rootBlockIds = appview.getRootBlockIds();
      if (rootBlockIds.length !== 1 || rootBlockIds[0] !== currBlockId)
        return false;
    }

    if ($from.parentOffset === pNode.content.size) {
      if (!dispatch) return true;

      appview.app.withTx((tx) => {
        const newContent = contentNodeToStr(schema.nodes.paragraph!.create());
        const newBlockId = tx.createBlockUnder(currBlockId, 0, {
          type: "text",
          folded: false,
          content: newContent,
        });
        tx.setSelection({
          viewId: appview.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });

      return true;
    }

    return false;
  };
}

export function splitListItemText(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview, schema } = editor;

    const { $from } = state.selection;
    const currListItem = findCurrListItem(state);
    if (!currListItem) return false;

    const { node: listItem } = currListItem;
    if (listItem.attrs.type !== "text") return false; // 这个方法仅用于文本块

    const currBlockId = listItem.attrs.blockId as BlockId;

    const currBlockNode = appview.app.getBlockNode(currBlockId);
    if (!currBlockNode) return false;

    const pNode = listItem.firstChild;
    if (!pNode) return false;

    if (!dispatch) return true;

    const splitPos = $from.parentOffset;
    if (splitPos === 0) {
      appview.app.withTx((tx) => {
        // 在开头分割：当前块上方创建空的新块，保持当前块内容不变
        const newContent = contentNodeToStr(schema.nodes.paragraph!.create());
        const newBlockId = tx.createBlockBefore(currBlockId, {
          type: "text",
          folded: false,
          content: newContent,
        });
        // 要求聚焦到新块
        tx.setSelection({
          viewId: appview.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    } else {
      appview.app.withTx((tx) => {
        // 在中间或末尾分割：更新当前块为分割前内容，新块为分割后内容
        const beforeContent = pNode.cut(0, splitPos);
        const afterContent = pNode.cut(splitPos);
        const beforeSerialized = contentNodeToStr(beforeContent);
        const afterSerialized = contentNodeToStr(afterContent);
        tx.updateBlock(currBlockId, { content: beforeSerialized });
        const newBlockId = tx.createBlockAfter(currBlockId, {
          type: "text",
          folded: false,
          content: afterSerialized,
        });
        // 要求聚焦到新块开头
        tx.setSelection({
          viewId: appview.id,
          blockId: newBlockId,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      });
    }

    return true;
  };
}

/** 删除空块 */
export function deleteEmptyListItem(
  editor: TiptapEditor,
  direction: "backward" | "forward" = "backward",
  confirm?: boolean
): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const { $from, empty } = state.selection;
    // 触发条件：
    // 1. 光标位于块开头且没有选中内容
    // 2. 块必须为空
    // 3. 没有子块
    if (!empty || $from.parentOffset !== 0) return false;

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;
    if (!isEmptyListItem(listItemInfo.node)) return false; // 块内容必须为空

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;
    const currentBlockNode = appview.app.getBlockNode(blockId);
    if (!currentBlockNode) return false;
    const children = currentBlockNode.children() ?? [];

    // 不删除有子块的块
    if (children.length > 0) return false;

    // 确定删除后要聚焦的块 - 直接在 ProseMirror 文档中查找
    let focusTarget: {
      viewId: AppViewId;
      blockId: BlockId;
      anchor: number;
    } | null = null;

    if (direction === "forward") {
      // Delete 键：找下一个 listItem
      let nextListItemPos: number | null = null;
      state.doc.descendants((node, pos) => {
        if (nextListItemPos !== null) return false; // 已找到，停止搜索
        if (pos > listItemInfo.pos && node.type.name === ListItem.name) {
          nextListItemPos = pos;
          return false;
        }
      });

      if (nextListItemPos !== null) {
        const nextListItem = state.doc.nodeAt(nextListItemPos);
        if (nextListItem) {
          const nextBlockId = nextListItem.attrs.blockId as BlockId;
          focusTarget = {
            viewId: appview.id,
            blockId: nextBlockId,
            anchor: 0,
          };
        }
      }
    } else {
      // Backspace 键：找前一个 listItem
      let prevListItemPos: number | null = null;
      state.doc.descendants((node, pos) => {
        if (pos < listItemInfo.pos && node.type.name === ListItem.name) {
          prevListItemPos = pos; // 继续找，保留最后一个（最接近的）
        }
      });

      if (prevListItemPos !== null) {
        const prevListItem = state.doc.nodeAt(prevListItemPos);
        if (prevListItem) {
          const prevBlockId = prevListItem.attrs.blockId as BlockId;
          const prevBlockData = appview.app.getBlockData(prevBlockId);
          if (prevBlockData) {
            const prevBlockNodeJson = JSON.parse(prevBlockData.content);
            const prevBlockNode = state.schema.nodeFromJSON(prevBlockNodeJson);
            focusTarget = {
              viewId: appview.id,
              blockId: prevBlockId,
              anchor: prevBlockNode.nodeSize,
            };
          }
        }
      }
    }

    // 如果这是编辑器中唯一的根块，则不删除
    if (!focusTarget) return false;

    if (!dispatch) return true;

    if (confirm) {
      const dialogs = useDialogs(appview.app);
      dialogs.openDeleteBlockConfirm(blockId, focusTarget);
      return true;
    }

    appview.app.withTx((tx) => {
      tx.deleteBlock(blockId);
      tx.setSelection(focusTarget);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

/** 选中当前聚焦的整个 listItem */
export function selectCurrentListItem(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;
    const { node: listItem, pos } = listItemInfo;

    const from = pos + 2;
    const paragraphNode = listItem.firstChild!;
    const to = from + paragraphNode.content.size;
    const selection = TextSelection.create(state.doc, from, to);

    if (dispatch) {
      const tr = state.tr.setSelection(selection);
      dispatch(tr);
    }

    return true;
  };
}

/**
 * 删除选中的内容
 */
export function deleteSelected(): Command {
  return function (state, dispatch) {
    const { from, to, empty } = state.selection;
    if (empty) return false; // 该命令仅处理非空选择

    // 如果选中了多个 listItem，什么都不做
    const { start, end, cross } = getSelectedListItemInfo(state);
    if (!start || !end || cross) return true;

    // 选择在单个 listItem 内
    const { node: listItem, pos: listItemPos } = start;
    const paragraphNode = listItem.firstChild;
    if (!paragraphNode) return false;

    const paraContentStartPos = listItemPos + 2; // 在 listItem 和段落开标签之后
    const paraContentEndPos = paraContentStartPos + paragraphNode.content.size;

    // 如果试图删除整个块的内容，将块内容替换为空
    // 因为默认行为会直接删掉这个块
    if (dispatch) {
      const tr = state.tr.replaceWith(
        Math.max(from, paraContentStartPos),
        Math.min(to, paraContentEndPos),
        []
      );
      dispatch(tr);
    }
    return true;
  };
}

export function updateSearchQuery(
  editor: TiptapEditor,
  query: string,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    let targetBlockId = blockId;

    if (!targetBlockId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      targetBlockId = listItemInfo.node.attrs.blockId as BlockId;
      if (!targetBlockId) return false;
    }

    if (!dispatch) return true;

    appview.app.withTx((tx) => {
      const blockData = tx.getBlockData(targetBlockId);
      if (!blockData) return;
      const nodeJson = JSON.parse(blockData.content);
      const node = editor.schema.nodeFromJSON(nodeJson);
      if (node.type.name !== Search.name) return;
      const newNode = node.type.create(
        {
          ...node.attrs,
          query,
        },
        node.content,
        node.marks
      );
      const newContent = contentNodeToStr(newNode);
      tx.updateBlock(targetBlockId, { content: newContent });
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function toggleFoldState(
  editor: TiptapEditor,
  targetState?: boolean,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    let targetBlockId = blockId;

    if (!targetBlockId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;
      targetBlockId = listItemInfo.node.attrs.blockId as BlockId;
      if (!targetBlockId) return false;
    }

    if (!dispatch) return true;

    const currentBlockData = appview.app.getBlockData(targetBlockId);
    if (!currentBlockData || targetState === currentBlockData.folded)
      return true;

    appview.app.withTx((tx) => {
      tx.updateBlock(targetBlockId, {
        folded: targetState ?? !currentBlockData.folded,
      });
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function copyBlockRef(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (listItemInfo == null) return true;

    const blockId = listItemInfo.node.attrs.blockId;
    if (blockId == null) return true;

    if (!dispatch) return true;

    if (navigator.clipboard) {
      const clipboard = navigator.clipboard as any;
      if (clipboard.writeText) {
        clipboard.writeText(buildBlockRefStr(blockId));
      }
    }

    return true;
  };
}

export function moveBlockUp(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;
    const blockNode = appview.app.getBlockNode(blockId);
    if (!blockNode) return false;
    const index = blockNode.index()!;
    if (index === 0) return false; // 已经是第一个块

    if (!dispatch) return true;

    appview.app.withTx((tx) => {
      const parentId = tx.getParentId(blockId)!;
      tx.moveBlock(blockId, parentId, index - 1);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function moveBlockDown(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;
    const blockNode = appview.app.getBlockNode(blockId);
    if (!blockNode) return false;
    const index = blockNode.index()!;
    const parentNode = blockNode.parent()!;
    if (index >= parentNode.children()!.length - 1) return false; // 已经是最后一个块

    if (!dispatch) return true;

    appview.app.withTx((tx) => {
      const parentId = tx.getParentId(blockId)!;
      tx.moveBlock(blockId, parentId, index + 1);
      tx.setOrigin("localEditorStructural");
    });

    return true;
  };
}

export function mergeWithPreviousBlock(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const { $from, empty } = state.selection;

    // 只在光标位于块开头且没有选中内容时触发
    if (!empty || $from.parentOffset !== 0) return false;

    if (!appview.tiptap) return false;
    const schema = appview.tiptap.schema;

    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const { node: currentListItem } = listItemInfo;
    const currentBlockId = currentListItem.attrs.blockId as BlockId;
    if (!currentBlockId) return false;

    const currentBlockNode = appview.app.getBlockNode(currentBlockId);
    if (!currentBlockNode) return false;

    const currentBlockData = appview.app.getBlockData(currentBlockId);
    if (!currentBlockData) return false;

    // 找到前一个可以合并的块
    const parentBlockNode = currentBlockNode.parent();

    const siblings =
      parentBlockNode == null
        ? appview.app.getRootBlockNodes()
        : parentBlockNode.children();
    if (!siblings) return false;

    const currentIndex = currentBlockNode.index();
    if (
      currentIndex === null ||
      currentIndex === undefined ||
      currentIndex <= 0
    )
      return false; // 如果是第一个块，无法合并

    // 找到前一个兄弟块（同级别）
    const prevBlockNode = siblings[currentIndex - 1]!;
    const prevBlockId = prevBlockNode.id;
    const prevBlockData = appview.app.getBlockData(prevBlockId);
    if (!prevBlockData) return false;

    // 只能合并同类型的文本块
    if (prevBlockData.type !== "text" || currentBlockData.type !== "text")
      return false;

    // 前一个块不能有子块
    const prevChildren = prevBlockNode.children();
    if (prevChildren && prevChildren.length > 0) return false;

    // 获取当前块的段落节点
    const currentParagraphNode = currentListItem.firstChild;
    if (!currentParagraphNode) return false;

    // 解析前一个块的内容
    let prevParagraphNode;
    try {
      if (prevBlockData.content && prevBlockData.content.trim() !== "") {
        prevParagraphNode = str2ContentNode(schema, prevBlockData.content);
      } else {
        prevParagraphNode = schema.nodes.paragraph!.create();
      }
    } catch (error) {
      // 如果解析失败，创建包含纯文本的段落
      const prevTextContent = appview.app.getTextContent(prevBlockId);
      prevParagraphNode = schema.nodes.paragraph!.create(
        null,
        prevTextContent ? [schema.text(prevTextContent)] : []
      );
    }

    // 检查前一个块是否为空
    const prevContentSize = prevParagraphNode.content.size;
    if (prevContentSize === 0) {
      // 前一个块为空，删除前一个块，保留当前块
      appview.app.withTx((tx) => {
        // 1. 删除前一个块
        tx.deleteBlock(prevBlockId);
        // 2. 设置光标位置到当前块开头
        const selection = {
          viewId: appview.id,
          blockId: currentBlockId,
          anchor: 0,
        };
        tx.setSelection(selection);
        tx.setOrigin("localEditorStructural");
      });
    } else {
      // 前一个块不为空，执行合并逻辑
      let mergedParagraphNode;

      if (currentParagraphNode.content.size === 0) {
        // 当前块为空，直接使用前一个块的内容
        mergedParagraphNode = prevParagraphNode;
      } else {
        // 两个块都有内容，需要合并
        const mergedContent = prevParagraphNode.content.append(
          currentParagraphNode.content
        );
        mergedParagraphNode = schema.nodes.paragraph!.create(
          null,
          mergedContent
        );
      }

      // 序列化合并后的内容
      const mergedSerialized = contentNodeToStr(mergedParagraphNode);

      // 计算光标在合并后的位置（在原前一个块内容的末尾）
      const mergePoint = prevContentSize;

      appview.app.withTx((tx) => {
        // 1. 更新前一个块的内容为合并后的内容
        tx.updateBlock(prevBlockId, { content: mergedSerialized });
        // 2. 删除当前块
        tx.deleteBlock(currentBlockId);
        // 3. 设置光标位置
        const selection = {
          viewId: appview.id,
          blockId: prevBlockId,
          anchor: mergePoint,
        };
        tx.setSelection(selection);
        tx.setOrigin("localEditorStructural");
      });
    }

    return true;
  };
}

/**
 * - h|<file> 这种情况下按 backspace ProseMirror 无法正常删除 h
 * 因此我们手工删掉 h，然后聚焦到 file
 */
export function backspaceAfterCharBeforeExpandedFile(): Command {
  return function (state, dispatch) {
    const { $to } = state.selection as NodeSelection;
    const afterNode = $to.nodeAfter;

    if (afterNode && afterNode.type.name === File.name) {
      const offset = $to.parentOffset;
      if (offset === 1) {
        let tr = state.tr.replaceWith($to.pos - 1, $to.pos + 1, afterNode);
        tr = tr.setSelection(NodeSelection.create(tr.doc, $to.pos - 1));
        dispatch && dispatch(tr);
        return true;
      }
    }

    return false;
  };
}

/**
 * 在 - |h<file> 这种情况下按 delete ProseMirror 无法正常删除 h
 * 因此我们手工删掉 h，然后聚焦到 file
 */
export function deleteBeforeCharBeforeExpandedFile(): Command {
  return function (state, dispatch) {
    const { empty, $from } = state.selection as NodeSelection;
    if (empty) {
      const $afterFrom = state.doc.resolve($from.pos + 1);
      const afterNode = $afterFrom.nodeAfter;

      if (afterNode && afterNode.type.name === File.name) {
        let tr = state.tr.replaceWith($from.pos, $from.pos + 2, afterNode);
        tr = tr.setSelection(NodeSelection.create(tr.doc, $from.pos));
        dispatch && dispatch(tr);
        return true;
      }
    } else {
      return backspaceAfterCharBeforeExpandedFile()(state, dispatch);
    }

    return false;
  };
}

/**
 * 在代码块中插入换行，并继承上一行的缩进
 */
export function codeblockInsertLineBreak(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的开始位置
    const textBefore = $from.parent.textContent.substring(
      0,
      $from.parentOffset
    );
    const lastNewlineIndex = textBefore.lastIndexOf("\n");
    const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;

    // 获取当前行的内容
    const currentLineText = $from.parent.textContent.substring(lineStart);

    // 计算当前行的缩进
    let indentLevel = 0;
    for (let i = 0; i < currentLineText.length; i++) {
      if (currentLineText[i] === " ") {
        indentLevel++;
      } else if (currentLineText[i] === "\t") {
        indentLevel += 2; // 将 tab 视为 2 个空格
      } else {
        break;
      }
    }

    // 创建新行内容：换行符 + 相同的缩进
    const indent = " ".repeat(indentLevel);
    const newLineContent = "\n" + indent;

    const tr = state.tr;
    tr.insertText(newLineContent);
    dispatch(tr);

    return true;
  };
}

/**
 * 在代码块中添加缩进（Tab）
 */
export function codeblockIndent(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from, to } = state.selection;
    const tr = state.tr;
    const indentStr = "  "; // 使用 2 个空格作为缩进

    if (from === to) {
      // 没有选中内容，直接插入缩进
      tr.insertText(indentStr);
    } else {
      // 有选中内容，对选中范围内的每一行添加缩进
      const doc = state.doc;
      const startPos = from;
      const endPos = to;

      // 获取选中文本
      const selectedText = doc.textBetween(startPos, endPos);
      const lines = selectedText.split("\n");

      // 对每一行添加缩进
      const indentedText = lines.map((line) => indentStr + line).join("\n");

      tr.replaceWith(startPos, endPos, state.schema.text(indentedText));

      // 调整选区以保持选中状态
      const newEndPos = startPos + indentedText.length;
      tr.setSelection(TextSelection.create(tr.doc, startPos, newEndPos));
    }

    dispatch(tr);
    return true;
  };
}

/**
 * 在代码块中移除缩进（Shift+Tab）
 */
export function codeblockOutdent(): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    const { from, to } = state.selection;
    const tr = state.tr;
    const indentStr = "  "; // 2 个空格的缩进

    if (from === to) {
      // 没有选中内容，尝试移除当前行的缩进
      const doc = state.doc;
      const $from = doc.resolve(from);

      // 找到当前行的开始位置
      const textBefore = $from.parent.textContent.substring(
        0,
        $from.parentOffset
      );
      const lastNewlineIndex = textBefore.lastIndexOf("\n");
      const lineStart = lastNewlineIndex === -1 ? 0 : lastNewlineIndex + 1;
      const lineStartPos = from - $from.parentOffset + lineStart;

      // 检查行首是否有缩进可以移除
      const lineText = $from.parent.textContent.substring(lineStart);
      if (lineText.startsWith(indentStr)) {
        tr.delete(lineStartPos, lineStartPos + indentStr.length);
      } else if (lineText.startsWith(" ")) {
        // 如果只有一个空格，也移除它
        tr.delete(lineStartPos, lineStartPos + 1);
      }
    } else {
      // 有选中内容，对选中范围内的每一行移除缩进
      const doc = state.doc;
      const selectedText = doc.textBetween(from, to);
      const lines = selectedText.split("\n");

      // 对每一行移除缩进
      const outdentedLines = lines.map((line) => {
        if (line.startsWith(indentStr)) {
          return line.substring(indentStr.length);
        } else if (line.startsWith(" ")) {
          return line.substring(1);
        }
        return line;
      });

      const outdentedText = outdentedLines.join("\n");
      tr.replaceWith(from, to, state.schema.text(outdentedText));

      // 调整选区
      const newEndPos = from + outdentedText.length;
      tr.setSelection(TextSelection.create(tr.doc, from, newEndPos));
    }

    dispatch(tr);
    return true;
  };
}

/**
 * 在代码块中选择全部内容
 */
export function codeblockSelectAll(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) {
      return false;
    }

    const { node: listItem, pos } = listItemInfo;
    const codeblockNode = listItem.firstChild;
    if (!codeblockNode || codeblockNode.type.name !== Codeblock.name) {
      return false;
    }

    // 代码块内容的起始和结束位置
    const from = pos + 2; // listItem + codeblock 开标签
    const to = from + codeblockNode.content.size;

    if (dispatch) {
      const selection = TextSelection.create(state.doc, from, to);
      const tr = state.tr.setSelection(selection);
      dispatch(tr);
    }

    return true;
  };
}

/**
 * 在代码块中移动到行首
 */
export function codeblockMoveToLineStart(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的开始位置
    const textBefore = $from.parent.textContent.substring(
      0,
      $from.parentOffset
    );
    const lastNewlineIndex = textBefore.lastIndexOf("\n");

    if (lastNewlineIndex === -1) {
      // 已经在第一行，移动到代码块开头
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      const lineStartPos = from - $from.parentOffset;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineStartPos);
        dispatch(state.tr.setSelection(selection));
      }
    } else {
      // 移动到当前行开头
      const lineStartOffset = lastNewlineIndex + 1;
      const lineStartPos = from - $from.parentOffset + lineStartOffset;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineStartPos);
        dispatch(state.tr.setSelection(selection));
      }
    }

    return true;
  };
}

/**
 * 在代码块中移动到行尾
 */
export function codeblockMoveToLineEnd(): Command {
  return function (state, dispatch) {
    const { from } = state.selection;
    const doc = state.doc;
    const $from = doc.resolve(from);

    // 找到当前行的结束位置
    const textAfter = $from.parent.textContent.substring($from.parentOffset);
    const nextNewlineIndex = textAfter.indexOf("\n");

    if (nextNewlineIndex === -1) {
      // 已经在最后一行，移动到代码块末尾
      const lineEndPos = from - $from.parentOffset + $from.parent.content.size;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineEndPos);
        dispatch(state.tr.setSelection(selection));
      }
    } else {
      // 移动到当前行末尾
      const lineEndPos = from + nextNewlineIndex;
      if (dispatch) {
        const selection = TextSelection.create(state.doc, lineEndPos);
        dispatch(state.tr.setSelection(selection));
      }
    }

    return true;
  };
}

export function undoCommand(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const canUndoRes = appview.canUndo();
    if (dispatch && canUndoRes) appview.undo();
    return true;
  };
}

export function redoCommand(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const { appView: appview } = editor;
    const canRedoRes = appview.canRedo();
    if (dispatch && canRedoRes) appview.redo();
    return true;
  };
}

export function insertLineBreak(): Command {
  return function (state, dispatch) {
    if (dispatch) {
      const lineBreak = state.schema.nodes.lineBreak!.create();
      const tr = state.tr.replaceSelectionWith(lineBreak);
      dispatch(tr);
    }
    return true;
  };
}

export const IMAGE_RESIZE_MARK = "IMAGE_RESIZE_MARK";
export function setImageWidth(pos: number, width: number): Command {
  return function (state, dispatch) {
    const node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== File.name) return false;

    // 更新文件节点的 extraInfo
    const newExtraInfo = JSON.stringify({
      ...JSON.parse(node.attrs.extraInfo || "{}"),
      width,
    });
    const newAttrs = {
      ...node.attrs,
      extraInfo: newExtraInfo,
    };

    if (dispatch) {
      let tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
      tr = tr.setMeta(IMAGE_RESIZE_MARK, true);
      dispatch(tr);
    }

    return true;
  };
}

export function deleteFile(pos: number): Command {
  return function (state, dispatch) {
    const node = state.doc.nodeAt(pos);
    const fileType = state.schema.nodes.file!;
    if (node && node.type.name === fileType.name) {
      const tr = state.tr.delete(pos, pos + node.nodeSize);
      dispatch && dispatch(tr);
      return true;
    }
    return false;
  };
}

export async function uploadFile(
  editor: TiptapEditor,
  getFile: () => Promise<File>
) {
  const { appView: appview } = editor;
  const { t } = useI18n();
  if (!appview.app.attachmentStorage) {
    showToast({
      title: t("attachment.storageNotConfigured") as string,
      variant: "destructive",
    });
    return;
  }

  const file = await getFile();
  if (!file) return;

  // 检查当前是否在列表项中
  const currListItem = findCurrListItem(editor.state);
  if (!currListItem) return;

  // 当任务创建时插入文件节点
  let taskId: string | null = null;
  const fileType = editor.schema.nodes.file!;

  const onTaskCreated = (task: AttachmentTaskInfo) => {
    // 开始执行就立刻移除监听器，确保只执行一次
    appview.app.attachmentStorage?.off("task:created", onTaskCreated);

    // 记录任务 ID，用于后续的文件节点更新
    taskId = task.id;

    // 插入 inline 文件节点，状态为 uploading-0
    const tr = editor.state.tr;
    const fileNode = fileType.create({
      path: task.path,
      displayMode: getDefaultDisplayMode(
        appview.app,
        inferFileTypeFromFilename(task.filename)
      ),
      filename: task.filename,
      type: inferFileTypeFromFilename(task.filename),
      size: task.size,
      status: "uploading-0",
    });
    tr.replaceSelectionWith(fileNode);
    editor.view.dispatch(tr);
  };

  const onTaskProgress = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    if (task.progress === undefined) return;

    let found: any = null;

    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (
        node.type.name === File.name &&
        (node.attrs as any).path === task.path
      ) {
        found = [node, pos];
        return false;
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const newAttrs = {
        ...(fileNode.attrs as any),
        status: `uploading-${Math.round(task.progress)}`,
      };

      const tr = editor.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      editor.view.dispatch(tr);
    }
  };

  const onTaskCompleted = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    // 移除监听器
    appview.app.attachmentStorage?.off("task:completed", onTaskCompleted);
    appview.app.attachmentStorage?.off("task:progress", onTaskProgress);

    // 在文档中找到对应的文件节点并更新
    let found: any = null;

    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (
        node.type.name === File.name &&
        (node.attrs as any).path === task.path
      ) {
        found = [node, pos];
        return false; // 停止遍历
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const currentAttrs = fileNode.attrs as any;
      const newAttrs = {
        ...currentAttrs,
        path: task.path, // 更新为真实的 path
        status: "uploaded",
      };

      const tr = editor.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      editor.view.dispatch(tr);
    }
  };

  const onTaskFailed = (task: AttachmentTaskInfo) => {
    // 如果任务 ID 不匹配，说明不是当前任务，直接返回
    if (task.id !== taskId) return;

    // 移除监听器
    appview.app.attachmentStorage?.off("task:failed", onTaskFailed);
    appview.app.attachmentStorage?.off("task:progress", onTaskProgress);

    // 在文档中找到对应的文件节点并更新状态
    let found: any = null;

    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (
        node.type.name === File.name &&
        (node.attrs as any).path === task.path
      ) {
        found = [node, pos];
        return false;
      }
    });

    if (found) {
      const [fileNode, filePos]: [Node, number] = found;
      const newAttrs = {
        ...(fileNode.attrs as any),
        status: "failed-1",
      };

      const tr = editor.state.tr.setNodeMarkup(filePos, undefined, newAttrs);
      editor.view.dispatch(tr);
    }
  };

  // 注册所有事件监听器
  appview.app.attachmentStorage?.on("task:created", onTaskCreated);
  appview.app.attachmentStorage?.on("task:completed", onTaskCompleted);
  appview.app.attachmentStorage?.on("task:failed", onTaskFailed);
  appview.app.attachmentStorage?.on("task:progress", onTaskProgress);

  // 直接上传文件，不需要确认对话框
  const attachment = useAttachment(appview.app);
  await attachment.upload(file, false);
}

export function changeFileDisplayMode(
  pos: number,
  displayMode: string
): Command {
  return function (state, dispatch) {
    const node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== File.name) return false;

    const newAttrs = {
      ...node.attrs,
      displayMode,
    };

    if (dispatch) {
      const tr = state.tr.setNodeMarkup(pos, undefined, newAttrs);
      dispatch(tr);
    }
    return true;
  };
}

export function convertToSearchBlock(
  editor: TiptapEditor,
  query?: string,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    // const app = editor.appView.app;

    // let targetBlockNode: BlockNode | null = null;
    // if (blockId) {
    //   targetBlockNode = app.getBlockNode(blockId);
    // } else {
    //   const listItemInfo = findCurrListItem(state);
    //   if (!listItemInfo) return false;
    //   const targetBlockId = listItemInfo.node.attrs.blockId as BlockId;
    //   targetBlockNode = app.getBlockNode(targetBlockId);
    // }
    // if (!targetBlockNode) return false;
    // const targetBlockId = targetBlockNode.id;
    // const targetBlockData = targetBlockNode.data.toJSON() as BlockDataInner;

    // // 已经是搜索块了
    // const type = targetBlockData.type;
    // if (type === "search") {
    //   const msg = i18n.global.t("commands.toSearchBlock.alreadySearchBlock");
    //   toast.warning(msg);
    //   return false;
    // }
    // // 不是文本块，不能转为搜索块
    // if (type !== "text") {
    //   const msg = i18n.global.t(
    //     "commands.toSearchBlock.onlyTextBlockCanBeSearchBlock"
    //   );
    //   toast.warning(msg);
    //   return false;
    // }

    // // 搜索块不能有子块
    // const children = targetBlockNode.children() ?? [];
    // if (children.length > 0) {
    //   const msg = i18n.global.t(
    //     "commands.toSearchBlock.searchBlockCannotHaveChildren"
    //   );
    //   toast.warning(msg);
    //   return false;
    // }

    // const pnodeJson = JSON.stringify(targetBlockData.content);
    // const pnode = state.schema.nodeFromJSON(pnodeJson);
    // if (!pnode) return false;
    // const snode = state.schema.nodes.search.create({ query }, pnode.content);

    // app.withTx((tx) => {
    //   tx.updateBlock(targetBlockId, {
    //     type: "search",
    //     content: JSON.stringify(snode.toJSON()),
    //     folded: false,
    //   });
    //   tx.setOrigin("localEditorStructural");
    //   tx.setSelection({
    //     viewId: editor.appView.id,
    //     blockId: targetBlockId,
    //     anchor: 0,
    //     head: 0,
    //     scrollIntoView: true,
    //   });
    // });
    // return true;
    throw new Error("未实现：convertToSearchBlock");
  };
}

export function recursiveDeleteBlock(
  editor: TiptapEditor,
  blockId: BlockId,
  selection?: SelectionInfo
): Command {
  return function () {
    const { appView: appview } = editor;
    appview.app.withTx((tx) => {
      const descendants = tx.getDescendants(blockId);
      console.log(descendants);
      for (let i = descendants.length - 1; i >= 0; i--) {
        tx.deleteBlock(descendants[i]!);
      }
      tx.setOrigin("localEditorStructural");
      selection && tx.setSelection(selection);
    });
    return true;
  };
}

export function addToBlockClipboard(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const blockId = listItemInfo.node.attrs.blockId as BlockId;
    if (!blockId) return false;

    if (!dispatch) return true;

    const clipboard = useBlockClipboard(editor.appView.app);
    clipboard.addBlock(blockId);

    return true;
  };
}

export function pasteAllBlocksFromClipboard(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    throw new Error("未实现：pasteAllBlocksFromClipboard");
  };
}

/**
 * 移动一个块到指定位置
 * @param blockId 要移动的块，如果不指定，默认为编辑器当前聚焦的块
 */
export function moveBlockTo(
  editor: TiptapEditor,
  blockId: BlockId | undefined,
  parent: BlockId | null,
  index: number
): Command {
  return function (state, dispatch) {
    let tgtId = blockId;
    if (!tgtId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      tgtId = listItemInfo.node.attrs.blockId as BlockId;
      if (!tgtId) return false;
    }

    if (!dispatch) return true;

    editor.appView.app.withTx((tx) => {
      tx.moveBlock(tgtId, parent, index);
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

/**
 * 移动多个块到指定位置
 * @param blockIds 要移动的所有块的 ID
 */
export function moveBlocksTo(
  editor: TiptapEditor,
  blockIds: BlockId[],
  parent: BlockId | null,
  index: number
): Command {
  return function (state, dispatch) {
    if (!dispatch) return true;

    editor.appView.app.withTx((tx) => {
      for (let i = blockIds.length - 1; i >= 0; i--) {
        tx.moveBlock(blockIds[i]!, parent, index);
      }
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function deleteCharBefore(): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const { empty, anchor } = state.selection;
    if (!empty) return false; // 仅当没有选中内容时可用

    if (anchor > listItemInfo.pos + 2) {
      if (dispatch) {
        const tr = state.tr.delete(anchor - 1, anchor);
        dispatch(tr);
      }
      return true;
    }

    return false;
  };
}

export function deleteCharAfter(): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;

    const { empty, anchor } = state.selection;
    if (!empty) return false; // 仅当没有选中内容时可用

    if (anchor + 1 < listItemInfo.pos + listItemInfo.node.nodeSize - 1) {
      if (dispatch) {
        const tr = state.tr.delete(anchor, anchor + 1);
        dispatch(tr);
      }
      return true;
    }

    return false;
  };
}

export function updateCodeblockLang(
  editor: TiptapEditor,
  blockId: BlockId | undefined,
  lang: string
): Command {
  return function (state, dispatch) {
    let tgtId = blockId;
    if (!tgtId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      tgtId = listItemInfo.node.attrs.blockId as BlockId;
      if (!tgtId) return false;
    }

    const tgtBlockData = editor.appView.app.getBlockData(tgtId);
    if (tgtBlockData == null || tgtBlockData.type !== "code") return false;

    if (!dispatch) return true;

    const json = JSON.parse(tgtBlockData.content);
    const oldNode = editor.schema.nodeFromJSON(json);
    const newNode = editor.schema.nodes.codeblock!.create(
      {
        ...oldNode.attrs,
        lang,
      },
      oldNode.content,
      oldNode.marks
    );

    editor.appView.app.withTx((tx) => {
      tx.updateBlock(tgtId, { content: contentNodeToStr(newNode) });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function convertToTagBlock(
  editor: TiptapEditor,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    const app = editor.appView.app;
    const { t } = useI18n();

    let targetBlockNode: BlockNode | null = null;
    if (blockId) {
      targetBlockNode = app.getBlockNode(blockId);
    } else {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;
      const targetBlockId = listItemInfo.node.attrs.blockId as BlockId;
      targetBlockNode = app.getBlockNode(targetBlockId);
    }
    if (!targetBlockNode) return false;
    const targetBlockId = targetBlockNode.id;
    const targetBlockData = targetBlockNode.data.toJSON() as BlockDataInner;

    // 已经是标签块了
    const type = targetBlockData.type;
    if (type === "tag") {
      const msg = t("commands.convertToTagBlock.alreadyTagBlock");
      showToast({
        title: msg as string,
        variant: "warning",
      });
      return false;
    }
    // 不是文本块，不能转为标签块
    if (type !== "text") {
      const msg = t("commands.convertToTagBlock.onlyTextBlockCanBeTagBlock");
      showToast({
        title: msg as string,
        variant: "warning",
      });
      return false;
    }

    // 标签块不能有子块
    const children = targetBlockNode.children() ?? [];
    if (children.length > 0) {
      const msg = t("commands.convertToTagBlock.tagBlockCannotHaveChildren");
      showToast({
        title: msg as string,
        variant: "warning",
      });
      return false;
    }

    const pnodeJson = JSON.parse(targetBlockData.content);
    const pnode = state.schema.nodeFromJSON(pnodeJson);
    if (!pnode) return false;
    const tnode = state.schema.nodes.tag!.create({}, pnode.content);

    app.withTx((tx) => {
      tx.updateBlock(targetBlockId, {
        type: "tag",
        content: JSON.stringify(tnode.toJSON()),
        folded: true,
      });
      tx.setOrigin("localEditorStructural");
      tx.setSelection({
        viewId: editor.appView.id,
        blockId: targetBlockId,
        anchor: 0,
        head: 0,
        scrollIntoView: true,
      });
    });
    return true;
  };
}

export function updateTagBlockAttrs(
  editor: TiptapEditor,
  blockId: BlockId | undefined,
  patch: Partial<TagAttrs>
): Command {
  return function (state, dispatch) {
    let tgtId = blockId;
    if (!tgtId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      tgtId = listItemInfo.node.attrs.blockId as BlockId;
      if (!tgtId) return false;
    }

    const tgtBlockData = editor.appView.app.getBlockData(tgtId);
    if (tgtBlockData == null || tgtBlockData.type !== "tag") return false;

    if (!dispatch) return true;

    const json = JSON.parse(tgtBlockData.content);
    const oldNode = editor.schema.nodeFromJSON(json);
    const newNode = editor.schema.nodes.tag!.create(
      {
        ...oldNode.attrs,
        ...patch,
      },
      oldNode.content
    );

    editor.appView.app.withTx((tx) => {
      tx.updateBlock(tgtId, { content: JSON.stringify(newNode.toJSON()) });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function updateSarchBlockAttrs(
  editor: TiptapEditor,
  blockId: BlockId | undefined,
  patch: Partial<SearchAttrs>
): Command {
  return function (state, dispatch) {
    let tgtId = blockId;
    if (!tgtId) {
      const listItemInfo = findCurrListItem(state);
      if (!listItemInfo) return false;

      tgtId = listItemInfo.node.attrs.blockId as BlockId;
      if (!tgtId) return false;
    }

    const tgtBlockData = editor.appView.app.getBlockData(tgtId);
    if (tgtBlockData == null || tgtBlockData.type !== "search") return false;

    if (!dispatch) return true;

    const json = JSON.parse(tgtBlockData.content);
    const oldNode = editor.schema.nodeFromJSON(json);
    const newNode = editor.schema.nodes.search!.create(
      {
        ...oldNode.attrs,
        ...patch,
      },
      oldNode.content
    );

    editor.appView.app.withTx((tx) => {
      tx.updateBlock(tgtId, { content: JSON.stringify(newNode.toJSON()) });
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}

export function numberingChildren(
  editor: TiptapEditor,
  format: NumberFormat,
  blockId?: BlockId
): Command {
  return function (state, dispatch) {
    // let tgtId = blockId;
    // if (!tgtId) {
    //   const listItemInfo = findCurrListItem(state);
    //   if (!listItemInfo) return false;

    //   tgtId = listItemInfo.node.attrs.blockId as BlockId;
    //   if (!tgtId) return false;
    // }

    // const tgtBlockData = editor.appView.app.getBlockData(tgtId);
    // if (tgtBlockData == null || tgtBlockData.type !== "text") return false;

    // if (!dispatch) return true;

    // editor.appView.app.withTx((tx) => {
    //   tx.updateBlock(tgtId, { nc: format });
    //   tx.setOrigin("localEditorStructural");
    // });
    // return true;
    throw new Error("未实现：numberingChildren");
  };
}

export function zoomin(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    const listItemInfo = findCurrListItem(state);
    if (!listItemInfo) return false;
    const blockId = listItemInfo.node.attrs.blockId as BlockId;

    const rootBlockIds = editor.appView.getRootBlockIds();
    if (rootBlockIds.length === 0 && rootBlockIds[0] === blockId) return false;

    if (!dispatch) return true;

    editor.appView.app.withTx((tx) => {
      editor.appView.setRootBlockIds([blockId]);
      const children = tx.getChildrenIds(blockId) ?? [];
      if (children.length > 0) {
        tx.setSelection({
          viewId: editor.appView.id,
          blockId: children[0]!,
          anchor: 0,
        });
        tx.setOrigin("localEditorStructural");
      } else {
        tx.abort();
      }
    });

    return true;
  };
}

export function zoomout(editor: TiptapEditor): Command {
  return function (state, dispatch) {
    editor.appView.app.withTx((tx) => {
      const rootBlockIds = editor.appView.getRootBlockIds();
      if (rootBlockIds.length > 1) {
        tx.abort();
        return;
      }

      const rootBlockId = rootBlockIds[0]!;
      const parentId = tx.getParentId(rootBlockId);
      if (parentId != null) {
        editor.appView.setRootBlockIds([parentId]);
      } else {
        editor.appView.setRootBlockIds([]);
      }
      if (parentId) {
        tx.setSelection({
          viewId: editor.appView.id,
          blockId: parentId,
          anchor: 0,
        });
      }
      tx.setOrigin("localEditorStructural");
    });
    return true;
  };
}
