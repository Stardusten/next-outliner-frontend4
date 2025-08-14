### 与 shadcn 用法的关键差异与注意事项（本项目基于 Kobalte + Solid）

以下总结在从 Vue/shadcn（React）迁移到本项目（Solid + Kobalte 封装组件）时，常见的易错点与推荐写法。

- 触发器 as 写法（最重要）

  - 本项目封装的触发器组件（如 `TooltipTrigger`、`DialogTrigger`、`DropdownMenuTrigger`）采用 Kobalte 的多态 `as` API，而不是 shadcn/react 中的 `asChild`。
  - 正确：使用 `as={(p) => <Button {...p} />}` 或 `as={SomeValidComponent}`，确保把 Kobalte 注入的交互 props 透传到真实触发元素上。
  - 错误：直接把元素作为 `TooltipTrigger` 的 children，或使用 `as-child`/`asChild` 之类的 prop（本项目不支持）。

  示例：

  ```tsx
  <Tooltip>
    <TooltipTrigger
      as={(p) => (
        <Button variant="ghost" size="xs-icon" {...p}>
          <Eye />
        </Button>
      )}
    />
    <TooltipContent>提示文案</TooltipContent>
  </Tooltip>
  ```

  当触发器是父组件传入的组件时：

  ```tsx
  <Tooltip>
    <TooltipTrigger as={props.trigger} {...p} />
    <TooltipContent>提示文案</TooltipContent>
  </Tooltip>
  ```

- Dialog 的受控用法

  - 本项目 `Dialog` 使用受控模式：`open={openSignal()}` 与 `onOpenChange={(o) => (o ? open() : close())}`。
  - Solid 中使用 camelCase 事件，如 `onOpenChange`、`onCloseAutoFocus`。请勿使用 Vue 模式的 `v-model:open`、`@close-auto-focus.prevent`。
  - 覆盖遮罩：`<DialogContent transparentOverlay />` 是本项目封装提供的便捷 prop（与 shadcn/react 的类名控制不同）。

- Tooltip 与 DropdownMenu 的一致模式

  - `TooltipTrigger`、`DropdownMenuTrigger`、`DialogTrigger` 均遵循同样的 `as` 渲染策略。
  - 如果需要在触发器外再包一层（如带 Tooltip 的触发按钮），外层用 Tooltip，里层 `TooltipTrigger as={(p)=> <Button {...p} />}`。

- 图标库差异

  - 使用 `lucide-solid`，而非 `lucide-react` 或 `lucide-vue-next`。导入示例：`import { Search, Eye } from "lucide-solid"`。

- i18n 用法

  - `useI18n().t(key)` 直接返回字符串，Solid JSX 可直接渲染：`<TooltipContent>{t("search.tooltip")}</TooltipContent>`。
  - 新增文案需在 `src/i18n/zh_CN.ts` 中补齐对应键值（例如：`search.tooltip`、`search.noMatch` 等）。

- 类型与触发器泛型

  - 触发器渲染函数参数建议使用对应组件的 Props 类型以获得类型检查，如：`as={(p: ButtonProps) => <Button {...p} />}`。
  - 组件透传时类型通常为 `ValidComponent`（见 `MoreMenu.tsx` 的 `trigger: ValidComponent`）。

- 事件与组合输入法处理

  - 在 Solid 中 `InputEvent` 自带 `isComposing`，可直接判断，无需 `// @ts-ignore`。
  - 键盘事件使用 `onKeyDown={(e) => { ... }}`，注意不要混用 Vue 的事件修饰符。

- 其他迁移提示
  - 不要使用 Vue 的模板语法（如 `v-for`、`v-if`、`class="..." :class="..."`）。Solid 中使用 `<For>`、`<Show>` 与 `classList` 或字符串拼接。
  - 避免把原先 Vue/React 的“把元素作为 Trigger 的 children”模式直接照搬；在本项目中应该使用 `as` 并透传 props。

推荐对照参考

- `src/components/node-views/ListItemView.tsx` 中 `TooltipTrigger as={(p)=> <div {...p} />}` 的写法
- `src/components/header/MoreMenu.tsx` 中 `DropdownMenuTrigger`、`TooltipTrigger` 的模式
- `src/components/SearchPopup.tsx` 中对 `DialogTrigger`、`TooltipTrigger` 的修正用法

### Select 组件的差异（重要）

- 本项目基于 Kobalte 的 Select，用法与 shadcn/react 不同：
  - 需要通过 `options`, `multiple`, `itemComponent`, `modal` 等属性声明选项与渲染方式。
  - `SelectItem` 不再直接写静态项，而是作为 `itemComponent` 的渲染器使用，传入 `props.item`。
  - `SelectValue` 使用 render 函数读取 `state.selectedOption()` 输出文本，而不是直接静态 children。

示例（参考 `CodeBlockView.tsx` 与 `TagFieldsEditor.tsx`）：

```tsx
<Select
  value={value()}
  onChange={setValue}
  options={["a", "b", "c"]}
  multiple={false}
  itemComponent={(props) => (
    <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
  )}
  modal={true}
>
  <SelectTrigger class="w-full">
    <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
  </SelectTrigger>
  <SelectContent />
</Select>
```
