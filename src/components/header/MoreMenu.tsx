import { useI18n } from "@/composables/useI18n";
import { EXPORT_FORMATS, useImportExport } from "@/composables/useImportExport";
import { useSettings } from "@/composables/useSettings";
import { App } from "@/lib/app/app";
import {
  Bookmark,
  BookOpen,
  Command,
  Download,
  History,
  Menu,
  MoreHorizontal,
  Paintbrush,
  Printer,
  RotateCcw,
  RotateCw,
  Settings,
  Trash2,
  Upload,
} from "lucide-solid";
import { LineSpacingToggle } from "../LineSpacingToggle";
import { ThemeToggle } from "../ThemeToggle";
import { Button, ButtonProps } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export const MoreMenu = (props: { app: App }) => {
  const { t } = useI18n();
  const { handleExport, handleImport, handleClearHistory, handleClearStorage } =
    useImportExport(props.app);
  const { setVisible } = useSettings(props.app);

  const openInputDialog = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = EXPORT_FORMATS;
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleImport(file);
      }
    };
    input.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as={(p: ButtonProps) => (
          <Tooltip>
            <TooltipTrigger
              as={(p) => (
                <Button variant="ghost" size="xs-icon" {...p}>
                  <MoreHorizontal />
                </Button>
              )}
              {...p}
            />
            <TooltipContent>{t("appHeader.more")}</TooltipContent>
          </Tooltip>
        )}
      />
      <DropdownMenuContent class="w-[270px]">
        {/* 主题设置 */}
        <div class="relative flex items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-hidden select-none">
          <div class="flex items-center gap-2">
            <Paintbrush size={16} class="text-muted-foreground shrink-0" />
            <span>{t("moremenu.theme")}</span>
          </div>
          <ThemeToggle app={props.app} />
        </div>

        {/* 行间距设置 */}
        <div class="relative flex items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-hidden select-none">
          <div class="flex items-center gap-2">
            <Menu size={16} class="text-muted-foreground shrink-0" />
            <span>{t("moremenu.lineSpace")}</span>
          </div>
          <LineSpacingToggle app={props.app} />
        </div>

        <DropdownMenuItem>
          <RotateCcw size={14} />
          <span>{t("menu.undo")}</span>
          <DropdownMenuShortcut>{t("menuShortcuts.undo")}</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <RotateCw size={14} />
          <span>{t("menu.redo")}</span>
          <DropdownMenuShortcut>{t("menuShortcuts.redo")}</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <History size={14} />
          <span>{t("menu.history")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Bookmark size={14} />
          <span>{t("menu.saveAsTemplate")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport()}>
          <Download size={14} />
          <span>{t("menu.export")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={openInputDialog}>
          <Upload size={14} />
          <span>{t("menu.import")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Printer size={14} />
          <span>{t("menu.print")}</span>
          <DropdownMenuShortcut>
            {t("menuShortcuts.print")}
          </DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <BookOpen size={14} />
          <span>{t("menu.tutorial")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Command size={14} />
          <span>{t("menu.shortcuts")}</span>
          <DropdownMenuShortcut>
            {t("menuShortcuts.shortcuts")}
          </DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setVisible(true)}>
          <Settings size={14} />
          <span>{t("menu.settings")}</span>
          <DropdownMenuShortcut>
            {t("menuShortcuts.settings")}
          </DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleClearHistory}>
          <Trash2 size={14} />
          <span>{t("menu.clearHistory")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem variant="destructive" onClick={handleClearStorage}>
          <Trash2 size={14} />
          <span>{t("menu.clearBlockStorage")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
