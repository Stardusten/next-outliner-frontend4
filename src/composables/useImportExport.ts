import type { App } from "@/lib/app/app";
import { forceSave } from "@/lib/app/saver";
import { withTx } from "@/lib/app/tx";
import type {
  BlockDataInner,
  BlockId,
  BlockNode,
  BlockType,
} from "@/lib/common/types";
import { BLOCKS_TREE_NAME } from "@/lib/persistence/local-storage";
import { LoroDoc } from "loro-crdt";
import { Fragment, type Node } from "@tiptap/pm/model";
import { useMainRoots } from "./useMainRoots";
import { showToast } from "@/components/ui/toast";
import { createSignal } from "solid-js";

type Block = {
  id: string;
  type: "text" | "code";
  folded: boolean;
  parentId: string;
  fractionalIndex: number;
  content: string;
  children: Block[];
};

export const EXPORT_FORMATS = ".jsonl,.bsnapshot,.snapshot";

type ExportFormat = "jsonl" | "bsnapshot" | "snapshot";

type PendingImport =
  | {
      format: "bsnapshot";
      doc: LoroDoc;
    }
  | {
      format: "snapshot";
      doc: LoroDoc;
    }
  | {
      format: "jsonl";
      blocks: Map<string, Block>;
    };

function jsonToUint8Array(obj: Record<string, number>): Uint8Array {
  // 找到最大下标，决定数组长度
  const maxIndex = Math.max(...Object.keys(obj).map(Number));
  const arr = new Uint8Array(maxIndex + 1);

  for (const [k, v] of Object.entries(obj)) {
    arr[Number(k)] = Number(v); // 写入对应位置
  }
  return arr;
}

