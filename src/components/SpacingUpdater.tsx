import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { createEffect } from "solid-js";

const spacingClasses = ["compact", "normal", "loose"];
const applySpacing = (spacing: string) => {
  const root = document.documentElement;
  spacingClasses.forEach((cls) => root.classList.remove(`spacing-${cls}`));
  if (spacing && spacingClasses.includes(spacing)) {
    root.classList.add(`spacing-${spacing}`);
  }
};

export const SpacingUpdater = () => {
  const { currentRepo } = useRepoConfigs();

  createEffect(() => {
    const spacing = currentRepo()?.editor?.lineSpacing ?? "normal";
    applySpacing(spacing);
  });

  return <></>;
};
