import { Checkbox } from "@/components/ui/checkbox";

export const CheckboxInput = (props: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) => {
  return <Checkbox checked={props.value} onChange={props.onValueChange} />;
};
