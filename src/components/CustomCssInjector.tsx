import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";
import { createEffect, onCleanup } from "solid-js";

export const CustomCssInjector = () => {
  const currentRepo = useCurrRepoConfig();
  let styleElement: HTMLStyleElement | null = null;

  const injectCustomCSS = (css: string) => {
    // 移除现有的自定义样式元素
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }

    // 如果有 CSS 内容，创建新的样式元素
    if (css.trim()) {
      styleElement = document.createElement("style");
      styleElement.setAttribute("data-custom-css", "true");
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  };

  createEffect(() => {
    const customCSS = currentRepo()?.ui?.customCSS ?? "";
    injectCustomCSS(customCSS);
  });

  onCleanup(() => {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  });

  return <></>;
};
