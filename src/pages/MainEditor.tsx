import CompletionPopup from "@/components/CompletionPopup";
import ContextMenuGlobal from "@/components/ContextMenuGlobal";
import { DeleteBlockConfirm } from "@/components/DeleteBlockConfirm";
import { AppHeader } from "@/components/header/AppHeader";
import ClearStorageConfirmDialog from "@/components/header/ClearStorageConfirmDialog";
import ImportConfirmDialog from "@/components/header/ImportConfirmDialog";
import SettingsPanel from "@/components/SettingsPanel";
import { useAppKeybinding } from "@/composables/useAppKeybinding";
import { useBlockRefCompletion } from "@/composables/useBlockRefCompletion";
import { useMainRoots } from "@/composables/useMainRoots";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { App } from "@/lib/app/app";
import { BlockRefCompletion } from "@/lib/tiptap/functionalities/block-ref-completion";
import { CompositionFix } from "@/lib/tiptap/functionalities/composition-fix";
import { FocusedBlockIdTracker } from "@/lib/tiptap/functionalities/focused-block-id-tracker";
import { HighlightCodeblock } from "@/lib/tiptap/functionalities/highlight-codeblock";
import { HighlightEphemeral } from "@/lib/tiptap/functionalities/highlight-ephermal";
import { NormalKeymap } from "@/lib/tiptap/functionalities/keymap/normal";
import { PasteHtmlOrPlainText } from "@/lib/tiptap/functionalities/paste-html";
import PasteImage from "@/lib/tiptap/functionalities/paste-image";
import { SafariImeSpan } from "@/lib/tiptap/functionalities/safari-ime-span";
import { ToCodeblock } from "@/lib/tiptap/functionalities/to-codeblock";
import { ToNumbered } from "@/lib/tiptap/functionalities/to-numbered";
import { markExtensions } from "@/lib/tiptap/marks";
import { nodeExtensions } from "@/lib/tiptap/nodes";
import { createSignal, onMount } from "solid-js";

type Props = {
  app: App;
};

export const MainEditor = (props: Props) => {
  let editorContainer!: HTMLDivElement;
  const [mainEditorView, setMainEditorView] =
    createSignal<EditableOutlineView | null>(null);
  const completion = useBlockRefCompletion(props.app);
  const [mainRoots, setMainRoots] = useMainRoots();
  const { handleKeydown } = useAppKeybinding(props.app);

  onMount(() => {
    if (!(editorContainer instanceof HTMLDivElement)) return;

    const mainEditorView_ = new EditableOutlineView(props.app, {
      id: "main",
      extensions: [
        ...nodeExtensions,
        ...markExtensions,
        NormalKeymap,
        SafariImeSpan,
        BlockRefCompletion,
        CompositionFix,
        HighlightCodeblock,
        ToCodeblock,
        ToNumbered,
        PasteHtmlOrPlainText,
        PasteImage,
        FocusedBlockIdTracker,
        HighlightEphemeral,
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

    mainEditorView_.on("root-blocks-changed", (event) => {
      setMainRoots(event.rootBlockIds);
    });
    mainEditorView_.on("*", (key, event) => {
      completion.handleCompletionRelatedEvent(mainEditorView_, key, event);
    });

    setMainEditorView(mainEditorView_);
  });

  return (
    <>
      <AppHeader app={props.app} />
      <div class="flex-1 flex flex-col overflow-auto" onKeyDown={handleKeydown}>
        <div
          class="flex-1 px-5 py-4 pb-[50vh] mt-5 outline-none"
          classList={{ "single-root": mainRoots().length === 1 }}
          ref={editorContainer}
        ></div>
      </div>

      <CompletionPopup editor={mainEditorView()!} completion={completion} />
      <ContextMenuGlobal />
      <ImportConfirmDialog app={props.app} />
      <ClearStorageConfirmDialog app={props.app} />
      <SettingsPanel />
      <DeleteBlockConfirm editor={mainEditorView()!} />
    </>
  );
};
