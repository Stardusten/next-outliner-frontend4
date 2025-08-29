import { createSimpleKeydownHandler } from "@/lib/common/utils/keybinding";
import { useSearch } from "./useSearch";
import { App } from "@/lib/app/app";

export const useAppKeybinding = (app: App) => {
  const handleKeydown = createSimpleKeydownHandler({
    "Mod-p": {
      run: () => {
        const { openSearch } = useSearch(app);
        openSearch();
        return true;
      },
      preventDefault: true,
    },
  });

  return { handleKeydown };
};
