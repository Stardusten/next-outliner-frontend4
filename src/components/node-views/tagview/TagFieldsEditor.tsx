import { For, Show, createSignal } from "solid-js";
import { nanoid } from "nanoid";
import type { TagField, TagFieldOptionsMode } from "@/lib/tiptap/nodes/tag";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowDown, ArrowUp, Plus, Trash, X } from "lucide-solid";
import { useI18n } from "@/composables/useI18n";

type Props = {
  value: TagField[];
  onChange: (next: TagField[]) => void;
};

export const TagFieldsEditor = (props: Props) => {
  const { t } = useI18n();
  const [newOption, setNewOption] = createSignal("");

  const update = (updater: (curr: TagField[]) => TagField[]) => {
    props.onChange(updater(props.value));
  };

  const addField = () => {
    update((curr) => [
      ...curr,
      { id: nanoid(), label: "", type: "text", optional: false } as TagField,
    ]);
  };

  const removeField = (id: string) => {
    update((curr) => curr.filter((f) => f.id !== id));
  };

  const moveFieldUp = (index: number) => {
    if (index <= 0) return;
    update((curr) => {
      const arr = curr.slice();
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveFieldDown = (index: number) => {
    update((curr) => {
      if (index >= curr.length - 1) return curr;
      const arr = curr.slice();
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      return arr;
    });
  };

  const updateField = (id: string, patch: Partial<TagField>) => {
    update((curr) =>
      curr.map((f) => (f.id === id ? ({ ...f, ...patch } as TagField) : f))
    );
  };

  const addOption = (field: TagField) => {
    const v = newOption().trim();
    if (!v) return;
    if (field.type === "single" || field.type === "multiple") {
      const options = Array.isArray(field.options) ? field.options.slice() : [];
      options.push(v);
      const optionsMode: TagFieldOptionsMode = field.optionsMode ?? "manual";
      updateField(field.id, { options, optionsMode } as any);
    }
    setNewOption("");
  };

  const removeOption = (field: TagField, idx: number) => {
    if (field.type === "single" || field.type === "multiple") {
      const options = (field.options ?? []).slice();
      options.splice(idx, 1);
      updateField(field.id, { options } as any);
    }
  };

  const typeLabel = (v: string | undefined) =>
    v === "text"
      ? (t("tag.type.text") as string)
      : v === "single"
      ? (t("tag.type.single") as string)
      : v === "multiple"
      ? (t("tag.type.multiple") as string)
      : v === "date"
      ? (t("tag.type.date") as string)
      : v === "number"
      ? (t("tag.type.number") as string)
      : v === "checkbox"
      ? (t("tag.type.checkbox") as string)
      : "";

  const optionsModeLabel = (v: string | undefined) =>
    v === "manual"
      ? (t("tag.optionsSourceManual") as string)
      : v === "fromTag"
      ? (t("tag.optionsSourceFromTag") as string)
      : "";

  return (
    <div class="space-y-3" contentEditable={false}>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm">{t("tag.fieldsLabel")}</h2>
          <p class="text-xs text-muted-foreground">{t("tag.fieldsDesc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={addField}>
          <Plus />
          {t("tag.addField")}
        </Button>
      </div>

      <Show when={props.value.length === 0}>
        <span class="text-sm text-warning flex items-center gap-2">
          <AlertCircle class="size-4" />
          {t("tag.noFieldPlaceholder")}
        </span>
      </Show>

      <div class="space-y-4">
        <For each={props.value}>
          {(f, i) => (
            <div class="relative pl-8 space-y-3">
              <div class="absolute left-0 top-0 w-6 h-6 flex items-center justify-center">
                <span class="text-xs text-muted-foreground font-medium">
                  #{i() + 1}
                </span>
              </div>

              <div class="flex gap-3 items-start">
                <div class="flex-1 space-y-2">
                  <Label class="text-xs">{t("tag.fieldLabel")}</Label>
                  <TextField>
                    <TextFieldInput
                      value={f.label}
                      placeholder={t("tag.fieldLabelPlaceholder") as string}
                      onInput={(e) =>
                        updateField(f.id, {
                          label: (e.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                  </TextField>
                </div>

                <div class="w-32 space-y-2">
                  <Label class="text-xs">{t("tag.fieldType")}</Label>
                  <Select
                    value={f.type}
                    onChange={(v) => updateField(f.id, { type: v as any })}
                    options={[
                      "text",
                      "single",
                      "multiple",
                      "date",
                      "number",
                      "checkbox",
                    ]}
                    multiple={false}
                    itemComponent={(props) => (
                      <SelectItem item={props.item}>
                        {typeLabel(props.item.rawValue as string)}
                      </SelectItem>
                    )}
                    modal={true}
                  >
                    <SelectTrigger class="w-full">
                      <SelectValue<string>>
                        {(state) => typeLabel(state.selectedOption() as string)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                </div>

                <div class="w-8 space-y-2 ml-2">
                  <Label class="text-xs">{t("tag.fieldOptional")}</Label>
                  <div class="h-9 flex items-center justify-start">
                    <Button
                      variant={f.optional ? "secondary" : "outline"}
                      size="2xs-icon"
                      onClick={() =>
                        updateField(f.id, { optional: !f.optional } as any)
                      }
                    >
                      {f.optional ? "✓" : ""}
                    </Button>
                  </div>
                </div>

                <div class="w-24 flex justify-end gap-1 items-center mt-7">
                  <Button
                    size="2xs-icon"
                    variant="ghost"
                    disabled={i() === 0}
                    onClick={() => moveFieldUp(i())}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="2xs-icon"
                    variant="ghost"
                    disabled={i() === props.value.length - 1}
                    onClick={() => moveFieldDown(i())}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="2xs-icon"
                    variant="ghost"
                    class="text-destructive"
                    onClick={() => removeField(f.id)}
                  >
                    <Trash />
                  </Button>
                </div>
              </div>

              <Show when={f.type === "single" || f.type === "multiple"}>
                <div class="space-y-4">
                  <div class="space-y-2">
                    <Label class="text-xs">{t("tag.optionsSource")}</Label>
                    <Select
                      value={(f as any).optionsMode ?? "manual"}
                      onChange={(v) =>
                        updateField(f.id, {
                          optionsMode: v as TagFieldOptionsMode,
                        } as any)
                      }
                      options={["manual", "fromTag"]}
                      multiple={false}
                      itemComponent={(props) => (
                        <SelectItem item={props.item}>
                          {optionsModeLabel(props.item.rawValue as string)}
                        </SelectItem>
                      )}
                      modal={true}
                    >
                      <SelectTrigger class="w-50">
                        <SelectValue<string>>
                          {(state) =>
                            optionsModeLabel(state.selectedOption() as string)
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent />
                    </Select>
                  </div>

                  <Show
                    when={(f as any).optionsMode === "manual"}
                    fallback={
                      <div class="space-y-2">
                        <Label class="text-xs">
                          {t("tag.optionsFromTagLabel")}
                        </Label>
                        <TextField>
                          <TextFieldInput
                            value={(f as any).fromTag ?? ""}
                            placeholder={
                              t("tag.optionsFromTagPlaceholder") as string
                            }
                            class="max-w-[280px]"
                            onInput={(e) =>
                              updateField(f.id, {
                                fromTag: (e.currentTarget as HTMLInputElement)
                                  .value,
                              } as any)
                            }
                          />
                        </TextField>
                      </div>
                    }
                  >
                    <div class="space-y-2">
                      <div class="flex items-center gap-2">
                        <TextField class="w-50">
                          <TextFieldInput
                            value={newOption()}
                            placeholder={
                              t("tag.addOptionPlaceholder") as string
                            }
                            onInput={(e) =>
                              setNewOption(
                                (e.currentTarget as HTMLInputElement).value
                              )
                            }
                          />
                        </TextField>
                        <Button variant="outline" onClick={() => addOption(f)}>
                          <Plus />
                          {t("tag.addOption")}
                        </Button>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <For each={(f as any).options ?? []}>
                          {(opt: string, idx) => (
                            <div class="flex items-center gap-1 px-2 py-[4px] rounded-md bg-muted text-xs">
                              <span>{opt}</span>
                              <Button
                                class="size-4 px-0! cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                variant="ghost"
                                onClick={() => removeOption(f, idx())}
                              >
                                <X class="size-3" />
                              </Button>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default TagFieldsEditor;
