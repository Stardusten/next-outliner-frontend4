import type {
  Editor,
  NodeViewRenderer,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { NodeView } from "@tiptap/pm/view";
import { createMemo, createSignal, Show, ValidComponent } from "solid-js";
import { render } from "solid-js/web";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { useI18n } from "@/composables/useI18n";
import { Pencil, RefreshCcw, Settings } from "lucide-solid";
import { updateSarchBlockAttrs } from "@/lib/app-views/editable-outline/commands";
import type { BlockId } from "@/lib/common/types";
import { isDescendantOf } from "@/lib/utils";

type ViewProps = {
  editor: Editor;
  node: ProseNode;
  getPos: () => number | undefined;
};

const SearchView = (props: ViewProps) => {
  const { t } = useI18n();

  const getBlockId = () => {
    const pos = props.getPos?.();
    if (pos === undefined) return null;
    const $pos = props.editor.view.state.doc.resolve(pos);
    return $pos.parent.attrs.blockId as BlockId;
  };

  const handleClickPad = () => {
    const pos = props.getPos?.();
    if (pos === undefined) return;
    const tr = props.editor.view.state.tr;
    const $pos = props.editor.view.state.doc.resolve(pos + props.node.nodeSize);
    const end = TextSelection.findFrom($pos, -1);
    if (!end) return;
    tr.setSelection(end);
    props.editor.view.dispatch(tr);
  };

  return (
    <div class="flex flex-wrap">
      <div class="flex-0-0-auto pr-[4px] search-content" />

      <div class="flex gap-1 items-center" contentEditable={false}>
        <Show when={(props.node.attrs as any).status != null}>
          <span
            classList={{
              "text-destructive":
                (props.node.attrs as any).status === "invalid",
              "text-muted-foreground":
                typeof (props.node.attrs as any).status === "number",
            }}
          >
            {(() => {
              const st = (props.node.attrs as any).status;
              if (st === "invalid") return t("searchBlock.invalidQuery");
              return t("searchBlock.nResults", { n: st });
            })()}
          </span>
        </Show>

        <EditSearchQueryPopup
          editor={props.editor}
          node={props.node}
          getBlockId={getBlockId}
          trigger={(p) => (
            <Button
              {...p}
              variant="secondary"
              size="2xs-icon"
              class="opacity-50 hover:opacity-100 transition-opacity"
            >
              <Pencil class="size-[12px]" />
            </Button>
          )}
        />

        <SearchViewOptionsPopup
          editor={props.editor}
          node={props.node}
          getBlockId={getBlockId}
          trigger={(p) => (
            <Button
              {...p}
              variant="secondary"
              size="2xs-icon"
              class="opacity-50 hover:opacity-100 transition-opacity"
            >
              <Settings class="size-[12px]" />
            </Button>
          )}
        />

        <Tooltip>
          <TooltipTrigger
            as={(p: ButtonProps) => (
              <Button
                variant="secondary"
                size="2xs-icon"
                class="opacity-50 hover:opacity-100 transition-opacity"
                {...p}
              >
                <RefreshCcw class="size-[12px]" />
              </Button>
            )}
          />
          <TooltipContent>{t("listItem.refreshSearch")}</TooltipContent>
        </Tooltip>
      </div>

      <div
        class="flex-1 cursor-text text-transparent"
        contentEditable={false}
        onClick={(e) => {
          e.preventDefault();
          handleClickPad();
        }}
      />
    </div>
  );
};

const EditSearchQueryPopup = (props: {
  editor: Editor;
  node: ProseNode;
  getBlockId: () => BlockId | null;
  trigger: ValidComponent;
}) => {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [queryText, setQueryText] = createSignal("");

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) setQueryText((props.node.attrs as any).query ?? "");
  };

  const handleSubmit = () => {
    const blockId = props.getBlockId();
    if (!blockId) return;
    const cmd = updateSarchBlockAttrs(props.editor, blockId, {
      query: queryText(),
    });
    props.editor.appView.execCommand(cmd, true);
    setOpen(false);
  };

  return (
    <Popover open={open()} onOpenChange={onOpenChange}>
      <PopoverTrigger
        as={(p: ButtonProps) => (
          <Tooltip>
            <TooltipTrigger as={props.trigger} {...p} />
            <TooltipContent>{t("listItem.editSearchQuery")}</TooltipContent>
          </Tooltip>
        )}
      />
      <PopoverContent class="w-80 p-3">
        <div class="space-y-3">
          <div>
            <Label class="text-sm font-medium">
              {t("editSearchQueryPopup.queryLabel")}
            </Label>
            <TextField class="mt-2">
              <TextFieldInput
                value={queryText()}
                placeholder={
                  t("editSearchQueryPopup.queryPlaceholder") as string
                }
                onInput={(e) =>
                  setQueryText((e.currentTarget as HTMLInputElement).value)
                }
              />
            </TextField>
          </div>

          <div class="flex justify-between">
            <div>
              <a class="text-sm text-muted-foreground cursor-pointer">
                语法说明
              </a>
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {t("editSearchQueryPopup.cancel")}
              </Button>
              <Button size="sm" onClick={handleSubmit}>
                {t("editSearchQueryPopup.save")}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SearchViewOptionsPopup = (props: {
  editor: Editor;
  node: ProseNode;
  getBlockId: () => BlockId | null;
  trigger: ValidComponent;
}) => {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [showPath, setShowPath] = createSignal(false);

  const onOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const attrs = props.node.attrs as any as { showPath?: boolean };
      setShowPath(!!attrs.showPath);
    }
  };

  const handleToggle = (v: boolean) => {
    const blockId = props.getBlockId();
    if (!blockId) return;
    const cmd = updateSarchBlockAttrs(props.editor, blockId, { showPath: v });
    props.editor.appView.execCommand(cmd, true);
    setShowPath(v);
  };

  return (
    <Popover open={open()} onOpenChange={onOpenChange}>
      <PopoverTrigger
        as={(p: ButtonProps) => (
          <Tooltip>
            <TooltipTrigger as={props.trigger} {...p} />
            <TooltipContent>{t("listItem.editViewOptions")}</TooltipContent>
          </Tooltip>
        )}
      />
      <PopoverContent class="w-80 p-3">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label class="text-sm">
                {t("searchViewOptions.showBlockPath")}
              </Label>
              <p class="text-xs text-muted-foreground">
                {t("searchViewOptions.showBlockPathDesc")}
              </p>
            </div>
            <Switch checked={showPath()} onChange={handleToggle}>
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
            </Switch>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

class SearchViewAdapter implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const dom = document.createElement("div");
    this.dispose = render(
      () => (
        <SearchView
          editor={props.editor}
          node={props.node}
          getPos={props.getPos}
        />
      ),
      dom
    );
    this.dom = dom;
    this.contentDOM = dom.querySelector(".search-content");
  }

  destroy(): void {
    this.dispose();
    this.dom.remove();
  }

  stopEvent(e: Event) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "search-content")
    )
      return false;
    return true;
  }

  ignoreMutation(e: MutationRecord) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "search-content")
    )
      return false;
    return true;
  }
}

export const searchViewRenderer: NodeViewRenderer = (props) =>
  new SearchViewAdapter(props);

export default SearchView;
