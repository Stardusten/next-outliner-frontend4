import { updateCodeblockLang } from "@/lib/app-views/editable-outline/commands";
import { languages } from "@/lib/tiptap/functionalities/highlight-codeblock";
import { isDescendantOf } from "@/lib/utils";
import { Editor, NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { Copy } from "lucide-solid";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { render } from "solid-js/web";
import { Button, ButtonProps } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useI18n } from "@/composables/useI18n";

type CodeBlockViewProps = {
  editor: Editor;
  node: Node;
  getPos: () => number | undefined;
};

const CodeBlockView = (props: CodeBlockViewProps) => {
  const [lang, setLang] = createSignal<string>("");
  const [focusedId] = props.editor.appView.focusedBlockId;
  const { t } = useI18n();

  const blockId = createMemo(() => {
    const pos = props.getPos();
    if (!pos) return;
    const $pos = props.editor.state.doc.resolve(pos);
    return $pos.parent.attrs.blockId;
  });

  createEffect(() => {
    setLang(props.node.attrs.lang);
  });

  const handleLangUpdate = (lang_: string) => {
    if (!blockId()) return;
    const cmd = updateCodeblockLang(props.editor, blockId(), lang_);
    props.editor.appView.execCommand(cmd, true);
    setLang(lang_);
  };

  return (
    <pre class="relative">
      <code class="codeblock-content"></code>

      {/* 工具栏，仅当代码块被聚焦时显示 */}
      <Show when={focusedId() === blockId()}>
        <div class="absolute right-0 -top-10 flex items-center gap-1">
          {/* 语言选择器 */}
          <Select
            value={lang()}
            onChange={handleLangUpdate}
            options={languages}
            multiple={false}
            contentEditable={false}
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
            )}
            modal={true}
          >
            <SelectTrigger class="h-8! min-w-40 bg-transparent!">
              <SelectValue<string> class="font-sans">
                {(state) => state.selectedOption()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent class="max-h-[400px]"></SelectContent>
          </Select>

          {/* 复制代码块按钮 */}
          <Tooltip>
            <TooltipTrigger
              as={(p: ButtonProps) => (
                <Button variant="outline" class="size-8 bg-transparent!" {...p}>
                  <Copy class="size-3.5" />
                </Button>
              )}
            />
            <TooltipContent>{t("codeblock.copyCode")}</TooltipContent>
          </Tooltip>
        </div>
      </Show>
    </pre>
  );
};

class CodeBlockViewAdapter implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const dom = document.createElement("div");
    this.dispose = render(
      () => (
        <CodeBlockView
          editor={props.editor}
          node={props.node}
          getPos={props.getPos}
        />
      ),
      dom
    );

    this.dom = dom;
    this.contentDOM = dom.querySelector(".codeblock-content");
  }

  destroy() {
    this.dispose();
    this.dom.remove();
  }

  // 不处理 codeblock-content 以外的任何事件
  stopEvent(e: Event) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "codeblock-content")
    )
      return false;
    return true;
  }

  // 代码块整体不允许被选中 / 反选
  selectNode() {}
  deselectNode() {}

  // 不处理 codeblock-content 以外的任何事件
  ignoreMutation(event: ViewMutationRecord) {
    if (isDescendantOf(event.target, "codeblock-content")) return false;
    return true;
  }
}

export const codeBlockNodeViewRenderer: NodeViewRenderer = (props) =>
  new CodeBlockViewAdapter(props);
