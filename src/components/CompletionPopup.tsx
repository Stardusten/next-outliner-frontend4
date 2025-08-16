import type { Component, JSX } from "solid-js";
import { For, Show, createEffect, createMemo } from "solid-js";
import type { BlockNode } from "@/lib/common/types";
import { ReadonlyBlockView } from "@/components/ReadonlyBlockView";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";
import { Editor } from "@tiptap/core";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";

type Props = {
  editor: EditableOutlineView;
  completion: ReturnType<typeof useBlockRefCompletion>;
};

export const CompletionPopup: Component<Props> = (props) => {
  let listRef: HTMLDivElement | undefined;
  const itemRefs = new Map<number, HTMLElement>();

  const setItemRef = (el: HTMLElement | undefined, index: number) => {
    if (el) itemRefs.set(index, el);
    else itemRefs.delete(index);
  };

  const POPUP_WIDTH = 350;
  const POPUP_MAX_HEIGHT = 300;
  const LINE_HEIGHT = 30;
  const POPUP_SPACING = 4;
  const WINDOW_PADDING = 8;

  const popupStyle = createMemo<JSX.CSSProperties>(() => {
    if (!props.completion.visible()) return {};

    const { x, y } = props.completion.position();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minPadding = 8;

    let left = x;
    if (left + POPUP_WIDTH > viewportWidth - minPadding) {
      left = viewportWidth - POPUP_WIDTH - minPadding;
    }
    left = Math.max(minPadding, left);

    let top = y + POPUP_SPACING;
    let maxHeight = POPUP_MAX_HEIGHT;

    const spaceBelow = viewportHeight - y - POPUP_SPACING - WINDOW_PADDING;
    const spaceAbove = y - LINE_HEIGHT - POPUP_SPACING - WINDOW_PADDING;

    if (spaceBelow < POPUP_MAX_HEIGHT && spaceAbove > spaceBelow) {
      top = y - LINE_HEIGHT - POPUP_SPACING;
      maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceAbove);
      return {
        left: `${left}px`,
        top: `${top}px`,
        "max-height": `${maxHeight}px`,
        transform: "translateY(-100%)",
      } as JSX.CSSProperties;
    } else {
      maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceBelow);
      return {
        left: `${left}px`,
        top: `${top}px`,
        "max-height": `${maxHeight}px`,
      } as JSX.CSSProperties;
    }
  });

  const scrollToActiveItem = () => {
    if (
      !listRef ||
      props.completion.activeIndex() < 0 ||
      props.completion.availableBlocks().length === 0
    )
      return;
    const doScroll = () => {
      const activeItem = itemRefs.get(props.completion.activeIndex());
      if (!activeItem) return;
      activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    if (typeof queueMicrotask === "function") queueMicrotask(doScroll);
    else setTimeout(doScroll, 0);
  };

  createEffect(() => {
    // react to activeIndex changes
    props.completion.activeIndex();
    scrollToActiveItem();
  });

  createEffect(() => {
    // react to visibility
    if (props.completion.visible()) scrollToActiveItem();
  });

  return (
    <Show when={props.completion.visible()}>
      <div
        ref={(el) => (listRef = el)}
        class="fixed z-50 w-[350px] max-h-[400px] overflow-y-auto rounded-sm border bg-popover text-popover-foreground shadow-md"
        style={popupStyle()}
      >
        <For each={props.completion.availableBlocks()}>
          {(block, index) => (
            <div
              ref={(el) => setItemRef(el as unknown as HTMLElement, index())}
              class="relative flex w-full cursor-default select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground border-b border-border last:border-b-0"
              classList={{
                "bg-accent text-accent-foreground":
                  index() === props.completion.activeIndex(),
              }}
              onClick={() =>
                props.completion.handleBlockSelect(props.editor, block)
              }
            >
              <div class="flex-1 overflow-hidden text-foreground">
                <ReadonlyBlockView
                  block={block}
                  app={props.editor.app}
                  searchQuery={props.completion.query()}
                  showPath
                  // 前十个块不启用延迟渲染，防止闪烁
                  lazyRender={index() >= 10}
                />
              </div>
            </div>
          )}
        </For>

        <Show when={props.completion.availableBlocks().length === 0}>
          <div class="p-4 text-center text-sm text-muted-foreground">
            没有找到匹配的块
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default CompletionPopup;
