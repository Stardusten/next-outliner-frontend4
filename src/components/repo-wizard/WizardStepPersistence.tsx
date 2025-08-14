import type { useRepoWizard } from "@/composables/useRepoWizard";
import { JSX, createMemo } from "solid-js";
import { checkExists } from "@/lib/persistence";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/composables/useI18n";

type Props = {
  wizard: ReturnType<typeof useRepoWizard>;
};

export default function WizardStepPersistence(props: Props): JSX.Element {
  const { form } = props.wizard;
  const { t } = useI18n();
  const id = createMemo(() => form.values.id);
  const persistenceType = createMemo(() => form.values.persistence?.type);
  const existStatus = createMemo(() => {
    if (!id() || !persistenceType()) return "others" as const;
    return checkExists(persistenceType()!, id()!);
  });

  return (
    <div class="grid gap-3">
      <div class="space-y-2">
        <Select
          value={form.values.persistence.type}
          onChange={(v) =>
            form.setFieldValue("persistence.type", v || "local-storage")
          }
          options={["local-storage"]}
          placeholder={t("repoWizard.persistence.placeholder")}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
          )}
        >
          <SelectTrigger aria-label={t("repoWizard.persistence.ariaLabel")}>
            <SelectValue<string>>
              {(state) => state.selectedOption()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
        {existStatus() !== "others" && (
          <div
            class="text-sm flex items-start gap-2 mt-2"
            classList={{
              "text-green-700":
                existStatus() === "valid" || existStatus() === "notFound",
              "text-orange-500": existStatus() === "corrupted",
            }}
          >
            <span class="flex-1 leading-relaxed">
              {existStatus() === "valid" &&
                t("repoWizard.persistence.existStatus.valid", { id: id() })}
              {existStatus() === "notFound" &&
                t("repoWizard.persistence.existStatus.notFound", { id: id() })}
              {existStatus() === "corrupted" &&
                t("repoWizard.persistence.existStatus.corrupted")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
