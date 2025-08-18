import { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import type { BlockId, BlockType } from "../common/types";
import { detachedSchema } from "./schema";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, EditorView } from "@tiptap/pm/view";
import { addHighlightEphemeral } from "./functionalities/highlight-ephermal";

/**
 * @param contentNode Paragraph、Codeblock 是内容节点
 */
export function contentNodeToStr(contentNode: ProseMirrorNode): string {
  return JSON.stringify(contentNode.toJSON());
}

export function str2ContentNode(schema: Schema, str: string): ProseMirrorNode {
  try {
    const json = JSON.parse(str);
    return schema.nodeFromJSON(json);
  } catch (error) {
    // 如果反序列化失败，返回一个空的段落节点
    console.warn(
      "Failed to deserialize content. content=",
      str,
      "error=",
      error
    );
    return schema.nodes.paragraph!.create();
  }
}

export function contentNodeToStrAndType(node: ProseMirrorNode): {
  type: BlockType;
  content: string;
} {
  const paragraph = detachedSchema.nodes.paragraph!;
  const codeblock = detachedSchema.nodes.codeblock!;
  const search = detachedSchema.nodes.search!;
  const tag = detachedSchema.nodes.tag!;

  // xxx
  const type =
    node.type.name === paragraph.name
      ? "text"
      : node.type.name === codeblock.name
      ? "code"
      : node.type.name === search.name
      ? "search"
      : node.type.name === tag.name
      ? "tag"
      : "text";
  const content = contentNodeToStr(node);
  return { type, content };
}

export function buildBlockRefStr(blockId: BlockId) {
  return `block-id:${blockId}`;
}

export function parseBlockRefStr(str: string) {
  const prefix = "block-id:";
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return null;
}

/**
 * 将相对一个块开头的偏移量转换为文档内的绝对位置
 */
export function getAbsPos(
  doc: ProseMirrorNode,
  blockId: BlockId,
  offset: number
): number | null {
  let absolutePos: number | null = null;
  const listItem = detachedSchema.nodes.listItem!;

  doc.descendants((node, pos) => {
    if (absolutePos !== null) return false; // 已找到，停止搜索

    if (node.type.name === listItem.name && node.attrs.blockId === blockId) {
      // listItem 的内容是 paragraph，文本从 pos + 2 开始。
      const paragraphNode = node.firstChild;
      if (paragraphNode) {
        const maxOffset = paragraphNode.content.size;
        const finalOffset = Math.min(offset, maxOffset);
        absolutePos = pos + 1 + 1 + finalOffset;
      }
      return false; // 停止搜索
    }
  });
  return absolutePos;
}

export function findCurrListItem(state: EditorState) {
  const { $from } = state.selection;
  const listItem = detachedSchema.nodes.listItem!;

  for (let i = $from.depth; i > 0; i--) {
    const node = $from.node(i);
    if (node.type.name === listItem.name) {
      return { node, depth: i, pos: $from.before(i) };
    }
  }
  return null;
}

/**
 *  查找包含给定文档位置的 listItem 节点
 * @param doc Prosemirror 文档
 * @param pos 文档中的绝对位置
 */
export function findListItemAtPos(doc: ProseMirrorNode, pos: number) {
  const $pos = doc.resolve(pos);
  const listItem = detachedSchema.nodes.listItem!;

  for (let i = $pos.depth; i > 0; i--) {
    const node = $pos.node(i);
    if (node.type.name === listItem.name) {
      return { node, pos: $pos.before(i) };
    }
  }
  return null;
}

export function getSelectedListItemInfo(state: EditorState) {
  const { from, to } = state.selection;
  const startItemInfo = findListItemAtPos(state.doc, from);
  const endItemInfo = findListItemAtPos(state.doc, to);
  return {
    start: startItemInfo,
    end: endItemInfo,
    cross: startItemInfo?.pos !== endItemInfo?.pos,
  };
}

export function scrollPmNodeIntoView(
  editor: EditorView,
  pos: number,
  args?: ScrollIntoViewOptions
) {
  const dom = editor.domAtPos(pos);
  if (dom.node instanceof HTMLElement) {
    dom.node.scrollIntoView({
      block: "center",
      behavior: "smooth",
      inline: "nearest",
      ...args,
    });
  }
}

export function highlightEphemeral(
  view: EditorView,
  pos: number,
  timeout: number = 3000
) {
  const listItem = findListItemAtPos(view.state.doc, pos);
  if (!listItem) return;
  addHighlightEphemeral(view, listItem.pos, timeout);
}
