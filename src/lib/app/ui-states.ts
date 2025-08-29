import { MenuItem } from "@/composables/useContextMenu";
import { BlockId, BlockNode } from "../common/types/block";
import { ViewParams } from "../common/types/app-view";
import { AppStep12 } from "./app";
import { createSignal, Signal } from "solid-js";
import { PendingImport } from "@/composables/useImportExport";
import { RepoConfig } from "../repo/schema";
import { SearchResult } from "@/composables/useSearch";
import { ZoomingStackItem } from "../app-views/editable-outline/commands";
import type { Node } from "@tiptap/pm/model";
import type { TagAttrs } from "../tiptap/nodes/tag";

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
      viewParams: undefined as ViewParams | undefined,
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
    tagEditor: {
      openSignal: createSignal(false),
      blockId: null as BlockId | null,
      attrs: null as TagAttrs | null,
    },
    blockRefCompletion: {
      visibleSignal: createSignal(false),
      querySignal: createSignal(""),
      positionSignal: createSignal<{ x: number; y: number } | null>(null),
      availableBlocksSignal: createSignal<BlockNode[]>([]),
      activeIndexSignal: createSignal(0),
      debounceTimer: undefined as number | undefined,
    },
    blockPropertiesDialog: {
      openSignal: createSignal(false),
      blockId: null as BlockId | null,
    },
  });
}
