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
