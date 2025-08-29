import { useDialogs } from "@/composables/useDialogs";
import { useI18n } from "@/composables/useI18n";
import { recursiveDeleteBlock } from "@/lib/app-views/editable-outline/commands";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
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

interface DeleteConfirmDialogProps {
  editor: EditableOutlineView;
}

export const DeleteBlockConfirm = (props: DeleteConfirmDialogProps) => {
  const { t } = useI18n();
  const app = props.editor.app;
  const { _deleteBlockConfirm: deleteBlockConfirm } = useDialogs(app);
  const [open, setOpen] = deleteBlockConfirm.openSignal;

  const cancelDelete = () => setOpen(false);
  const confirmDelete = () => {
    const { blockId, viewParams: selection } = deleteBlockConfirm;
    if (!blockId) return;
    const tiptap = props.editor.tiptap!;
    if (tiptap.appView instanceof EditableOutlineView) {
      const cmd = recursiveDeleteBlock(tiptap, blockId, selection);
      tiptap.appView.execCommand(cmd);
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open()} onOpenChange={setOpen}>
      <AlertDialogTrigger class="hidden" />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("deleteBlockConfirmDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteBlockConfirmDialog.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={cancelDelete}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={confirmDelete}>
            {t("common.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBlockConfirm;
