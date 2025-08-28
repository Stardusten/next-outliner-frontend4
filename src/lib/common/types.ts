import type { LoroMap, LoroTreeNode, TreeID, VersionVector } from "loro-crdt";
import z from "zod";

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
    ? RecursivePartial<T[P]>
    : T[P];
};

export type BlockId = TreeID;

export type BlockNode = LoroTreeNode;

export type BlocksVersion = VersionVector;

export type BlockType = "text" | "code" | "search" | "tag";

export const numberFormats = [
  "1.",
  "1)",
  "(1)",
  "a.",
  "a)",
  "(a)",
  "I.",
  "I)",
  "(I)",
  "i.",
  "i)",
  "(i)",
  "一、",
  "(一)",
] as const;

export type NumberFormat = (typeof numberFormats)[number];

export type BlockDataInner = {
  folded: boolean;
  type: BlockType;
  content: string;
  vo?: ViewOptions;
  fields?: Record<string, TagField | CustomField>;
  fieldValues?: Record<string, any>;
};

export type ViewOptions = {
  number?: string;
  paragraph?: boolean;
};

export type BlockData = LoroMap<BlockDataInner>;

export type SelectionInfo = {
  viewId: string;
  blockId: BlockId;
  anchor: number;
  head?: number;
  scrollIntoView?: boolean;
  highlight?: boolean;
};

const fieldBaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  optional: z.boolean(),
});
export type FieldBase = z.infer<typeof fieldBaseSchema>;

export const fieldOptionsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fromTag"), tagId: z.string() }),
  z.object({ type: z.literal("manual"), options: z.array(z.string()) }),
]);
export type FieldOptions = z.infer<typeof fieldOptionsSchema>;

export const textFieldSchema = fieldBaseSchema.extend({
  type: z.literal("text"),
  default: z.string().optional(),
});
export type TextFieldSchema = z.infer<typeof textFieldSchema>;

export const dateFieldSchema = fieldBaseSchema.extend({
  type: z.literal("date"),
  default: z.string().optional(),
});
export type DateFieldSchema = z.infer<typeof dateFieldSchema>;

export const numberFieldSchema = fieldBaseSchema.extend({
  type: z.literal("number"),
  default: z.number().optional(),
});
export type NumberFieldSchema = z.infer<typeof numberFieldSchema>;

export const checkboxFieldSchema = fieldBaseSchema.extend({
  type: z.literal("checkbox"),
  default: z.boolean().optional(),
});
export type CheckboxFieldSchema = z.infer<typeof checkboxFieldSchema>;

export const singleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("single"),
  options: fieldOptionsSchema,
  default: z.string().optional(),
});
export type SingleChoiceFieldSchema = z.infer<typeof singleChoiceFieldSchema>;

export const multipleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("multiple"),
  options: fieldOptionsSchema,
  default: z.array(z.string()).optional(),
});
export type MultipleChoiceFieldSchema = z.infer<
  typeof multipleChoiceFieldSchema
>;

export const fieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  dateFieldSchema,
  numberFieldSchema,
  checkboxFieldSchema,
  singleChoiceFieldSchema,
  multipleChoiceFieldSchema,
]);
export type FieldSchema = z.infer<typeof fieldSchema>;

export type TagField = {
  type: "tagField";
  tagId: BlockId;
  fieldId: string;
};

export type CustomField = {
  type: "custom";
  schema: FieldSchema;
};
