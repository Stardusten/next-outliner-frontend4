import type { BlockId } from "@/lib/common/types";
import { Node } from "@tiptap/core";
import { tagViewRenderer } from "@/components/node-views/tagview/TagView";

export type TagFieldOptionsMode = "manual" | "fromTag";

export type TagFieldBase = {
  id: string;
  label: string;
  optional: boolean;
};

export type TagFieldText = TagFieldBase & { type: "text" };
export type TagFieldDate = TagFieldBase & { type: "date" };
export type TagFieldNumber = TagFieldBase & { type: "number" };
export type TagFieldCheckbox = TagFieldBase & { type: "checkbox" };
export type TagFieldSingleChoice = TagFieldBase & {
  type: "single";
  optionsMode: TagFieldOptionsMode;
  options?: string[]; // when optionsMode === 'manual'
  fromTag?: string; // when optionsMode === 'fromTag'
};
export type TagFieldMultipleChoice = TagFieldBase & {
  type: "multiple";
  optionsMode: TagFieldOptionsMode;
  options?: string[]; // when optionsMode === 'manual'
  fromTag?: string; // when optionsMode === 'fromTag'
};

export type TagField =
  | TagFieldText
  | TagFieldDate
  | TagFieldNumber
  | TagFieldCheckbox
  | TagFieldSingleChoice
  | TagFieldMultipleChoice;

export type TagAttrs = {
  inherits: BlockId[];
  color: string;
  fields: TagField[];
};

export const Tag = Node.create({
  name: "tag",
  group: "block",
  content: "inline*",
  addAttributes() {
    return {
      inherits: { default: [] },
      color: { default: "" },
      fields: { default: [] },
    };
  },
  parseHTML() {
    return [
      {
        tag: "div.tag",
        getAttrs: (dom: HTMLElement) => ({
          inherits: (dom.dataset.inherits ?? "").split(",").filter((x) => x),
          color: dom.dataset.color ?? "",
          fields: [], // TODO
        }),
      },
    ];
  },
  renderHTML() {
    return ["div", 0];
  },
  addNodeView() {
    return tagViewRenderer;
  },
});
