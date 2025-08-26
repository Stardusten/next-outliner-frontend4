# SolidUI 组件库使用指南（基于 Kobalte + SolidJS）

本项目使用基于 **SolidJS** 和 **Kobalte** 无头组件库构建的 UI 组件系统，与传统的 React shadcn/ui 有显著差异。本文档总结了所有组件的正确用法、与 shadcn/ui 的差异以及常见陷阱。

## 核心设计理念

### 1. 多态组件系统 (Polymorphic Components)
所有 Kobalte 基础组件都支持 `as` prop，可以渲染为不同的 HTML 元素或组件：
```tsx
<Button as="a" href="/link">Link Button</Button>
<AlertDialogTitle as="h1">Dialog Title</AlertDialogTitle>
```

### 2. SolidJS 响应式系统
- 使用 `createSignal()` 而非 `useState()`
- 事件处理使用驼峰命名（`onClick` 而非 `onclick`）
- 条件渲染使用 `<Show>` 和 `<For>` 组件

### 3. 复合组件模式 (Compound Components)
大多数复杂组件采用复合组件模式，需要正确组合多个子组件。

### 4. 程序化控制
支持通过 `open`/`onOpenChange` 等 props 进行程序化控制，适用于复杂的状态管理场景。

---

## 组件详细说明

### AlertDialog - 确认对话框

**基础架构**: 基于 `@kobalte/core/alert-dialog`，用于重要操作的二次确认。

**API 接口**:
```typescript
AlertDialog { open?, onOpenChange? }
AlertDialogTrigger { as?, children? }
AlertDialogContent { class?, children?, transparentOverlay? }
AlertDialogHeader, AlertDialogFooter { class? }
AlertDialogTitle, AlertDialogDescription { class?, as? }
```

**与 shadcn/ui 的差异**:
- ✅ 内置 Portal 和 Overlay，无需手动包裹
- ✅ 支持 `transparentOverlay` 属性
- ❌ 无需 `AlertDialogPortal` 组件
- ⚠️ 必须使用 `open` 和 `onOpenChange` 进行状态管理

**实际使用示例**:
```tsx
const [open, setOpen] = createSignal(false);

<AlertDialog open={open()} onOpenChange={setOpen}>
  <AlertDialogTrigger class="hidden" /> {/* 程序化控制时隐藏 */}
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
      <AlertDialogDescription>
        {t("deleteConfirm.description")}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        {t("cancel")}
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        {t("delete")}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**常见陷阱**:
- ❌ 忘记设置状态管理：`open` 和 `onOpenChange` 是必需的
- ❌ 尝试使用 `asChild`：应使用 `as` prop

---

### Button - 按钮组件

**基础架构**: 基于 `@kobalte/core/button` + `class-variance-authority`。

**API 接口**:
```typescript
Button { 
  variant?: "default" | "destructive" | "destructiveOutline" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon" | "xs-icon" | "2xs-icon"
  as?, class?, onClick?, disabled?
}
ColorfulButton { class?, onClick? } // 彩虹渐变边框按钮
```

**与 shadcn/ui 的差异**:
- ✅ 额外变体：`destructiveOutline`、`xs-icon`、`2xs-icon`
- ✅ 特殊组件：`ColorfulButton` 提供渐变效果
- ✅ 自动图标样式：使用 `has-[>svg]` 选择器

**实际使用示例**:
```tsx
{/* 基本使用 */}
<Button onClick={handleClick}>Click me</Button>

{/* 图标按钮 */}
<Button variant="ghost" size="xs-icon">
  <Search size={14} />
</Button>

{/* 危险操作 */}
<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>

{/* 彩虹按钮 */}
<ColorfulButton onClick={handleGenerate}>
  <WandSparkles size={16} />
  {t("aiGenerate")}
</ColorfulButton>

{/* 多态使用 */}
<Button as="a" href="/link" variant="outline">
  Link Button
</Button>
```

**常用变体组合**:
- 主操作：`variant="default"`
- 次要操作：`variant="outline"`
- 工具按钮：`variant="ghost" size="xs-icon"`
- 危险操作：`variant="destructive"`

---

### Card - 卡片容器

**基础架构**: 纯原生 HTML 元素 + CSS Grid 布局。

**API 接口**:
```typescript
Card { class? }
CardHeader { class? } // 使用 CSS Grid
CardTitle, CardDescription { class? }
CardContent, CardFooter { class? }
CardAction { class? } // 特有组件，自动定位到右上角
```

**与 shadcn/ui 的差异**:
- ✅ 独有 `CardAction` 组件
- ✅ Header 使用 CSS Grid + Container Queries
- ⚠️ 无需包装其他无头组件

**实际使用示例**:
```tsx
<Card class="w-full max-w-md shadow-xl">
  <CardHeader class="text-center space-y-4">
    <CardTitle>Settings</CardTitle>
    <CardDescription>Configure your preferences</CardDescription>
    <CardAction>
      <Button variant="ghost" size="xs-icon">
        <X />
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent class="space-y-4">
    {/* 主要内容 */}
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>

