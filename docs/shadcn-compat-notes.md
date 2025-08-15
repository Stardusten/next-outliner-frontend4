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

  注意：如果 Dialog 和 Tooltip 一起使用时，都需要透传 props

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

### Popover 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/popover` 实现，功能上与 Tooltip、Dialog 类似，但多用于包含交互内容的小面板。
- 子组件：
  - `PopoverTrigger`：触发元素（需 `as` 写法透传）
  - `PopoverContent`：弹出内容
- 与 shadcn/react 相比：
  - 没有 asChild，必须使用 `as` 并透传交互 props。
  - 动画和定位由 Kobalte 内置 `data-[expanded]/data-[closed]` 状态控制。
- 在本项目中：
  - 用于小型配置弹窗（如附件上传面板 `AttachmentPopup`，剪贴板面板 `ClipboardPopup`）
  - 适配 Tooltip 一样的触发`as`模式

示例（来自当前项目 - 附件管理按钮带 Popover）：

```tsx
<Popover>
  <PopoverTrigger
    as={(p) => (
      <Button {...p}>
        <Folder />
      </Button>
    )}
  />
  <PopoverContent class="p-4 w-72">
    <AttachmentManager />
  </PopoverContent>
</Popover>
```

示例（来自当前项目 - ClipboardPopup 用法）：

```tsx
<Popover>
  <PopoverTrigger
    as={(p) => (
      <Button variant="ghost" size="xs-icon" {...p}>
        <Copy />
      </Button>
    )}
  />
  <PopoverContent class="p-2">
    <ClipboardList />
  </PopoverContent>
</Popover>
```

### Label 组件的差异与用法

- 基于 Solid JSX 原生 label 封装，类名与 shadcn 保持一致（`text-sm font-medium leading-none`等），并允许传递额外 `class`。
- 与 shadcn/react 的 Label 用法一致，区别是：
  - Solid 中 `for` 属性需要写成 `for={id}`（不能用 `htmlFor`）。
  - 可配合 `peer` 与状态类实现样式变化，如 `peer-disabled:cursor-not-allowed`。
- 在表单控件组件中（如 TextField、Switch、Select），有独立的 `*Label` 子组件（如 `SwitchLabel`, `TextFieldLabel`, `SelectLabel`），用法类似。

示例（来自当前项目 - 设置面板表单标签）：

```tsx
<Label class="block mb-2">{setting.label}</Label>
<Show when={setting.description}>
  <Label class="block text-[.8em] text-muted-foreground mb-2 whitespace-pre-wrap">
    {setting.description}
  </Label>
</Show>
```

示例（来自当前项目 - TagFieldsEditor）：

```tsx
<Label class="text-xs">{t("tag.fieldLabel")}</Label>
<TextField>
  <TextFieldInput value={f.label} onInput={updateLabel} />
</TextField>
```

### DropdownMenu 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/dropdown-menu` 实现，使用方式与 Tooltip/Dialog 相似：
  - `DropdownMenuTrigger` 需通过 `as` 写法传递触发元素（如 Button）。
  - `DropdownMenuContent` 是菜单面板，可包含多种项：
    - `DropdownMenuItem` 普通条目
    - `DropdownMenuCheckboxItem` 复选项
    - `DropdownMenuRadioItem` 单选项
    - `DropdownMenuSeparator` 分隔线
    - `DropdownMenuSub` / `DropdownMenuSubTrigger` / `DropdownMenuSubContent` 子菜单
    - `DropdownMenuShortcut` 显示快捷键
- 与 shadcn/react 相比：
  - 没有 asChild，Solid 需透传 props。
  - 样式、动画基于 Tailwind + data-state。
- 在本项目中：
  - `MoreMenu.tsx` 使用 DropdownMenu 提供应用主菜单功能。
  - `ContextMenuGlobal` 中也使用 DropdownMenu 实现右键菜单（不过更多用 ContextMenu 组件）。

示例（来自当前项目 - MoreMenu 主菜单）：

```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    as={(p) => (
      <Button {...p}>
        <MenuIcon />
      </Button>
    )}
  />
  <DropdownMenuContent class="w-[270px]">
    <DropdownMenuItem onClick={undo}>
      <UndoIcon />
      撤销<DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>更多选项</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem>子项 1</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  </DropdownMenuContent>
</DropdownMenu>
```

