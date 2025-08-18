import { App } from "@/lib/app/app";
import { useMainRoots } from "./useMainRoots";
import { useRepoConfigs } from "./useRepoConfigs";
import { createMemo } from "solid-js";
import { BlockId, BlockNode } from "@/lib/common/types";
import {
  EditableOutlineView,
  EditableOutlineViewEvents,
} from "@/lib/app-views/editable-outline/editable-outline";
import { useCurrRepoConfig } from "./useCurrRepoConfig";

type BreadcrumbItem = {
  blockId?: BlockId;
  title: string;
};

export const useBreadcrumb = (app: App) => {
  const [mainRoots, setMainRoots] = useMainRoots();
  const currentRepo = useCurrRepoConfig();

  const items = createMemo(() => {
    const currentRepoData = currentRepo();
    if (!currentRepoData) throw new Error("No current repo");

    const res: BreadcrumbItem[] = [{ title: currentRepoData.title }];
    if (mainRoots().length === 1) {
      const rootBlockId = mainRoots()[0];
      if (!rootBlockId) return [];

      const rootBlock = app.getBlockNode(rootBlockId);
      if (rootBlock) {
        const path: BlockId[] = [];
        let currentBlock: BlockNode | null = rootBlock;

        while (currentBlock) {
          path.unshift(currentBlock.id);
          currentBlock = currentBlock.parent() ?? null;
        }

        path.forEach((blockId) => {
          const block = app.getBlockNode(blockId);
          if (block) {
            const title =
              app.getTextContent(blockId) || `块 ${blockId.slice(0, 8)}`;
            res.push({ blockId, title });
          }
        });
      }
    }

    return res;
  });

  const handleBreadcrumbClick = (blockId?: BlockId) => {
    const mainEditor = app.getAppViewById("main");
    if (!(mainEditor instanceof EditableOutlineView))
      throw new Error("Failed to find mainEditor");

    if (blockId) mainEditor.setRootBlockIds([blockId]);
    else mainEditor.setRootBlockIds([]); // TODO ??
  };

  return {
    items,
    handleBreadcrumbClick,
  };
};