{/* TipTap 节点视图中的使用 */}
<Card class="w-full my-1 rounded-md relative" contentEditable={false}>
  <CardHeader class="hidden" />
  <CardContent>
    {/* 不可编辑的内容 */}
  </CardContent>
</Card>
```

---

### Dialog - 对话框

**基础架构**: 基于 `@kobalte/core/dialog`。

**API 接口**:
```typescript
Dialog { open?, onOpenChange? }
DialogTrigger { as?, children? }
DialogContent { class?, transparentOverlay? }
DialogHeader, DialogFooter { class? }
DialogTitle, DialogDescription { class? }
```

**与 shadcn/ui 的差异**:
- ✅ 支持 `transparentOverlay` 属性
- ✅ 内置关闭按钮和 Portal
- ❌ 无需 `DialogPortal` 组件

**实际使用示例**:
```tsx
const [open, setOpen] = createSignal(false);

<Dialog open={open()} onOpenChange={setOpen}>
  <DialogTrigger>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent class="max-w-[90vw] max-h-[80vh] w-[800px]">
    <DialogHeader>
      <DialogTitle>{t("settings.title")}</DialogTitle>
    </DialogHeader>
    {/* 设置面板内容 */}
    <DialogFooter>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* 复杂布局示例 */}
<DialogContent class="flex flex-row gap-0 max-w-[90vw]! max-h-[80vh]! w-[800px] h-[600px] p-0 overflow-hidden">
  <aside class="w-[200px] border-r">
    {/* 侧边栏 */}
  </aside>
  <main class="flex-1">
    {/* 主内容 */}
  </main>
</DialogContent>
```

---

### DropdownMenu - 下拉菜单

**基础架构**: 基于 `@kobalte/core/dropdown-menu`。

**API 接口**:
```typescript
DropdownMenu { open?, onOpenChange?, getAnchorRect? }
DropdownMenuTrigger { as?, children? }
DropdownMenuContent { class? }
DropdownMenuItem { class?, variant?: "default" | "destructive", inset?, onSelect? }
DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuShortcut { class? }
DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent { class? }
DropdownMenuCheckboxItem, DropdownMenuRadioItem { class?, checked?, onChange? }
```

**与 shadcn/ui 的差异**:
- ✅ 支持 `getAnchorRect` 用于自定义定位
- ✅ MenuItem 支持 `destructive` 变体和 `inset` 属性
- ✅ 内置图标支持

**实际使用示例**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="xs-icon">
      <MoreHorizontal />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent class="min-w-[200px]">
    <DropdownMenuItem onSelect={handleEdit}>
      <Edit size={14} />
      <span>Edit</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <span>More Options</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent class="min-w-[150px]">
        <DropdownMenuItem onSelect={handleDuplicate}>
          <Copy size={14} />
          <span>Duplicate</span>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
      <Trash2 size={14} />
      <span>Delete</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

{/* 右键菜单实现 */}
<DropdownMenu open={ctx.isOpen()} onOpenChange={ctx.setIsOpen} getAnchorRect={getAnchorRect}>
  <DropdownMenuTrigger class="hidden" />
  <DropdownMenuContent class="w-[200px]">
    {/* 动态菜单项 */}
  </DropdownMenuContent>
</DropdownMenu>
```

**特殊用法**:
- 支持通过 `getAnchorRect` 实现右键菜单
- `inset` 属性用于子菜单项的缩进对齐

---

### Label - 标签组件

**基础架构**: 原生 HTML `<label>` 元素。

**API 接口**:
```typescript
Label { class?, for?, children? }
```

**与 shadcn/ui 的差异**:
- ⚠️ SolidJS 中使用 `for` 而非 `htmlFor`
- ✅ 支持 `peer-disabled` 样式

**实际使用示例**:
```tsx
<div class="space-y-2">
  <Label class="text-sm font-medium">
    Username
  </Label>
  <TextFieldInput id="username" />
</div>

{/* 与其他组件配合 */}
<Label class="text-xs text-muted-foreground">
  {t("field.description")}
</Label>
```

