import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDescendantOf(elem: Node, className: string) {
  let curr = elem as any;
  while (curr != null) {
    if (curr instanceof HTMLElement && curr.classList.contains(className)) {
      return true;
    }
    curr = curr.parentNode;
  }
  return false;
}

// platform
export const mac =
  typeof navigator != "undefined"
    ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    : false;

// 安全的深拷贝函数，可以处理 undefined 值
export function deepCopy<T>(obj: T): T {
  if (obj === undefined) {
    return undefined as any;
  }

  if (obj === null) {
    return null as any;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item)) as any;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepCopy((obj as any)[key]);
    }
  }
  return result;
}
