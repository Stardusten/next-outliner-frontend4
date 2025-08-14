import type { Component } from "solid-js";
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
import { App } from "@/lib/app/app";
import { useI18n } from "@/composables/useI18n";

type Props = {
  app: App;
};

export const ImportConfirmDialog: Component<Props> = (props) => {
  const { t } = useI18n();
  const {
    importDialogVisible,
    importBlockCount,
    handleImportConfirm,
    handleImportCancel,
    setImportDialogVisible,
  } = useImportExport(props.app);

  return (
    <AlertDialog
      open={importDialogVisible()}
      onOpenChange={(set) => setImportDialogVisible(set)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("importConfirmDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("importConfirmDialog.description", {
              count: importBlockCount(),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleImportCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="default" onClick={handleImportConfirm}>
            {t("importConfirmDialog.confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ImportConfirmDialog;
