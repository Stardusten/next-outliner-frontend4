import { createEffect } from "solid-js";
import { TextFieldInput } from "@/components/ui/text-field";

export const DateInput = (props: {
  value: string | null;
  onValueChange: (value: string | null) => void;
}) => {
  let inputRef: HTMLInputElement = null!;

  createEffect(() => {
    inputRef.value = props.value ?? "";
  });

  const handleInput = (e: InputEvent) => {
    const date = inputRef.value;
    const valid = !!inputRef.valueAsDate;
    if (valid) props.onValueChange(date);
    else props.onValueChange(null);
  };

  return <TextFieldInput type="date" ref={inputRef} onInput={handleInput} />;
};
