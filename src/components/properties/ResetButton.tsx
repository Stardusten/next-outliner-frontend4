import { RefreshCcw } from "lucide-solid";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ResetButton = () => {
  return (
    <Tooltip>
      <TooltipTrigger
        as={(p: ButtonProps) => (
          <Button variant="ghost" size="icon" {...p}>
            <RefreshCcw class="size-4" />
          </Button>
        )}
      />
      <TooltipContent>重置为默认值</TooltipContent>
    </Tooltip>
  );
};
