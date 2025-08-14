import { Show, For, onMount, createEffect, createSignal, on } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UseSearchReturn } from "@/composables/useSearch";
import type { App } from "@/lib/app/app";
import { Eye, Search, Settings2 } from "lucide-solid";
import { ReadonlyBlockView } from "./ReadonlyBlockView";
import { Button, ButtonProps } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useI18n } from "@/composables/useI18n";
import type { ValidComponent } from "solid-js";
import { useSearch } from "@/composables/useSearch";

type Props = {
  app: App;
  trigger: ValidComponent;
};

export function SearchPopup(props: Props) {
  const { t } = useI18n();
  const {
    searchVisible,
    searchResults,
    searchQuery,
    activeIndex,
    setQuery,
    closeSearch,
    openSearch,
    navigateDown,
    navigateUp,
    selectBlock,
    selectCurrentItem,
  } = useSearch(props.app);

  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;
  const [itemRefs, setItemRefs] = createSignal<Record<number, HTMLElement>>({});

  const setItemRef = (el: HTMLElement | undefined, index: number) => {
    setItemRefs((prev) => {
      const next = { ...prev };
      if (el) next[index] = el;
      else delete next[index];
      return next;
    });
  };

  const scrollToActiveItem = async () => {
    if (!listRef) return;
    const items = searchResults();
    if (!items.length) return;
    const idx = activeIndex();
    const el = itemRefs()[idx];
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        navigateDown();
        break;
      case "ArrowUp":
        e.preventDefault();
        navigateUp();
        break;
      case "Enter":
        e.preventDefault();
        selectCurrentItem();
        break;
      case "Escape":
        e.preventDefault();
        closeSearch();
        break;
    }
  };

  const handleInput = (e: InputEvent) => {
    if (e.isComposing) return;
    const value = (e.target as HTMLInputElement).value;
    setQuery(value);
  };

  const handleCompositionEnd = (e: CompositionEvent) => {
    const value = (e.target as HTMLInputElement).value;
    setQuery(value);
  };

  createEffect(on(activeIndex, scrollToActiveItem));

  createEffect(() => {
    if (searchVisible()) {
      queueMicrotask(() => {
        inputRef?.focus();
        scrollToActiveItem();
      });
    }
  });

  onMount(() => {
    if (searchVisible()) {
      queueMicrotask(() => inputRef?.focus());
    }
  });

  return (
    <Dialog
      open={searchVisible()}
      onOpenChange={(o) => (o ? openSearch() : closeSearch())}
    >
      <DialogTrigger
        as={(p: ButtonProps) => (
          <Tooltip>
            <TooltipTrigger as={props.trigger} {...p} />
            <TooltipContent>{t("search.tooltip")}</TooltipContent>
          </Tooltip>
        )}
      />

      <DialogContent
        class="max-w-[500px] max-h-[500px] p-0 gap-0 [&>button]:hidden"
        transparentOverlay
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle class="hidden" />

        <div class="flex items-center border-b">
          <div class="flex items-center justify-center w-10 h-[44px] shrink-0">
            <Search size={16} class="text-muted-foreground" />
          </div>
          <input
            ref={(el) => (inputRef = el)}
            value={searchQuery()}
            class="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground h-[44px] px-2"
            placeholder="搜索块内容..."
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onCompositionEnd={handleCompositionEnd}
          />
          <div class="flex items-center gap-1 pr-2 shrink-0">
            <Tooltip>
              <TooltipTrigger
                as={(p: ButtonProps) => (
                  <Button
                    variant="ghost"
                    size="xs-icon"
                    class="text-muted-foreground"
                    {...p}
                  >
                    <Eye />
                  </Button>
                )}
              />
              <TooltipContent>{t("search.showPreview")}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger
                as={(p: ButtonProps) => (
                  <Button
                    variant="ghost"
                    size="xs-icon"
                    class="text-muted-foreground"
                    {...p}
                  >
                    <Settings2 />
                  </Button>
                )}
              />
              <TooltipContent>{t("search.editSearchOptions")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div class="max-h-[400px] overflow-y-auto" ref={(el) => (listRef = el)}>
          <For each={searchResults()}>
            {(result, index) => (
              <div
                ref={(el) => setItemRef(el!, index())}
                class={`p-3 cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/50 ${
                  index() === activeIndex() ? "bg-muted/50" : ""
                }`}
                onClick={() => selectBlock(result)}
              >
                <ReadonlyBlockView
                  block={result.block}
                  app={props.app}
                  searchQuery={searchQuery()}
                  class="text-sm **:text-nowrap! **:text-ellipsis! **:overflow-hidden!"
                  showPath
                />
              </div>
            )}
          </For>

          <Show when={searchQuery() && searchResults().length === 0}>
            <div class="p-5 text-center text-sm text-muted-foreground">
              {t("search.noMatch")}
            </div>
          </Show>
          <Show when={!searchQuery()}>
            <div class="p-5 text-center text-sm text-muted-foreground italic">
              {t("search.noMatchDescription")}
            </div>
          </Show>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchPopup;
