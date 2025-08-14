import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/ui/text-field";
import type { useRepoWizard } from "@/composables/useRepoWizard";
import { JSX } from "solid-js";
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

export default function WizardStepAttachment(props: Props): JSX.Element {
  const { form } = props.wizard;
  const { t } = useI18n();

  return (
    <div class="space-y-4 max-h-[60vh] overflow-y-auto px-1">
      <div class="grid gap-3">
        <Select
          value={form.values.attachment.storageType}
          onChange={(v) =>
            form.setFieldValue("attachment.storageType", v || "none")
          }
          options={["none", "oss"]}
          placeholder={t("repoWizard.attachment.placeholder")}
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
          )}
        >
          <SelectTrigger aria-label={t("repoWizard.attachment.ariaLabel")}>
            <SelectValue<string>>
              {(state) => state.selectedOption()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent />
        </Select>
      </div>

      {form.values.attachment?.storageType === "oss" && (
        <div class="space-y-3 p-4 bg-accent/30 rounded-lg border mt-4">
          <h4 class="font-medium text-sm">
            {t("repoWizard.attachment.ossConfigTitle")}
          </h4>

          <div class="space-y-3">
            <TextField>
              <TextFieldLabel class="text-xs">
                {t("repoWizard.attachment.fields.endpoint.label")}
              </TextFieldLabel>
              <TextFieldInput
                placeholder={t(
                  "repoWizard.attachment.fields.endpoint.placeholder"
                )}
                class="text-sm"
                value={form.values.attachment.endpoint}
                onInput={(e) =>
                  form.setFieldValue(
                    "attachment.endpoint",
                    (e.currentTarget as HTMLInputElement).value
                  )
                }
              />
            </TextField>

            <TextField>
              <TextFieldLabel class="text-xs">
                {t("repoWizard.attachment.fields.bucket.label")}
              </TextFieldLabel>
              <TextFieldInput
                placeholder={t(
                  "repoWizard.attachment.fields.bucket.placeholder"
                )}
                class="text-sm"
                value={form.values.attachment.bucket}
                onInput={(e) =>
                  form.setFieldValue(
                    "attachment.bucket",
                    (e.currentTarget as HTMLInputElement).value
                  )
                }
              />
            </TextField>

            <TextField>
              <TextFieldLabel class="text-xs">
                {t("repoWizard.attachment.fields.accessKeyId.label")}
              </TextFieldLabel>
              <TextFieldInput
                placeholder={t(
                  "repoWizard.attachment.fields.accessKeyId.placeholder"
                )}
                class="text-sm"
                value={form.values.attachment.accessKeyId}
                onInput={(e) =>
                  form.setFieldValue(
                    "attachment.accessKeyId",
                    (e.currentTarget as HTMLInputElement).value
                  )
                }
              />
            </TextField>

            <TextField>
              <TextFieldLabel class="text-xs">
                {t("repoWizard.attachment.fields.secretAccessKey.label")}
              </TextFieldLabel>
              <TextFieldInput
                type="password"
                placeholder={t(
                  "repoWizard.attachment.fields.secretAccessKey.placeholder"
                )}
                class="text-sm"
                value={form.values.attachment.secretAccessKey}
                onInput={(e) =>
                  form.setFieldValue(
                    "attachment.secretAccessKey",
                    (e.currentTarget as HTMLInputElement).value
                  )
                }
              />
            </TextField>
          </div>
        </div>
      )}
    </div>
  );
}
