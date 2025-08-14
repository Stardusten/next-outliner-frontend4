import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsFooter(props: {
  t: (k: any, p?: any) => any;
  isDirty: () => boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <CardFooter class="flex justify-end gap-2">
      <Button
        variant="outline"
        disabled={!props.isDirty()}
        onClick={(e) => {
          e.stopPropagation();
          props.onDiscard();
        }}
      >
        {props.t("tag.discard")}
      </Button>
      <Button
        disabled={!props.isDirty()}
        onClick={(e) => {
          e.stopPropagation();
          props.onSave();
        }}
      >
        {props.t("tag.save")}
      </Button>
    </CardFooter>
  );
}
