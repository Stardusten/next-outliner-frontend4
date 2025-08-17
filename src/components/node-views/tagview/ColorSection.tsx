import { For, Show } from "solid-js";

export type ColorOption = { key: string; bg: string; isNone?: boolean };

function ColorSwatchButton(props: {
  option: ColorOption;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const isSelected = () => props.selectedKey === props.option.key;
  return (
    <button
      type="button"
      class="rounded-full p-[2px]"
      aria-pressed={isSelected()}
      onClick={() => props.onSelect(props.option.key)}
    >
      <div
        class={`w-7 h-7 rounded-full p-0 relative ${props.option.bg} ${
          isSelected()
            ? "ring-2 ring-offset-2 ring-offset-background ring-foreground"
            : "ring-0"
        }`}
      >
        <Show when={props.option.isNone}>
          <span class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[2px] bg-foreground rotate-45 rounded" />
        </Show>
      </div>
    </button>
  );
}

export default function ColorSection(props: {
  t: (k: any, p?: any) => any;
  colorOptions: ColorOption[];
  getSelectedColor: () => string;
  onSelectColor: (key: string) => void;
}) {
  return (
    <div class="space-y-1">
      <h2 class="text-sm">{props.t("tag.colorLabel")}</h2>
      <p class="text-xs text-muted-foreground mb-4">
        {props.t("tag.colorDesc")}
      </p>
      <div class="flex items-center gap-2 flex-wrap">
        <For each={props.colorOptions}>
          {(c) => (
            <ColorSwatchButton
              option={c}
              selectedKey={props.getSelectedColor()}
              onSelect={props.onSelectColor}
            />
          )}
        </For>
      </div>
    </div>
  );
}
