import type { BlockDataInner } from "@/lib/common/types/block";
import type { BlockNode } from "@/lib/common/types/block";
import { Node, Schema } from "@tiptap/pm/model";
import { RenderOptions } from "@/lib/common/types/app-view";
import { EditableOutlineView } from "../editable-outline";
import { execQuery } from "@/lib/app/query";

type RenderContext = {
  getSchema: () => Schema;
  queryExecutor: (query: string) => BlockNode[] | Error;
};

// 全量渲染器
export class FullRenderer {
  #renderContext: RenderContext;
  #options: RenderOptions;

  private constructor(ctx: RenderContext, options: RenderOptions) {
    this.#renderContext = ctx;
    this.#options = options;
  }

  static create(view: EditableOutlineView) {
    const queryExecutor = (query: string) => execQuery(view.app, query);
    const renderContext = {
      getSchema: () => view.tiptap!.schema,
      queryExecutor,
    };
    return new FullRenderer(renderContext, view.renderOptions);
  }

  renderBlock(
    blockNode: BlockNode,
    level: number,
    overrideAttrs: Record<string, any>
  ) {
    return renderBlock(
      blockNode,
      level,
      overrideAttrs,
      this.#renderContext,
      this.#options
    );
  }

  renderOutline(rootBlocks: BlockNode[]) {
    return renderOutline(rootBlocks, this.#renderContext, this.#options);
  }
}

const BLOCK_RENDERER_REGISTRY = {
  text: renderTextBlock,
  code: renderCodeBlock,
  search: renderSearchBlock,
  tag: renderTagBlock,
};

function renderBlock(
  blockNode: BlockNode,
  level: number,
  overrideAttrs: Record<string, any>,
  context: RenderContext,
  options: RenderOptions
): Node[] {
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const blockRenderer = BLOCK_RENDERER_REGISTRY[blockData.type];
  if (!blockRenderer) {
    throw new Error(`unexpected block type. got "${blockData.type}"`);
  }
  return blockRenderer(blockNode, level, overrideAttrs, context, options);
}

function renderTextBlock(
  blockNode: BlockNode,
  level: number,
  overrideAttrs: Record<string, any>,
  context: RenderContext,
  options: RenderOptions
): Node[] {
  const result: Node[] = [];
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const schema = context.getSchema();

  if (blockData.type !== "text")
    throw new Error(
      `unexpected block type. expect "text", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;
  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem!;
  const paragraphNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "text",
      vo: blockData.vo,
      ...overrideAttrs,
    },
    paragraphNode
  );
  result.push(listItemNode);

  // 指定 options.rootOnly 时，不渲染子节点
  if (hasChildren && !options.rootOnly) {
    // 如果块未被折叠，或者指定 expandFoldedRoot 且是根块，则渲染子节点
    if (!blockData.folded || (options.expandFoldedRoot && level === 0)) {
      for (const child of children) {
        const childNodes = renderBlock(
          child,
          level + 1,
          overrideAttrs,
          context,
          options
        );
        result.push(...childNodes);
      }
    }
  }

  return result;
}

function renderCodeBlock(
  blockNode: BlockNode,
  level: number,
  overrideAttrs: Record<string, any>,
  context: RenderContext,
  options: RenderOptions
): Node[] {
  const result: Node[] = [];
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const schema = context.getSchema();

  if (blockData.type !== "code")
    throw new Error(
      `unexpected block type. expect "code", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;
  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem!;
  const paragraphNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "code",
      vo: blockData.vo,
      ...overrideAttrs,
    },
    paragraphNode
  );
  result.push(listItemNode);

  // 指定 options.rootOnly 时，不渲染子节点
  if (hasChildren && !options.rootOnly) {
    // 如果块未被折叠，或者指定 expandFoldedRoot 且是根块，则渲染子节点
    if (!blockData.folded || (options.expandFoldedRoot && level === 0)) {
      for (const child of children) {
        const childNodes = renderBlock(
          child,
          level + 1,
          overrideAttrs,
          context,
          options
        );
        result.push(...childNodes);
      }
    }
  }

  return result;
}

function renderSearchBlock(
  blockNode: BlockNode,
  level: number,
  overrideAttrs: Record<string, any>,
  context: RenderContext,
  options: RenderOptions
): Node[] {
  const result: Node[] = [];
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const schema = context.getSchema();

  if (blockData.type !== "search")
    throw new Error(
      `unexpected block type. expect "search", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  if (hasChildren) throw new Error("search block should not have children");

  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem!;
  const searchNode = schema.nodeFromJSON(json);
  const res =
    !blockData.folded && context.queryExecutor(searchNode.attrs.query);
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
      vo: blockData.vo,
      ...overrideAttrs,
    },
    searchNodeWithStatus
  );
  result.push(listItemNode);

  // 指定 options.rootOnly 时，不渲染子节点
  if (hasChildren && !options.rootOnly) {
    // 如果块未被折叠，或者指定 expandFoldedRoot 且是根块，则渲染子节点
    if (!blockData.folded || (options.expandFoldedRoot && level === 0)) {
      // 执行 query 得到搜索结果
      // 然后将搜索结果视为子节点递归渲染
      if (res instanceof Error) {
        console.error("Invalid query result", res);
      } else {
        for (const child of res as BlockNode[]) {
          const rendered = renderBlock(
            child,
            level + 1,
            overrideAttrs,
            context,
            options
          );
          result.push(...rendered);
        }
      }
    }
  }

  return result;
}

function renderTagBlock(
  blockNode: BlockNode,
  level: number,
  overrideAttrs: Record<string, any>,
  context: RenderContext,
  options: RenderOptions
): Node[] {
  const result: Node[] = [];
  const blockData = blockNode.data.toJSON() as BlockDataInner;
  const schema = context.getSchema();

  if (blockData.type !== "tag")
    throw new Error(
      `unexpected block type. expect "tag", got "${blockData.type}"`
    );

  const children = blockNode.children();
  const hasChildren = children != null && children.length > 0;

  // if (hasChildren) throw new Error("tag block should not have children");

  const json = JSON.parse(blockData.content);
  const listItemType = schema.nodes.listItem!;
  const tagNode = schema.nodeFromJSON(json);
  const listItemNode = listItemType.create(
    {
      level,
      blockId: blockNode.id,
      folded: blockData.folded,
      hasChildren,
      type: "tag",
      vo: blockData.vo,
      ...overrideAttrs,
    },
    tagNode
  );
  result.push(listItemNode);

  // 指定 options.rootOnly 时，不渲染子节点
  if (hasChildren && !options.rootOnly) {
    // 如果块未被折叠，或者指定 expandFoldedRoot 且是根块，则渲染子节点
    if (!blockData.folded || (options.expandFoldedRoot && level === 0)) {
      for (const child of children) {
        const childNodes = renderBlock(
          child,
          level + 1,
          overrideAttrs,
          context,
          options
        );
        result.push(...childNodes);
      }
    }
  }

  return result;
}

function renderOutline(
  rootBlocks: BlockNode[],
  context: RenderContext,
  options: RenderOptions
): Node {
  const listItemNodes: Node[] = [];

  for (const rootBlock of rootBlocks) {
    const rendered = renderBlock(rootBlock, 0, {}, context, options);
    listItemNodes.push(...rendered);
  }

  // 创建文档节点
  const docType = context.getSchema().nodes.doc!;
  const multiRoot = listItemNodes.length > 1;
  return docType.create({ multiRoot }, listItemNodes);
}
