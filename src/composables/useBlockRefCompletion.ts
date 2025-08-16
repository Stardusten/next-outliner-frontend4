import { createSignal } from "solid-js";
import type { App } from "@/lib/app/app";
import type { BlockDataInner, BlockNode } from "@/lib/common/types";
import {
  EditableOutlineView,
  type CompletionStatus,
  type EditableOutlineViewEvents,
} from "@/lib/app-views/editable-outline/editable-outline";
import { executeCompletion } from "@/lib/tiptap/functionalities/block-ref-completion";

export function useBlockRefCompletion(app: App) {
  const [visible, setCompletionVisible] = createSignal(false);
  const [query, setCompletionQuery] = createSignal("");
  const [position, setCompletionPosition] = createSignal({
    x: 0,
    y: 0,
  });
  const [availableBlocks, setAvailableBlocks] = createSignal<BlockNode[]>([]);
  const [activeIndex, setCompletionActiveIndex] = createSignal(0);

  // 防抖加载可用块
  const DEBOUNCE_DELAY = 200; // ms，比搜索稍快一些
  let debounceTimer: number | undefined;

  function handleCompletionRelatedEvent(
    editor: EditableOutlineView,
    key: keyof EditableOutlineViewEvents,
    event: EditableOutlineViewEvents[keyof EditableOutlineViewEvents]
  ) {
    switch (key) {
      case "completion":
        handleCompletionEvent(
          editor,
          (event as EditableOutlineViewEvents["completion"]).status
        );
        break;
      case "completion-next":
        handleCompletionNext();
        break;
      case "completion-prev":
        handleCompletionPrev();
        break;
      case "completion-select":
        handleCompletionSelect(editor);
        break;
    }
  }

  const handleCompletionEvent = (
    editor: EditableOutlineView,
    status: CompletionStatus | null
  ) => {
    if (status) {
      setCompletionVisible(true);
      setCompletionQuery(status.query);
      const coords = editor.coordAtPos(status.from);
      setCompletionPosition({ x: coords.left, y: coords.bottom + 4 });
      debouncedLoadAvailableBlocks(editor, status.query);
      setCompletionActiveIndex(0);
    } else {
      setCompletionVisible(false);
      setCompletionQuery("");
      setCompletionActiveIndex(0);
      // 清除防抖定时器，避免在关闭后还执行搜索
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
    }
  };

  const onlyContainsOneBlockRef = (blockNode: BlockNode) => {
    const content = blockNode.data.toJSON() as BlockDataInner;
    const nodeJson = JSON.parse(content.content);
    const node = app.detachedSchema.nodeFromJSON(nodeJson);
    const blockRefType = app.detachedSchema.nodes.blockRef!.name;
    if (node.content.size == 1) {
      const fstChild = node.firstChild;
      if (fstChild && fstChild.type.name === blockRefType) {
        return true;
      }
    }
    return false;
  };

  const loadAvailableBlocks = (editor: EditableOutlineView, query?: string) => {
    const blocks: BlockNode[] = [];
    if (query && query.trim()) {
      const searchResults = app.searchBlocks(query, 100);

      const focusedEditor = app.getFocusingAppView();
      if (!(focusedEditor instanceof EditableOutlineView))
        throw new Error("Focused editor is not a TiptapEditorView");
      const focusedBlockId = focusedEditor
        ? focusedEditor.getFocusedBlockId()
        : null;

      for (const blockId of searchResults) {
        const blockNode = app.getBlockNode(blockId);
        if (blockNode) {
          // 总是不包含当前块，防止自引用
          if (focusedBlockId && blockNode.id === focusedBlockId) continue;
          // 只考虑文本块和标签块
          const type = blockNode.data.get("type");
          if (type !== "text" && type !== "tag") continue;
          // 剔除掉只包含一个 blockRef 的块
          if (onlyContainsOneBlockRef(blockNode)) continue;
          // 剔除掉文本内容为空的块
          const textContent = app.getTextContent(blockId);
          if (!textContent || textContent.trim().length == 0) continue;
          blocks.push(blockNode);
        }
      }
    } else {
      let count = 0;
      for (const blockNode of app.getAllNodes()) {
        if (count >= 10) return false;
        const textContent = app.getTextContent(blockNode.id);
        if (textContent && textContent.trim().length > 0) {
          blocks.push(blockNode);
          count++;
        }
        return true;
      }
    }
    setAvailableBlocks(blocks);
  };

  // 防抖版本的加载可用块
  const debouncedLoadAvailableBlocks = (
    editor: EditableOutlineView,
    query?: string
  ) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      loadAvailableBlocks(editor, query);
    }, DEBOUNCE_DELAY);
  };

  const handleBlockSelect = (editor: EditableOutlineView, block: BlockNode) => {
    editor.tiptap && executeCompletion(block.id, editor.tiptap.view);
    setCompletionVisible(false);
    // 清除防抖定时器
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  };

  const handleCompletionClose = () => {
    setCompletionVisible(false);
    // 清除防抖定时器
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  };

  const handleCompletionNext = () => {
    if (availableBlocks().length === 0) return;
    setCompletionActiveIndex((activeIndex() + 1) % availableBlocks().length);
  };

  const handleCompletionPrev = () => {
    if (availableBlocks().length === 0) return;
    const next = activeIndex() - 1;
    setCompletionActiveIndex(next < 0 ? availableBlocks().length - 1 : next);
  };

  const handleCompletionSelect = (editor: EditableOutlineView) => {
    const selectedBlock = availableBlocks()[activeIndex()];
    if (selectedBlock) {
      handleBlockSelect(editor, selectedBlock);
    }
  };

  return {
    app,
    visible,
    query,
    position,
    availableBlocks,
    activeIndex,
    handleBlockSelect,
    handleCompletionClose,
    handleCompletionRelatedEvent,
  } as const;
}