---

### Popover - 弹出框

**基础架构**: 基于 `@kobalte/core/popover`。

**API 接口**:
```typescript
Popover { open?, onOpenChange? }
PopoverTrigger { as?, children? }
PopoverContent { class? } // 默认 w-72
```

**实际使用示例**:
```tsx
<Popover>
  <PopoverTrigger 
    as={Button} 
    variant="ghost" 
    size="xs-icon"
    class="opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <Paperclip size={14} />
  </PopoverTrigger>
  <PopoverContent class="w-96">
    <AttachmentManager />
  </PopoverContent>
</Popover>
```

---

### Select - 选择框

**基础架构**: 基于 `@kobalte/core/select`。

**API 接口**:
```typescript
Select { value?, onChange?, options, placeholder?, itemComponent, multiple?, modal? }
SelectTrigger { class?, size?: "sm" | "default" }
SelectContent { class? }
SelectItem { class?, item }
SelectValue<T> { children: (state) => JSX.Element }
SelectLabel, SelectDescription, SelectErrorMessage { class? }
```

**与 shadcn/ui 的关键差异**:
- ⚠️ **使用 `options` 数组而非静态 `SelectItem`**
- ⚠️ **`SelectValue` 需要渲染函数**
- ⚠️ **`itemComponent` 负责渲染每个选项**

**实际使用示例**:
```tsx
const [selectedValue, setSelectedValue] = createSignal<string>();

<Select
  value={selectedValue()}
  onChange={setSelectedValue}
  options={["option1", "option2", "option3"]}
  placeholder="Select an option"
  itemComponent={(props) => (
    <SelectItem item={props.item}>
      {props.item.rawValue}
    </SelectItem>
  )}
  modal={true}
>
  <SelectTrigger class="w-full">
    <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
  </SelectTrigger>
  <SelectContent />
</Select>

{/* 带标签的完整表单 */}
<div class="space-y-2">
  <SelectLabel>Choose Option</SelectLabel>
  <Select /* ... */>
    <SelectTrigger size="sm">
      <SelectValue<string>>
        {(state) => state.selectedOption() || "Select..."}
      </SelectValue>
    </SelectTrigger>
    <SelectContent />
  </Select>
  <SelectDescription>Choose your preferred option</SelectDescription>
</div>
```

**常见陷阱**:
- ❌ 直接写 `<SelectItem>Option</SelectItem>`
- ✅ 必须使用 `options` + `itemComponent`

---

### Switch - 开关组件

**基础架构**: 基于 `@kobalte/core/switch`。

**API 接口**:
```typescript
Switch { checked?, onChange?, children? }
SwitchControl { class? }
SwitchThumb { class? }
SwitchLabel { class? }
SwitchDescription, SwitchErrorMessage { class? }
```

**与 shadcn/ui 的差异**:
- ⚠️ **分离的 Control/Thumb 架构**
- ❌ 无 `asChild`，使用标准的组合模式

**实际使用示例**:
```tsx
const [enabled, setEnabled] = createSignal(false);

<Switch checked={enabled()} onChange={setEnabled}>
  <div class="flex items-center space-x-2">
    <SwitchControl>
      <SwitchThumb />
    </SwitchControl>
    <SwitchLabel>Enable notifications</SwitchLabel>
  </div>
</Switch>

{/* 简化版本 */}
<Switch checked={!!value()} onChange={handleChange}>
  <SwitchControl>
    <SwitchThumb />
  </SwitchControl>
</Switch>
```

---

### TextField - 文本输入

**基础架构**: 基于 `@kobalte/core/text-field`。

**API 接口**:
```typescript
TextField { class?, validationState? }
TextFieldInput { type?, placeholder?, value?, onChange?, class? }
TextFieldTextArea { rows?, placeholder?, value?, onChange?, class? }
TextFieldLabel { class? }
TextFieldDescription, TextFieldErrorMessage { class? }
```

**与 shadcn/ui 的差异**:
- ✅ 支持完整的表单验证状态
- ✅ 分离的 Input/TextArea 组件
- ✅ 响应式字体大小：`text-base md:text-sm`

