import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import { extractBlockRefs } from "@/lib/app/util";
import {
  BlockId,
  CustomField,
  FieldSchema,
  TagField,
} from "@/lib/common/types";
import { Settings } from "lucide-solid";
import { nanoid } from "nanoid";
import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { AddCustomFieldDialog } from "./AddCustomFieldDialog";
import { AddFieldDropdown, TagSuggestion } from "./AddFieldDropdown";
import { CheckboxInput } from "./inputs/CheckboxInput";
import { DateInput } from "./inputs/DateInput";
import { NumberInput } from "./inputs/NumberInput";
import { TextInput } from "./inputs/TextInput";
import { ResetButton } from "./ResetButton";

type FieldInfo = {
  id: string;
  type: TagField["type"] | CustomField["type"];
  schema: FieldSchema;
  value: any;
  tagId?: BlockId;
};

export const BlockPropertiesDialog = (props: { app: App }) => {
  const blockPropertiesDialog = props.app.blockPropertiesDialog;
  const [open, setOpen] = blockPropertiesDialog.openSignal;
  const [addCustomFieldOpen, setAddCustomFieldOpen] = createSignal(false);
  const [fieldInfos, setFieldInfos] = createStore<Record<string, FieldInfo>>(
    {}
  );

  createEffect(() => {
    if (!open()) return; // open 改变时触发

    const blockId = blockPropertiesDialog.blockId;
    if (!blockId) return;
    const blockData = props.app.getBlockData(blockId);
    if (!blockData) return;

    const fieldInfos_ = {} as Record<string, FieldInfo>;
    const fieldValues = blockData.fieldValues ?? {};
    for (const [fieldId, field] of Object.entries(blockData.fields ?? {})) {
      if (field.type === "tagField") {
        const tagAttrs = props.app.getTagAttrs(field.tagId);
        if (!tagAttrs) continue;
        const fieldSchema = tagAttrs.fields.find((f) => f.id === fieldId);
        if (!fieldSchema) continue;
        const fieldInfo = {
          id: fieldId,
          schema: fieldSchema,
          value: fieldValues[fieldId],
          type: "tagField" as const,
          tagId: field.tagId,
        };
        fieldInfos_[fieldId] = fieldInfo;
      } else if (field.type === "custom") {
        const fieldInfo = {
          id: fieldId,
          schema: field.schema,
          value: fieldValues[fieldId],
          type: "custom" as const,
        };
        fieldInfos_[fieldId] = fieldInfo;
      }
    }

    setFieldInfos(fieldInfos_);
  });

  const tagSuggestions = () => {
    const blockId = blockPropertiesDialog.blockId;
    if (!blockId) return [];
    const blockData = props.app.getBlockData(blockId);
    if (!blockData) return [];

    const json = JSON.parse(blockData.content);
    const node = props.app.detachedSchema.nodeFromJSON(json);

    const res = [] as TagSuggestion[];
    const tagIds = extractBlockRefs(node, true);
    const existed = new Set(Object.keys(fieldInfos));
    for (const tagId of tagIds) {
      const tagAttrs = props.app.getTagAttrs(tagId);
      if (!tagAttrs) continue;
      const tagTextContent = props.app.getTextContent(tagId);
      for (const fieldSchema of tagAttrs.fields) {
        // 跳过已经有的字段
        if (existed.has(fieldSchema.id)) continue;
        res.push({ tagId, tagTextContent, fieldSchema });
      }
    }

    return res;
  };

  const applyTagSuggestion = (suggestion: TagSuggestion) => {
    setFieldInfos(
      produce((state) => {
        const fieldId = suggestion.fieldSchema.id;
        if (fieldId in state) return;
        state[fieldId] = {
          id: fieldId,
          type: "tagField",
          schema: suggestion.fieldSchema,
          value: suggestion.fieldSchema.default ?? null,
        };
      })
    );
  };

  const addCustomField = (schema: FieldSchema) => {
    setFieldInfos(
      produce((state) => {
        const fieldId = nanoid();
        state[fieldId] = {
          id: fieldId,
          type: "custom",
          schema,
          value: schema.default ?? null,
        };
      })
    );
  };

  const updateFieldValue = (fieldId: string, value: any) => {
    setFieldInfos(
      produce((state) => {
        const fieldInfo = state[fieldId];
        if (fieldInfo) fieldInfo.value = value;
      })
    );
  };

  const handleFieldUpdate = (fieldId: string) => (value: any) =>
    updateFieldValue(fieldId, value);

  const handleCommit = () => {
    const blockId = blockPropertiesDialog.blockId;
    if (!blockId) return;

    props.app.withTx((tx) => {
      const blockData = tx.getBlockData(blockId);
      if (!blockData) return;

      const fields: Record<string, TagField | CustomField> = {};
      const fieldValues: Record<string, any> = {};

      for (const [fieldId, fieldInfo] of Object.entries(fieldInfos)) {
        fields[fieldId] =
          fieldInfo.type === "tagField"
            ? {
                type: "tagField",
                tagId: fieldInfo.tagId!,
                fieldId: fieldInfo.id,
              }
            : { type: "custom", schema: fieldInfo.schema };
        fieldValues[fieldId] = fieldInfo.value;
      }

      tx.updateBlock(blockId, {
        fields,
        fieldValues,
      });
    });
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class="hidden" />
      <DialogContent class="sm:max-w-[525px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2 py-1">
            <Settings class="size-4 text-muted-foreground" />
            <span>块属性编辑器</span>
          </DialogTitle>
        </DialogHeader>

        <div class="space-y-5 py-4 flex-1 overflow-y-auto pr-2">
          <For each={Object.values(fieldInfos)}>
            {(fieldInfo) => {
              return (
                <>
                  <h2
                    classList={{
                      "mb-2": fieldInfo.schema.description == null,
                      "mb-1": fieldInfo.schema.description != null,
                    }}
                  >
                    {/* 是否可选 */}
                    <Show when={!fieldInfo.schema.optional}>
                      <span class="text-red-500 mr-1">*</span>
                    </Show>

                    {/* 字段 label */}
                    <span class="text-sm">{fieldInfo.schema.label}</span>

                    {/* 类型指示 */}
                    <span class="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded ml-2">
                      {fieldInfo.schema.type}
                    </span>
                  </h2>

                  {/* 字段描述 */}
                  <Show when={fieldInfo.schema.description != null}>
                    <p class="text-xs text-muted-foreground mb-2">
                      {fieldInfo.schema.description}
                    </p>
                  </Show>

                  {/* 字段值 */}
                  <TextField class="w-full flex items-center gap-2">
                    <Switch>
                      <Match when={fieldInfo.schema.type === "number"}>
                        <NumberInput
                          value={fieldInfo.value}
                          onValueChange={handleFieldUpdate(fieldInfo.id)}
                        />
                      </Match>
                      <Match when={fieldInfo.schema.type === "text"}>
                        <TextInput
                          value={fieldInfo.value}
                          onValueChange={handleFieldUpdate(fieldInfo.id)}
                        />
                      </Match>
                      <Match when={fieldInfo.schema.type === "date"}>
                        <DateInput
                          value={fieldInfo.value}
                          onValueChange={handleFieldUpdate(fieldInfo.id)}
                        />
                      </Match>
                      <Match when={fieldInfo.schema.type === "checkbox"}>
                        <CheckboxInput
                          value={
                            typeof fieldInfo.value === "boolean"
                              ? fieldInfo.value
                              : false
                          }
                          onValueChange={handleFieldUpdate(fieldInfo.id)}
                        />
                      </Match>
                    </Switch>
                    <ResetButton />
                  </TextField>
                </>
              );
            }}
          </For>

          <AddCustomFieldDialog
            open={addCustomFieldOpen()}
            onOpenChange={setAddCustomFieldOpen}
            onSave={addCustomField}
          />
        </div>

        <DialogFooter>
          <div class="w-full flex justify-between">
            <AddFieldDropdown
              tagSuggestions={tagSuggestions()}
              applyTagSuggestion={applyTagSuggestion}
              addCustomField={addCustomField}
              openAddCustomFieldDialog={() => setAddCustomFieldOpen(true)}
            />

            <div class="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                class="px-4"
              >
                取消
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  handleCommit();
                  setOpen(false);
                }}
                class="px-6"
              >
                应用
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
