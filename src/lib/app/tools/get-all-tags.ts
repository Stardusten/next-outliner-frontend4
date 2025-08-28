import type { App } from '../app';

/**
 * 获取笔记库中的所有标签
 */
export function getAllTags(app: App) {
  const [getTags] = app.tags;
  const tags = getTags();
  
  const result = [];
  for (const [blockId, tagAttrs] of tags.entries()) {
    const textContent = app.getTextContent(blockId);
    result.push({
      id: blockId,
      name: textContent,
      color: tagAttrs.color || null,
      fields: tagAttrs.fields || []
    });
  }
  
  return result;
}

export const getAllTagsTool = {
  name: 'get_all_tags',
  description: '获取笔记库中的所有标签',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
};