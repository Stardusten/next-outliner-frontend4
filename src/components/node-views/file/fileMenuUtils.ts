import { useDialogs } from "@/composables/useDialogs";
import { useI18n } from "@/composables/useI18n";
import type { MenuItem } from "@/composables/useContextMenu";
import {
  changeFileDisplayMode,
  deleteFile,
  downloadFile,
  setImageFilter,
} from "@/lib/app-views/editable-outline/commands";

type ImageFilter =
  | "imageBlend"
  | "imageBlendLuminosity"
  | "imageInvert"
  | "imageInvertW";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import {
  inferFileTypeFromFilename,
  type FileAttrs,
} from "@/lib/tiptap/nodes/file";
import { TextSelection } from "@tiptap/pm/state";
import { Download, Edit3, Filter, Info, Repeat, Trash2 } from "lucide-solid";
import type { FileViewProps } from "./FileView";

export interface FileMenuOptions {
  editor: FileViewProps["editor"];
  node: FileViewProps["node"];
  getPos: FileViewProps["getPos"];
  showImageFilters?: boolean;
  showConvertToInline?: boolean;
  showConvertToPreview?: boolean;
  showConvertToCard?: boolean;
  showDelete?: boolean;
}

export function createFileMenuItems(options: FileMenuOptions): MenuItem[] {
  const { t } = useI18n();
  const filename = () => options.node.attrs.filename as string;
  const fileType = () => inferFileTypeFromFilename(filename());

  // 获取当前图片滤镜
  const getCurrentFilter = () => {
    const { extraInfo } = options.node.attrs as FileAttrs;
    try {
      const parsed = JSON.parse(extraInfo || "{}");
      return parsed.filter;
    } catch (_e) {
      return undefined;
    }
  };

  const handleDownload = () => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const cmd = downloadFile(options.editor, options.node.attrs as FileAttrs);
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const handleRename = () => {
    const { openImageRename } = useDialogs(options.editor.appView.app);
    const handleRenameConfirm = (newName: string) => {
      const { editor, node, getPos } = options;
      const pos = getPos();
      let tr = editor.state.tr.setNodeAttribute(pos, "filename", newName);
      const sel = TextSelection.create(tr.doc, pos + 1);
      tr = tr.setSelection(sel);
      editor.view.dispatch(tr);
      // 延迟聚焦
      setTimeout(() => editor.view.focus());
    };
    openImageRename(filename(), handleRenameConfirm);
  };

  const handleConvertToInline = () => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const pos = options.getPos();
      const cmd = changeFileDisplayMode(pos, "inline");
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const handleConvertToPreview = () => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const pos = options.getPos();
      const cmd = changeFileDisplayMode(pos, "preview");
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const handleConvertToCard = () => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const pos = options.getPos();
      const cmd = changeFileDisplayMode(pos, "expanded");
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const handleDelete = () => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const pos = options.getPos();
      const cmd = deleteFile(pos);
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const handleSetImageFilter = (filter: ImageFilter | undefined) => {
    if (options.editor.appView instanceof EditableOutlineView) {
      const pos = options.getPos();
      const cmd = setImageFilter(pos, filter);
      options.editor.appView.execCommand(cmd, true);
    }
  };

  const menuItems: MenuItem[] = [
    {
      type: "item",
      label: t("fileContextMenu.download"),
      icon: Download,
      action: handleDownload,
    },
    {
      type: "item",
      label: t("fileContextMenu.rename"),
      icon: Edit3,
      action: handleRename,
    },
  ];

  // 图片滤镜选项（仅对图片文件显示）
  if (options.showImageFilters !== false && fileType() === "image") {
    const currentFilter = getCurrentFilter();
    menuItems.push({
      type: "submenu",
      label: t("fileContextMenu.imageFilter"),
      icon: Filter,
      children: [
        {
          type: "item",
          label: t("imageFilters.none"),
          action: () => handleSetImageFilter(undefined),
          checked: currentFilter === undefined,
        },
        {
          type: "item",
          label: t("imageFilters.imageBlend"),
          action: () => handleSetImageFilter("imageBlend"),
          checked: currentFilter === "imageBlend",
        },
        {
          type: "item",
          label: t("imageFilters.imageBlendLuminosity"),
          action: () => handleSetImageFilter("imageBlendLuminosity"),
          checked: currentFilter === "imageBlendLuminosity",
        },
        {
          type: "item",
          label: t("imageFilters.imageInvert"),
          action: () => handleSetImageFilter("imageInvert"),
          checked: currentFilter === "imageInvert",
        },
        {
          type: "item",
          label: t("imageFilters.imageInvertW"),
          action: () => handleSetImageFilter("imageInvertW"),
          checked: currentFilter === "imageInvertW",
        },
      ],
    });
  }

  // 转换选项分隔符
  const hasConversionOptions =
    options.showConvertToInline !== false ||
    options.showConvertToPreview !== false ||
    options.showConvertToCard !== false;

  if (hasConversionOptions) {
    menuItems.push({ type: "divider" });

    if (options.showConvertToInline !== false) {
      menuItems.push({
        type: "item",
        label: t("file.contextMenu.convertToInline"),
        icon: Repeat,
        action: handleConvertToInline,
      });
    }

    if (options.showConvertToPreview !== false) {
      menuItems.push({
        type: "item",
        label: t("fileContextMenu.convertToPreview"),
        icon: Repeat,
        action: handleConvertToPreview,
      });
    }

    if (options.showConvertToCard !== false) {
      menuItems.push({
        type: "item",
        label: t("file.contextMenu.convertToCard"),
        icon: Repeat,
        action: handleConvertToCard,
      });
    }
  }

  // 其他选项分隔符
  menuItems.push({ type: "divider" });

  menuItems.push({
    type: "item",
    label: t("fileContextMenu.details"),
    icon: Info,
    action: () => {
      // TODO: 实现详情功能
    },
  });

  // 删除选项（如果需要）
  if (options.showDelete !== false) {
    menuItems.push({
      type: "item",
      label: t("file.preview.deleteImage"),
      icon: Trash2,
      action: handleDelete,
      danger: true,
    });
  }

  return menuItems;
}
