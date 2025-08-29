import {
  Component,
  createMemo,
  createSignal,
  createEffect,
  Show,
} from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";
import type { BlockId } from "@/lib/common/types/block";
import type { TagAttrs } from "@/lib/tiptap/nodes/tag";
import type { FieldSchema } from "@/lib/common/types/block-field";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { updateTagBlockAttrs } from "@/lib/app-views/editable-outline/commands";
import ColorSection from "@/components/node-views/tagview/ColorSection";
import InheritsSection from "@/components/node-views/tagview/InheritsSection";
import TagFieldsEditor from "@/components/node-views/tagview/TagFieldsEditor";
import {
  cloneTagFields,
  parseInheritsInput,
  validateBlockIdsExist,
} from "@/components/node-views/tagview/tag-validators";

type Props = {
  app: App;
};

export const TagEditorDialog: Component<Props> = (props) => {
  const { t } = useI18n();
  const tagEditor = props.app.tagEditor;

  const [inheritsText, setInheritsText] = createSignal<string>("");
  const [selectedColor, setSelectedColor] = createSignal<string>("none");
  const [fields, setFields] = createSignal<FieldSchema[]>([]);
  const [initialState, setInitialState] = createSignal<{
    color: string;
    inherits: string;
    fields: FieldSchema[];
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

  const syncFromAttrs = (attrs: TagAttrs) => {
    setSelectedColor(attrs.color || "none");
    setInheritsText(
      Array.isArray(attrs.inherits)
        ? (attrs.inherits as any as string[]).join(",")
        : ""
    );
    setFields(
      Array.isArray(attrs.fields) ? (attrs.fields as FieldSchema[]) : []
    );
    setInitialState({
      color: attrs.color || "",
      inherits: Array.isArray(attrs.inherits)
        ? (attrs.inherits as any as string[]).join(",")
        : "",
      fields: cloneTagFields(
        Array.isArray(attrs.fields) ? (attrs.fields as FieldSchema[]) : []
      ),
    });
  };

  // 当对话框打开时，同步数据
  createEffect(() => {
    const open = tagEditor.openSignal[0]();
    if (open && tagEditor.attrs) {
      syncFromAttrs(tagEditor.attrs);
    }
  });

  const handleSelectColor = (key: string) => setSelectedColor(key);

  const handleSave = () => {
    const blockId = tagEditor.blockId;
    if (!blockId) return;

    setInheritsError("");
    const parsed = parseInheritsInput(inheritsText());
    if (!parsed.ok) {
      setInheritsError(
        (t("tag.invalidFormat", { example: "$id1,$id2,$id3" }) as string) ?? ""
      );
      return;
    }

    // 获取主编辑器视图
    const mainEditorView = props.app.getAppViewById("main");
    if (!(mainEditorView instanceof EditableOutlineView)) return;

    const vres = validateBlockIdsExist(parsed.ids, (bid) =>
      props.app.getBlockNode(bid)
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

    const editor = mainEditorView.tiptap;
    if (!editor) return;

    const cmd = updateTagBlockAttrs(editor, blockId, patch);
    mainEditorView.execCommand(cmd, true);

    // 关闭对话框
    tagEditor.openSignal[1](false);
  };

  const handleDiscard = () => {
    const s = initialState();
    if (!s) return;
    setSelectedColor(s.color || "none");
    setInheritsText(s.inherits);
    setFields(cloneTagFields(s.fields));
  };

  const handleClose = () => {
    tagEditor.openSignal[1](false);
  };

  return (
    <Dialog
      open={tagEditor.openSignal[0]()}
      onOpenChange={(open) => tagEditor.openSignal[1](open)}
    >
      <DialogContent class="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{t("tag.settings")}</DialogTitle>
        </DialogHeader>

        <div class="space-y-6 py-4">
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

          <TagFieldsEditor value={fields()} onChange={setFields} />
        </div>

        <DialogFooter>
          <Show when={isDirty()}>
            <Button variant="outline" onClick={handleDiscard}>
              {t("tag.discard")}
            </Button>
          </Show>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="default" onClick={handleSave} disabled={!isDirty()}>
            {t("tag.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagEditorDialog;
