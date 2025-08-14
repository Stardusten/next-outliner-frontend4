import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { common, createLowlight } from "lowlight";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// 创建 lowlight 实例
const lowlight = createLowlight(common);
const defaultLanguage = "plaintext";
export const languages = lowlight.listLanguages();

// 解析 lowlight 返回的节点结构
function parseNodes(
  nodes: any[],
  className: string[] = []
): { text: string; classes: string[] }[] {
  return nodes
    .map((node) => {
      const classes = [
        ...className,
        ...(node.properties ? node.properties.className : []),
      ];

      if (node.children) {
        return parseNodes(node.children, classes);
      }

      return {
        text: node.value,
        classes,
      };
    })
    .flat();
}

// 获取高亮节点（兼容 lowlight v1 和 v2）
function getHighlightNodes(result: any) {
  return result.value || result.children || [];
}

// 查找所有指定类型的节点
function findChildren(
  doc: ProseMirrorNode,
  predicate: (node: ProseMirrorNode) => boolean
) {
  const result: { node: ProseMirrorNode; pos: number }[] = [];

  doc.descendants((node, pos) => {
    if (predicate(node)) {
      result.push({ node, pos });
    }
  });

  return result;
}

// 生成装饰器
function getDecorations(doc: ProseMirrorNode, nodeName: string) {
  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === nodeName).forEach((block) => {
    let from = block.pos + 1;
    const language = block.node.attrs.lang || defaultLanguage;

    const shouldHighlight =
      language &&
      (languages.includes(language) || lowlight.registered(language));

    const nodes = shouldHighlight
      ? getHighlightNodes(lowlight.highlight(language, block.node.textContent))
      : getHighlightNodes(lowlight.highlightAuto(block.node.textContent));

    parseNodes(nodes).forEach((node) => {
      const to = from + node.text.length;

      if (node.classes.length) {
        const decoration = Decoration.inline(from, to, {
          class: node.classes.join(" "),
        });

        decorations.push(decoration);
      }

      from = to;
    });
  });

  return DecorationSet.create(doc, decorations);
}

const HIGHLIGHT_CODEBLOCK_NAME = "highlightCodeblock";

export const HighlightCodeblock = Extension.create({
  name: HIGHLIGHT_CODEBLOCK_NAME,
  addProseMirrorPlugins() {
    const nodeName = "codeblock";

    const highlightPlugin: Plugin = new Plugin({
      key: new PluginKey("highlight-codeblock"),

      state: {
        init: (_, { doc }) => getDecorations(doc, nodeName),
        apply: (transaction, decorationSet, oldState, newState) => {
          const oldNodeName = oldState.selection.$head.parent.type.name;
          const newNodeName = newState.selection.$head.parent.type.name;
          const oldNodes = findChildren(
            oldState.doc,
            (node) => node.type.name === nodeName
          );
          const newNodes = findChildren(
            newState.doc,
            (node) => node.type.name === nodeName
          );

          if (
            transaction.docChanged &&
            // 应用装饰器的条件：
            // 选区包含代码块节点
            ([oldNodeName, newNodeName].includes(nodeName) ||
              // 或者事务添加/删除了代码块节点
              newNodes.length !== oldNodes.length ||
              // 或者事务的变更完全包含了某个节点
              transaction.steps.some((step) => {
                // @ts-ignore
                return (
                  // @ts-ignore
                  step.from !== undefined &&
                  // @ts-ignore
                  step.to !== undefined &&
                  oldNodes.some((node) => {
                    // @ts-ignore
                    return (
                      // @ts-ignore
                      node.pos >= step.from &&
                      // @ts-ignore
                      node.pos + node.node.nodeSize <= step.to
                    );
                  })
                );
              }))
          ) {
            return getDecorations(transaction.doc, nodeName);
          }

          return decorationSet.map(transaction.mapping, transaction.doc);
        },
      },

      props: {
        decorations(state) {
          return highlightPlugin.getState(state);
        },
      },
    });

    return [highlightPlugin];
  },
});
