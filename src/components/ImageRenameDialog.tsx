import { useDialogs } from "@/composables/useDialogs";
import { useI18n } from "@/composables/useI18n";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { TextField, TextFieldInput } from "./ui/text-field";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import type { App } from "@/lib/app/app";
import { createSimpleKeydownHandler } from "@/lib/common/keybinding";
import { isExtensionChanged } from "@/lib/tiptap/nodes/file";

interface ImageRenameDialogProps {
  app: App;
}

export const ImageRenameDialog = (props: ImageRenameDialogProps) => {
  const { t } = useI18n();
  const { _imageRename: imageRename } = useDialogs(props.app);
  const [open, setOpen] = imageRename.openSignal;
  const [newName, setNewName] = createSignal("");
  const [isAwaitingExtensionConfirm, setIsAwaitingExtensionConfirm] =
    createSignal(false);

  // 检查扩展名是否已改变
  const isExtensionChangedMemo = createMemo(() => {
    const oldName = imageRename.currentName || "";
    const newFileName = newName().trim();
    return oldName && newFileName && isExtensionChanged(oldName, newFileName);
  });

  const cancelRename = () => {
    setOpen(false);
    setNewName("");
    setIsAwaitingExtensionConfirm(false);
  };

  const confirmRename = () => {
    const name = newName().trim();
    if (!name) return;

    // 如果扩展名改变了且还没有确认过
    if (isExtensionChangedMemo() && !isAwaitingExtensionConfirm()) {
      setIsAwaitingExtensionConfirm(true);
      return;
    }

    // 应用重命名
    imageRename.handleRename?.(name);
    setOpen(false);
    setNewName("");
    setIsAwaitingExtensionConfirm(false);
  };

  createEffect(() => {
    const isOpen = open();
    if (isOpen) {
      // 对话框打开时，设置当前完整文件名
      const currentName = imageRename.currentName || "";
      setNewName(currentName);
      setIsAwaitingExtensionConfirm(false);

      // 只选中文件名部分，不包括扩展名
      setTimeout(() => {
        const input = document.querySelector("input[autofocus]");
        if (input instanceof HTMLInputElement) {
          input.focus();

          // 找到最后一个点的位置
          const lastDotIndex = currentName.lastIndexOf(".");
          if (lastDotIndex > 0) {
            // 选中从开始到最后一个点之前的部分
            input.setSelectionRange(0, lastDotIndex);
          } else {
            // 如果没有扩展名，选中全部
            input.select();
          }
        }
      });
    } else {
      setNewName("");
      setIsAwaitingExtensionConfirm(false);
    }
  });

  // 当用户修改输入内容时，重置确认状态
  createEffect(() => {
    newName(); // 订阅 newName 的变化
    setIsAwaitingExtensionConfirm(false);
  });

  const handleKeyDown = createSimpleKeydownHandler({
    Enter: {
      run: () => (confirmRename(), true),
      preventDefault: true,
      stopPropagation: true,
    },
  });

  return (
    <AlertDialog open={open()} onOpenChange={setOpen}>
      <AlertDialogTrigger class="hidden" />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("imageRenameDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("imageRenameDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <TextField>
          <TextFieldInput
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("imageRenameDialog.placeholder")}
            autofocus
          />
        </TextField>

        {/* 扩展名变更警告 */}
        <Show when={isExtensionChangedMemo()}>
          <div class="text-sm text-destructive">
            {t("imageRenameDialog.extensionChangeWarning")}
          </div>
        </Show>

        <AlertDialogFooter>
          <Button variant="outline" onClick={cancelRename}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={confirmRename}
            disabled={!newName().trim()}
            variant={isExtensionChangedMemo() ? "destructive" : "default"}
          >
            {isAwaitingExtensionConfirm()
              ? t("imageRenameDialog.confirmExtensionChange")
              : t("imageRenameDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImageRenameDialog;
