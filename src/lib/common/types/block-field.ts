import z from "zod";
import {
  fieldBaseSchema,
  fieldOptionsSchema,
  textFieldSchema,
  dateFieldSchema,
  numberFieldSchema,
  checkboxFieldSchema,
  singleChoiceFieldSchema,
  multipleChoiceFieldSchema,
  fieldSchema,
} from "../schemas/block-field";
import { BlockId } from "./block";

export type FieldBase = z.infer<typeof fieldBaseSchema>;
export type FieldOptions = z.infer<typeof fieldOptionsSchema>;
export type TextFieldSchema = z.infer<typeof textFieldSchema>;
export type DateFieldSchema = z.infer<typeof dateFieldSchema>;
export type NumberFieldSchema = z.infer<typeof numberFieldSchema>;
export type CheckboxFieldSchema = z.infer<typeof checkboxFieldSchema>;
export type SingleChoiceFieldSchema = z.infer<typeof singleChoiceFieldSchema>;

export type MultipleChoiceFieldSchema = z.infer<
  typeof multipleChoiceFieldSchema
>;

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

export type BlockField = TagField | CustomField;
