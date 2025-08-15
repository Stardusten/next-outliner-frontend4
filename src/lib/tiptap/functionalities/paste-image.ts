import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { uploadFile } from "@/lib/app-views/editable-outline/commands";

const PASTE_IMAGE_NAME = "pasteImageUpload";

export const PasteImage = Extension.create({
  name: PASTE_IMAGE_NAME,
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey(PASTE_IMAGE_NAME),
        props: {
          handlePaste(_view, event) {
            const items = event.clipboardData?.items;
            if (!items || items.length === 0) return false;

            let imageFile: File | null = null;
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.kind === "file" && /^(image)\//.test(item.type)) {
                imageFile = item.getAsFile();
                if (imageFile) break;
              }
            }

            if (imageFile) {
              uploadFile(editor as any, async () => imageFile as File);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

export default PasteImage;