**实际使用示例**:
```tsx
{/* 基本输入 */}
<TextField>
  <TextFieldInput
    placeholder="Enter text..."
    value={value()}
    onChange={(v) => setValue(v)}
  />
</TextField>

{/* 完整表单字段 */}
<TextField validationState={error() ? "invalid" : "valid"}>
  <TextFieldLabel class="text-xs">
    Email Address
  </TextFieldLabel>
  <TextFieldInput
    type="email"
    placeholder="user@example.com"
    value={email()}
    onChange={setEmail}
  />
  <TextFieldDescription>
    We'll never share your email.
  </TextFieldDescription>
  <TextFieldErrorMessage>
    {error()}
  </TextFieldErrorMessage>
</TextField>

{/* 文本区域 */}
<TextField>
  <TextFieldLabel>Description</TextFieldLabel>
  <TextFieldTextArea
    rows={4}
    placeholder="Enter description..."
    value={description()}
    onChange={setDescription}
  />
</TextField>
```

---

### Toast - 通知消息

**基础架构**: 基于 `@kobalte/core/toast` + Lucide 图标。

**API 接口**:
```typescript
Toaster { class? } // 根容器，放在 App 中
Toast { variant? }
ToastClose, ToastTitle, ToastDescription { class? }

// 工具函数
showToast({ title?, description?, variant?, duration? })
showToastPromise(promise, { loading?, success?, error?, duration? })
```

**与 shadcn/ui 的差异**:
- ✅ **内置图标**：Title 根据 variant 自动显示对应图标
- ✅ **Promise 支持**：`showToastPromise` 自动处理异步状态
- ✅ **便捷 API**：`showToast` 函数式调用

**实际使用示例**:
```tsx
// 在 App.tsx 中添加
<Toaster />

// 在组件中使用
showToast({
  title: t("copySuccess"),
  variant: "success"
});

showToast({
  title: t("error.failed"),
  description: error.message,
  variant: "destructive"
});

// Promise toast（自动处理状态）
showToastPromise(
  saveData(),
  {
    loading: t("saving"),
    success: t("saveSuccess"),
    error: (err) => t("saveError", { error: err.message })
  }
);
```

**支持的变体**:
- `default` - 默认样式
- `success` - 绿色 + 勾选图标
- `warning` - 黄色 + 警告图标  
- `error` / `destructive` - 红色 + 错误图标

---

### Tooltip - 工具提示

**基础架构**: 基于 `@kobalte/core/tooltip`。

**API 接口**:
```typescript
Tooltip { openDelay?, gutter?, triggerOnFocusOnly?, ...otherProps }
TooltipTrigger { as?, children? }
TooltipContent { class?, side? }
```

**与 shadcn/ui 的差异**:
- ✅ 默认 `openDelay: 100ms`
- ✅ 默认 `gutter: 4px`
- ✅ 默认 `triggerOnFocusOnly: false` - 只响应 hover，不响应焦点
- ⚠️ 必须使用 `as` prop 传递触发器

**实际使用示例**:
```tsx
<Tooltip>
  <TooltipTrigger>
    <Button variant="ghost" size="xs-icon">
      <Search size={16} />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>{t("search.tooltip")}</p>
  </TooltipContent>
</Tooltip>

{/* 指定位置 */}
<Tooltip>
  <TooltipTrigger>
    <Button>Hover me</Button>
  </TooltipTrigger>
  <TooltipContent side="top">
    Top tooltip
  </TooltipContent>
</Tooltip>

{/* 与其他组件组合时的透传 */}
<Tooltip>
  <TooltipTrigger as={(props) => (
    <Button {...props} variant="ghost">
      <Settings />
    </Button>
  )}>
  </TooltipTrigger>
  <TooltipContent>{t("settings")}</TooltipContent>
</Tooltip>
```

---

## 通用最佳实践

### 1. 状态管理
```tsx
// ✅ 使用 SolidJS 信号
const [open, setOpen] = createSignal(false);
<Dialog open={open()} onOpenChange={setOpen} />

// ❌ 不要使用 React 风格
const [open, setOpen] = useState(false);
```

### 2. 事件处理
```tsx
// ✅ 驼峰命名
<Button onClick={handleClick} />

// ❌ 全小写
<Button onclick={handleClick} />
```

### 3. 条件渲染
```tsx
// ✅ SolidJS 组件
<Show when={condition}>
  <Component />
</Show>

// ❌ 三元表达式（在某些情况下可能有问题）
{condition ? <Component /> : null}
```

### 4. 列表渲染
```tsx
// ✅ SolidJS For 组件
<For each={items()}>
  {(item, index) => <Item data={item} />}
</For>

// ❌ 原生 map
{items().map(item => <Item data={item} />)}
```

### 5. 样式应用
```tsx
// ✅ class 属性
<Button class="my-custom-class" />

// ❌ className
<Button className="my-custom-class" />
```

