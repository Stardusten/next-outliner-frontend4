import { MenuItem } from "@/composables/useContextMenu";
import { BlockId, BlockNode, SelectionInfo } from "../common/types";
import { AppStep12 } from "./app";
import { createSignal, Signal } from "solid-js";
import { PendingImport } from "@/composables/useImportExport";
import { RepoConfig } from "../repo/schema";
import { SearchResult } from "@/composables/useSearch";
import { ZoomingStackItem } from "../app-views/editable-outline/commands";
import type { Node } from "@tiptap/pm/model";

export function initUiStates(app: AppStep12) {
  return Object.assign(app, {
    blockCutted: createSignal<BlockId[]>([]),
    contextmenu: {
      isOpenSignal: createSignal(false),
      anchorPointSignal: createSignal<{ x: number; y: number } | null>(null),
      itemsSignal: createSignal<MenuItem[]>([]),
    },
    deleteBlockConfirm: {
      openSignal: createSignal(false),
      blockId: null as BlockId | null,
      selection: undefined as SelectionInfo | undefined,
    },
    imageRename: {
      openSignal: createSignal(false),
      currentName: null as string | null,
      handleRename: null as ((newName: string) => void) | null,
    },
    importExport: {
      importDialogVisibleSignal: createSignal(false),
      importBlockCountSignal: createSignal(0),
      pendingImportSignal: createSignal<PendingImport | null>(null),
      clearStorageDialogVisibleSignal: createSignal(false),
      clearHistoryDialogVisibleSignal: createSignal(false),
    },
    mainRoots: null as Signal<BlockId[]> | null,
    search: {
      visibleSignal: createSignal(false),
      querySignal: createSignal(""),
      resultsSignal: createSignal<SearchResult[]>([]),
      activeIndexSignal: createSignal(0),
    },
    settings: {
      visibleSignal: createSignal(false),
      currentPageSignal: createSignal("appearance"),
    },
    zooming: {
      stack: <ZoomingStackItem[]>[],
    },
    tagSelector: {
      openSignal: createSignal(false),
      blockId: null as BlockId | null,
    },
    blockRefCompletion: {
      visibleSignal: createSignal(false),
      querySignal: createSignal(""),
      positionSignal: createSignal<{ x: number; y: number } | null>(null),
      availableBlocksSignal: createSignal<BlockNode[]>([]),
      activeIndexSignal: createSignal(0),
      debounceTimer: undefined as number | undefined,
    },
  });
}