### Dialog 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/dialog` 实现，受控模式为：
  ```tsx
  const [open, setOpen] = createSignal(false);
  <Dialog open={open()} onOpenChange={setOpen}>
    ...
  </Dialog>;
  ```
- 触发器：
  - `DialogTrigger` 需用 `as` 写法透传 props，避免直接 children。
- 内容：
  - `DialogContent` 可传 `transparentOverlay` 改为透明遮罩。
  - 内置 `DialogHeader`、`DialogFooter`、`DialogTitle`、`DialogDescription`。
  - 自动渲染关闭按钮（右上角`<DialogPrimitive.CloseButton>`），可定制。
- 对比 shadcn/react：
  - 没有 asChild，必须透传 props。
  - 事件是 camelCase（如 `onOpenChange`）。
- 在本项目中，Dialog 常用于设置面板、多步向导、搜索弹窗等。

示例（来自当前项目 - 搜索弹窗带透明遮罩）：

```tsx
<Dialog open={searchOpen()} onOpenChange={setSearchOpen}>
  <DialogTrigger as={(p) => <Button {...p}>{t("search.open")}</Button>} />
  <DialogContent transparentOverlay class="max-w-[500px] p-0 gap-0">
    <SearchForm />
  </DialogContent>
</Dialog>
```

示例（来自当前项目 - 设置面板）：

```tsx
<Dialog open={visible()} onOpenChange={onOpenChange}>
  <DialogContent class="flex flex-row w-[800px] h-[600px] p-0 overflow-hidden">
    <SettingsSidebar />
    <SettingsContent />
  </DialogContent>
</Dialog>
```

### ContextMenu 组件的差异与用法

- 基于 Kobalte 的 ContextMenu 组件群，功能相当于 shadcn/react 的 DropdownMenu 但触发方式是右键菜单。
- 子组件包括：
  - `ContextMenu` 根组件
  - `ContextMenuTrigger`（触发器，同样支持 as 写法）
  - `ContextMenuContent`（菜单面板）
  - `ContextMenuItem`（普通项）、`ContextMenuCheckboxItem`（复选项）、`ContextMenuRadioItem`（单选项）
  - `ContextMenuSeparator`（分隔线）、`ContextMenuGroup`/`GroupLabel`
  - `ContextMenuSub`、`ContextMenuSubTrigger`、`ContextMenuSubContent`（子菜单）
  - `ContextMenuShortcut`（快捷键显示）
- 注意：
  - 本项目全局使用 `ContextMenuGlobal` + `useContextMenu` 实现动态构建菜单项，而不是直接静态编写 `<ContextMenu>` 结构。
  - 每个可右键的节点视图（File、BlockRef、ListItem 等）均在 `onContextMenu` 事件中调用 `useContextMenu().open({items})`。
  - 触发器的 `as` 使用需透传 props（例子见 Tooltip/Dialog）。

示例（来自当前项目 - 简化的全局菜单渲染）：

```tsx
// 注册全局组件（通常放在根节点内）
<ContextMenuGlobal />

// 在节点组件内触发
<div onContextMenu={(e) => {
  e.preventDefault();
  useContextMenu().open([
    { type: "item", label: "复制", action: copyHandler },
    { type: "separator" },
    { type: "item", label: "删除", danger: true, action: deleteHandler }
  ]);
}} />
```

示例（来自当前项目 - ContextMenuGlobal 渲染器）：

```tsx
<ContextMenu>
  <ContextMenuContent>
    <For each={items()}>
      {(item) => (
        <ContextMenuItem inset={item.inset} onSelect={item.action}>
          {item.icon && <item.icon />}
          {item.label}
        </ContextMenuItem>
      )}
    </For>
  </ContextMenuContent>
</ContextMenu>
```

### Card 组件的差异与用法

- 基于 Kobalte 封装，提供语义化结构插槽：
  - `Card` 外层容器
  - `CardHeader` 标题区域
  - `CardContent` 主体
  - `CardFooter` 底部操作
  - `CardAction` 操作按钮区域等。