### 6. Ref 处理
```tsx
// ✅ SolidJS ref
let inputRef: HTMLInputElement;
<input ref={inputRef} />

// ❌ React 风格
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />
```

---

## 常见陷阱与解决方案

### 1. Select 组件使用错误
```tsx
// ❌ 错误方式 - 类似 shadcn/ui
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>

// ✅ 正确方式 - 基于 Kobalte
<Select
  options={["1", "2"]}
  itemComponent={(props) => (
    <SelectItem item={props.item}>
      Option {props.item.rawValue}
    </SelectItem>
  )}
>
  <SelectTrigger>
    <SelectValue>{(state) => `Option ${state.selectedOption()}`}</SelectValue>
  </SelectTrigger>
  <SelectContent />
</Select>
```

### 2. 多态组件 as 属性缺失
```tsx
// ❌ 不支持 asChild
<TooltipTrigger asChild>
  <Button>Hover me</Button>
</TooltipTrigger>

// ✅ 使用 as 属性
<TooltipTrigger as={(props) => (
  <Button {...props}>Hover me</Button>
)}>
</TooltipTrigger>
```

### 3. 状态管理不当
```tsx
// ❌ 忘记状态管理
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Content</DialogContent>
</Dialog>

// ✅ 正确的状态管理
const [open, setOpen] = createSignal(false);
<Dialog open={open()} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Content</DialogContent>
</Dialog>
```

### 4. Switch 组件结构错误
```tsx
// ❌ 缺少 Control/Thumb 结构
<Switch checked={value()} onChange={setValue} />

// ✅ 正确的结构
<Switch checked={value()} onChange={setValue}>
  <SwitchControl>
    <SwitchThumb />
  </SwitchControl>
</Switch>
```

### 5. Dialog 关闭后焦点管理问题
```tsx
// ❌ Dialog 关闭后 Tooltip 意外显示
// 问题：Dialog 默认会将焦点恢复到 DialogTrigger，
// 如果 DialogTrigger 被 Tooltip 包裹，会触发 Tooltip 显示
<Dialog open={open()} onOpenChange={setOpen}>
  <DialogTrigger>
    <Tooltip>
      <TooltipTrigger>
        <Button>Open Search</Button>
      </TooltipTrigger>
      <TooltipContent>Search tooltip</TooltipContent>
    </Tooltip>
  </DialogTrigger>
</Dialog>

// ✅ 解决方案 1: 设置 Tooltip 不响应焦点
<Dialog open={open()} onOpenChange={setOpen}>
  <DialogTrigger>
    <Tooltip triggerOnFocusOnly={false}>  {/* 关键：只响应 hover */}
      <TooltipTrigger>
        <Button>Open Search</Button>
      </TooltipTrigger>
      <TooltipContent>Search tooltip</TooltipContent>
    </Tooltip>
  </DialogTrigger>
</Dialog>

// ✅ 解决方案 2: 使用 onCloseAutoFocus 阻止焦点恢复
<Dialog open={open()} onOpenChange={setOpen}>
  <DialogTrigger>
    <Tooltip>
      <TooltipTrigger>
        <Button ref={buttonRef}>Open Search</Button>
      </TooltipTrigger>
      <TooltipContent>Search tooltip</TooltipContent>
    </Tooltip>
  </DialogTrigger>
  <DialogContent 
    onCloseAutoFocus={(e) => {
      e.preventDefault();
      buttonRef?.blur?.();
      // 然后将焦点转移到其他地方
    }}
  >
    {/* Dialog 内容 */}
  </DialogContent>
</Dialog>
```

---

## 总结

这个基于 SolidJS + Kobalte 的 UI 组件库相比传统 shadcn/ui 有以下特点：

### 优势
- 🚀 **现代化**: 使用最新的 CSS 特性和 SolidJS 响应式系统
- 🎨 **灵活性**: 多态组件系统提供更好的组合能力
- ♿ **可访问性**: Kobalte 提供完整的无障碍支持
- ⚡ **性能**: SolidJS 的细粒度响应性带来更好的性能

### 注意事项
- 📚 **学习曲线**: 需要熟悉 SolidJS 和 Kobalte 的概念
- 🔄 **API 差异**: 与 React 生态的 shadcn/ui 有显著差异
- 🎯 **特殊语法**: `as` prop、状态管理、事件处理等需要特别注意

掌握这些差异和最佳实践，能够帮助你更高效地使用这个现代化的 UI 组件库。