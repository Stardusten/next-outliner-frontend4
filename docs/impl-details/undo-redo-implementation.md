# 撤销重做系统实现文档

## 概述

本文档详细描述了基于 CRDT（Loro）的撤销重做系统实现，包括设计思路、关键挑战和解决方案。

## 系统架构

### 核心组件

1. **UndoRedoManager** (`src/lib/app/undo-redo.ts`)
   - 管理撤销栈 (`undoStack`) 和重做栈 (`redoStack`)
   - 维护全局ID映射表 (`idMapping`)
   - 监听事务提交事件，自动记录操作历史

2. **撤销重做操作实现** (`src/lib/app-views/editable-outline/editable-outline.ts`)
   - `canUndo()/canRedo()`: 检查是否可以执行撤销/重做
   - `undo()/redo()`: 执行实际的撤销/重做操作

### 数据结构

```typescript
type UndoRedoItem = {
  executedOps: TxExecutedOperation[];    // 已执行的操作列表
  beforeSelection?: SelectionInfo;       // 操作前的选区状态
  afterSelection?: SelectionInfo;        // 操作后的选区状态
};

type TxExecutedOperation = 
  | { type: "block:create", blockId: BlockId, parent: BlockId | null, index: number, data: BlockDataInner }
  | { type: "block:delete", blockId: BlockId, oldParent: BlockId | null, oldIndex: number, oldData: BlockDataInner }
  | { type: "block:move", blockId: BlockId, parent: BlockId | null, index: number, oldParent: BlockId | null, oldIndex: number }
  | { type: "block:update", blockId: BlockId, newData: BlockDataInner, oldData: BlockDataInner };
```

## 核心挑战与解决方案

### 挑战1: CRDT库不支持指定块ID

**问题**: Loro CRDT库从底层不允许指定块的ID，所有新创建的块都会获得系统分配的唯一ID。

**解决方案**: 使用ID映射机制
- 维护全局ID映射表 `app.idMapping: Record<BlockId, BlockId>`
- 原始ID → 当前真实ID的映射关系
- 在撤销重做过程中动态更新映射

### 挑战2: 临时ID与真实ID的转换

**问题**: 在事务执行过程中，新创建的块首先获得临时ID（如 `temp_2`），事务提交后才转换为真实ID。

**解决方案**: 两级ID映射机制
```typescript
// 第一级映射：原始ID → 临时ID
const id2Tmp: Record<BlockId, BlockId> = {};

// 第二级映射：临时ID → 真实ID（从 withTx 返回）
const { idMapping: txIdMapping } = await app.withTx((tx) => {
  // 事务操作
});

// 组合映射：原始ID → 真实ID
for (const [oldId, tmpId] of Object.entries(id2Tmp)) {
  const realId = txIdMapping[tmpId] || tmpId;
  app.idMapping[oldId] = realId;
}
```

### 挑战3: 选区状态的保存和恢复

**问题**: 撤销重做操作后需要恢复正确的光标位置和选区状态。

**解决方案**: 
- 在操作前后记录选区信息
- 撤销时恢复 `beforeSelection`
- 重做时恢复 `afterSelection`
- 应用ID映射确保选区中的blockId正确

## 实现细节

### 撤销操作流程

```typescript
async undo(): Promise<void> {
  const lastTx = app.undoStack.pop()!;
  const id2Tmp: Record<BlockId, BlockId> = {};
  
  const result = await app.withTx((tx) => {
    // 反向执行操作
    for (let i = lastTx.executedOps.length - 1; i >= 0; i--) {
      const op = lastTx.executedOps[i];
      if (op.type === "block:create") {
        tx.deleteBlock(mapId(op.blockId));
      } else if (op.type === "block:delete") {
        const newBlockId = tx.createBlockUnder(/* ... */);
        id2Tmp[op.blockId] = newBlockId;
      }
      // ... 处理其他操作类型
    }
    
    // 恢复选区
    if (lastTx.beforeSelection) {
      tx.setSelection(mapSelection(lastTx.beforeSelection));
    }
  });
  
  // 更新全局ID映射
  updateGlobalIdMapping(id2Tmp, result.idMapping);
  app.redoStack.push(lastTx);
}
```

### 重做操作流程

```typescript
async redo(): Promise<void> {
  const lastTx = app.redoStack.pop()!;
  const id2Tmp: Record<BlockId, BlockId> = {};
  
  const result = await app.withTx((tx) => {
    // 正向执行操作
    for (const op of lastTx.executedOps) {
      if (op.type === "block:create") {
        const newBlockId = tx.createBlockUnder(/* ... */);
        id2Tmp[op.blockId] = newBlockId;
      } else if (op.type === "block:delete") {
        tx.deleteBlock(mapId(op.blockId));
      }
      // ... 处理其他操作类型
    }
    
    // 恢复选区
    if (lastTx.afterSelection) {
      tx.setSelection(mapSelection(lastTx.afterSelection));
    }
  });
  
  // 更新全局ID映射
  updateGlobalIdMapping(id2Tmp, result.idMapping);
  app.undoStack.push(lastTx);
}
```

## 常见陷阱与注意事项

### 1. ID映射的生命周期管理

**错误做法**:
```typescript
// ❌ 直接使用临时ID更新全局映射
app.idMapping[oldId] = tmpId; // tmpId 可能是临时ID
```

**正确做法**:
```typescript
// ✅ 使用事务返回的真实ID映射
const { idMapping: txIdMapping } = await app.withTx(/* ... */);
const realId = txIdMapping[tmpId] || tmpId;
app.idMapping[oldId] = realId;
```

### 2. 操作顺序的重要性

- **撤销**: 必须反向遍历操作列表 (`for (let i = ops.length - 1; i >= 0; i--)`)
- **重做**: 正向遍历操作列表 (`for (const op of ops)`)

### 3. 选区映射

在应用选区时，必须考虑ID映射：
```typescript
const mappedSelection = {
  ...selection,
  blockId: mapId(selection.blockId)  // 应用ID映射
};
```

## 参考实现

可以参考 `src/composables/useImportExport.ts` 中的导入逻辑，它使用了类似的两级ID映射机制：

```typescript
const old2Tmp: Record<string, BlockId> = {};
const { idMapping: tmp2New } = await withTx(app, (tx) => {
  // 创建块，记录 old2Tmp 映射
});

// 第二个事务中使用组合映射
await withTx(app, (tx) => {
  for (const blockId of Object.values(tmp2New)) {
    const newContent = applyIdMapping(oldData.content, old2Tmp, tmp2New);
    tx.updateBlock(blockId, { content: newContent });
  }
});
```

## 调试技巧

在开发和调试过程中，可以添加详细的日志来追踪ID映射过程：

```typescript
console.log("🔙 开始撤销操作", {
  操作数量: lastTx.executedOps.length,
  当前idMapping: { ...app.idMapping }
});

console.log("🗺️ 事务执行后的ID映射:", txIdMapping);
console.log("🔗 更新映射:", { oldId, tmpId, realId });
```

这些日志有助于理解ID映射的转换过程和定位问题。

## 总结

基于CRDT的撤销重做系统的核心在于正确处理ID映射。由于CRDT库的限制，我们无法直接指定块ID，因此必须通过两级映射机制来确保撤销重做操作的正确性。关键是理解临时ID到真实ID的转换过程，并在适当的时机更新全局ID映射表。