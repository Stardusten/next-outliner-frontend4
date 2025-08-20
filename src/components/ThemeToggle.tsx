import type { Component } from "solid-js";
import { createMemo } from "solid-js";
import { useSettings } from "@/composables/useSettings";
import { App } from "@/lib/app/app";

export const ThemeToggle = (props: { app: App }) => {
  const { getSetting, saveSetting } = useSettings(props.app);

  const theme = createMemo<string>(() => getSetting("ui.theme") || "light");

  const setLight = () => saveSetting("ui.theme", "light");
  const setDark = () => saveSetting("ui.theme", "dark");
  const setSystem = () => saveSetting("ui.theme", "system");

  const isLight = createMemo(() => theme() === "light");
  const isDark = createMemo(() => theme() === "dark");
  const isSystem = createMemo(() => theme() === "system");

  const baseItemClass =
    "px-1.5 py-1 text-xs rounded cursor-pointer transition-all duration-200 text-muted-foreground whitespace-nowrap text-center min-w-8";

  return (
    <div class="flex bg-muted rounded-md p-0.5 gap-0.5 -my-1">
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isLight() }}
        onClick={setLight}
      >
        明亮
      </span>
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isDark() }}
        onClick={setDark}
      >
        黑暗
      </span>
      <span
        class={baseItemClass}
        classList={{ "bg-primary text-primary-foreground": isSystem() }}
        onClick={setSystem}
      >
        跟随系统
      </span>
    </div>
  );
};
