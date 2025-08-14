import { useRepoConfigs } from "@/composables/useRepoConfigs";
import type { RepoConfig } from "@/lib/repo/schema";
import { createSignal, type JSX, type ValidComponent, Show } from "solid-js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { useI18n } from "@/composables/useI18n";

interface DeleteConfirmDialogProps {
  toDelete: RepoConfig;
  children?: JSX.Element;
  trigger?: ValidComponent;
}

const DeleteConfirmDialog = (props: DeleteConfirmDialogProps) => {
  const repoConfig = useRepoConfigs();
  const [open, setOpen] = createSignal(false);
  const { t } = useI18n();

  const cancelDelete = () => setOpen(false);
  const confirmDelete = () => {
    repoConfig.removeConfig(props.toDelete.id);
    setOpen(false);
  };

  const trigger = () => props.trigger ?? ("button" as ValidComponent);

  return (
    <AlertDialog open={open()} onOpenChange={setOpen}>
      <Show when={props.children}>
        <AlertDialogTrigger as={trigger()}>{props.children}</AlertDialogTrigger>
      </Show>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteConfirmDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteConfirmDialog.description", {
              title: props.toDelete.title || props.toDelete.id,
            })}
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

export default DeleteConfirmDialog;
