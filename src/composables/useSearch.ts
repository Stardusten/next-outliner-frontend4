import { createSignal } from "solid-js";
import type { App } from "@/lib/app/app";
import type { BlockNode } from "@/lib/common/types";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";

export type SearchResult = {
  block: BlockNode;
  score?: number;
};

export function useSearch(app: App) {
  const { visibleSignal, querySignal, resultsSignal, activeIndexSignal } =
    app.search;
  const [searchVisible, setSearchVisible] = visibleSignal;
  const [searchQuery, setSearchQuery] = querySignal;
  const [searchResults, setSearchResults] = resultsSignal;
  const [activeIndex, setActiveIndex] = activeIndexSignal;

  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setActiveIndex(0);
      return;
    }

    const searchResultsWithScore = app.searchBlocksWithScore(query, 100);
    const results: SearchResult[] = [];

    for (const { id, score } of searchResultsWithScore) {
      const blockNode = app.getBlockNode(id);
      if (blockNode) {
        const textContent = app.getTextContent(id, true);
        if (textContent && textContent.trim().length > 0) {
          results.push({ block: blockNode, score });
        }
      }
    }

    setSearchResults(results);
    setActiveIndex(0);
  };

  // 防抖执行搜索
  const DEBOUNCE_DELAY = 300; // ms
  let debounceTimer: number | undefined;
  const debouncedSearch = (query: string) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_DELAY);
  };

  const setQuery = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const setActiveIndexSafe = (index: number) => {
    const items = searchResults();
    if (index >= 0 && index < items.length) {
      setActiveIndex(index);
    }
  };

  const navigateDown = () => {
    const items = searchResults();
    if (items.length > 0) {
      const nextIndex = Math.min(activeIndex() + 1, items.length - 1);
      setActiveIndexSafe(nextIndex);
    }
  };

  const navigateUp = () => {
    const items = searchResults();
    if (items.length > 0) {
      const prevIndex = Math.max(activeIndex() - 1, 0);
      setActiveIndexSafe(prevIndex);
    }
  };

  const selectCurrentItem = () => {
    const currentItem = searchResults()[activeIndex()];
    if (currentItem) {
      selectBlock(currentItem);
    }
  };

  const selectBlock = (result: SearchResult) => {
    const editor = app.getLastFocusedAppView();
    if (editor instanceof EditableOutlineView) {
      editor.locateBlock(result.block.id);
    }
    closeSearch();
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setActiveIndex(0);
  };

  const openSearch = () => {
    setSearchVisible(true);
  };

  const closeSearch = () => {
    setSearchVisible(false);
    resetSearch();
  };

  return {
    // 状态
    searchVisible,
    searchQuery,
    searchResults,
    activeIndex,
    // 搜索功能
    setQuery,
    resetSearch,
    openSearch,
    closeSearch,
    // 导航功能
    setActiveIndex: setActiveIndexSafe,
    navigateDown,
    navigateUp,
    // 选择功能
    selectBlock,
    selectCurrentItem,
  };
}

export type UseSearchReturn = ReturnType<typeof useSearch>;
