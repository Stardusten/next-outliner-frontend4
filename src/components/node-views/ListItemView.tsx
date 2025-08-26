import { useContextMenu } from "@/composables/useContextMenu";
import { useI18n } from "@/composables/useI18n";
import {
  convertToSearchBlock,
  convertToTagBlock,
  numberingChildren,
  openSelectTagDialog,
  toggleFoldState,
  toggleParagraphBlock,
  zoomin,
} from "@/lib/app-views/editable-outline/commands";
import { clipboard } from "@/lib/common/clipboard";
import { toMarkdown } from "@/lib/common/markdown";
import { isDescendantOf } from "@/lib/utils";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import {
  Clipboard,
  Copy,
  CornerDownRight,
  Link,
  ListOrdered,
  Pilcrow,
  Repeat,
  Scissors,
  SVGAttributes,
  Tag,
  Text,
  Trash,
} from "lucide-solid";
import { createMemo } from "solid-js";
import { render } from "solid-js/web";
import { Html } from "../icon/Html";
import { Markdown } from "../icon/Markdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";

const Dot = (props: SVGAttributes) => (
  <svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="7.5" cy="7.5" r="2.5" fill="currentColor" />
  </svg>
);

const HashTag = (props: SVGAttributes) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
  >
    <line x1="4" x2="20" y1="9" y2="9" />
    <line x1="4" x2="20" y1="15" y2="15" />
    <line x1="10" x2="8" y1="3" y2="21" />
    <line x1="16" x2="14" y1="3" y2="21" />
  </svg>
);

const Search = (props: SVGAttributes) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    {...props}
  >
    <path d="M20.5 20.5 L15.8 15.8" />
    <circle cx="11" cy="11" r="5.5" />
  </svg>
);

const Triangle = (props: SVGAttributes) => (
  <svg viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" {...props}>
    <polygon points="5,5 10,5 7.5,10" fill="currentColor" />
  </svg>
);

type ListItemViewProps = {
  node: Node;
  editor: Editor;
};

