import { For, Show, createSignal } from "solid-js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Clipboard as IconClipboard,
  ClipboardPaste,
  ClipboardX,
  Trash,
  Trash2,
} from "lucide-solid";
import { useBlockClipboard } from "@/composables/useBlockClipboard";
import type { App } from "@/lib/app/app";
import ReadonlyBlockView from "@/components/ReadonlyBlockView";
import { useI18n } from "@/composables/useI18n";

export default function ClipboardPopup(props: { app: App }) {
  const {
    blockNodesCutted,
    removeBlock,
    removeAllBlocks,
    pasteAllBlocks,
    pasteBlock,
  } = useBlockClipboard(props.app);
  const { t } = useI18n();

  return (
    <Show when={blockNodesCutted().length > 0}>
      <Popover>
        <PopoverTrigger
          as={(p: ButtonProps) => (
            <Tooltip>
              <TooltipTrigger
                as={(p: ButtonProps) => (
                  <Button
                    variant="ghost"
                    size="xs-icon"
                    class="relative"
                    {...p}
                  >
                    <IconClipboard size={18} />
                    <div class="absolute top-[2px] right-[2px] size-[5px] rounded-full bg-destructive" />
                  </Button>
                )}
                {...p}
              />
              <TooltipContent>{t("clipboardPopup.tooltip")}</TooltipContent>
            </Tooltip>
          )}
        />

        <PopoverContent class="w-96">
          <div class="flex flex-col space-y-2">
            <div class="flex items-start">
              <div class="space-y-1 pr-2">
                <div class="font-semibold leading-none tracking-tight">
                  {t("clipboardPopup.title")}
                </div>
                <div class="text-xs text-muted-foreground">
                  {t("clipboardPopup.blockCount", {
                    count: blockNodesCutted().length,
                  })}
                </div>
              </div>
              <div class="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  class="h-8"
                  onClick={() => pasteAllBlocks()}
                >
                  <ClipboardPaste size={18} /> {t("clipboardPopup.pasteAll")}
                </Button>
                <Button
                  variant="destructiveOutline"
                  class="h-8"
                  onClick={() => removeAllBlocks()}
                >
                  <Trash size={18} /> {t("clipboardPopup.clearAll")}
                </Button>
              </div>
            </div>

            <div class="space-y-2 max-h-80 overflow-y-auto">
              <For each={blockNodesCutted()}>
                {(blockNode) => (
                  <div class="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors">
                    <div class="flex-1 min-w-0 mr-2">
                      <ReadonlyBlockView
                        app={props.app}
                        block={blockNode}
                        showPath
                        class="text-sm **:text-nowrap! **:text-ellipsis! **:overflow-hidden!"
                      />
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <Tooltip>
                        <TooltipTrigger
                          as={(p: ButtonProps) => (
                            <Button
                              variant="outline"
                              size="xs-icon"
                              class="h-7 w-7"
                              {...p}
                              onClick={() => pasteBlock(blockNode.id)}
                            >
                              <ClipboardPaste size={14} />
                            </Button>
                          )}
                        />
                        <TooltipContent>
                          {t("clipboardPopup.pasteHere")}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger
                          as={(p: ButtonProps) => (
                            <Button
                              variant="destructiveOutline"
                              size="xs-icon"
                              class="h-7 w-7"
                              {...p}
                              onClick={() => removeBlock(blockNode.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        />
                        <TooltipContent>
                          {t("clipboardPopup.deleteFromClipboard")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={blockNodesCutted().length === 0}>
              <div class="text-center py-8">
                <ClipboardX
                  size={48}
                  class="mx-auto text-muted-foreground mb-3"
                />
                <div class="text-sm font-medium text-card-foreground">
                  {t("clipboardPopup.emptyTitle")}
                </div>
                <div class="text-xs text-muted-foreground mt-1">
                  {t("clipboardPopup.emptyDescription")}
                </div>
              </div>
            </Show>
          </div>
        </PopoverContent>
      </Popover>
    </Show>
  );
}
