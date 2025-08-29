import { For, createMemo, createSignal, onMount } from "solid-js";
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { App } from "@/lib/app/app";
import { cn } from "@/lib/common/utils/tailwindcss";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type Props = {
  app: App;
  class?: string;
};

export const MainBreadcrumb = (props: Props) => {
  const { items, handleBreadcrumbClick } = useBreadcrumb(props.app);
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
  const [shouldCollapse, setShouldCollapse] = createSignal(false);

  const lastIndex = createMemo(() => items().length - 1);

  // 检查是否需要折叠
  const checkOverflow = () => {
    const container = containerRef();
    if (!container) return;

    // 临时显示所有内容来测量宽度
    setShouldCollapse(false);

    requestAnimationFrame(() => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      setShouldCollapse(scrollWidth > clientWidth && items().length > 3);
    });
  };

  onMount(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  });

  // 当items变化时重新检查
  createMemo(() => {
    items();
    setTimeout(checkOverflow, 0);
  });

  const displayItems = createMemo(() => {
    const allItems = items();
    if (!shouldCollapse() || allItems.length <= 3) {
      return allItems;
    }

    // 显示第一个、省略号、最后一个
    const first = allItems[0];
    const last = allItems[allItems.length - 1];
    const collapsed = allItems.slice(1, -1);

    return [
      first,
      {
        blockId: "ellipsis",
        title: "...",
        isEllipsis: true,
        collapsedItems: collapsed,
      },
      last,
    ];
  });

  const renderBreadcrumbItem = (item: any, i: () => number) => {
    if (item.isEllipsis) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <span class="text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-200 select-none">
              {item.title}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto">
            <For each={item.collapsedItems}>
              {(collapsedItem: any) => (
                <DropdownMenuItem
                  class="cursor-pointer text-sm px-2 py-1.5 focus:bg-accent focus:text-accent-foreground"
                  onSelect={() => handleBreadcrumbClick(collapsedItem.blockId)}
                >
                  <div
                    class="truncate w-full text-left"
                    title={collapsedItem.title}
                  >
                    {collapsedItem.title}
                  </div>
                </DropdownMenuItem>
              )}
            </For>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <span
        class="transition-colors duration-200 cursor-pointer hover:text-foreground whitespace-nowrap shrink-0"
        classList={{
          "text-foreground cursor-default": i() === lastIndex(),
          "text-muted-foreground": i() !== lastIndex(),
        }}
        onClick={() => handleBreadcrumbClick(item.blockId)}
      >
        {item.title}
      </span>
    );
  };

  return (
    <div
      ref={setContainerRef}
      class={cn("flex items-center text-sm min-w-0 flex-1", props.class)}
    >
      <For each={displayItems()}>
        {(item, i) => (
          <>
            {renderBreadcrumbItem(item, i)}
            {i() < displayItems().length - 1 && (
              <span class="mx-2 text-border shrink-0">/</span>
            )}
          </>
        )}
      </For>
    </div>
  );
};
