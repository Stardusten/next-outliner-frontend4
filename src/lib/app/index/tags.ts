import { createSignal, Signal } from "solid-js";
import { AppStep13 } from "../app";
import { BlockDataInner, BlockId, BlockNode } from "@/lib/common/types";
import { ReactiveMap } from "@solid-primitives/map";
import { TagAttrs } from "@/lib/tiptap/nodes/tag";
import { calcMatchScore, hybridTokenize } from "./tokenize";

function getAttrsFromContent(content: string) {
  const json = JSON.parse(content);
  return json.attrs;
}

export function initTagsIndex(app: AppStep13) {
  const tagsSignal = createSignal(new ReactiveMap<BlockId, TagAttrs>());

  app.on("tx-committed", (e) => {
    const [getTtags, setTags] = tagsSignal;
    const tags = getTtags();

    for (const change of e.executedOps) {
      if (change.type === "block:create") {
        if (change.data.type === "tag") {
          tags.set(change.blockId, getAttrsFromContent(change.data.content));
        }
      } else if (change.type === "block:delete") {
        if (change.oldData.type === "tag") {
          tags.delete(change.blockId);
        }
      } else if (change.type === "block:update") {
        const { blockId, oldData, newData } = change;
        if (oldData.type !== "tag" && newData.type === "tag") {
          tags.set(blockId, getAttrsFromContent(newData.content));
        } else if (oldData.type === "tag" && newData.type !== "tag") {
          tags.delete(blockId);
        }
      }
      setTags(tags);
    }
  });

  // 初始化时全量加载一次 tags
  const [getTtags, setTags] = tagsSignal;
  const tags = getTtags();
  for (const blockNode of app.getAllNodes()) {
    const type = blockNode.data.get("type");
    if (type === "tag") {
      const data = blockNode.data.toJSON() as BlockDataInner;
      const attrs = getAttrsFromContent(data.content);
      tags.set(blockNode.id, attrs);
    }
  }
  setTags(tags);

  const result = Object.assign(app, {
    tags: tagsSignal,

    // 添加更优雅的标签访问方法
    getTagAttrs(tagId: BlockId): TagAttrs | null {
      const [getTags] = tagsSignal;
      return getTags().get(tagId) || null;
    },

    hasTag(tagId: BlockId): boolean {
      const [getTags] = tagsSignal;
      return getTags().has(tagId);
    },

    getAllTagIds(): BlockId[] {
      const [getTags] = tagsSignal;
      return Array.from(getTags().keys());
    },

    getAllTagAttrs(): Map<BlockId, TagAttrs> {
      const [getTags] = tagsSignal;
      return new Map(getTags());
    },

    searchTags(
      query?: string,
      filter?: (blockNode: BlockNode) => boolean
    ): BlockNode[] {
      if (query && query.trim().length > 0) {
        const [getTags] = tagsSignal;
        const tags = getTags();

        const queryTokens = hybridTokenize(query, {
          caseSensitive: false,
          cjkNGram: 1,
          includePrefix: false,
          removeDiacritics: app.fulltextConfig.ignoreDiacritics,
        });

        const idAndScores: { id: BlockId; score: number }[] = [];
        for (const blockId of tags.keys()) {
          const textContent = app.getTextContent(blockId);
          const score = calcMatchScore(queryTokens, textContent);
          idAndScores.push({ id: blockId, score });
        }
        idAndScores.sort((a, b) => b.score - a.score);

        return idAndScores
          .filter((idAndScore) => idAndScore.score > 0)
          .map((item) => app.getBlockNode(item.id))
          .filter((b) => b != null && (!filter || filter(b))) as BlockNode[];
      } else return [];
    },
  });

  return result;
}
