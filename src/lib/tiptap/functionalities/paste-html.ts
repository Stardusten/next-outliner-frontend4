import { withTx } from "@/lib/app/tx";
import type { BlockId } from "@/lib/common/types";
import { Extension } from "@tiptap/core";
import {
  Fragment,
  Node as ProseMirrorNode,
  DOMParser as ProsemirrorDOMParser,
  Schema,
  Slice,
} from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { nanoid } from "nanoid";
import { isEmptyListItem } from "../../app-views/editable-outline/commands";
import { contentNodeToStrAndType, findCurrListItem } from "../utils";

const PASTE_HTML_OR_PLAIN_TEXT_NAME = "pasteHtmlOrPlainText";

type Block = {
  id: string;
  type: "text" | "code" | "search" | "tag";
  folded: boolean;
  content: string;
  parentId: string | null;
  children: Block[];
};

const blockTags: { [tagName: string]: boolean } = {
  ADDRESS: true,
  ARTICLE: true,
  ASIDE: true,
  BLOCKQUOTE: true,
  BODY: true,
  CANVAS: true,
  DD: true,
  DIV: true,
  DL: true,
  FIELDSET: true,
  FIGCAPTION: true,
  FIGURE: true,
  FOOTER: true,
  FORM: true,
  H1: true,
  H2: true,
  H3: true,
  H4: true,
  H5: true,
  H6: true,
  HEADER: true,
  HGROUP: true,
  HR: true,
  LI: true,
  NOSCRIPT: true,
  OL: true,
  OUTPUT: true,
  P: true,
  PRE: true,
  SECTION: true,
  TABLE: true,
  TFOOT: true,
  UL: true,
};

const ignoreTags: { [tagName: string]: boolean } = {
  HEAD: true,
  NOSCRIPT: true,
  OBJECT: true,
  SCRIPT: true,
  STYLE: true,
  TITLE: true,
};

const HTTP_LINK_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}(\.[a-zA-Z0-9()]{1,6})?\b([^\s]*)/g;

function linkify(fragment: Fragment): Fragment {
  const linkified: ProseMirrorNode[] = [];

  fragment.forEach((child) => {
    if (child.isText) {
      const text = child.text as string;
      let pos = 0,
        match;

      // eslint-disable-next-line no-cond-assign
      while ((match = HTTP_LINK_REGEX.exec(text))) {
        const start = match.index;
        const end = start + match[0].length;
        const linkMarkType = child.type.schema.marks["link"];

        // simply copy across the text from before the match
        if (start > 0) {
          linkified.push(child.cut(pos, start));
        }

        const urlText = text.slice(start, end);
        const linkMark = linkMarkType.create({ href: urlText });
        linkified.push(
          child.cut(start, end).mark(linkMark.addToSet(child.marks))
        );
        pos = end;
      }

      // copy over whatever is left
      if (pos < text.length) {
        linkified.push(child.cut(pos));
      }
    } else {
      linkified.push(child.copy(linkify(child.content)));
    }
  });

  return Fragment.fromArray(linkified);
}

function parseHtml(html: string, schema: Schema) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const ctx: Block[] = [];
  const blocks: Record<string, Block> = {};
  const domParser = ProsemirrorDOMParser.fromSchema(schema);

  function addBlock(dom: Node, ctx: Block[], parentId: string | null) {
    const pNode = schema.nodes.paragraph.create({});
    let pNode2 = domParser.parse(dom, { topNode: pNode });
    if (pNode2.content.size === 0) return;

    // 解析链接
    const linkified = linkify(pNode2.content);
    const slice = Slice.maxOpen(linkified);
    pNode2 = pNode2.replace(0, pNode2.content.size, slice);

    const id = nanoid();
    blocks[id] = {
      id,
      ...contentNodeToStrAndType(pNode2),
      parentId,
      children: [],
      folded: false, // 默认不折叠
    };
    ctx.push(blocks[id]);
  }

  function traverse(node: Node, ctx: Block[], parentId: string | null) {
    if (node instanceof HTMLOListElement || node instanceof HTMLUListElement) {
      const newCtx = ctx.length === 0 ? ctx : ctx[ctx.length - 1].children;
      const newParentId = ctx.length === 0 ? parentId : ctx[ctx.length - 1].id;
      for (const child of (node as HTMLElement).childNodes) {
        traverse(child, newCtx, newParentId); // 对每个子元素递归
      }
    } else if (node instanceof HTMLElement && blockTags[node.tagName]) {
      const childNodes = [...node.childNodes.values()];
      for (let i = 0; i < childNodes.length; i++) {
        let j = i;
        for (; j < childNodes.length; j++) {
          const jthChild = childNodes[j];
          if (jthChild instanceof HTMLElement && blockTags[jthChild.tagName])
            break;
        }
        if (j > i) {
          const el = document.createElement("div");
          el.append(...childNodes.slice(i, j));
          addBlock(el, ctx, parentId);
          el.remove();
        }
        if (j < childNodes.length) {
          traverse(childNodes[j], ctx, parentId);
        }
        i = j;
      }
    } else if (node instanceof HTMLElement && ignoreTags[node.tagName]) {
      return;
    } else {
      addBlock(node, ctx, parentId);
    }
  }

  traverse(doc.body, ctx, null); // 根块没有父块
  return [ctx, blocks] as const;
}

function tabToSpaces(text: string, indent: number) {
  return text.replace(/\t/g, " ".repeat(indent));
}

