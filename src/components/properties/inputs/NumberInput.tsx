import { createEffect } from "solid-js";
import { TextFieldInput } from "@/components/ui/text-field";

export const NumberInput = (props: {
  value: number | null;
  onValueChange: (value: number | null) => void;
}) => {
  let inputRef: HTMLInputElement = null!;

  createEffect(() => {
    inputRef.value =
      typeof props.value === "number" ? props.value.toString() : "";
  });

  const handleInput = (e: InputEvent) => {
    const value = inputRef.valueAsNumber;
    if (!Number.isNaN(value)) props.onValueChange(value);
    else props.onValueChange(null);
  };

  return <TextFieldInput type="number" ref={inputRef} onInput={handleInput} />;
};
