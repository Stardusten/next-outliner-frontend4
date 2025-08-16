import { useI18n } from "@/composables/useI18n";

export const Unsupported = (props: { typeText: string }) => {
  const { t } = useI18n();
  return (
    <div
      class="inline-block px-4 py-3 my-1 rounded-md border text-[.9em]"
      classList={{ "text-destructive border-destructive/20": true }}
      contentEditable={false}
    >
      {t("file.preview.unsupported", { type: props.typeText })}
    </div>
  );
};
