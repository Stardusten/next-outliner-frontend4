import type { App } from '../app';

/**
 * 在笔记库中搜索标签
 */
export function searchTags(app: App, query: string) {
  const matchedNodes = app.searchTags(query);
  
  return matchedNodes.map(node => {
    const [getTags] = app.tags;
    const tags = getTags();
    const tagAttrs = tags.get(node.id);
    
    return {
      id: node.id,
      name: app.getTextContent(node.id),
      color: tagAttrs?.color || null,
      fields: tagAttrs?.fields || []
    };
  });
}

export const searchTagsTool = {
  name: 'search_tags',
  description: '在笔记库中搜索标签',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词'
      }
    },
    required: ['query']
  }
};