import { For, createMemo } from "solid-js";
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { App } from "@/lib/app/app";

type Props = {
  app: App;
};

export const MainBreadcrumb = (props: Props) => {
  const { items, handleBreadcrumbClick } = useBreadcrumb(props.app);

  const lastIndex = createMemo(() => items().length - 1);

  return (
    <div class="flex items-center text-sm">
      <For each={items()}>
        {(item, i) => (
          <>
            <span
              class="transition-colors duration-200 cursor-pointer hover:text-foreground"
              classList={{
                "text-foreground cursor-default": i() === lastIndex(),
                "text-muted-foreground": i() !== lastIndex(),
              }}
              onClick={() => handleBreadcrumbClick(item.blockId)}
            >
              {item.title}
            </span>
            {i() < lastIndex() && (
              <span class="mx-2 text-border text-sm">/</span>
            )}
          </>
        )}
      </For>
    </div>
  );
};
