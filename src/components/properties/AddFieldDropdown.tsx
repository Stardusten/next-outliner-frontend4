import { For } from "solid-js";
import { Plus } from "lucide-solid";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldSchema } from "@/lib/common/types";

export type TagSuggestion = {
  tagId: string;
  tagTextContent: string;
  fieldSchema: FieldSchema;
};

export const AddFieldDropdown = (props: {
  tagSuggestions: TagSuggestion[];
  applyTagSuggestion: (suggestion: TagSuggestion) => void;
  addCustomField: (fieldSchema: FieldSchema) => void;
  openAddCustomFieldDialog: () => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as={(p: ButtonProps) => (
          <Button {...p} variant="outline">
            <Plus size="4" />
            添加块属性
          </Button>
        )}
      />
      <DropdownMenuContent>
        <For each={props.tagSuggestions}>
          {(tagSuggestion) => (
            <DropdownMenuItem
              onClick={() => props.applyTagSuggestion(tagSuggestion)}
            >
              字段 "{tagSuggestion.fieldSchema.label}"（来自标签 #
              {tagSuggestion.tagTextContent}）
            </DropdownMenuItem>
          )}
        </For>
        <DropdownMenuItem onClick={props.openAddCustomFieldDialog}>
          添加自定义字段（不关联标签）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
