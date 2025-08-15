import type { App } from "@/lib/app/app";
import type { BlockId, BlockNode } from "@/lib/common/types";
import {
  moveBlockTo,
  moveBlocksTo,
} from "@/lib/app-views/editable-outline/commands";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { createMemo, createSignal } from "solid-js";
import { useI18n } from "@/composables/useI18n";
import { showToast } from "@/components/ui/toast";

const [blockCutted, setBlockCutted] = createSignal<BlockId[]>([]);

export function useBlockClipboard(app: App) {
  const { t } = useI18n();

  const blockNodesCutted = createMemo<BlockNode[]>(() => {
    const res: BlockNode[] = [];
    for (const blockId of blockCutted()) {
      const node = app.getBlockNode(blockId);
      if (node) res.push(node);
    }
    return res;
  });

  const addBlock = (blockId: BlockId) => {
    const text = (app as any).getTextContent(blockId);
    if (!blockCutted().includes(blockId)) {
      setBlockCutted([...blockCutted(), blockId]);
      showToast({
        title: t("clipboardPopup.blockCutted", { content: text ?? "" }),
      });
    } else {
      showToast({
        title: t("clipboardPopup.blockAlreadyExists", { content: text ?? "" }),
      });
    }
  };

  const removeBlock = (blockId: BlockId) => {
    setBlockCutted(blockCutted().filter((id) => id !== blockId));
  };

  const removeAllBlocks = () => setBlockCutted([]);

  const _getFocusedInfo = () => {
    const appView = app.getLastFocusedAppView();
    if (!appView || !(appView instanceof EditableOutlineView)) {
      showToast({ title: t("clipboardPopup.noAppFocused") });
      return;
    }
    const focused = appView.getFocusedBlockId();
    if (!focused) {
      showToast({ title: t("clipboardPopup.noAppFocused") });
      return;
    }
    const focusedBlockNode = app.getBlockNode(focused);
    if (!focusedBlockNode) return;
    const parent = focusedBlockNode.parent()?.id ?? null;
    const index = focusedBlockNode.index()!;
    return { appView, parent, index };
  };

  const pasteBlock = (blockId: BlockId) => {
    const info = _getFocusedInfo();
    if (!info) return;
    const { appView, parent, index } = info;
    const cmd = moveBlockTo(appView.tiptap!, blockId, parent, index + 1);
    appView.execCommand(cmd, true);
    removeBlock(blockId);
    const text = (app as any).getTextContent(blockId);
    showToast({
      title: t("clipboardPopup.blockPasted", { content: text ?? "" }),
    });
  };

  const pasteAllBlocks = () => {
    const info = _getFocusedInfo();
    if (!info) return;
    const { appView, parent, index } = info;
    const n = blockNodesCutted().length;
    const cmd = moveBlocksTo(appView.tiptap!, blockCutted(), parent, index + 1);
    appView.execCommand(cmd, true);
    removeAllBlocks();
    showToast({ title: t("clipboardPopup.blocksPasted", { n }) });
  };

  return {
    blockCutted,
    blockNodesCutted,
    addBlock,
    removeBlock,
    removeAllBlocks,
    pasteBlock,
    pasteAllBlocks,
  } as const;
}
