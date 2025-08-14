### Tiptap NodeView 实现要点（Solid + Kobalte）

本文基于 `src/components/node-views/ListItemView.tsx` 与 `src/components/node-views/BlockRefView.tsx` 的实现，总结在本项目中实现 Tiptap NodeView 的关键点与实践建议。

- 架构分层

  - 将“展示组件”（Solid 组件）与“NodeView 适配器”（实现 Tiptap `NodeView` 接口的类）分离：
    - 展示组件：负责 UI 渲染与交互逻辑（使用 Solid 响应式能力、Kobalte 组件、i18n 等）。
    - 适配器类：负责把展示组件挂载到一个原生 DOM 容器上，并将该容器交给 Tiptap/ProseMirror。

- 适配器创建与挂载

  - 在适配器构造函数中创建根 DOM 容器（例如 `div` 或 `span`）。
  - 使用 Solid 的 `render(() => <YourView ... />, dom)` 将展示组件挂载，保存返回的 `dispose` 清理函数。
  - 如果需要可编辑内容区域（contentDOM），在根 DOM 内创建一个占位元素（如 `.list-item-content`），并将其赋给 `this.contentDOM`，以供 ProseMirror 管理其内部内容。

  示例：

  ```ts
  class ExampleNodeViewAdapter implements NodeView {
    dom: HTMLDivElement;
    contentDOM: HTMLElement | undefined;
    dispose: () => void;

    constructor(props: NodeViewRendererProps) {
      const dom = document.createElement("div");
      this.dispose = render(
        () => <ExampleView node={props.node} editor={props.editor} />,
        dom
      );
      this.dom = dom;
      this.contentDOM = dom.querySelector(".editable-content");
    }

    destroy() {
      this.dispose();
      this.dom.remove();
    }
  }
  ```

- 事件拦截与变更筛选

  - 实现 `stopEvent(e)`：仅放行发生在 `contentDOM` 内部的事件，避免容器外层被 ProseMirror 捕获（示例中利用 `isDescendantOf` 判断）。
  - 实现 `ignoreMutation(record)`：忽略 `contentDOM` 外部的变更（提升性能，避免无效刷新）。
  - 对于“整体不可被选中”的节点，可实现空的 `selectNode/deselectNode`，或在展示组件中通过样式控制。

- 选择态与内部状态

  - 若需要在选中/反选时改变样式或行为，可在适配器中维护一个 `Signal<boolean>`，在 `selectNode/deselectNode` 中更新；展示组件读取该信号以实现高亮等效果（见 `BlockRefView.tsx`）。

- 与应用层交互

  - 可通过 `props.editor.appView.app` 访问应用对象，并：
    - 查询或订阅块数据：如 `app.getReactiveBlockData(blockId)`、`app.getTextContentReactive(blockId)`。
    - 执行编辑命令：如 `editor.appView.execCommand(cmd, true)`。
  - 展示组件中可使用 Solid 的 `createMemo` 计算派生数据（如反链/标签计数、路径字符串）。

- UI 与交互

  - 统一使用 Kobalte 组件，尤其是 Tooltip：`<TooltipTrigger as={(p)=> <Button {...p} />}/>`，不要使用 `asChild`。
  - 对不可编辑的 UI 元素（折叠按钮、项目符号等）设置 `contentEditable={false}`，避免影响 ProseMirror 编辑区。
  - 右键菜单：通过 `useContextMenu()` 打开菜单项，集成 i18n 与 clipboard/toast（见 `ListItemView.tsx`、`BlockRefView.tsx`）。
  - 图标库使用 `lucide-solid`。

- 性能与可维护性

  - 避免在适配器中手动操作 DOM 更新；展示组件依赖 Solid 响应式进行刷新。
  - 使用 `createMemo` 缓存计算结果，减少不必要的重渲染。
  - 仅将真正可编辑的区域交给 ProseMirror（`contentDOM`），其它 UI 由展示组件完全控制。

- 销毁与清理

  - 在 `destroy()` 中调用 `dispose()` 并移除根 DOM，确保无内存泄漏。

- 具体实践要点（来自示例）

  - ListItemView：
    - 通过 `classList` 控制节点状态（`folded`、`has-children`、`show-path` 等）。
    - 维护 `.list-item-content` 作为 `contentDOM`，其余（折叠按钮、路径、计数器）均为受控 UI。
    - 使用应用层 API 计算反链与标签数，路径字符串等。
    - 通过 `toggleFocusedFoldState`、`convertToTagBlock`、`convertToSearchBlock` 等命令与编辑器交互。
  - BlockRefView：
    - 依赖 `getTextContentReactive`、`getReactiveBlockData` 获取块数据并响应式更新。
    - 根据标签块的 `color` 动态生成样式类；在选中态时调整样式。
    - 右键菜单支持复制被引用块 ID，并通过 `showToast` 给出反馈。

- NodeViewRenderer 注册
  - 每个 NodeView 暴露 `NodeViewRenderer`：`export const listItemNodeViewRenderer: NodeViewRenderer = (props) => new ListItemViewAdapter(props);`
  - 在节点扩展中将该渲染器绑定到对应的 NodeView。

参考文件

- `src/components/node-views/ListItemView.tsx`
- `src/components/node-views/BlockRefView.tsx`
