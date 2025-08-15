import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Folder } from "lucide-solid";
import AttachmentPopupContent from "./AttachmentPopupContent";
import type { App } from "@/lib/app/app";
import { useI18n } from "@/composables/useI18n";

export function AttachmentPopup(props: { app: App }) {
  const { t } = useI18n();

  return (
    <Popover>
      <PopoverTrigger
        as={(p: ButtonProps) => (
          <Tooltip>
            <TooltipTrigger
              as={(p2: ButtonProps) => (
                <Button variant="ghost" size="xs-icon" {...p} {...p2}>
                  <Folder size={18} />
                </Button>
              )}
              {...p}
            />
            <TooltipContent>{t("attachmentMgr.tooltip")}</TooltipContent>
          </Tooltip>
        )}
      />
      <PopoverContent class="w-96">
        <AttachmentPopupContent app={props.app} />
      </PopoverContent>
    </Popover>
  );
}

export default AttachmentPopup;