// Uint8Array -> Base64 字符串
function uint8ToBase64(u8: Uint8Array): string {
  // 分块处理大数组，避免栈溢出
  const CHUNK_SIZE = 8192; // 8KB chunks
  let binary = "";

  for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
    const chunk = u8.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// Base64 字符串 -> Uint8Array
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

const [importDialogVisible, setImportDialogVisible] = createSignal(false);
const [importBlockCount, setImportBlockCount] = createSignal(0);
const [pendingImport, setPendingImport] = createSignal<PendingImport | null>(
  null
);
const [clearStorageDialogVisible, setClearStorageDialogVisible] =
  createSignal(false);
const [clearHistoryDialogVisible, setClearHistoryDialogVisible] =
  createSignal(false);

export function useImportExport(app: App) {
  // 导出功能
  const handleExport = (format: ExportFormat = "bsnapshot") => {
    if (format == "snapshot") {
      const snapshot = app.doc.export({ mode: "snapshot" });
      const base64snapshot = uint8ToBase64(snapshot);
      const a = document.createElement("a");
      a.href = `data:application/json;base64,${base64snapshot}`;
      a.download = `${app.docId}_${new Date().toLocaleString()}.snapshot`;
      a.click();
      a.remove();
    } else if (format === "bsnapshot") {
      const snapshot = app.doc.export({ mode: "snapshot" });
      const blob = new Blob([snapshot], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${app.docId}_${new Date().toLocaleString()}.bsnapshot`;
      a.click();
      a.remove();
    }
  };

  // 导入功能
  const handleImport = async (file: File) => {
    try {
      if (file.name.endsWith(".jsonl")) {
        const content = await file.text();
        const lines = content.split("\n");

        const blockMap = new Map<string, Block>();
        for (const line of lines) {
          const block = JSON.parse(line) as Block;
          block.children = [];
          blockMap.set(block.id, block);
        }

        setImportBlockCount(blockMap.size);
        setImportDialogVisible(true);
        setPendingImport({
          format: "jsonl",
          blocks: blockMap,
        });
      } else if (file.name.endsWith(".snapshot")) {
        const bytesBase64 = await file.text();
        const bytes = base64ToUint8(bytesBase64);
        const doc = new LoroDoc();
        doc.import(bytes);
        setImportBlockCount(
          doc.getTree(BLOCKS_TREE_NAME)?.getNodes({ withDeleted: false })
            ?.length ?? 0
        );
        setImportDialogVisible(true);
        setPendingImport({
          format: "snapshot",
          doc,
        });
      } else if (file.name.endsWith(".bsnapshot")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const doc = new LoroDoc();
        doc.import(bytes);
        setImportBlockCount(
          doc.getTree(BLOCKS_TREE_NAME)?.getNodes({ withDeleted: false })
            ?.length ?? 0
        );
        setImportDialogVisible(true);
        setPendingImport({
          format: "bsnapshot",
          doc,
        });
      }
    } catch (error) {
      showToast({
        title: `导入失败：${error}`,
        variant: "error",
      });
    }
  };

  // 将块引用的 id 根据 idMapping 更新
  const applyIdMapping = (
    type: BlockType,
    content: string,
    old2tmp: Record<string, string>,
    tmp2new: Record<string, BlockId>
  ) => {
    const nodeJson = JSON.parse(content);
    const schema = app.detachedSchema;
    const node = schema.nodeFromJSON(nodeJson);
    const blockRefType = schema.nodes.blockRef;
    const paragraphType = schema.nodes.paragraph;
    const codeblockType = schema.nodes.codeblock;
    const searchType = schema.nodes.search;
    const tagType = schema.nodes.tag;

    const recur = (fragment: Fragment) => {
      const result: Node[] = [];

      fragment.forEach((child) => {
        if (child.type === blockRefType) {
          const oldId = child.attrs.blockId;
          const newId = tmp2new[old2tmp[oldId]] ?? oldId;
          const newNode = blockRefType.create({
            ...child.attrs,
            blockId: newId,
          });
          result.push(newNode);
        } else {
          result.push(child.copy(recur(child.content)));
        }
      });

      return Fragment.fromArray(result);
    };

    if (type == "text") {
      const paragraph = paragraphType.create(
        {
          ...node.attrs,
        },
        recur(node.content)
      );
      return JSON.stringify(paragraph.toJSON());
    } else if (type == "code") {
      const codeblock = codeblockType.create(
        { ...node.attrs },
        recur(node.content)
      );
      return JSON.stringify(codeblock.toJSON());
    } else if (type === "search") {
      // TODO maybe better idea?
      let query: string = node.attrs.query;
      for (const [k, v] of Object.entries(old2tmp)) {
        query = query.replaceAll(`"${k}"`, `"${v}"`);
        query = query.replaceAll(`${k}`, `${v}`);
      }
      for (const [k, v] of Object.entries(tmp2new)) {
        query = query.replaceAll(`"${k}"`, `"${v}"`);
        query = query.replaceAll(`${k}`, `${v}`);
      }
      const search = searchType.create(
        {
          ...node.attrs,
        },
        recur(node.content)
      );
      return JSON.stringify(search.toJSON());
    } else if (type === "tag") {
      const tag = tagType.create(
        {
          ...node.attrs,
        },
        recur(node.content)
      );
      return JSON.stringify(tag.toJSON());
    } else throw new Error("不支持的块类型");
  };

  // 处理导入确认
  const handleImportConfirm = async () => {
    const pi = pendingImport();
    if (!pi) return;

    try {
      if (pi.format === "jsonl") {
        // 导入 jsonl 文件，每条记录是一个块
        const blockMap = pi.blocks;

        for (const block of blockMap.values()) {
          if (block.parentId == null) continue; // 根块
          const parentBlock = blockMap.get(block.parentId);
          if (!parentBlock) {
            throw new Error(`父块 ${block.parentId} 不存在`);
          }
          parentBlock.children.push(block);
        }

        for (const block of blockMap.values()) {
          block.children.sort((a, b) => a.fractionalIndex - b.fractionalIndex);
        }

        const old2Tmp: Record<string, BlockId> = {};
        const { idMapping: tmp2New } = await withTx(app, (tx) => {
          const createTree = (block: Block, newBlockId: BlockId) => {
            for (let i = 0; i < block.children.length; i++) {
              const child = block.children[i];
              const newChildId = tx.createBlockUnder(newBlockId, i, {
                type: child.type,
                folded: child.folded,
                content: child.content, // 临时内容，之后需要应用 idMapping
              });
              old2Tmp[child.id] = newChildId;
              createTree(child, newChildId);
            }
          };

          [...blockMap.values()]
            .filter((block) => block.parentId == null)
            .sort((a, b) => a.fractionalIndex - b.fractionalIndex)
            .forEach((block, i) => {
              const rootBlockId = tx.createBlockUnder(null, i, {
                type: block.type,
                folded: block.folded,
                content: block.content, // 临时内容，之后需要应用 idMapping
              });
              old2Tmp[block.id] = rootBlockId;
              createTree(block, rootBlockId);
            });

          tx.setOrigin("localImport");
        });

        await withTx(app, (tx) => {
          for (const blockId of Object.values(tmp2New)) {
            const oldData = tx.getBlockData(blockId)!;
            const newContent = applyIdMapping(
              oldData.type,
              oldData.content,
              old2Tmp,
              tmp2New
            );
            tx.updateBlock(blockId, { content: newContent });
          }

          tx.setOrigin("localImport");
        });

        showToast({
          title: "导入成功！",
          variant: "success",
        });
        forceSave(app);
      } else if (pi.format === "snapshot" || pi.format === "bsnapshot") {
        // 导入 snapshot 或 bsnapshot 文件，整个文档是一个 LoroDoc 快照
        const importedDoc = pi.doc;

        const old2Tmp: Record<string, BlockId> = {};
        const { idMapping: tmp2New } = await withTx(app, (tx) => {
          const createTree = (node1: BlockNode, node2Id: BlockId) => {
            const node1children = node1.children() ?? [];
            for (let i = 0; i < node1children.length; i++) {
              const child = node1children[i];
              const childData = child.data.toJSON() as BlockDataInner;
              const newChildId = tx.createBlockUnder(node2Id, i, {
                type: childData.type,
                folded: childData.folded,
                content: childData.content, // 临时内容，之后需要应用 idMapping
              });
              old2Tmp[child.id] = newChildId;
              createTree(child, newChildId);
            }
          };

          const importedTree = importedDoc.getTree(BLOCKS_TREE_NAME);
          const importedRoots = importedTree.roots();
          for (let i = 0; i < importedRoots.length; i++) {
            const root1 = importedRoots[i];
            const rootData = root1.data.toJSON() as BlockDataInner;
            const newRootId = tx.createBlockUnder(null, i, {
              type: rootData.type,
              folded: rootData.folded,
              content: rootData.content, // 临时内容，之后需要应用 idMapping
            });
            old2Tmp[root1.id] = newRootId;
            createTree(root1, newRootId);
          }

          tx.setOrigin("localImport");
        });

        await withTx(app, (tx) => {
          for (const blockId of Object.values(tmp2New)) {
            const oldData = tx.getBlockData(blockId)!;
            const newContent = applyIdMapping(
              oldData.type,
              oldData.content,
              old2Tmp,
              tmp2New
            );
            tx.updateBlock(blockId, { content: newContent });
          }

          tx.setOrigin("localImport");
        });
      }

      showToast({
        title: "导入成功！",
        variant: "success",
      });
      forceSave(app);
    } catch (error) {
      showToast({
        title: `导入失败：${error}`,
        variant: "error",
      });
    } finally {
      handleImportCancel();
    }
  };

  // 处理导入取消
  const handleImportCancel = () => {
    setImportDialogVisible(false);
    setImportBlockCount(0);
    setPendingImport(null);
  };

  // 清空存储功能
  const handleClearStorage = () => {
    setClearStorageDialogVisible(true);
  };

  // 确认清空存储
  const handleClearStorageConfirm = () => {
    try {
      app.persistence.clear();
      forceSave(app);
      // 清空块存储记得也要清空 main editor 的根块，
      // 因为之前的根块可能已经不存在了
      const [mainRoots, setMainRoots] = useMainRoots();
      setMainRoots([]);
      showToast({
        title: "成功清空存储！",
        variant: "success",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      showToast({
        title: "清空存储失败，请查看控制台了解详情",
        variant: "error",
      });
    } finally {
      setClearStorageDialogVisible(false);
    }
  };

  // 取消清空存储
  const handleClearStorageCancel = () => {
    setClearStorageDialogVisible(false);
  };

  // 清空历史版本功能
  const handleClearHistory = () => {
    setClearHistoryDialogVisible(true);
  };

  // 确认清空历史版本
  const handleClearHistoryConfirm = () => {
    try {
      app.persistence.clearHistory(app.docId);
      app.updatesCount = 0;
      showToast({
        title: "已清空历史版本！",
        variant: "success",
      });
    } catch (error) {
      console.error("清空历史版本失败:", error);
      showToast({
        title: "清空历史版本失败，请查看控制台了解详情",
        variant: "error",
      });
    } finally {
      setClearHistoryDialogVisible(false);
    }
  };

  // 新增：取消清空历史版本
  const handleClearHistoryCancel = () => {
    setClearHistoryDialogVisible(false);
  };

  return {
    // 状态
    importDialogVisible,
    setImportDialogVisible,
    importBlockCount,
    setImportBlockCount,
    clearStorageDialogVisible,
    setClearStorageDialogVisible,
    clearHistoryDialogVisible,
    setClearHistoryDialogVisible,

    // 方法
    handleExport,
    handleImport,
    handleImportConfirm,
    handleImportCancel,
    handleClearStorage,
    handleClearStorageConfirm,
    handleClearStorageCancel,
    // 新增
    handleClearHistory,
    handleClearHistoryConfirm,
    handleClearHistoryCancel,
  };
}
