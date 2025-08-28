# Block Properties System Design

## Overview

The block properties system allows blocks to have structured data fields beyond their main content. This enables features like task management, metadata tracking, and custom attributes while maintaining flexibility and type safety.

## Architecture

### Core Concepts

1. **Fields** - Definitions of what properties a block can have
2. **Field Values** - Actual data stored for each field on a block
3. **Field Sources** - Fields can come from tags or be custom to the block

### Data Structure

Properties are stored directly in `BlockDataInner`:

```typescript
export type BlockDataInner = {
  folded: boolean;
  type: BlockType;
  content: string;
  vo?: ViewOptions;
  fields?: Record<string, TagField | CustomField>;  // Field definitions
  fieldValues?: Record<string, any>;                 // Field values
};
```

## Field Types

### TagField

References a field defined in a tag. When a tag is applied to a block, its fields become available.

```typescript
export type TagField = {
  type: 'tagField';
  tagId: BlockId;  // Reference to the tag containing the field definition
};
```

### CustomField

A field defined directly on the block, independent of any tags.

```typescript
export type CustomField = {
  type: 'custom';
  schema: FieldSchema;  // Embedded field definition
};
```

### FieldSchema

The actual field definition, supporting multiple data types:

```typescript
export type FieldSchema = 
  | { type: 'text'; name: string; defaultValue?: string }
  | { type: 'number'; name: string; defaultValue?: number; min?: number; max?: number }
  | { type: 'date'; name: string; defaultValue?: string }
  | { type: 'boolean'; name: string; defaultValue?: boolean }
  | { type: 'select'; name: string; options: string[] | { fromTag: BlockId }; defaultValue?: string }
  | { type: 'multiSelect'; name: string; options: string[] | { fromTag: BlockId }; defaultValue?: string[] }
  | { type: 'blockRef'; name: string; defaultValue?: BlockId };
```

## API Design

The API is divided into two categories:

### Schema Modification Methods

Methods that change the structure of fields on a block:

- `addFieldsFromTag(blockId, tagId)` - Add all fields from a tag
- `addCustomField(blockId, schema)` - Add a custom field
- `removeField(blockId, fieldId)` - Remove a field
- `updateCustomFieldSchema(blockId, fieldId, schema)` - Update custom field definition

### Value Modification Methods

Methods that change the actual data stored in fields:

- `setFieldValue(blockId, fieldId, value)` - Set a single field value
- `setFieldValues(blockId, values)` - Set multiple field values
- `clearFieldValue(blockId, fieldId)` - Clear a field value

### Helper Methods

Utilities for working with fields:

- `getFieldSchema(blockId, fieldId)` - Get the schema for a field
- `getFieldOptions(blockId, fieldId)` - Get options for select fields
- `getBlocksUsingTagFields(tagId)` - Find blocks using a tag's fields

## UI Components

### BlockPropertiesDialog

Main dialog for viewing and editing block properties. Displays:
- Tag-based fields grouped by their source tag
- Custom fields with add/edit/delete capabilities
- Appropriate input controls based on field type

### Component Hierarchy

```
BlockPropertiesDialog
├── TagPropertiesSection (for each tag with fields)
│   └── PropertyValueInput (for each field)
└── CustomPropertiesSection
    └── PropertyValueInput (for each custom field)
```

### PropertyValueInput

Renders the appropriate input control based on field type:
- Text → TextField
- Number → TextField with number validation
- Date → TextField with date type
- Boolean → Checkbox
- Select → Select component
- MultiSelect → Multi-select component
- BlockRef → Block reference picker

## Integration Points

### With Tag System

When a tag is applied to a block:
1. Tag's fields are added to the block's `fields` object as `TagField` entries
2. Field IDs are generated as `tag:{tagId}:{fieldName}`
3. Values can be set independently on each block

When a tag is removed from a block:
1. All `TagField` entries referencing that tag are removed
2. Associated field values are cleared

### With Editor

The block properties dialog is accessible via:
1. Right-click context menu on any block
2. Keyboard shortcut (to be defined)
3. Programmatic API calls

## Design Decisions

### Why Separate Fields and Values?

- **Flexibility**: Allows schema changes without data loss
- **Efficiency**: Values only stored when set (sparse data)
- **Clarity**: Clear distinction between structure and data

### Why Union Type for FieldSchema?

- **Type Safety**: Each field type has its own specific properties
- **Extensibility**: Easy to add new field types
- **Validation**: TypeScript ensures correct usage

### Why TagField vs CustomField?

- **Source Tracking**: Clear distinction between tag-derived and custom fields
- **Consistency**: Tag fields stay synchronized across all blocks using that tag
- **Migration**: Easier to handle when tags change

## Future Considerations

### Field Validation

- Add validation rules to FieldSchema
- Implement client-side validation in UI
- Consider server-side validation for data integrity

### Field Dependencies

- Allow fields to depend on other field values
- Implement conditional visibility/requirements
- Support calculated fields

### Bulk Operations

- Apply properties to multiple blocks simultaneously
- Copy properties between blocks
- Template system for common property sets

### Search and Filter

- Index field values for search
- Filter blocks by property values
- Create smart lists based on properties

## Migration Strategy

When tag schemas change:
- Existing field values are preserved where possible
- Type mismatches trigger migration logic
- User notified of any data loss risks

## Performance Considerations

- Fields and values stored in CRDT for collaboration
- Lazy loading of field schemas when needed
- Efficient updates using transactions
- Minimal overhead when properties not used