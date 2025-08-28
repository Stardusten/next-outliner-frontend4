import { TextFieldInput } from "@/components/ui/text-field";

export const TextInput = (props: {
  value: string | null;
  onValueChange: (value: string | null) => void;
}) => {
  return (
    <TextFieldInput
      type="text"
      value={props.value ?? ""}
      onInput={(e) => {
        const text = (e.target as HTMLInputElement).value;
        if (text.length > 0) props.onValueChange(text);
        else props.onValueChange(null);
      }}
    />
  );
};
