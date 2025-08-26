import { useRepoConfigs } from "@/composables/useRepoConfigs";
import type { App, AppEvents } from "@/lib/app/app";
import type { BlockId, SelectionInfo } from "@/lib/common/types";
import type { RepoConfig } from "@/lib/repo/schema";
import { schemaExts } from "@/lib/tiptap/schema";
import {
  contentNodeToStrAndType,
  findCurrListItem,
  findListItemAtPos,
  getAbsPos,
  highlightEphemeral,
  scrollPmNodeIntoView,
} from "@/lib/tiptap/utils";
import { Editor as TiptapEditor } from "@tiptap/core";
import { AnyExtension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, Transaction, type Command } from "@tiptap/pm/state";
import type { Emitter } from "mitt";
import mitt from "mitt";
import { nanoid } from "nanoid";
import type { AppView, AppViewId } from "../types";
import { Accessor, createEffect, createSignal, Setter } from "solid-js";
import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";
import { FullRenderer } from "./renderers/full";
import { Patcher } from "./renderers/patch";
import { RenderOptions } from "./renderers/types";

declare module "@tiptap/core" {
  interface Editor {
    appView: AppView<any>;
  }
}

export type ExtensionFn = (editor: EditableOutlineView) => AnyExtension;

export type CompletionStatus = {
  from: number;
  to: number;
  query: string;
  trigger: "[[" | "【【" | "#";
  isTag?: boolean;
  fromCompositionEnd?: boolean;
};

export type EditableOutlineViewOptions = {
  id: AppViewId;
  rootBlockIds: BlockId[];
  extensions: (AnyExtension | ExtensionFn)[];
  expandFoldedRoot: boolean;
};

export type EditableOutlineViewEvents = {
  "root-blocks-changed": { rootBlockIds: BlockId[] };
  focus: void;
};

type Signal<T> = [Accessor<T>, Setter<T>];

function withDefaults(
  params: Partial<EditableOutlineViewOptions>
): EditableOutlineViewOptions {
  return {
    id: params.id ?? nanoid(),
    rootBlockIds: params.rootBlockIds ?? [],
    extensions: params.extensions ?? schemaExts,
    expandFoldedRoot: params.expandFoldedRoot ?? true,
  };
}

const STORAGE_SYNC_META_KEY = "fromStorage";

export class EditableOutlineView implements AppView<EditableOutlineViewEvents> {
  id: AppViewId;
  app: App;
  tiptap: TiptapEditor | null;
  extensions: AnyExtension[];

  // 事件监听器
  #appTxCommittedHandler: ((event: AppEvents["tx-committed"]) => void) | null;
  #focusHandler: (() => void) | null;

  // 事件总线
  eb: Emitter<EditableOutlineViewEvents>;
  on: Emitter<EditableOutlineViewEvents>["on"];
  off: Emitter<EditableOutlineViewEvents>["off"];
  deferredContentSyncTask: (() => void) | null;

  repoConfig: Accessor<RepoConfig | null>;
  lastFocusedBlockId: Signal<BlockId | null>;
  rootBlockIds: Signal<BlockId[]>;

  // 渲染器
  renderOptions: RenderOptions;
  fullRenderer: FullRenderer;
  patcher: Patcher;

  constructor(app: App, params_: Partial<EditableOutlineViewOptions> = {}) {
    const params = withDefaults(params_);
    this.id = params.id;
    this.app = app;
    this.tiptap = null;
    this.rootBlockIds = createSignal(params.rootBlockIds);
    this.extensions = params.extensions.map((e) =>
      typeof e === "function" ? e(this) : e
    );
    this.#appTxCommittedHandler = null;
    this.#focusHandler = null;
    this.eb = mitt<EditableOutlineViewEvents>();
    this.on = this.eb.on;
    this.off = this.eb.off;
    this.deferredContentSyncTask = null;
    this.repoConfig = useCurrRepoConfig(app);
    this.lastFocusedBlockId = createSignal<BlockId | null>(null);

    this.renderOptions = {
      rootOnly: false,
      expandFoldedRoot: params.expandFoldedRoot,
    };
    this.fullRenderer = FullRenderer.create(this);
    this.patcher = Patcher.create(this);

    // 监听 rootBlockIds 的变化，如果变化，则重绘编辑器
    createEffect(() => {
      const [getRootBlockIds] = this.rootBlockIds;
      const rootBlockIds = getRootBlockIds();
      this.eb.emit("root-blocks-changed", { rootBlockIds });
      if (this.tiptap) this.#rerender(undefined, true);
    });
  }