- 与 shadcn/react 的 Card 类似，但本项目使用 Solid 的 props 透传。
- 常见用法：
  - 用于表单包裹、展示数据列表项等。
  - 可以直接在 `class` 中传递自定义样式。
- Solid 中禁止直接在 `Card` 上用子组件标签名作为 JSX children slot 名称（不像 Vue 的 `<template v-slot:header>`），需要直接嵌套对应组件。
- 在 TipTap 节点组件中常用于包裹不可编辑区块（ `contentEditable={false}` ）。

示例（来自当前项目 - 页面布局）：

```tsx
<Card class="w-full max-w-md shadow-xl">
  <CardHeader class="text-center space-y-4">
    <h2>标题</h2>
  </CardHeader>
  <CardContent>
    <p>这是卡片内容，放置表单或文本。</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline">取消</Button>
    <Button>确认</Button>
  </CardFooter>
</Card>
```

#### Tooltip 与 Select 组合使用的注意事项

- 当 Tooltip 包裹 `SelectTrigger` 时：
  1. **必须在 TooltipTrigger 中透传 SelectTrigger 的 props**
     - 使用 `as={(p) => <SelectTrigger {...p} />}`，不能简单地将 `<SelectTrigger>` 直接嵌套在 Tooltip 内，否则鼠标事件可能被拦截导致 Select 无法打开。
  2. **交互优先顺序**
     - Tooltip `openDelay` 建议保持较短（默认 100ms）以避免影响点击弹出 Select。
     - 避免 Tooltip 在 Select 打开时长时间保持打开状态，可通过 `Tooltip` 的受控 open 属性配合管理。
- 在本项目中（示例见 `SettingsPanel` 字体选择旁提示按钮），通常 Tooltip 用于放在 Select 附近的说明按钮，而非直接包裹 SelectTrigger。若确需为 SelectTrigger 添加 Tooltip，建议按以下模式：

示例（来自当前项目的推荐写法）：

```tsx
<Tooltip>
  <TooltipTrigger
    as={(p) => (
      <SelectTrigger {...p} class="w-[240px]">
        <SelectValue<string>>
          {(state) => idToLabel(state.selectedOption() as string)}
        </SelectValue>
      </SelectTrigger>
    )}
  />
  <TooltipContent>选择仓库存储类型</TooltipContent>
</Tooltip>
<SelectContent />
```

示例（来自当前项目 - TipTap 节点视图）：

```tsx
<Card class="w-full my-1 rounded-md relative" contentEditable={false}>
  <CardHeader class="hidden" />
  <CardContent>节点不可编辑的内容区域</CardContent>
</Card>
```

### Button 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/button`，支持 `variant`（样式变体）与 `size`。
- 按照 Solid 用法：
  - 直接使用 `<Button onClick={...}>` 作为基本按钮。
  - 当作为其他组件（如 DialogTrigger、TooltipTrigger）触发器时，需用 `as={(p) => <Button {...p} />}` 透传 props。
- 按钮变体：
  - `default`（主按钮）、`outline`（描边）、`ghost`（透明背景）、`destructive`（红色危险）等。
- 尺寸：
  - `sm`, `default`, `lg`, `xs-icon`（仅图标的小按钮），等。
- Solid 事件：驼峰命名（如 `onClick`），不要用 Vue/React 特殊语法。

示例（来自当前项目 - 图标按钮触发 Tooltip）：

```tsx
<Tooltip>
  <TooltipTrigger
    as={(p) => (
      <Button variant="ghost" size="xs-icon" {...p}>
        <Search />
      </Button>
    )}
  />
  <TooltipContent>{t("search.tooltip")}</TooltipContent>
</Tooltip>
```

示例（来自当前项目 - 表单操作按钮组）：

```tsx
<div class="flex gap-2">
  <Button variant="outline" onClick={handleCancel}>
    {t("common.cancel")}
  </Button>
  <Button onClick={handleSubmit} disabled={!formValid()}>
    {t("common.confirm")}
  </Button>
</div>
```

