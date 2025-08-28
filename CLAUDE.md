# 项目开发规范

## 开发流程

- 如果要求实现某个功能，总是先给出完整的实现思路和修改计划，指出修改范围（所有被改动的文件）
- 每次修改应该运行 pnpm tsc 执行类型检查

## 代码组织

- 所有 LLM 工具请全部放到 llm-tools 目录下
- 请总是优先使用 src/components/ui 下的组件，使用方式参考 docs/shadcn-compat-notes.md

## 代码质量

- 不要硬编码字符串在代码中，请总是优先使用 i18n 工具，具体来说，你会需要修改 zh_CN.ts 翻译文件，然后使用 const { t } = useI18n() 获得翻译工具
- 尽可能保证代码的类型安全
  - 如无必要，禁止使用 any、unknown
  - 一个变量的类型保持稳定，不要中途变更
  - 一个变量的类型尽可能简单，比如既可能是字符串又可能是数字就很不好
- 所有导出都使用 export const / function xxxx，不要使用 export default xxx，即使只导出一个组件

# 框架踩坑记录

## SolidJS

- 不要在 JSX 中使用立即执行函数，会破坏响应式，应使用 Switch/Match 或 Show
- 多个相关状态应合并为一个状态对象，避免状态不一致
- 同时修改多个 signal 时应使用 batch 函数
- 使用 as prop 时，{...p} 展开的位置决定了属性优先级：放在前面会被后续属性覆盖，放在后面会覆盖前面的属性

## Loro CRDT

- node.children() 是函数直接调用，不要用 typeof 判断

## LLM 库

- LLMWrapper 是值不是类型，导入类型应使用 LLMServices
- chat() 方法返回字符串，不是对象
- 构造函数参数用 model 不是 modelName
