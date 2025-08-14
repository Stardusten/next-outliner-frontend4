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
} from "@/lib/tiptap/utils";
import { Editor as TiptapEditor } from "@tiptap/core";
import { AnyExtension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, Transaction, type Command } from "@tiptap/pm/state";
import type { Emitter } from "mitt";
import mitt from "mitt";
import { nanoid } from "nanoid";
import type { AppView, AppViewId } from "../types";
import { renderOutline } from "./renderers/basic-outline";
import { incrementalUpdate } from "./renderers/patchers";
import { Accessor, createSignal, Setter } from "solid-js";

declare module "@tiptap/core" {
  interface Editor {
    appView: EditableOutlineView;
  }
}

export type ExtensionFn = (editor: EditableOutlineView) => AnyExtension;

export type CompletionStatus = {
  from: number;
  to: number;
  query: string;
  trigger: "[[" | "【【" | "#";
  isTag?: boolean;
};

export type EditableOutlineViewOptions = {
  id: AppViewId;
  rootBlockIds: BlockId[];
  renderer: (editor: EditableOutlineView) => ProseMirrorNode;
  extensions: (AnyExtension | ExtensionFn)[];
};

export type EditableOutlineViewEvents = {
  "root-blocks-changed": { rootBlockIds: BlockId[] };
  completion: { status: CompletionStatus | null };
  "completion-next": void;
  "completion-prev": void;
  "completion-select": void;
  focus: void;
};

type Signal<T> = [Accessor<T>, Setter<T>];

const renderers = {
  basicOutline: renderOutline,
};

function withDefaults(
  params: Partial<EditableOutlineViewOptions>
): EditableOutlineViewOptions {
  return {
    id: params.id ?? nanoid(),
    rootBlockIds: params.rootBlockIds ?? [],
    renderer: params.renderer ?? renderers.basicOutline,
    extensions: params.extensions ?? schemaExts,
  };
}

const STORAGE_SYNC_META_KEY = "fromStorage";

export class EditableOutlineView implements AppView<EditableOutlineViewEvents> {
  id: AppViewId;
  app: App;
  tiptap: TiptapEditor | null;
  rootBlockIds: BlockId[];
  renderer: (editor: EditableOutlineView) => ProseMirrorNode;
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
  focusedBlockId: Signal<BlockId | null>;

  constructor(app: App, params: Partial<EditableOutlineViewOptions> = {}) {
    const options = withDefaults(params);
    this.id = options.id;
    this.app = app;
    this.tiptap = null;
    this.rootBlockIds = options.rootBlockIds;
    this.renderer = options.renderer;
    this.extensions = options.extensions.map((extension) =>
      typeof extension === "function" ? extension(this) : extension
    );
    this.#appTxCommittedHandler = null;
    this.#focusHandler = null;
    this.eb = mitt<EditableOutlineViewEvents>();
    this.on = this.eb.on;
    this.off = this.eb.off;
    this.deferredContentSyncTask = null;
    const { currentRepo } = useRepoConfigs();
    this.repoConfig = currentRepo;
    this.focusedBlockId = createSignal(null);
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

  getFocusedBlockId(): BlockId | null {
    if (!this.tiptap) throw new Error("Editor not mounted");
    const state = this.tiptap.state;
    const listItemInfo = findCurrListItem(state);
    return listItemInfo?.node.attrs.blockId ?? null;
  }

  setRootBlockIds(rootBlockIds: BlockId[]): void {
    this.rootBlockIds = rootBlockIds;
    // 触发一次重绘来更新视图
    if (this.tiptap) {
      this.#rerender(undefined, true);
    }
    // 触发根块变更事件
    this.eb.emit("root-blocks-changed", { rootBlockIds });
  }

  canUndo(): boolean {
    throw new Error("Not implemented");
  }

  canRedo(): boolean {
    throw new Error("Not implemented");
  }

  undo(): void {
    throw new Error("Not implemented");
  }

  redo(): void {
    throw new Error("Not implemented");
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
      const currentRoots =
        this.rootBlockIds.length > 0
          ? this.rootBlockIds
          : this.app.getRootBlockIds(); // todo

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
              commonAncestor = rootPath[i];
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
      const tr = this.tiptap.state.tr.setSelection(sel).scrollIntoView();
      this.tiptap.view.focus();
      this.tiptap.view.dispatch(tr);
    });
  }

  #rerender(selection?: SelectionInfo, fromStorageSync = false) {
    if (!this.tiptap) throw new Error("Editor not mounted");

    // 整个文档替换
    const newDoc = this.renderer(this);
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
      incrementalUpdate(this, appTx);

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
      const step = tr.steps[i];
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
        this.app.withTx((tx) => {
          tx.updateBlock(blockId, newData);
          tx.setOrigin("localEditorContent" + this.id);
          beforeSelection && tx.setBeforeSelection(beforeSelection);
        });
      }
    }
  }

  #startTxCommittedListener() {
    this.#appTxCommittedHandler = (event) => {
      if (!this.tiptap) return;

      // 如果事件是来自本地编辑器的内容变更，则不更新视图
      if (event.meta.origin === "localEditorContent" + this.id) return;

      const incrementalUpdate = this.repoConfig().editor.incrementalUpdate;
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
