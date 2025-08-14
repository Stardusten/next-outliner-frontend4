import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDescendantOf(elem: Node, className: string) {
  let curr = elem;
  while (curr != null) {
    if (curr instanceof HTMLElement && curr.classList.contains(className)) {
      return true;
    }
    curr = curr.parentNode;
  }
  return false;
}