### Breadcrumb 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/breadcrumbs` 实现，提供完整的 `Breadcrumb` 语义结构。
- 子组件包括：
  - `BreadcrumbList`（容器 `ol`）
  - `BreadcrumbItem`（`li` 项）
  - `BreadcrumbLink`（链接，支持 `data-current` 样式）
  - `BreadcrumbSeparator`（分隔符，支持自定义 children，默认 `/`）
  - `BreadcrumbEllipsis`（省略显示）
- 与 shadcn/react 相比：
  - 没有 asChild，用 `as={(p) => <A {...p} />}` 传递组件时需透传 props。
  - 使用 Solid 的 `Show` 进行条件渲染。
- 在本项目中，复杂逻辑（如点击跳转、获取面包屑数据）通常封装在业务组件内，如 `MainBreadcrumb`。

示例（来自当前项目-自定义 MainBreadcrumb，用原生标签实现逻辑，可按需替换为 Breadcrumb 组件）：

```tsx
<div class="flex items-center text-sm">
  <For each={items()}>
    {(item, i) => (
      <>
        <span
          class="transition-colors duration-200 cursor-pointer hover:text-foreground"
          classList={{
            "text-foreground cursor-default": i() === lastIndex(),
            "text-muted-foreground": i() !== lastIndex(),
          }}
          onClick={() => handleBreadcrumbClick(item.blockId)}
        >
          {item.title}
        </span>
        {i() < lastIndex() && <span class="mx-2 text-border text-sm">/</span>}
      </>
    )}
  </For>
</div>
```

若使用 UI 封装：

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink data-current>当前页</BreadcrumbLink>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### AlertDialog 组件的差异与用法

- 基于 Kobalte 的 `AlertDialog`，结构与 shadcn/react 类似，但触发器依然需使用 `as` 而不是 asChild。
- 支持受控模式：`open={signal()}` + `onOpenChange={setOpen}`。
- 包含子组件：`AlertDialogTrigger`、`AlertDialogContent`、`AlertDialogHeader`、`AlertDialogFooter`、`AlertDialogTitle`、`AlertDialogDescription`。
- 常用于关键操作二次确认，例如删除、清空数据等。
- 注意：
  - 如果 Trigger 是外部传入组件，确保透传交互 props（`as={SomeButton}`）。
  - Solid 中事件用 camelCase，避免 React/Vue 写法。
  - 使用 `variant="destructive"` 的按钮强化危险操作提示。

示例（来自当前项目）：

```tsx
<AlertDialog open={open()} onOpenChange={setOpen}>
  <AlertDialogTrigger as={(p) => <Button {...p}>删除</Button>} />
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t("deleteConfirmDialog.title")}</AlertDialogTitle>
      <AlertDialogDescription>
        {t("deleteConfirmDialog.description", { title: itemTitle })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <Button variant="outline" onClick={cancelDelete}>
        {t("common.cancel")}
      </Button>
      <Button variant="destructive" onClick={confirmDelete}>
        {t("common.delete")}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Select 组件的差异与用法（重要）

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

### Switch 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/switch` 实现，结构与 shadcn/react 类似但必须使用 Solid 的事件与 `class` 写法。
- 子组件：
  - `Switch` 根组件（包裹交互控件）
  - `SwitchControl` 控制外观容器
  - `SwitchThumb` 拖动拇指
  - `SwitchLabel` 标签
- 与 shadcn/react 相比：
  - 没有 asChild，用法中控件结构需显式嵌套 `SwitchControl` 和 `SwitchThumb`。
  - `checked` 和 `onChange` 采用 Solid 信号绑定。
- 在本项目中：
  - 常用于设置面板的布尔开关（`SettingsPanel`、`SearchView`等）。
  - 当作表单字段集成时可结合 `SwitchLabel` 提示说明。

示例（来自当前项目 - 设置面板开关组件）：

```tsx
<Switch checked={!!val()} onChange={onChange}>
  <SwitchControl>
    <SwitchThumb />
  </SwitchControl>
</Switch>
```

示例（来自当前项目 - 搜索视图中切换路径显示）：

```tsx
<Switch checked={showPath()} onChange={handleToggle}>
  <SwitchControl>
    <SwitchThumb />
  </SwitchControl>
</Switch>
```

