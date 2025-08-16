import type { Component } from "solid-js";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import type { BlockNode } from "@/lib/common/types";
import type { App } from "@/lib/app/app";
import { ReadonlyBlockView as ReadonlyBlockViewClass } from "@/lib/app-views/read-only-block/read-only-block";
import { cn } from "@/lib/utils";
import "./readonly-block-view.css";

type Props = {
  block: BlockNode;
  app: App;
  searchQuery?: string;
  class?: string;
  showPath?: boolean;
  lazyRender?: boolean;
};

export const ReadonlyBlockView: Component<Props> = (props) => {
  let containerEl!: HTMLDivElement;
  let observerTargetEl!: HTMLDivElement;
  let view: ReadonlyBlockViewClass | undefined;
  let observer: IntersectionObserver | undefined;

  const [isMounted, setIsMounted] = createSignal(false);

  const path = createMemo(() => {
    if (!props.showPath) return "";
    const segments: string[] = [];
    let curr = props.block.parent();
    while (curr) {
      const text = props.app.getTextContent(curr.id, true);
      if (text) segments.push(text);
      curr = curr.parent();
    }
    return segments.reverse().join(" / ");
  });

  const updateHighlight = (q?: string) => {
    if (!view) return;
    if (q === undefined) {
      view.updateHighlightTerms([]);
    } else {
      const terms = q.trim().split(/\s+/).filter(Boolean);
      view.updateHighlightTerms(terms);
    }
  };

  const mountView = () => {
    if (isMounted()) return;
    if (!containerEl) return;

    view = new ReadonlyBlockViewClass(props.app, props.block.id);
    view.mount(containerEl);
    setIsMounted(true);
    updateHighlight(props.searchQuery);
  };

  onMount(() => {
    if (props.lazyRender) {
      // 如果启用延迟渲染，则创建一个 observer
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              mountView();
              // 一旦渲染完成，则停止 observer
              observer?.unobserve(observerTargetEl);
            }
          });
        },
        {
          root: null,
          rootMargin: "50px", // 在元素进入可视区域前 50px 时开始渲染
          threshold: 0,
        }
      );

      observer.observe(observerTargetEl);
    } else {
      // 不启用延迟渲染，则立即渲染
      mountView();
    }
  });

  onCleanup(() => {
    if (observer) {
      observer.unobserve(observerTargetEl);
      observer.disconnect();
      observer = undefined;
    }

    if (view) {
      view.unmount();
      view = undefined;
    }
  });

  createEffect(() => {
    if (isMounted()) {
      updateHighlight(props.searchQuery);
    }
  });

  return (
    <div
      class={cn("search-result-item-container", props.class)}
      ref={(el) => (observerTargetEl = el)}
    >
      <Show when={props.lazyRender && !isMounted()}>
        <div class="flex items-center justify-center p-4 text-muted-foreground">
          Loading...
        </div>
      </Show>
      <div
        ref={(el) => (containerEl = el)}
        style={{
          display: props.lazyRender && !isMounted() ? "none" : "block",
        }}
      />
      <Show when={props.showPath}>
        <span class="text-xs block text-muted-foreground text-nowrap text-ellipsis overflow-hidden">
          {path()}
        </span>
      </Show>
    </div>
  );
};

export default ReadonlyBlockView;
