import { z } from "zod";

export const fieldBaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  optional: z.boolean(),
});

export const fieldOptionsSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fromTag"), tagId: z.string() }),
  z.object({ type: z.literal("manual"), options: z.array(z.string()) }),
]);

export const textFieldSchema = fieldBaseSchema.extend({
  type: z.literal("text"),
  default: z.string().optional(),
});

export const dateFieldSchema = fieldBaseSchema.extend({
  type: z.literal("date"),
  default: z.string().optional(),
});

export const numberFieldSchema = fieldBaseSchema.extend({
  type: z.literal("number"),
  default: z.number().optional(),
});

export const checkboxFieldSchema = fieldBaseSchema.extend({
  type: z.literal("checkbox"),
  default: z.boolean().optional(),
});

export const singleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("single"),
  options: fieldOptionsSchema,
  default: z.string().optional(),
});

export const multipleChoiceFieldSchema = fieldBaseSchema.extend({
  type: z.literal("multiple"),
  options: fieldOptionsSchema,
  default: z.array(z.string()).optional(),
});

export const fieldSchema = z.discriminatedUnion("type", [
  textFieldSchema,
  dateFieldSchema,
  numberFieldSchema,
  checkboxFieldSchema,
  singleChoiceFieldSchema,
  multipleChoiceFieldSchema,
]);
