import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { useContextMenu, type MenuItem } from "@/composables/useContextMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dynamic } from "solid-js/web";

export const ContextMenuGlobal: Component = () => {
  const ctx = useContextMenu();
  const { close } = ctx;

  const handleClick = (menuItem: MenuItem) => {
    if (menuItem.type !== "item") return;
    if (menuItem.disabled) return;
    menuItem.action?.();
    // 先关闭，让 data-[closed] 触发动画，等动画结束后再清理 anchor/items，避免 Popper 锚点丢失导致闪到 (0,0)
    close();
  };

  const ContextMenuItemRenderer: Component<{ item: MenuItem }> = (props) => {
    const renderMenuItem = (mi: MenuItem) => {
      switch (mi.type) {
        case "divider":
          return <DropdownMenuSeparator />;
        case "submenu":
          return (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                disabled={!!mi.disabled}
                class="flex gap-2"
              >
                <Show when={!!mi.icon}>
                  <Dynamic component={mi.icon!} size={14} />
                </Show>
                <span>{mi.label}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent class="min-w-[150px] mx-1">
                  <For each={mi.children}>
                    {(child) => <ContextMenuItemRenderer item={child} />}
                  </For>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          );
        case "item":
          return (
            <DropdownMenuItem
              class="flex gap-2"
              disabled={!!mi.disabled}
              variant={mi.danger ? "destructive" : "default"}
              onSelect={() => handleClick(mi)}
            >
              <Show when={!!mi.icon}>
                <Dynamic component={mi.icon!} size={14} />
              </Show>
              <span>{mi.label}</span>
            </DropdownMenuItem>
          );
      }
    };
    return <>{renderMenuItem(props.item)}</>;
  };

  // 稳定的 getAnchorRect 回调，关闭动画期间保持锚点，避免闪到 (0,0)
  const getAnchorRect = (_anchor?: HTMLElement) => {
    const p = ctx.anchorPoint();
    return p ? { x: p.x, y: p.y, width: 0, height: 0 } : undefined;
  };

  return (
    <DropdownMenu
      open={ctx.isOpen()}
      onOpenChange={ctx.setIsOpen}
      getAnchorRect={getAnchorRect}
      gutter={4}
    >
      <DropdownMenuTrigger class="hidden" />
      <DropdownMenuContent class="block-contextmenu-content w-[200px] outline-none!">
        <For each={ctx.items()}>
          {(item) => <ContextMenuItemRenderer item={item} />}
        </For>
        <Show when={ctx.items().length === 0}>
          <div class="py-2 text-center text-sm text-muted-foreground">
            无可用菜单
          </div>
        </Show>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContextMenuGlobal;
