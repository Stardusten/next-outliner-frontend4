import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { nanoid } from "nanoid";
import { Edit2, Plus, Save, Settings, Trash2 } from "lucide-solid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/composables/useI18n";
import {
  CheckboxFieldSchema,
  DateFieldSchema,
  FieldOptions,
  FieldSchema,
  MultipleChoiceFieldSchema,
  NumberFieldSchema,
  RecursivePartial,
  SingleChoiceFieldSchema,
  TextFieldSchema,
} from "@/lib/common/types";
import { CheckboxInput } from "./inputs/CheckboxInput";
import { NumberInput } from "./inputs/NumberInput";
import { TextInput } from "./inputs/TextInput";
import { DateInput } from "./inputs/DateInput";

export const AddCustomFieldDialog = (props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fieldSchema: FieldSchema) => void;
}) => {
  const DEFAULTS = {
    text: {
      label: "文本",
      description: "一个文本字段",
      type: "text",
      optional: true,
    } as RecursivePartial<TextFieldSchema>,
    date: {
      label: "日期",
      description: "一个日期字段",
      type: "date",
      optional: true,
    } as RecursivePartial<DateFieldSchema>,
    number: {
      label: "数字",
      description: "一个数字字段",
      type: "number",
      optional: true,
    } as RecursivePartial<NumberFieldSchema>,
    checkbox: {
      label: "复选",
      description: "一个复选字段",
      type: "checkbox",
      optional: true,
    } as RecursivePartial<CheckboxFieldSchema>,
    single: {
      label: "单选",
      description: "一个单选字段",
      type: "single",
      options: { type: "fromTag", tagId: undefined },
      optional: true,
    } as RecursivePartial<SingleChoiceFieldSchema>,
    multiple: {
      label: "多选",
      description: "一个多选字段",
      type: "multiple",
      options: { type: "fromTag", tagId: undefined },
      optional: true,
    } as RecursivePartial<MultipleChoiceFieldSchema>,
    fromTagOptions: {
      type: "fromTag",
      tagId: undefined,
    } as RecursivePartial<FieldOptions>,
    manualOptions: {
      type: "manual",
      options: [],
    } as RecursivePartial<FieldOptions>,
  } as const;

  const { t } = useI18n();
  const [fieldSchema, setFieldSchema] = createStore(DEFAULTS.text as any);
  const [newOption, setNewOption] = createSignal("");
  const [editingOption, setEditingOption] = createSignal<{
    index: number;
    value: string;
  } | null>(null);
  const [fieldName, setFieldName] = createSignal("");
  const [fieldDescription, setFieldDescription] = createSignal("");
  const [defaultValue, setDefaultValue] = createSignal<any>(null);
  const [selectedSingleOption, setSelectedSingleOption] =
    createSignal<string>("");
  const [selectedMultipleOptions, setSelectedMultipleOptions] = createSignal<
    string[]
  >([]);

  // Reset form when dialog opens
  createEffect(() => {
    if (props.open) {
      setFieldSchema(DEFAULTS.text as any);
      setNewOption("");
      setEditingOption(null);
      setFieldName("");
      setFieldDescription("");
      setDefaultValue(null);
      setSelectedSingleOption("");
      setSelectedMultipleOptions([]);
    }
  });

  const updateFieldType = (type: FieldSchema["type"]) => {
    if (type === fieldSchema.type) return;
    const defaultVal = DEFAULTS[type];
    const newState = {
      ...defaultVal,
      // 修改类型时，id, label 和 description 继承自之前的
      id: fieldSchema.id,
      label: fieldSchema.label,
      description: fieldSchema.description,
    } as FieldSchema;
    setFieldSchema(newState);
    // 重置默认值
    setDefaultValue(null);
    setSelectedSingleOption("");
    setSelectedMultipleOptions([]);
  };

  const updateFieldOptional = (optional: boolean) => {
    setFieldSchema(
      produce((state: any) => {
        state.optional = optional;
      })
    );
  };

  const updateFieldOptionsType = (type: FieldOptions["type"]) => {
    setFieldSchema(
      produce((state: any) => {
        if (state.type === "single" || state.type === "multiple") {
          if (state.options?.type === type) return;
          state.options =
            type === "fromTag"
              ? DEFAULTS.fromTagOptions
              : DEFAULTS.manualOptions;
          console.log("new options", state.options);
        }
      })
    );
    // 重置选择的选项
    if (fieldSchema.type === "single") {
      setSelectedSingleOption("");
    } else if (fieldSchema.type === "multiple") {
      setSelectedMultipleOptions([]);
    }
  };

  const updateTagId = (tagId: string) => {
    setFieldSchema(
      produce((state: any) => {
        if (state.options?.type === "fromTag") {
          state.options.tagId = tagId;
        }
      })
    );
  };

  const addOption = () => {
    const option = newOption();
    if (!option) return;

    setFieldSchema(
      produce((state: any) => {
        if (state.options?.type === "manual") {
          if (!state.options.options) state.options.options = [];
          state.options.options.push(option);
        }
      })
    );
    setNewOption("");
  };

  const removeOption = (index: number) => {
    setFieldSchema(
      produce((state: any) => {
        if (state.options?.type === "manual" && state.options.options) {
          const removedOption = state.options.options[index];
          state.options.options.splice(index, 1);

          // 如果删除的是已选项，需要更新默认值
          if (
            fieldSchema.type === "single" &&
            selectedSingleOption() === removedOption
          ) {
            setSelectedSingleOption("");
          } else if (fieldSchema.type === "multiple") {
            setSelectedMultipleOptions((prev) =>
              prev.filter((opt) => opt !== removedOption)
            );
          }
        }
      })
    );
  };

  const startEditOption = (index: number, value: string) => {
    setEditingOption({ index, value });
  };

  const saveEditOption = () => {
    const editing = editingOption();
    if (!editing) return;

    setFieldSchema(
      produce((state: any) => {
        if (state.options?.type === "manual" && state.options.options) {
          const oldValue = state.options.options[editing.index];
          state.options.options[editing.index] = editing.value;

          // 更新已选项中的引用
          if (
            fieldSchema.type === "single" &&
            selectedSingleOption() === oldValue
          ) {
            setSelectedSingleOption(editing.value);
          } else if (fieldSchema.type === "multiple") {
            setSelectedMultipleOptions((prev) =>
              prev.map((opt) => (opt === oldValue ? editing.value : opt))
            );
          }
        }
      })
    );
    setEditingOption(null);
  };

  const toggleMultipleOption = (option: string) => {
    const selected = selectedMultipleOptions();
    if (selected.includes(option)) {
      setSelectedMultipleOptions(selected.filter((opt) => opt !== option));
    } else {
      setSelectedMultipleOptions([...selected, option]);
    }
  };

  const handleDefaultValueChange = (value: any) => {
    setDefaultValue(value);
  };

  const handleSave = () => {
    if (!fieldName()) return;

    let finalDefaultValue = defaultValue();

    // 处理选择类型的默认值
    if (fieldSchema.type === "single") {
      finalDefaultValue = selectedSingleOption() || null;
    } else if (fieldSchema.type === "multiple") {
      finalDefaultValue =
        selectedMultipleOptions().length > 0 ? selectedMultipleOptions() : null;
    }

    const schema: FieldSchema = {
      ...fieldSchema,
      id: nanoid(),
      label: fieldName(),
      description: fieldDescription() || undefined,
      default: finalDefaultValue,
    };

    props.onSave?.(schema);
    props.onOpenChange(false);
  };

  const getTypeName = (type: string) => t(`blockProperties.type${type}` as any);
  const getOptionSourceName = (type: string) =>
    t(`blockProperties.optionSource_${type}` as any);

  // 默认值区域渲染
  const renderDefaultValueInput = () => {
    return (
      <TextField class="gap-1.5">
        <h2 class="text-sm">默认值</h2>
        <Switch>
          <Match when={fieldSchema.type === "text"}>
            <TextInput
              value={defaultValue()}
              onValueChange={handleDefaultValueChange}
            />
          </Match>
          <Match when={fieldSchema.type === "number"}>
            <NumberInput
              value={defaultValue()}
              onValueChange={handleDefaultValueChange}
            />
          </Match>
          <Match when={fieldSchema.type === "date"}>
            <DateInput
              value={defaultValue()}
              onValueChange={handleDefaultValueChange}
            />
          </Match>
          <Match when={fieldSchema.type === "checkbox"}>
            <CheckboxInput
              value={!!defaultValue()}
              onValueChange={handleDefaultValueChange}
            />
          </Match>
          <Match
            when={
              fieldSchema.type === "single" &&
              fieldSchema.options?.type === "manual"
            }
          >
            <div class="w-full">
              <Select
                value={selectedSingleOption()}
                onChange={(value) => setSelectedSingleOption(value || "")}
                options={fieldSchema.options?.options || []}
                itemComponent={(p) => (
                  <SelectItem item={p.item}>{p.item.rawValue}</SelectItem>
                )}
                multiple={false}
                modal={true}
              >
                <SelectTrigger class="w-full">
                  <SelectValue<string>>
                    {(state) => state.selectedOption() || "请选择默认值"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
              <Show when={fieldSchema.options?.options?.length === 0}>
                <p class="text-xs text-muted-foreground mt-1">请先添加选项</p>
              </Show>
            </div>
          </Match>
          <Match
            when={
              fieldSchema.type === "multiple" &&
              fieldSchema.options?.type === "manual"
            }
          >
            <div class="w-full space-y-2">
              <Show when={fieldSchema.options?.options?.length === 0}>
                <p class="text-xs text-muted-foreground">请先添加选项</p>
              </Show>
              <div class="space-y-1">
                <For each={fieldSchema.options?.options || []}>
                  {(option) => (
                    <div class="flex items-center gap-2">
                      <CheckboxInput
                        value={selectedMultipleOptions().includes(option)}
                        onValueChange={() => toggleMultipleOption(option)}
                      />
                      <span class="text-sm">{option}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Match>
          <Match
            when={
              fieldSchema.type === "single" &&
              fieldSchema.options?.type === "fromTag"
            }
          >
            <p class="text-xs text-muted-foreground">
              使用标签作为来源时，无法在此设置默认值
            </p>
          </Match>
          <Match
            when={
              fieldSchema.type === "multiple" &&
              fieldSchema.options?.type === "fromTag"
            }
          >
            <p class="text-xs text-muted-foreground">
              使用标签作为来源时，无法在此设置默认值
            </p>
          </Match>
        </Switch>
      </TextField>
    );
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogTrigger class="hidden"></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Settings class="size-4" />
            添加自定义字段
          </DialogTitle>
          <DialogDescription>
            自定义字段仅存在于这个块，不来自标签
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-6 py-4">
          {/* 字段名 */}
          <TextField class="gap-1.5">
            <h2 class="text-sm">字段名</h2>
            <TextFieldInput
              value={fieldName()}
              onInput={(e) =>
                setFieldName((e.target as HTMLInputElement).value)
              }
              placeholder="请输入字段名称"
            />
          </TextField>

          {/* 字段描述 */}
          <TextField class="gap-1.5">
            <h2 class="text-sm">字段描述 (可选)</h2>
            <TextFieldInput
              value={fieldDescription()}
              onInput={(e) =>
                setFieldDescription((e.target as HTMLInputElement).value)
              }
              placeholder="请输入字段描述"
            />
          </TextField>

          {/* 字段类型 */}
          <TextField class="gap-1.5">
            <h2 class="text-sm">类型</h2>
            <Select
              value={fieldSchema.type}
              onChange={(type) => updateFieldType(type ?? "text")}
              options={[
                "text",
                "date",
                "number",
                "checkbox",
                "single",
                "multiple",
              ]}
              itemComponent={(p) => (
                <SelectItem item={p.item}>
                  {getTypeName(p.item.rawValue)}
                </SelectItem>
              )}
              multiple={false}
              modal={true}
            >
              <SelectTrigger class="w-full">
                <SelectValue<string>>
                  {(state) => getTypeName(state.selectedOption())}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </TextField>

          {/* 字段是否可选 */}
          <TextField class="flex">
            <h2 class="text-sm">可选？</h2>
            <CheckboxInput
              value={fieldSchema.optional}
              onValueChange={(newVal) => updateFieldOptional(newVal)}
            />
          </TextField>

          {/* 字段选项（用于单选和多选） */}
          <Show
            when={
              fieldSchema.type === "single" || fieldSchema.type === "multiple"
            }
          >
            <div class="space-y-4">
              <TextField class="gap-1.5">
                <h2 class="text-sm">选项来源</h2>
                <Select
                  value={fieldSchema.options?.type || "fromTag"}
                  onChange={(type) => updateFieldOptionsType(type ?? "fromTag")}
                  options={["fromTag", "manual"]}
                  itemComponent={(p) => (
                    <SelectItem item={p.item}>
                      {getOptionSourceName(p.item.rawValue)}
                    </SelectItem>
                  )}
                  multiple={false}
                  modal={true}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) => getOptionSourceName(state.selectedOption())}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </TextField>

              {/* 标签选项，来源是 fromTag */}
              <Show when={fieldSchema.options?.type === "fromTag"}>
                <TextField class="gap-1.5">
                  <h2 class="text-sm">标签 ID</h2>
                  <TextFieldInput
                    value={fieldSchema.options?.tagId || ""}
                    placeholder="输入标签ID"
                    onInput={(e) =>
                      updateTagId((e.target as HTMLInputElement).value)
                    }
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    从指定标签的子标签获取选项列表
                  </p>
                </TextField>
              </Show>

              {/* 选项编辑器，来源是 manual */}
              <Show when={fieldSchema.options?.type === "manual"}>
                <TextField class="gap-1.5">
                  <h2 class="text-sm">选项列表</h2>

                  {/* 选项列表 */}
                  <div class="border rounded-md p-1 bg-muted/20 space-y-0.5">
                    <For each={fieldSchema.options?.options || []}>
                      {(option, index) => (
                        <div class="flex items-center justify-between gap-2 py-0.5 px-1 rounded-sm hover:bg-muted/50">
                          <Show
                            when={editingOption()?.index === index()}
                            fallback={<div class="flex-1">{option}</div>}
                          >
                            <TextFieldInput
                              class="flex-1"
                              value={editingOption()?.value || ""}
                              onInput={(e) =>
                                setEditingOption({
                                  index: index(),
                                  value: (e.target as HTMLInputElement).value,
                                })
                              }
                            />
                          </Show>

                          <div class="flex gap-0.5">
                            <Show
                              when={editingOption()?.index === index()}
                              fallback={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    startEditOption(index(), option)
                                  }
                                  class="h-7 w-7"
                                >
                                  <Edit2 class="size-3" />
                                </Button>
                              }
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={saveEditOption}
                                class="h-7 w-7"
                              >
                                <Save class="size-3" />
                              </Button>
                            </Show>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(index())}
                              class="h-7 w-7"
                            >
                              <Trash2 class="size-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>

                    {/* 添加新选项 */}
                    <div class="flex gap-1 mt-1">
                      <TextFieldInput
                        class="flex-1"
                        value={newOption()}
                        placeholder="新选项"
                        onInput={(e) =>
                          setNewOption((e.target as HTMLInputElement).value)
                        }
                        onKeyDown={(e) => e.key === "Enter" && addOption()}
                      />
                      <Button
                        onClick={addOption}
                        variant="outline"
                        class="h-8 px-2 py-0"
                      >
                        <Plus class="size-3 mr-1" />
                        添加
                      </Button>
                    </div>
                  </div>
                </TextField>
              </Show>
            </div>
          </Show>

          {/* 字段默认值 */}
          {renderDefaultValueInput()}
        </div>

        <DialogFooter class="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!fieldName()}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
