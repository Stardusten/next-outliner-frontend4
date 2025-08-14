import { createEffect, type Component } from "solid-js";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useImportExport } from "@/composables/useImportExport";
import { useI18n } from "@/composables/useI18n";
import { App } from "@/lib/app/app";

type Props = {
  app: App;
};

export const ClearStorageConfirmDialog: Component<Props> = (props) => {
  const { t } = useI18n();
  const {
    clearStorageDialogVisible,
    handleClearStorageConfirm,
    handleClearStorageCancel,
    setClearStorageDialogVisible,
  } = useImportExport(props.app);

  return (
    <AlertDialog
      open={clearStorageDialogVisible()}
      onOpenChange={(set) => setClearStorageDialogVisible(set)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("clearStorageConfirmDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div class="space-y-2">
              <p>{t("clearStorageConfirmDialog.description")}</p>
              <p class="text-destructive font-medium">
                {t("clearStorageConfirmDialog.warning")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClearStorageCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleClearStorageConfirm}>
            {t("clearStorageConfirmDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ClearStorageConfirmDialog;
