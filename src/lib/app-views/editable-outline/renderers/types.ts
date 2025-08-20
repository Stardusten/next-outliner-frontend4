export type RenderOptions = {
  // 是否只渲染根块，不渲染子块
  rootOnly: boolean;
  // 如果根块只有一个，且是折叠的，是否需要视这个块是展开的
  expandFoldedRoot: boolean;
};
