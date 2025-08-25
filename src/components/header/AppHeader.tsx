import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import { Menu, MoreHorizontal, Search } from "lucide-solid";
import { Button } from "../ui/button";
import { MainBreadcrumb } from "./MainBreadcrumb";
import { MoreMenu } from "./MoreMenu";
import SearchPopup from "../SearchPopup";
import ClipboardPopup from "../ClipboardPopup";
import AttachmentPopup from "../AttachmentPopup";

type Props = {
  app: App;
};

export const AppHeader = (props: Props) => {
  const { t } = useI18n();

  return (
    <header class="h-[46px] py-3 px-4 pt-[15px] flex items-center justify-between border-b border-border bg-background shrink-0">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <Button variant="ghost" size="xs-icon" class="shrink-0">
          <Menu />
        </Button>
        <MainBreadcrumb app={props.app} class="overflow-x-auto no-scrollbar" />
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <AttachmentPopup app={props.app} />
        <ClipboardPopup app={props.app} />
        <SearchPopup app={props.app} />
        <MoreMenu app={props.app} />
      </div>
    </header>
  );
};
