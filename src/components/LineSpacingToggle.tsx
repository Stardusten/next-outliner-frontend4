import type { Component } from "solid-js";
import { createMemo } from "solid-js";
import { useSettings } from "@/composables/useSettings";

export const LineSpacingToggle: Component = () => {
  const { getSetting, saveSetting } = useSettings();

  const spacing = createMemo<string>(
    () => getSetting("editor.lineSpacing") || "normal"
  );

  const setSpacing = (val: string) => saveSetting("editor.lineSpacing", val);

  const isCompact = createMemo(() => spacing() === "compact");
  const isNormal = createMemo(() => spacing() === "normal");
  const isLoose = createMemo(() => spacing() === "loose");

  const baseItemClass =
    "px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground min-w-6 text-center";

  const spacingOptions = {
    compact: { label: "紧凑" },
    normal: { label: "正常" },
    loose: { label: "宽松" },
  } as const;

  return (
    <div class="flex bg-muted rounded-md p-0.5 gap-0.5 -my-1">
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isCompact() }}
        onClick={() => setSpacing("compact")}
      >
        {spacingOptions.compact.label}
      </span>
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isNormal() }}
        onClick={() => setSpacing("normal")}
      >
        {spacingOptions.normal.label}
      </span>
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isLoose() }}
        onClick={() => setSpacing("loose")}
      >
        {spacingOptions.loose.label}
      </span>
    </div>
  );
};