  mount(el: HTMLElement): void {
    if (this.tiptap) {
      console.warn("Editor already mounted, unmount it");
      this.unmount();
    }

    const tiptap = new TiptapEditor({
      element: el,
      extensions: this.extensions,
      injectCSS: false,
    });
    tiptap.appView = this; // 用于在 tiptap 中访问 appView
    this.tiptap = tiptap;

    // 覆盖默认的 dispatchTransaction
    this.tiptap.view.props.dispatchTransaction =
      this.#wrapDispatchTransaction();

    // 注册 focus 监听器
    this.#focusHandler = () => {
      this.eb.emit("focus");
    };
    this.tiptap.view.dom.addEventListener("focus", this.#focusHandler);

    setTimeout(() => {
      this.#rerender();
      this.#startTxCommittedListener();
    });
  }

  unmount(): void {
    this.tiptap?.destroy();
  }

  hasFocus(): boolean {
    return this.tiptap != null && this.tiptap.isFocused;
  }

  execCommand(command: Command, dispatch?: boolean) {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const view = this.tiptap.view;
    if (dispatch) command(view.state, view.dispatch, view);
    else command(view.state, undefined, undefined);
  }

  getSelectionInfo(): SelectionInfo | null {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const state = this.tiptap.state;
    const sel = state.selection;
    const listItemInfo = findCurrListItem(state);
    return listItemInfo && listItemInfo.node.attrs.blockId
      ? {
          viewId: this.id,
          blockId: listItemInfo.node.attrs.blockId,
          anchor: sel.from - (listItemInfo.pos + 2),
        }
      : null;
  }

