import CompletionPopup from "@/components/CompletionPopup";
import ContextMenuGlobal from "@/components/ContextMenuGlobal";
import { AppHeader } from "@/components/header/AppHeader";
import ClearStorageConfirmDialog from "@/components/header/ClearStorageConfirmDialog";
import ImportConfirmDialog from "@/components/header/ImportConfirmDialog";
import SettingsPanel from "@/components/SettingsPanel";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { useImportExport } from "@/composables/useImportExport";
import { useMainRoots } from "@/composables/useMainRoots";
import {
  EditableOutlineView,
  EditableOutlineViewEvents,
} from "@/lib/app-views/editable-outline/editable-outline";
import { App } from "@/lib/app/app";
import { BlockRefCompletion } from "@/lib/tiptap/functionalities/block-ref-completion";
import { CompositionFix } from "@/lib/tiptap/functionalities/composition-fix";
import { FocusedBlockIdTracker } from "@/lib/tiptap/functionalities/focused-block-id-tracker";
import { HighlightCodeblock } from "@/lib/tiptap/functionalities/highlight-codeblock";
import { NormalKeymap } from "@/lib/tiptap/functionalities/keymap/normal";
import { PasteHtmlOrPlainText } from "@/lib/tiptap/functionalities/paste-html";
import PasteImage from "@/lib/tiptap/functionalities/paste-image";
import { ToCodeblock } from "@/lib/tiptap/functionalities/to-codeblock";
import { markExtensions } from "@/lib/tiptap/marks";
import { nodeExtensions } from "@/lib/tiptap/nodes";
import { createSignal, onMount } from "solid-js";

type Props = {
  app: App;
};

export const MainEditor = (props: Props) => {
  let editorContainer: HTMLDivElement;
  const [mainEditorView, setMainEditorView] =
    createSignal<EditableOutlineView | null>(null);
  const breadcrumb = useBreadcrumb(props.app);
  const completion = useBlockRefCompletion(props.app);

  onMount(() => {
    if (!(editorContainer instanceof HTMLDivElement)) return;

    const [mainRoots] = useMainRoots();
    const mainEditorView_ = new EditableOutlineView(props.app, {
      id: "main",
      extensions: [
        ...nodeExtensions,
        ...markExtensions,
        NormalKeymap,
        BlockRefCompletion,
        CompositionFix,
        HighlightCodeblock,
        ToCodeblock,
        PasteImage, // 必须放在 PasteHtmlOrPlainText 前面
        PasteHtmlOrPlainText,
        FocusedBlockIdTracker,
      ],
    });
    props.app.registerAppView(mainEditorView_);
    mainEditorView_.setRootBlockIds(mainRoots());
    mainEditorView_.mount(editorContainer);

    // 聚焦到开头
    setTimeout(() => {
      const tiptap = mainEditorView_?.tiptap;
      tiptap?.commands.setTextSelection(0);
      tiptap?.view.focus();
    });

    const handleEditorEvent = (
      key: keyof EditableOutlineViewEvents,
      event: EditableOutlineViewEvents[keyof EditableOutlineViewEvents]
    ) => {
      completion.handleCompletionRelatedEvent(mainEditorView_, key, event);
      breadcrumb.handleMainEditorEvent(key, event);
    };
    mainEditorView_.on("*", handleEditorEvent);
    setMainEditorView(mainEditorView_);
    globalThis.clearAll = useImportExport(props.app).handleClearStorageConfirm;
  });

  return (
    <>
      <AppHeader app={props.app} />
      <div class="flex-1 flex flex-col overflow-auto">
        <div
          class="flex-1 px-5 py-4 pb-[50vh] mt-5 outline-none"
          ref={editorContainer}
        ></div>
      </div>

      <CompletionPopup editor={mainEditorView()} completion={completion} />
      <ContextMenuGlobal />
      <ImportConfirmDialog app={props.app} />
      <ClearStorageConfirmDialog app={props.app} />
      <SettingsPanel />
    </>
  );
};
