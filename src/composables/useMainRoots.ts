import { BlockId } from "@/lib/common/types";
import { Signal } from "solid-js";
import { useLocalStorage } from "./useLocalStorage";

let mainRoots: Signal<BlockId[]> | null = null;

export const useMainRoots = () => {
  if (!mainRoots) {
    mainRoots = useLocalStorage("mainRoots", []);
  }
  return mainRoots;
};
