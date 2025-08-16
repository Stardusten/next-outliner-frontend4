import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { RouteSectionProps } from "@solidjs/router";
import { createEffect } from "solid-js";

// tailwindcss 依靠 .dark 判断是不是暗色模式
// kobalte 的传统则是 data-kb-theme 变量来指定颜色主题
const applyTheme = (themeValue: string) => {
  const root = document.documentElement;
  switch (themeValue) {
    case "light":
      root.dataset.kbTheme = "light";
      root.style.colorScheme = "light";
      root.classList.remove("dark");
      break;
    case "dark":
      root.dataset.kbTheme = "dark";
      root.style.colorScheme = "dark";
      root.classList.add("dark");
      break;
    case "system":
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.kbTheme = isDark ? "dark" : "light";
      root.style.colorScheme = isDark ? "dark" : "light";
      if (isDark) root.classList.add("dark");
      else root.classList.remove("dark");
      break;
  }
};

export const ThemeUpdater = () => {
  const currentRepo = useCurrRepoConfig();

  createEffect(() => {
    const theme = currentRepo()?.ui?.theme ?? "system";
    applyTheme(theme);
  });

  return <></>;
};
