import {
  EditableOutlineView,
  type CompletionStatus,
} from "@/lib/app-views/editable-outline/editable-outline";
import type { App } from "@/lib/app/app";
import { calcMatchScore, hybridTokenize } from "@/lib/app/index/tokenize";
import { extractBlockRefs } from "@/lib/app/util";
import type { BlockDataInner, BlockId, BlockNode } from "@/lib/common/types";
import { executeCompletion } from "@/lib/tiptap/functionalities/block-ref-completion";

export function useBlockRefCompletion(app: App) {
  const {
    visibleSignal,
    querySignal,
    positionSignal,
    availableBlocksSignal,
    activeIndexSignal,
  } = app.blockRefCompletion;
  const [visible, setCompletionVisible] = visibleSignal;
  const [query, setCompletionQuery] = querySignal;
  const [position, setCompletionPosition] = positionSignal;
  const [availableBlocks, setAvailableBlocks] = availableBlocksSignal;
  const [activeIndex, setCompletionActiveIndex] = activeIndexSignal;

  // 防抖加载可用块
  const DEBOUNCE_DELAY = 200; // ms，比搜索稍快一些
  // 使用 app.blockRefCompletion 中的持久化 debounceTimer
  const getDebounceTimer = () => app.blockRefCompletion.debounceTimer;
  const setDebounceTimer = (timer: number | undefined) => {
    app.blockRefCompletion.debounceTimer = timer;
  };

  const handleCompletionEvent = (
    editor: EditableOutlineView,
    status: CompletionStatus | null
  ) => {
    if (status) {
      setCompletionVisible(true);
      setCompletionQuery(status.query);
      const coords = editor.coordAtPos(status.from);
      setCompletionPosition({ x: coords.left, y: coords.bottom + 4 });

      // 如果事件来自 compositionend，直接加载可用块而不使用防抖
      if (status.fromCompositionEnd)
        immediateLoadAvailableBlocks(editor, status.query, status);
      else debouncedLoadAvailableBlocks(editor, status.query, status);

      setCompletionActiveIndex(0);
    } else {
      setCompletionVisible(false);
      setCompletionQuery("");
      setCompletionActiveIndex(0);
      // 清除防抖定时器，避免在关闭后还执行搜索
      const debounceTimer = getDebounceTimer();
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        setDebounceTimer(undefined);
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

  const calcTagCandidates = (query?: string) => {
    // 过滤掉当前聚焦的块中已经有的所有 tags
    let filteredTags: BlockId[] | null = null;
    const focusedBlockId = app.getFocusedBlockId();
    if (focusedBlockId) {
      const data = app.getBlockData(focusedBlockId);
      const schema = app.detachedSchema;
      if (data) {
        const json = JSON.parse(data.content);
        const pmNode = schema.nodeFromJSON(json);
        filteredTags = extractBlockRefs(pmNode, true);
      }
    }

    if (query && query.trim()) {
      const filter = filteredTags
        ? (n: BlockNode) => !filteredTags.includes(n.id)
        : undefined;
      const matchedTags = app.searchTags(app, query, filter);
      setAvailableBlocks(matchedTags);
    } else {
      const allTags: BlockNode[] = [];
      for (const blockId of app.tags[0]().keys()) {
        if (filteredTags?.includes(blockId)) continue;
        const blockNode = app.getBlockNode(blockId);
        if (blockNode) allTags.push(blockNode);
      }
      setAvailableBlocks(allTags);
    }
  };

  const calcBlockCandidates = (query?: string) => {
    const blocks: BlockNode[] = [];
    if (query && query.trim()) {
      const searchResults = app.searchBlocks(query, 100);

      const focusedEditor = app.getFocusingAppView();
      if (!(focusedEditor instanceof EditableOutlineView))
        throw new Error("Focused editor is not a TiptapEditorView");
      const focusedBlockId = focusedEditor
        ? focusedEditor.getLastFocusedBlockId()
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
        if (count >= 10) break;
        const textContent = app.getTextContent(blockNode.id);
        if (textContent && textContent.trim().length > 0) {
          blocks.push(blockNode);
          count++;
        }
      }
    }
    setAvailableBlocks(blocks);
  };

  // 直接加载可用块（清除计时器并立即加载）
  const immediateLoadAvailableBlocks = (
    editor: EditableOutlineView,
    query?: string,
    status?: CompletionStatus
  ) => {
    // console.log("immediateLoadAvailableBlocks", query);
    // 清除防抖定时器，避免重复加载
    const debounceTimer = getDebounceTimer();
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      setDebounceTimer(undefined);
    }

    // 根据触发符号决定调用哪个候选计算函数
    // 如果是 # 触发或者 isTag 为 true，则调用 calcTagCandidates
    // 如果是 [[ 或 【【 触发，则调用 calcBlockCandidates
    if (status?.isTag || status?.trigger === "#") {
      calcTagCandidates(query);
    } else {
      calcBlockCandidates(query);
    }
  };

  // 防抖版本的加载可用块
  const debouncedLoadAvailableBlocks = (
    editor: EditableOutlineView,
    query?: string,
    status?: CompletionStatus
  ) => {
    // console.log("debouncedLoadAvailableBlocks", query);
    const debounceTimer = getDebounceTimer();
    if (debounceTimer) window.clearTimeout(debounceTimer);
    const newTimer = window.setTimeout(() => {
      // 根据触发符号决定调用哪个候选计算函数
      // 如果是 # 触发或者 isTag 为 true，则调用 calcTagCandidates
      // 如果是 [[ 或 【【 触发，则调用 calcBlockCandidates
      if (status?.isTag || status?.trigger === "#") {
        calcTagCandidates(query);
      } else {
        calcBlockCandidates(query);
      }
    }, DEBOUNCE_DELAY);
    setDebounceTimer(newTimer);
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
      editor.tiptap && executeCompletion(selectedBlock.id, editor.tiptap.view);
      setCompletionVisible(false);
      // 清除防抖定时器
      const debounceTimer = getDebounceTimer();
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        setDebounceTimer(undefined);
      }
    }
  };

  return {
    app,
    visible,
    query,
    position,
    availableBlocks,
    activeIndex,
    handleCompletionEvent,
    handleCompletionNext,
    handleCompletionPrev,
    handleCompletionSelect,
  } as const;
}
