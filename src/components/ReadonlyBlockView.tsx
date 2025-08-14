import type { Component } from "solid-js";
import { createEffect, createMemo, onCleanup, onMount } from "solid-js";
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
};

export const ReadonlyBlockView: Component<Props> = (props) => {
  let containerEl: HTMLDivElement | undefined;
  let view: ReadonlyBlockViewClass | undefined;

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

  onMount(() => {
    if (!containerEl) throw new Error("container element not found");
    view = new ReadonlyBlockViewClass(props.app, props.block.id);
    view.mount(containerEl);
    updateHighlight(props.searchQuery);
  });

  onCleanup(() => {
    if (view) {
      view.unmount();
      view = undefined;
    }
  });

  createEffect(() => {
    updateHighlight(props.searchQuery);
  });

  return (
    <div class={cn("search-result-item-container", props.class)}>
      <div ref={(el) => (containerEl = el)} />
      {props.showPath && (
        <span class="text-xs block text-muted-foreground text-nowrap text-ellipsis overflow-hidden">
          {path()}
        </span>
      )}
    </div>
  );
};

export default ReadonlyBlockView;
