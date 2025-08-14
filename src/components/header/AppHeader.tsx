import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import { Menu, MoreHorizontal, Search } from "lucide-solid";
import { Button } from "../ui/button";
import { MainBreadcrumb } from "./MainBreadcrumb";
import { MoreMenu } from "./MoreMenu";
import SearchPopup from "../SearchPopup";

type Props = {
  app: App;
};

export const AppHeader = (props: Props) => {
  const { t } = useI18n();

  return (
    <header class="h-[46px] pt-[15px] pr-4 pb-3 pl-4 flex items-center justify-between border-b border-border bg-background shrink-0">
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="xs-icon">
          <Menu />
        </Button>
        <MainBreadcrumb app={props.app} />
      </div>

      <div class="flex items-center gap-1">
        <SearchPopup
          app={props.app}
          trigger={(p) => (
            <Button variant="ghost" size="xs-icon" {...p}>
              <Search />
            </Button>
          )}
        />

        <MoreMenu
          trigger={(p) => (
            <Button variant="ghost" size="xs-icon" {...p}>
              <MoreHorizontal />
            </Button>
          )}
          app={props.app}
        />
      </div>
    </header>
  );
};
