export function html(params: {
  tag: string;
  classes?: string[];
  styles?: Record<string, string>;
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
  children?: (Node | undefined)[];
}) {
  const { tag, classes, styles, dataset, attrs, children } = params;
  const el = document.createElement(tag);
  if (classes) el.classList.add(...classes.filter(Boolean));
  if (styles) {
    for (const [key, value] of Object.entries(styles)) {
      el.style.setProperty(key, value);
    }
  }
  if (dataset) Object.assign(el.dataset, dataset);
  if (attrs) Object.assign(el, attrs);
  if (children) el.append(...children.filter((c) => c !== undefined));
  return el;
}
