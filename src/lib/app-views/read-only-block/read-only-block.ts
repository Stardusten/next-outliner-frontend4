import type { App } from "@/lib/app/app";
import { getBlockNode } from "@/lib/app/block-manage";
import type { BlockDataInner } from "@/lib/common/types/block";
import type { BlockId, BlockNode } from "@/lib/common/types/block";
import { schemaExts } from "@/lib/tiptap/schema";
import { Editor as TiptapEditor } from "@tiptap/core";
import { nanoid } from "nanoid";
import { FastListItem } from "../../tiptap/nodes/fast-list-item";
import { HighlightMatches } from "../../tiptap/functionalities/highlight-matches";
import type { AppView, AppViewId } from "@/lib/common/types/app-view";
import { HighlightCodeblock } from "@/lib/tiptap/functionalities/highlight-codeblock";

export class ReadonlyBlockView implements AppView {
  id: AppViewId;
  blockId: BlockId;
  app: App;
  tiptap: TiptapEditor | null;
  highlightTerms: string[];

  constructor(app: App, blockId: BlockId, viewId?: AppViewId) {
    this.id = viewId ?? nanoid();
    this.blockId = blockId;
    this.app = app;
    this.tiptap = null;
    this.highlightTerms = [];
  }

  mount(el: HTMLElement): void {
    const blockNode = getBlockNode(this.app, this.blockId)!; // TODO

    this.tiptap = new TiptapEditor({
      element: el,
      editable: false,
      extensions: [
        ...schemaExts,
        HighlightMatches,
        HighlightCodeblock,
        FastListItem,
      ],
    });
    this.tiptap.appView = this;

    // 我们用 fastListItem，使用纯 js 实现，渲染速度快得多
    const fastListItem = this.#toFastListItem(blockNode);
    const doc = this.tiptap.schema.nodes.doc!.create({}, [fastListItem]);
    this.tiptap.commands.setContent(doc);

    this.updateHighlightTerms(); // 初始化高亮
  }

  unmount(): void {
    this.tiptap?.destroy();
    this.tiptap = null;
  }

  updateHighlightTerms(terms?: string[]) {
    if (terms != null) this.highlightTerms = terms;
    if (this.tiptap) {
      const tr = this.tiptap.state.tr;
      tr.setMeta("highlightTerms", terms);
      this.tiptap.view.dispatch(tr);
    }
  }

  hasFocus(): boolean {
    return this.tiptap != null && this.tiptap.isFocused;
  }

  // 空实现
  on(args: any) {}
  off(args: any) {}

  #toFastListItem(blockNode: BlockNode) {
    if (!this.tiptap) throw new Error("tiptap not mounted");

    const schema = this.tiptap.schema;
    const blockData = blockNode.data.toJSON() as BlockDataInner;
    const json = JSON.parse(blockData.content);
    const node = schema.nodeFromJSON(json);
    const fastListItemNode = this.tiptap.schema.nodes.fastListItem!.create(
      {
        level: 0,
        blockId: blockNode.id,
        folded: blockData.folded,
        type: blockData.type,
      },
      node
    );

    return fastListItemNode;
  }
}
