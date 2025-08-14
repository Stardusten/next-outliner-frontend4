import {
  TextField,
  TextFieldDescription,
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/ui/text-field";
import type { useRepoWizard } from "@/composables/useRepoWizard";
import { JSX } from "solid-js";
import { useI18n } from "@/composables/useI18n";

type Props = {
  wizard: ReturnType<typeof useRepoWizard>;
};

export default function WizardStepBasicInfo(props: Props): JSX.Element {
  const { form } = props.wizard;
  const { t } = useI18n();
  return (
    <div class="space-y-4">
      <TextField validationState={form.errors.title ? "invalid" : "valid"}>
        <TextFieldLabel>{t("repoWizard.basicInfo.nameLabel")}</TextFieldLabel>
        <TextFieldInput
          value={form.values.title}
          onInput={(e) =>
            form.setFieldValue(
              "title",
              (e.currentTarget as HTMLInputElement).value
            )
          }
          onBlur={() => form.validateField("title")}
          placeholder={t("repoWizard.basicInfo.namePlaceholder")}
        />
        <TextFieldErrorMessage>{form.errors.title}</TextFieldErrorMessage>
      </TextField>

      <TextField validationState={form.errors.id ? "invalid" : "valid"}>
        <TextFieldLabel>{t("repoWizard.basicInfo.idLabel")}</TextFieldLabel>
        <TextFieldInput
          value={form.values.id}
          onInput={(e) =>
            form.setFieldValue(
              "id",
              (e.currentTarget as HTMLInputElement).value
            )
          }
          onBlur={() => form.validateField("id")}
        />
        <TextFieldDescription>
          <span>{t("repoWizard.basicInfo.idHint")}</span>
        </TextFieldDescription>
        <TextFieldErrorMessage>{form.errors.id}</TextFieldErrorMessage>
      </TextField>
    </div>
  );
}
