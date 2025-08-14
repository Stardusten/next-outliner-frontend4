import { execQuery } from "@/lib/app/query";
import type { BlockDataInner, BlockId, BlockNode } from "@/lib/common/types";
import { Node } from "@tiptap/pm/model";
import type { EditableOutlineView } from "../editable-outline";

export function renderBlock(params: {
  editor: EditableOutlineView;
  blockNode: BlockNode;
  level: number;
  overrideAttrs?: Record<string, any>;
  rootOnly?: boolean;
}): Node[] {
  const { editor, blockNode, level, overrideAttrs, rootOnly } = params;
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  switch (blockData.type) {
    case "text":
      return renderTextBlock({
        editor,
        blockNode,
        level,
        overrideAttrs,
        rootOnly,
      });
    case "code":
      return renderCodeBlock({
        editor,
        blockNode,
        level,
        overrideAttrs,
        rootOnly,
      });
    case "search":
      return renderSearchBlock({
        editor,
        blockNode,
        level,
        overrideAttrs,
        rootOnly,
      });
    case "tag":
      return renderTagBlock({
        editor,
        blockNode,
        level,
        overrideAttrs,
        rootOnly,
      });
    default:
      throw new Error(`unexpected block type. got "${blockData.type}"`);
  }
}

function renderTextBlock(params: {
  editor: EditableOutlineView;
  blockNode: BlockNode;
  blockData?: BlockDataInner;
  level: number;
  overrideAttrs?: Record<string, any>;
  rootOnly?: boolean;
}): Node[] {
  let { editor, blockNode, blockData, level, overrideAttrs, rootOnly } = params;
  if (!editor.tiptap) throw new Error("tiptap no init");
  const schema = editor.tiptap.schema;
  const result: Node[] = [];
  blockData = blockData ?? (blockNode.data.toJSON() as BlockDataInner);

  if (blockData.type !== "text")
    throw new Error(
      `unexpected block type. expect "text", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;
  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem;
  const paragraphNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "text",
      ...overrideAttrs,
    },
    paragraphNode
  );
  result.push(listItemNode);

  // 如果块有子节点且未被折叠，递归渲染子节点
  if (hasChildren && !blockData.folded && !rootOnly) {
    for (const child of children) {
      const childNodes = renderBlock({
        editor,
        blockNode: child,
        level: level + 1,
      });
      result.push(...childNodes);
    }
  }

  return result;
}

function renderCodeBlock(params: {
  editor: EditableOutlineView;
  blockNode: BlockNode;
  blockData?: BlockDataInner;
  level: number;
  overrideAttrs?: Record<string, any>;
  rootOnly?: boolean;
}): Node[] {
  let { editor, blockNode, blockData, level, overrideAttrs, rootOnly } = params;
  if (!editor.tiptap) throw new Error("tiptap no init");
  const schema = editor.tiptap.schema;
  const result: Node[] = [];
  blockData = blockData ?? (blockNode.data.toJSON() as BlockDataInner);

  if (blockData.type !== "code")
    throw new Error(
      `unexpected block type. expect "code", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;
  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem;
  const paragraphNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "code",
      ...overrideAttrs,
    },
    paragraphNode
  );
  result.push(listItemNode);

  // 如果块有子节点且未被折叠，递归渲染子节点
  if (hasChildren && !blockData.folded && !rootOnly) {
    for (const child of children) {
      const childNodes = renderBlock({
        editor,
        blockNode: child,
        level: level + 1,
      });
      result.push(...childNodes);
    }
  }

  return result;
}

function renderSearchBlock(params: {
  editor: EditableOutlineView;
  blockNode: BlockNode;
  blockData?: BlockDataInner;
  level: number;
  overrideAttrs?: Record<string, any>;
  rootOnly?: boolean;
}): Node[] {
  let { editor, blockNode, blockData, level, overrideAttrs, rootOnly } = params;
  if (!editor.tiptap) throw new Error("tiptap no init");
  const schema = editor.tiptap.schema;
  const result: Node[] = [];
  blockData = blockData ?? (blockNode.data.toJSON() as BlockDataInner);

  if (blockData.type !== "search")
    throw new Error(
      `unexpected block type. expect "search", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  if (hasChildren) throw new Error("search block should not have children");

  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem;
  const searchNode = schema.nodeFromJSON(json);
  const res =
    !blockData.folded && execQuery(editor.app, searchNode.attrs.query);
  const searchNodeWithStatus = searchNode.type.create(
    {
      ...searchNode.attrs,
      status: !res ? undefined : res instanceof Error ? "invalid" : res.length,
    },
    searchNode.content,
    searchNode.marks
  );

  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "search",
      ...overrideAttrs,
    },
    searchNodeWithStatus
  );
  result.push(listItemNode);

  // 如果未折叠，执行 query 得到搜索结果
  // 然后将搜索结果视为子节点递归渲染
  if (!blockData.folded && !rootOnly) {
    if (res instanceof Error) {
      console.error("Invalid query result", res);
    } else {
      for (const id of res as BlockId[]) {
        const blockNode = editor.app.getBlockNode(id);
        if (blockNode == null) {
          console.warn(`Failed to get blockNode with blockId ${id}`);
          continue;
        }
        const rendered = renderBlock({
          editor,
          blockNode,
          level: level + 1,
          overrideAttrs: {
            isSearchResultRoot: true,
            showPath: searchNode.attrs.showPath,
          },
        });
        result.push(...rendered);
      }
    }
  }

  return result;
}

function renderTagBlock(params: {
  editor: EditableOutlineView;
  blockNode: BlockNode;
  blockData?: BlockDataInner;
  level: number;
  overrideAttrs?: Record<string, any>;
  rootOnly?: boolean;
}): Node[] {
  let { editor, blockNode, blockData, level, overrideAttrs, rootOnly } = params;
  if (!editor.tiptap) throw new Error("tiptap no init");
  const schema = editor.tiptap.schema;
  blockData = blockData ?? (blockNode.data.toJSON() as BlockDataInner);

  if (blockData.type !== "tag")
    throw new Error(
      `unexpected block type. expect "tag", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  if (hasChildren) throw new Error("tag block should not have children");

  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem;
  const tagNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "tag",
      ...overrideAttrs,
    },
    tagNode
  );
  return [listItemNode];
}

export function renderOutline(editor: EditableOutlineView): Node {
  if (!editor.tiptap) throw new Error("tiptap no init");
  const schema = editor.tiptap.schema;

  const listItemNodes: Node[] = [];

  const rootBlockIds =
    editor.rootBlockIds.length === 0
      ? editor.app.getRootBlockIds()
      : editor.rootBlockIds;

  for (const rootBlockId of rootBlockIds) {
    const blockNode = editor.app.getBlockNode(rootBlockId);
    if (blockNode == null) {
      console.warn(`Failed to get blockNode with blockId ${rootBlockId}`);
      continue;
    }
    const rendered = renderBlock({
      editor,
      blockNode,
      level: 0,
    });
    listItemNodes.push(...rendered);
  }

  // 创建文档节点
  const { doc: docType } = schema.nodes;
  const multiRoot = listItemNodes.length > 1;
  return docType.create({ multiRoot }, listItemNodes);
}
