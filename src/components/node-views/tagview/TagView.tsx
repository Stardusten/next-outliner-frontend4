import { Button, ButtonProps } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/composables/useI18n";
import {
  toggleFoldState,
  updateTagBlockAttrs,
} from "@/lib/app-views/editable-outline/commands";
import type { BlockId } from "@/lib/common/types";
import type { TagAttrs, TagField } from "@/lib/tiptap/nodes/tag";
import type {
  Editor,
  NodeViewRenderer,
  NodeViewRendererProps,
} from "@tiptap/core";
import type { Node as ProseNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { Settings, X } from "lucide-solid";
import { createMemo, createSignal, onMount, Show } from "solid-js";
import { render } from "solid-js/web";
import ColorSection from "./ColorSection";
import InheritsSection from "./InheritsSection";
import SettingsFooter from "./SettingsFooter";
import TagFieldsEditor from "./TagFieldsEditor";
import {
  cloneTagFields,
  parseInheritsInput,
  validateBlockIdsExist,
} from "./tag-validators";

type ViewProps = {
  editor: Editor;
  node: ProseNode;
  getPos: () => number | undefined;
};

const TagView = (props: ViewProps) => {
  const { t } = useI18n();

  const blockId = createMemo<BlockId | null>(() => {
    const pos = props.getPos?.();
    if (pos === undefined) return null;
    const $pos = props.editor.view.state.doc.resolve(pos);
    const listItem = $pos.parent;
    return (listItem?.attrs as any).blockId ?? null;
  });

  const blockData = createMemo(() => {
    const id = blockId();
    if (!id) return null;
    const getter = props.editor.appView.app.getReactiveBlockNode(id);
    return getter()?.getData() ?? null;
  });

  const [inheritsText, setInheritsText] = createSignal<string>("");
  const [selectedColor, setSelectedColor] = createSignal<string>("none");
  const [fields, setFields] = createSignal<TagField[]>([]);
  const [initialState, setInitialState] = createSignal<{
    color: string;
    inherits: string;
    fields: TagField[];
  } | null>(null);
  const [inheritsError, setInheritsError] = createSignal<string>("");

  const isDirty = createMemo(() => {
    const s = initialState();
    if (!s) return false;
    const currentColor = selectedColor() === "none" ? "" : selectedColor();
    const currentInherits = inheritsText().trim();
    return (
      s.color !== currentColor ||
      s.inherits !== currentInherits ||
      JSON.stringify(cloneTagFields(fields())) !==
        JSON.stringify(cloneTagFields(s.fields))
    );
  });

  const colorOptions = [
    { key: "none", bg: "bg-zinc-400", isNone: true },
    { key: "1", bg: "bg-[var(--tag-bg1)]" },
    { key: "2", bg: "bg-[var(--tag-bg2)]" },
    { key: "3", bg: "bg-[var(--tag-bg3)]" },
    { key: "4", bg: "bg-[var(--tag-bg4)]" },
    { key: "5", bg: "bg-[var(--tag-bg5)]" },
    { key: "6", bg: "bg-[var(--tag-bg6)]" },
    { key: "7", bg: "bg-[var(--tag-bg7)]" },
    { key: "8", bg: "bg-[var(--tag-bg8)]" },
    { key: "9", bg: "bg-[var(--tag-bg9)]" },
    { key: "10", bg: "bg-[var(--tag-bg10)]" },
    { key: "11", bg: "bg-[var(--tag-bg11)]" },
    { key: "12", bg: "bg-[var(--tag-bg12)]" },
  ];

  const syncFromNode = (node: ProseNode) => {
    const attrs = node.attrs as TagAttrs;
    setSelectedColor(attrs.color || "none");
    setInheritsText(
      Array.isArray(attrs.inherits)
        ? (attrs.inherits as any as string[]).join(",")
        : ""
    );
    setFields(Array.isArray(attrs.fields) ? (attrs.fields as TagField[]) : []);
    setInitialState({
      color: attrs.color || "",
      inherits: Array.isArray(attrs.inherits)
        ? (attrs.inherits as any as string[]).join(",")
        : "",
      fields: cloneTagFields(
        Array.isArray(attrs.fields) ? (attrs.fields as TagField[]) : []
      ),
    });
  };

  onMount(() => {
    syncFromNode(props.node);
  });

  const handleToggleFold = () => {
    const id = blockId();
    if (!id) return;
    console.log("toggleFold", id);
    const cmd = toggleFoldState(props.editor, undefined, id);
    props.editor.appView.execCommand(cmd, true);
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

  const handleSelectColor = (key: string) => setSelectedColor(key);

  const handleSave = () => {
    const id = blockId();
    if (!id) return;

    setInheritsError("");
    const parsed = parseInheritsInput(inheritsText());
    if (!parsed.ok) {
      setInheritsError(
        (t("tag.invalidFormat", { example: "$id1,$id2,$id3" }) as string) ?? ""
      );
      return;
    }

    const vres = validateBlockIdsExist(parsed.ids, (bid) =>
      props.editor.appView.app.getBlockNode(bid)
    );
    if (!vres.ok) {
      const miss = (vres as any).missing;
      setInheritsError(t("tag.blockNotExists", { id: miss }) as string);
      return;
    }

    const patch: Partial<TagAttrs> = {
      inherits: parsed.ids,
      color: selectedColor() === "none" ? "" : selectedColor(),
      fields: fields(),
    };
    const cmd = updateTagBlockAttrs(props.editor, id, patch);
    props.editor.appView.execCommand(cmd, true);

    // 重置初始状态
    setInitialState({
      color: patch.color ?? "",
      inherits: inheritsText().trim(),
      fields: cloneTagFields(fields()),
    });
  };

  const handleDiscard = () => {
    const s = initialState();
    if (!s) return;
    setSelectedColor(s.color || "none");
    setInheritsText(s.inherits);
    setFields(cloneTagFields(s.fields));
  };

  return (
    <div
      class="tag flex flex-wrap items-center"
      data-inherits={(props.node.attrs as any).inherits?.join?.(",") ?? ""}
      data-color={(props.node.attrs as any).color ?? ""}
      data-fields={JSON.stringify((props.node.attrs as any).fields ?? [])}
    >
      <div class="flex flex-grow">
        <div class="flex-0-0-auto pr-[4px] tag-content" />

        <div class="flex gap-1 items-center" contentEditable={false}>
          <Tooltip>
            <TooltipTrigger
              as={(p: ButtonProps) => (
                <Button
                  {...p}
                  variant="secondary"
                  size="2xs-icon"
                  class="opacity-50 hover:opacity-100 transition-opacity"
                  onClick={handleToggleFold}
                >
                  <Settings class="size-[12px]" />
                </Button>
              )}
            />
            <TooltipContent>{t("tag.settings")}</TooltipContent>
          </Tooltip>
        </div>

        <div
          class="flex-1 cursor-text text-transparent"
          onClick={(e) => {
            e.preventDefault();
            handleClickPad();
          }}
          contentEditable={false}
        />
      </div>

      <Show when={blockData() && !blockData()!.folded}>
        <Card class="w-full my-1 rounded-md relative" contentEditable={false}>
          <CardHeader class="hidden" />
          <div class="absolute right-2 top-2">
            <Tooltip>
              <TooltipTrigger
                as={(p: ButtonProps) => (
                  <Button
                    {...p}
                    variant="ghost"
                    size="2xs-icon"
                    onClick={handleToggleFold}
                  >
                    <X class="size-[12px]" />
                  </Button>
                )}
              />
              <TooltipContent>{t("tag.close")}</TooltipContent>
            </Tooltip>
          </div>
          <CardContent class="space-y-6">
            <ColorSection
              t={t}
              colorOptions={colorOptions}
              getSelectedColor={selectedColor}
              onSelectColor={handleSelectColor}
            />
            <InheritsSection
              t={t}
              getInheritsText={inheritsText}
              setInheritsText={setInheritsText}
              getError={inheritsError}
              setError={setInheritsError}
            />
          </CardContent>

          <CardContent class="pt-0">
            <TagFieldsEditor value={fields()} onChange={setFields} />
          </CardContent>
          <SettingsFooter
            t={t}
            isDirty={isDirty}
            onDiscard={handleDiscard}
            onSave={handleSave}
          />
        </Card>
      </Show>
    </div>
  );
};

function cloneFields(src: TagField[]): TagField[] {
  return src.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type as any,
    optional: (f as any).optional,
    optionsMode: (f as any).optionsMode,
    options: Array.isArray((f as any).options)
      ? ([...(f as any).options] as string[])
      : undefined,
    fromTag: (f as any).fromTag,
  })) as TagField[];
}

class TagViewAdapter implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLElement;
  dispose: () => void;

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("div");
    this.dispose = render(
      () => (
        <TagView
          editor={props.editor}
          node={props.node}
          getPos={props.getPos as any}
        />
      ),
      container
    );
    this.dom = container.firstChild as HTMLDivElement;
    this.contentDOM = container.querySelector(".tag-content")!;
  }

  destroy(): void {
    this.dispose();
    this.dom.remove();
  }

  stopEvent(e: Event) {
    if (
      e.target instanceof HTMLElement &&
      isDescendantOf(e.target, "tag-content")
    )
      return false;
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (
      mutation.target instanceof HTMLElement &&
      isDescendantOf(mutation.target, "tag-content")
    ) {
      return false;
    }
    return true;
  }
}

function isDescendantOf(el: HTMLElement, className: string) {
  let curr: HTMLElement | null = el;
  while (curr) {
    if (curr.classList.contains(className)) return true;
    curr = curr.parentElement;
  }
  return false;
}

export const tagViewRenderer: NodeViewRenderer = (props) =>
  new TagViewAdapter(props);

export default TagView;
