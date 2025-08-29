import { App } from "@/lib/app/app";
import { BlockId } from "@/lib/common/types/block";
import { useLocalStorage } from "./useLocalStorage";

export const useMainRoots = (app: App) => {
  if (!app.mainRoots) {
    app.mainRoots = useLocalStorage<BlockId[]>("mainRoots", []);
  }
  return app.mainRoots;
};