### TextField 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/text-field` 实现，封装多个子组件：
  - `TextField` 根组件
  - `TextFieldInput` 输入框
  - `TextFieldLabel` 标签
  - `TextFieldDescription` 描述
  - `TextFieldErrorMessage` 错误提示
  - `TextFieldTextArea` 多行文本输入
- 与 shadcn/react 相比：
  - 事件和属性使用 Solid JSX 语法（`onInput`、`value={...}`）。
  - 样式类与验证状态通过 props/classList 传入。
- 在本项目中：
  - 广泛应用于向导步骤（`WizardStepAttachment`、`WizardStepBasicInfo`）、Tag 编辑等。
  - 支持直接在 `TextField` 上设置 `class` 调整布局。

示例（来自当前项目 - 附件配置向导的 endpoint 输入）：

```tsx
<TextField>
  <TextFieldLabel class="text-xs">
    {t("repoWizard.attachment.fields.endpoint.label")}
  </TextFieldLabel>
  <TextFieldInput
    placeholder={t("repoWizard.attachment.fields.endpoint.placeholder")}
    value={form.values.attachment.endpoint}
    onInput={(e) =>
      form.setFieldValue("attachment.endpoint", e.currentTarget.value)
    }
  />
</TextField>
```

示例（来自当前项目 - 基本信息向导带验证状态）：

```tsx
<TextField validationState={form.errors.title ? "invalid" : "valid"}>
  <TextFieldLabel>{t("repoWizard.basicInfo.nameLabel")}</TextFieldLabel>
  <TextFieldInput
    value={form.values.title}
    onInput={(e) => form.setFieldValue("title", e.currentTarget.value)}
  />
  <TextFieldErrorMessage>{form.errors.title}</TextFieldErrorMessage>
</TextField>
```

### Toast 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/toast` 封装，提供全局 `Toaster` 与程序触发 API。
- 核心元素：
  - `Toaster` 根区域（通常放在 App 根部）
  - `Toast` 单个通知容器
  - `ToastClose` 关闭按钮
  - `ToastTitle` 标题
  - `ToastDescription` 描述
  - `showToast` 与 `showToastPromise` 助手函数
- 与 shadcn/react 对比：
  - 使用函数调用直接触发，不依赖外部上下文。
  - 支持 variant 控制样式（`default`、`success`、`error` 等）。
- 在本项目中：
  - 常用在文件下载、复制等成功/失败提示（`FileInlineView`、`BlockRefView`等）。

示例（来自当前项目 - 复制引用 ID 成功提示）：

```tsx
showToast({
  title: t("blockRefContextMenu.copyBlockRefIdSuccess"),
});
```

示例（来自当前项目 - App 根渲染 Toaster）：

```tsx
<>
  <SpacingUpdater />
  <Toaster />
</>
```

### Tooltip 组件的差异与用法

- 基于 Kobalte 的 `@kobalte/core/tooltip` 封装。
- 子组件：
  - `Tooltip` 根组件（可传 openDelay, gutter 等）
  - `TooltipTrigger` 触发器（必须 as 写法透传 props）
  - `TooltipContent` 弹出内容
- 与 shadcn/react 相比：
  - 没有 asChild，必须用 `as={(p) => <Button {...p}/ >}` 或组件引用透传。
  - 样式与定位完全依赖 Kobalte。
- 在本项目中：
  - 常用于按钮、图标的额外说明（大量出现在 `SearchPopup`、`ClipboardPopup`、`ListItemView`等）。

示例（来自当前项目 - 搜索按钮提示）：

```tsx
<Tooltip>
  <TooltipTrigger
    as={(p: ButtonProps) => (
      <Button variant="ghost" size="xs-icon" {...p}>
        <Search />
      </Button>
    )}
  />
  <TooltipContent>{t("search.tooltip")}</TooltipContent>
</Tooltip>
```

示例（来自当前项目 - 自定义颜色按钮提示）：

```tsx
<Tooltip>
  <TooltipTrigger
    as={(p: ButtonProps) => (
      <Button {...p}>
        <Paintbrush />
      </Button>
    )}
  />
  <TooltipContent>{t("tag.customColor")}</TooltipContent>
</Tooltip>
```
