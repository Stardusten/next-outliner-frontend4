import { Mark } from "@tiptap/core";

export const Link = Mark.create({
  name: "link",
  inclusive: false,
  addAttributes() {
    return {
      href: {},
    };
  },
  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (node: HTMLElement) => {
          return {
            href: node.getAttribute("href"),
          };
        },
      },
    ];
  },
  renderHTML({ mark, HTMLAttributes }) {
    const { href } = mark.attrs;
    const a = document.createElement("a");
    a.href = href;
    a.spellcheck = false;
    // 点击在浏览器中打开链接
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(href, "_blank");
    });
    return a;
  },
});