const ListItemView = (props: ListItemViewProps) => {
  const type = () => props.node.attrs.type;
  const showPath = () => props.node.attrs.showPath === true;
  const showRefCounter = () => props.node.attrs.type === "text";
  const level = () => props.node.attrs.level;
  const number = () => props.node.attrs.vo?.number;
  const paragraph = () => props.node.attrs.vo?.paragraph;
  const { t } = useI18n();

  const nopr = createMemo(() => {
    const numberVal = number() as string;
    if (numberVal == null) return false;
    const lastChar = numberVal.at(-1);
    return lastChar == "、" || lastChar == "）";
  });

  const nInRefs = createMemo(() => {
    if (!showRefCounter()) return 0;
    const app = props.editor.appView.app;
    const blockId = props.node.attrs.blockId;
    const [inRefs] = app.getInRefs(blockId);
    return inRefs().size;
  });

  const nInTags = createMemo(() => {
    if (!showRefCounter()) return 0;
    const app = props.editor.appView.app;
    const blockId = props.node.attrs.blockId;
    const [inTags] = app.getInTags(blockId);
    return inTags().size;
  });

  const nInRefsAndTags = createMemo(() => nInRefs() + nInTags());

  const path = createMemo(() => {
    if (!showPath()) return null;
    const app = props.editor.appView.app;
    const blockId = props.node.attrs.blockId;
    const path = app.getBlockPath(blockId);
    if (path != null && path.length > 0) {
      return path.map((blockId) => app.getTextContent(blockId)).join(" / ");
    }
    return null;
  });

  const handleClickFoldBtn = (e: MouseEvent) => {
    const blockId = props.node.attrs.blockId;
    const appView = props.editor.appView;
    if (appView instanceof EditableOutlineView) {
      const cmd = toggleFoldState(props.editor, undefined, blockId);
      appView.execCommand(cmd, true);
    }
  };

  const handleClickBullet = (e: MouseEvent) => {
    const blockId = props.node.attrs.blockId;
    const appView = props.editor.appView;
    if (appView instanceof EditableOutlineView) {
      const cmd = zoomin(props.editor, blockId);
      appView.execCommand(cmd, true);
    }
  };

  const handleRightClickBullet = (e: MouseEvent) => {
    e.preventDefault();
    const { open } = useContextMenu(props.editor.appView.app);
    const { t } = useI18n();
    const editor = props.editor;
    const blockId = props.node.attrs.blockId;
    open(e, [
      {
        type: "submenu",
        icon: Copy,
        label: t("blockContextMenu.copyAs"),
        children: [
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.copyAsMarkdown"),
            action: () => {
              const markdown = toMarkdown(editor.appView.app, [blockId]);
              clipboard.writeText(markdown);
              // toast.success(t("blockContextMenu.copiedMarkdownToClipboard"));
            },
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.copyAsPureText"),
            action: () => {},
          },
          {
            type: "item",
            icon: Html,
            label: t("blockContextMenu.copyAsHtml"),
            action: () => {},
          },
        ],
      },
      {
        type: "submenu",
        icon: Clipboard,
        label: t("blockContextMenu.pasteAs"),
        children: [
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.pasteAsMarkdownSingleBlock"),
            action: () => {},
          },
          {
            type: "item",
            icon: Markdown,
            label: t("blockContextMenu.pasteAsMarkdownAutoSplit"),
            action: () => {},
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.pasteAsPureTextSingleBlock"),
            action: () => {},
          },
          {
            type: "item",
            icon: Text,
            label: t("blockContextMenu.pasteAsPureTextAutoSplit"),
            action: () => {},
          },
        ],
      },
      {
        type: "submenu",
        icon: Repeat,
        label: t("blockContextMenu.convertTo"),
        children: [
          {
            type: "item",
            icon: HashTag,
            label: t("blockContextMenu.convertToTag"),
            action: () => {
              const appView = editor.appView;
              if (appView instanceof EditableOutlineView) {
                const cmd = convertToTagBlock(editor, blockId);
                appView.execCommand(cmd, true);
              }
            },
          },
          {
            type: "item",
            icon: Search,
            label: t("blockContextMenu.convertToSearch"),
            action: () => {
              const appView = editor.appView;
              if (appView instanceof EditableOutlineView) {
                const cmd = convertToSearchBlock(editor, undefined, blockId);
                appView.execCommand(cmd, true);
              }
            },
          },
        ],
      },
      {
        type: "item",
        icon: ListOrdered,
        label: t("blockContextMenu.numberingChildren"),
        action: () => {
          const appView = editor.appView;
          if (appView instanceof EditableOutlineView) {
            const cmd = numberingChildren(editor, "1.", blockId);
            appView.execCommand(cmd, true);
          }
        },
      },
      {
        type: "item",
        icon: Pilcrow,
        label: t("blockContextMenu.toParagraph"),
        action: () => {
          const appView = editor.appView;
          if (appView instanceof EditableOutlineView) {
            const cmd = toggleParagraphBlock(editor, blockId);
            appView.execCommand(cmd, true);
          }
        },
      },

      {
        type: "item",
        icon: Tag,
        label: t("blockContextMenu.selectTag"),
        action: () => {
          const appView = editor.appView;
          if (appView instanceof EditableOutlineView) {
            const cmd = openSelectTagDialog(editor, blockId);
            appView.execCommand(cmd, true);
          }
        },
      },
      {
        type: "item",
        icon: CornerDownRight,
        label: t("blockContextMenu.moveBlock"),
        action: () => {},
      },
      {
        type: "item",
        icon: Link,
        label: t("blockContextMenu.copyBlockRef"),
        action: () => {
          clipboard.writeText(blockId);
        },
      },
      {
        type: "item",
        icon: Scissors,
        label: t("blockContextMenu.cutBlock"),
        action: () => {},
      },
      {
        type: "item",
        icon: Trash,
        label: t("blockContextMenu.delete"),
        danger: true,
        action: () => {},
      },
    ]);
  };

  const bullet = () => {
    const props = {
      class: "bullet",
      onclick: handleClickBullet,
      oncontextmenu: handleRightClickBullet,
    } as const;
    if (number() != null) return <span {...props}>{number()}</span>;
    if (type() === "tag") return <HashTag {...props} />;
    if (type() === "search") return <Search {...props} />;
    return <Dot {...props} />;
  };

  return (
    <div
      class="list-item-x select-none"
      classList={{
        [type()]: true,
        [`level-${level()}`]: true,
        folded: props.node.attrs.folded,
        "has-children": props.node.attrs.hasChildren,
        "is-search-result-root": props.node.attrs.isSearchResultRoot,
        "has-inref": nInRefs() > 0,
        "has-intag": nInTags() > 0,
        "show-path": showPath(),
        highlighted: props.node.attrs.highlighted,
        "has-number": number() != null,
        nopr: nopr(),
        paragraph: paragraph(),
      }}
      style={{ "--level": level() }}
      data-block-id={props.node.attrs.blockId}
      {...(number() != null ? { "data-number": number() } : {})}
    >
      <div class="list-item-left" contentEditable={false}>
        {/* 折叠按钮 */}
        <Triangle class="fold-btn" onclick={handleClickFoldBtn} />

        {bullet()}
      </div>

      {/* 块内容 */}
      <div class="list-item-content"></div>

      {/* 引用计数 */}
      {showRefCounter() && (
        <Tooltip>
          <TooltipTrigger
            as={(p: any) => (
              <div
                class="ref-counter cursor-pointer"
                contentEditable={false}
                {...p}
              >
                {nInRefsAndTags()}
              </div>
            )}
          />
          <TooltipContent>
            {t("listItem.inRefsTagsTooltip", { n: nInRefsAndTags() })}
          </TooltipContent>
        </Tooltip>
      )}

      {/* 块路径 */}
      {showPath() && (
        <div class="path" contentEditable={false}>
          {path()}
        </div>
      )}
    </div>
  );
};

class ListItemViewAdapter implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("div");
    this.dispose = render(
      () => <ListItemView node={props.node} editor={props.editor} />,
      container
    );

    this.dom = container.firstChild as HTMLDivElement;
    this.contentDOM = container.querySelector(".list-item-content")!;
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }

  // 不处理 list-item-content 以外的任何事件
  stopEvent(e: Event) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "list-item-content")
    )
      return false;
    return true;
  }

  // 列表块整体不允许被选中 / 反选
  selectNode() {}
  deselectNode() {}

  // 不处理 list-item-content 以外的任何事件
  ignoreMutation(event: ViewMutationRecord) {
    if (isDescendantOf(event.target, "list-item-content")) return false;
    return true;
  }
}

export const listItemNodeViewRenderer: NodeViewRenderer = (props) =>
  new ListItemViewAdapter(props);