function normalizeSpaces(text: string) {
  return text.replace(/\s/g, " ");
}

export const PasteHtmlOrPlainText = Extension.create({
  name: PASTE_HTML_OR_PLAIN_TEXT_NAME,
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey(PASTE_HTML_OR_PLAIN_TEXT_NAME),
        props: {
          handlePaste(view, event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const schema = editor.appView.tiptap?.schema!;

            const currListItem = findCurrListItem(view.state);
            const currBlockId = currListItem?.node.attrs.blockId ?? null;
            if (currListItem == null || currBlockId == null) return true;

            // 在代码块中粘贴，不会创建出多个块
            if (
              currListItem.node?.firstChild?.type === schema.nodes.codeblock
            ) {
              let text = event.clipboardData?.getData("text/plain");
              if (text) {
                text = tabToSpaces(text, 2);
                const tr = view.state.tr;
                tr.replaceSelectionWith(schema.text(text));
                view.dispatch(tr);
              }
              schema;
              return true;
            }

            const html = event.clipboardData?.getData("text/html");
            // 粘贴了 html 内容
            if (html) {
              const [parsedTree, parsedBlocks] = parseHtml(html, schema);
              const cnt = Object.keys(parsedBlocks).length; // 解析出多少个块

              if (cnt <= 0) return true;
              else if (cnt == 1) {
                // 粘贴了一个块，则我们不创建新块，直接用粘贴的这个块的内容
                // 替换当前选区
                const block = parsedTree[0];
                const pNodeJson = JSON.parse(block.content);
                const pNode = schema.nodeFromJSON(pNodeJson);
                const tr = view.state.tr;
                const slice = new Slice(pNode.content, 0, 0);
                tr.replaceSelection(slice);
                view.dispatch(tr);
              } else {
                const idMapping = new Map<string, BlockId>(); // old id -> new id
                withTx(editor.appView.app, (tx) => {
                  // 粘贴了多于一个块，则粘贴所有块到当前块下方
                  const createTree = (block: Block, newBlockId: BlockId) => {
                    for (let i = 0; i < block.children.length; i++) {
                      const child = block.children[i];
                      const newChildId = tx.createBlockUnder(newBlockId, i, {
                        type: child.type,
                        folded: child.folded,
                        content: child.content,
                      });
                      idMapping.set(child.id, newChildId);
                      createTree(child, newChildId);
                    }
                  };

                  let lastRootId: BlockId | null = null;
                  let prevBlockId = currBlockId;
                  for (let i = 0; i < parsedTree.length; i++) {
                    const block = parsedTree[i];
                    if (block.parentId == null) {
                      const rootBlockId = tx.createBlockAfter(prevBlockId, {
                        type: block.type,
                        folded: block.folded,
                        content: block.content,
                      });
                      lastRootId = rootBlockId;
                      prevBlockId = rootBlockId;
                      idMapping.set(block.id, rootBlockId);
                      createTree(block, rootBlockId);
                    }
                  }

                  // 如果当前块为空，则删除当前块
                  if (
                    currListItem?.node &&
                    isEmptyListItem(currListItem.node)
                  ) {
                    tx.deleteBlock(currBlockId);
                  }

                  // 插入后，将光标移动到插入的最后一个块的末尾
                  if (lastRootId != null) {
                    const lastRootContent =
                      tx.getBlockData(lastRootId)!.content;
                    const lastRootJson = JSON.parse(lastRootContent);
                    const lastRootNode = schema.nodeFromJSON(lastRootJson);
                    schema;
                    tx.setSelection({
                      viewId: editor.appView.id,
                      blockId: lastRootId,
                      anchor: lastRootNode.nodeSize,
                      scrollIntoView: true,
                    });
                  }

                  tx.setOrigin("localEditorStructural");
                });
              }
              return true;
            }

            const text = event.clipboardData?.getData("text/plain");
            if (text) {
              // 粘贴了纯文本内容
              const lines = text
                .split("\n")
                .map((s) => normalizeSpaces(s.trim()))
                .filter((s) => s.length > 0);

              if (lines.length === 0) return true;
              else if (lines.length === 1) {
                const tr = view.state.tr;

                // 解析链接
                let frag = Fragment.from([schema.text(text)]);
                frag = linkify(frag);
                schema;
                const slice = Slice.maxOpen(frag);

                tr.replaceSelection(slice);
                view.dispatch(tr);
                return true;
              } else {
                // 粘贴了多行文本
                withTx(editor.appView.app, (tx) => {
                  let prevBlockId = currBlockId;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const tNode = schema.text(line);
                    const pNode = schema.nodes.paragraph.create({}, tNode);
                    const newBlockId = tx.createBlockAfter(prevBlockId, {
                      type: "text",
                      folded: false,
                      content: contentNodeToStrAndType(pNode).content,
                    });
                    prevBlockId = newBlockId;
                  }

                  // 如果当前块为空，则删除当前块
                  if (
                    currListItem?.node &&
                    isEmptyListItem(currListItem.node)
                  ) {
                    tx.deleteBlock(currBlockId);
                  }

                  tx.setSelection({
                    viewId: editor.appView.id,
                    blockId: prevBlockId,
                    anchor: 0,
                    scrollIntoView: true,
                  });
                  tx.setOrigin("localEditorStructural");
                });
              }
            }

            return true; // 确保粘贴事件不被其他插件和 ProseMirror 默认行为处理
          },
        },
      }),
    ];
  },
});
