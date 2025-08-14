import { Show } from "solid-js";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import { AlertCircle } from "lucide-solid";

export default function InheritsSection(props: {
  t: (k: any, p?: any) => any;
  getInheritsText: () => string;
  setInheritsText: (v: string) => void;
  getError: () => string;
  setError: (v: string) => void;
}) {
  return (
    <div class="space-y-1">
      <h2 class="text-sm">{props.t("tag.inheritsLabel")}</h2>
      <p class="text-xs text-muted-foreground mb-2">
        {props.t("tag.inheritsDesc")}
      </p>
      <TextField class="w-full max-w-[380px]">
        <TextFieldInput
          value={props.getInheritsText()}
          placeholder={props.t("tag.inheritsPlaceholder") as string}
          onInput={(e) => {
            props.setInheritsText((e.currentTarget as HTMLInputElement).value);
            props.setError("");
          }}
        />
      </TextField>
      <Show when={!!props.getError()}>
        <p class="text-sm text-destructive mt-3 flex items-center gap-2">
          <AlertCircle class="size-4" />
          {props.getError()}
        </p>
      </Show>
    </div>
  );
}