  coordAtPos(pos: number): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const coords = this.tiptap.view.coordsAtPos(pos);
    return {
      left: coords.left,
      right: coords.right,
      top: coords.top,
      bottom: coords.bottom,
    };
  }

  getLastFocusedBlockId(): BlockId | null {
    const [getter] = this.lastFocusedBlockId;
    return getter();
  }

  getFocusingBlockId(): BlockId | null {
    if (!this.tiptap?.isFocused) return null;
    return this.getLastFocusedBlockId();
  }

  setRootBlockIds(rootBlockIds: BlockId[]): void {
    const [_, setRootBlockIds] = this.rootBlockIds;
    setRootBlockIds(rootBlockIds);
  }

  getRootBlockIds(): BlockId[] {
    const [getRootBlockIds] = this.rootBlockIds;
    return getRootBlockIds();
  }

  canUndo(): boolean {
    return this.app.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.app.redoStack.length > 0;
  }

  async undo(): Promise<void> {
    const { app } = this;
    if (app.undoStack.length === 0) return;
    const lastTx = app.undoStack.pop()!;

    const afterSelection = this.getSelectionInfo();
    lastTx.afterSelection = afterSelection ?? undefined;

    const id2Tmp: Record<BlockId, BlockId> = {};
    const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;

    const result = await app.withTx((tx) => {
      for (let i = lastTx.executedOps.length - 1; i >= 0; i--) {
        const op = lastTx.executedOps[i]!;

        if (op.type === "block:create") {
          const blockId = mapId(op.blockId);
          tx.deleteBlock(blockId);
        } else if (op.type === "block:delete") {
          const oldParentId = op.oldParent ? mapId(op.oldParent) : null;
          const newBlockId = tx.createBlockUnder(oldParentId, op.oldIndex, {
            type: op.oldData.type,
            folded: op.oldData.folded,
            content: op.oldData.content,
            vo: op.oldData.vo,
          });
          id2Tmp[op.blockId] = newBlockId;
        } else if (op.type === "block:move") {
          const targetId = mapId(op.blockId);
          const parentId = op.oldParent ? mapId(op.oldParent) : null;
          tx.moveBlock(targetId, parentId, op.oldIndex);
        } else if (op.type === "block:update") {
          const blockId = mapId(op.blockId);
          tx.updateBlock(blockId, op.oldData);
        }
      }

      if (lastTx.beforeSelection) {
        const sel = lastTx.beforeSelection;
        const mappedSel = {
          ...sel,
          blockId: mapId(sel.blockId),
        };
        tx.setSelection(mappedSel);
      }
      tx.setOrigin("undoRedo");
    });

    const txIdMapping = result.idMapping;

    for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
      const realId = txIdMapping[tmpId] || tmpId;
      app.idMapping[oldId as BlockId] = realId;
    }

    app.redoStack.push(lastTx);
  }

  async redo(): Promise<void> {
    const { app } = this;
    if (app.redoStack.length === 0) return;
    const lastTx = app.redoStack.pop()!;

    const id2Tmp: Record<BlockId, BlockId> = {};
    const mapId = (id: BlockId) => id2Tmp[id] ?? app.idMapping[id] ?? id;

    const result = await app.withTx((tx) => {
      for (let i = 0; i < lastTx.executedOps.length; i++) {
        const op = lastTx.executedOps[i]!;

        if (op.type === "block:create") {
          const parentId = op.parent ? mapId(op.parent) : null;
          const newBlockId = tx.createBlockUnder(parentId, op.index, {
            type: op.data.type,
            folded: op.data.folded,
            content: op.data.content,
            vo: op.data.vo,
          });
          id2Tmp[op.blockId] = newBlockId;
        } else if (op.type === "block:delete") {
          const blockId = mapId(op.blockId);
          tx.deleteBlock(blockId);
        } else if (op.type === "block:move") {
          const targetId = mapId(op.blockId);
          const parentId = op.parent ? mapId(op.parent) : null;
          tx.moveBlock(targetId, parentId, op.index);
        } else if (op.type === "block:update") {
          const blockId = mapId(op.blockId);
          tx.updateBlock(blockId, op.newData);
        }
      }

      if (lastTx.afterSelection) {
        const sel = lastTx.afterSelection;
        const mappedSel = {
          ...sel,
          blockId: mapId(sel.blockId),
        };
        tx.setSelection(mappedSel);
      }
      tx.setOrigin("undoRedo");
    });

    const txIdMapping = result.idMapping;

    for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
      const realId = txIdMapping[tmpId] || tmpId;
      app.idMapping[oldId as BlockId] = realId;
    }

    app.undoStack.push(lastTx);
  }

  async locateBlock(blockId: BlockId) {
    await this.app.withTx((tx) => {
      // 1. 获取目标块的完整路径
      const targetPath = tx.getBlockPath(blockId);
      if (!targetPath) {
        return;
      }

      // 2. 展开所有祖先块中折叠的块
      // targetPath 包含目标块本身，所以我们需要排除最后一个元素
      const ancestors = targetPath.slice(0, -1);
      for (const ancestorId of ancestors) {
        tx.updateBlock(ancestorId, { folded: false });
      }

      // 3. 确定根块：找到当前根块与目标块的公共父块
      const rootBlockIds = this.getRootBlockIds();
      const currentRoots =
        rootBlockIds.length > 0 ? rootBlockIds : this.app.getRootBlockIds(); // todo

      let newRootBlocks: BlockId[] = [];

      if (currentRoots.length === 0 || currentRoots.length > 1) {
        // 如果当前没有根块，显示所有根块
        newRootBlocks = [];
      } else {
        // 寻找公共父块
        let commonAncestor: BlockId | null = null;

        for (const rootId of currentRoots) {
          const rootPath = tx.getBlockPath(rootId);
          if (!rootPath) continue;

          for (
            let i = 0;
            i < Math.min(rootPath.length, targetPath.length);
            i++
          ) {
            if (rootPath[i] === targetPath[i]) {
              commonAncestor = rootPath[i]!;
            } else {
              break;
            }
          }

          if (commonAncestor) {
            break;
          }
        }

        // 如果找到公共祖先，使用它作为新的根块
        if (commonAncestor) {
          newRootBlocks = [commonAncestor];
        } else {
          // 如果没有公共祖先，显示所有根块
          newRootBlocks = [];
        }
      }
      this.setRootBlockIds(newRootBlocks);
      tx.setOrigin("localEditorStructural");
    });

    // 聚焦到目标块
    setTimeout(() => {
      if (!this.tiptap) return;
      const doc = this.tiptap.state.doc;
      const absPos = getAbsPos(doc, blockId, 0);
      if (absPos == null) return;
      const sel = TextSelection.create(doc, absPos);
      const tr = this.tiptap.state.tr.setSelection(sel);
      this.tiptap.view.focus();
      this.tiptap.view.dispatch(tr);
      // 使用自定义的滚动函数，支持动画 + 滚动到中间
      scrollPmNodeIntoView(this.tiptap.view, absPos);
      // 高亮目标块
      highlightEphemeral(this.tiptap.view, absPos);
    });
  }

  #rerender(selection?: SelectionInfo, fromStorageSync = false) {
    if (!this.tiptap) throw new Error("Editor not mounted");

    // 计算根块
    const [getRootBlockIds] = this.rootBlockIds;
    let rootNodes = getRootBlockIds()
      .map((id) => this.app.getBlockNode(id))
      .filter((node) => node != null);

    if (rootNodes.length == 0) rootNodes = this.app.tree.roots();

    // 整个文档替换
    const newDoc = this.fullRenderer.renderOutline(rootNodes);
    const state = this.tiptap.state;
    let tr = state.tr.replaceWith(0, state.doc.content.size, newDoc);

    // 如果是来自存储同步，加上 STORAGE_SYNC_META_KEY 标记
    if (fromStorageSync) {
      tr = tr.setMeta(STORAGE_SYNC_META_KEY, true);
    }

    // 如果指定了要恢复的选区，并且选区属于当前编辑器，则恢复
    let setSelectionSuccess = false;
    if (selection != null && selection.viewId === this.id) {
      const anchor = getAbsPos(tr.doc, selection.blockId, selection.anchor);
      const head = selection.head
        ? getAbsPos(tr.doc, selection.blockId, selection.head) ?? undefined
        : undefined;
      if (anchor !== null) {
        tr = tr.setSelection(TextSelection.create(tr.doc, anchor, head));
        setSelectionSuccess = true;
      }
      if (selection.scrollIntoView) {
        tr = tr.scrollIntoView();
      }
      if (selection.highlight && anchor !== null) {
        setTimeout(() => {
          highlightEphemeral(this.tiptap!.view, anchor);
        });
      }
      this.tiptap.view.focus();
    }

    // 如果恢复选区失败，则设置选区为文档开头
    // 防止选中整个文档
    if (!setSelectionSuccess) {
      tr = tr.setSelection(TextSelection.create(tr.doc, 0));
    }

    this.tiptap.view.dispatch(tr);
  }

  async #patchStateAccAppTx(appTx: AppEvents["tx-committed"]) {
    if (!this.tiptap) return;

    try {
      // 执行增量更新
      this.patcher.updateView(appTx);

      // 恢复选区
      const selection = appTx.meta.selection;
      if (selection != null && selection.viewId === this.id) {
        const state = this.tiptap.state;
        const anchor = getAbsPos(
          state.doc,
          selection.blockId,
          selection.anchor
        );
        const head = selection.head
          ? getAbsPos(state.doc, selection.blockId, selection.head) ?? undefined
          : undefined;

        if (anchor !== null) {
          let tr = state.tr.setSelection(
            TextSelection.create(state.doc, anchor, head)
          );

          if (selection.scrollIntoView) {
            tr = tr.scrollIntoView();
          }

          if (selection.highlight && anchor !== null) {
            setTimeout(() => {
              highlightEphemeral(this.tiptap!.view, anchor);
            });
          }

          this.tiptap.view.dispatch(tr);
          this.tiptap.view.focus();
        }
      }
    } catch (error) {
      console.warn("增量更新失败，回退到全量重绘:", error);
      this.#rerender(appTx.meta.selection, true);
    }
  }

  #wrapDispatchTransaction() {
    // 保存 tiptap 的实现
    if (!this.tiptap) throw new Error("Editor not mounted");
    const defaultImpl = this.tiptap.view.props.dispatchTransaction!;

    return (transaction: Transaction) => {
      if (!this.tiptap) throw new Error("Editor not mounted");

      // 先记录当前选区
      const beforeSelection = this.getSelectionInfo() ?? undefined;

      // 调用默认实现
      defaultImpl(transaction);

      // 如果文档内容被用户修改，则同步到应用层
      if (
        transaction.docChanged &&
        !transaction.getMeta(STORAGE_SYNC_META_KEY)
      ) {
        // 如果使用输入法输入，则在 compositionend 事件时才触发同步
        if (this.tiptap.view.composing) {
          this.deferredContentSyncTask = () => {
            this.#syncContentChangesToApp(transaction, beforeSelection);
            this.deferredContentSyncTask = null;
          };
        } else {
          this.#syncContentChangesToApp(transaction, beforeSelection);
        }
      }
    };
  }

  #syncContentChangesToApp(tr: Transaction, beforeSelection?: SelectionInfo) {
    // 这样做能 work，基于传入的 transaction 的每个 step 只操作单个 listItem
    // 不会一个 step 操作多个 listItem
    //
    // 遍历所有 step，然后将 step 涉及范围内的一个 pos（from 或 pos）
    // 映射到新文档，然后添加到 positions 中
    const positions: number[] = [];
    for (let i = 0; i < tr.steps.length; i++) {
      const step = tr.steps[i]!;
      const mapping = tr.mapping.slice(i);

      if ("from" in step) {
        if (typeof step.from === "number") {
          const fromNew = mapping.map(step.from, -1);
          positions.push(fromNew);
        }
      } else if ("pos" in step) {
        if (typeof step.pos === "number") {
          const fromNew = mapping.map(step.pos, -1);
          positions.push(fromNew);
        }
      }
    }

    const updatedIds = new Set<BlockId>();
    for (const pos of positions) {
      const listItem = findListItemAtPos(tr.doc, pos);
      if (listItem != null) {
        const blockId = listItem.node.attrs.blockId as BlockId;

        // 如果已经更新过，则跳过，防止重复更新一个块
        if (updatedIds.has(blockId)) continue;
        updatedIds.add(blockId);

        const newData = contentNodeToStrAndType(listItem.node.firstChild!);
        // console.log(newData);
        
        // 使用防抖：同一个编辑器内同一个块的连续编辑会被防抖合并
        this.app.withTx(
          (tx) => {
            tx.updateBlock(blockId, newData);
            tx.setOrigin("localEditorContent" + this.id);
            beforeSelection && tx.setBeforeSelection(beforeSelection);
          },
          {
            // 按编辑器ID和块ID分组防抖，确保不同块之间不会互相影响
            debounceKey: `${this.id}-${blockId}`,
            // 500ms 防抖延迟，用户停止输入 500ms 后才真正执行事务
            debounceDelay: 500,
          }
        );
      }
    }
  }

  #startTxCommittedListener() {
    this.#appTxCommittedHandler = (event) => {
      if (!this.tiptap) return;

      // 如果事件是来自本地编辑器的内容变更，则不更新视图
      if (event.meta.origin === "localEditorContent" + this.id) return;

      const incrementalUpdate = this.repoConfig()?.editor.incrementalUpdate;
      if (incrementalUpdate) this.#patchStateAccAppTx(event);
      else {
        const selection =
          event.meta.selection ?? this.getSelectionInfo() ?? undefined;
        this.#rerender(selection, true);
      }
    };
    this.app.on("tx-committed", this.#appTxCommittedHandler);
  }
}
