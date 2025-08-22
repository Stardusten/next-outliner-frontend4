import { useI18n } from "@/composables/useI18n";
import {
  changeFileDisplayMode,
  deleteFile,
  setImageWidth,
} from "@/lib/app-views/editable-outline/commands";
import { parseFileStatus } from "@/lib/tiptap/nodes/file";
import { createMemo, Match, Switch } from "solid-js";

import { fileTypeToText, FileViewProps } from "./FileView";
import { ImageEmbeddedPreview } from "./ImageBox";
import { StatusBox } from "./StatusBox";
import { Unsupported } from "./Unsupported";

export const FilePreviewView = (props: FileViewProps) => {
  const { t } = useI18n();
  const filename = () => props.node.attrs.filename as string;
  const type = () => (props.node.attrs.type as string) || "unknown";
  const status = createMemo(() => {
    const statusString = props.node.attrs.status as string;
    return parseFileStatus(statusString);
  });

  const handleConvertToInline = () => {
    const pos = props.getPos();
    const cmd = changeFileDisplayMode(pos, "inline");
    props.editor.appView.execCommand(cmd, true);
  };

  const handleConvertToCard = () => {
    const pos = props.getPos();
    const cmd = changeFileDisplayMode(pos, "expanded");
    props.editor.appView.execCommand(cmd, true);
  };

  const handleDelete = () => {
    const pos = props.getPos();
    const cmd = deleteFile(pos);
    props.editor.appView.execCommand(cmd, true);
  };

  const handleImageResize = (newWidth: number) => {
    const pos = props.getPos();
    const cmd = setImageWidth(pos, newWidth);
    props.editor.appView.execCommand(cmd, true);
  };

  const showStatusBox = () =>
    status().type === "uploading" || status().type === "failed";
  const showImageBox = () => type() === "image" && status().type === "uploaded";

  return (
    <Switch fallback={<Unsupported typeText={fileTypeToText(t, type())} />}>
      <Match when={showStatusBox()}>
        <StatusBox filename={filename()} status={status()} />
      </Match>
      <Match when={showImageBox()}>
        <ImageEmbeddedPreview
          app={props.editor.appView.app}
          node={props.node}
          convertToInline={handleConvertToInline}
          convertToCard={handleConvertToCard}
          deleteImage={handleDelete}
          resizeImage={handleImageResize}
        />
      </Match>
    </Switch>
  );
};
