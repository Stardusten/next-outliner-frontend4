import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/composables/useI18n";
import { useRepoWizard } from "@/composables/useRepoWizard";
import type { useRepoConfigs } from "@/composables/useRepoConfigs";
import WizardStepBasicInfo from "./WizardStepBasicInfo";
import WizardStepPersistence from "./WizardStepPersistence";
import WizardStepAttachment from "./WizardStepAttachment";
import { createSignal, JSX, Show } from "solid-js";
import { Code } from "lucide-solid";

export default function RepoWizard() {
  const wizard = useRepoWizard();
  const { t } = useI18n();
  const {
    currentStep,
    totalSteps,
    canProceedToNext,
    canFinish,
    form,
    nextStep,
    previousStep,
    resetWizard,
    handleSubmit,
  } = wizard;
  const [open, setOpen] = createSignal(false);

  const handleOpen = () => {
    resetWizard();
    setOpen(true);
  };

  const handleFinish = () => {
    const ok = form.validate();
    if (ok) {
      handleSubmit();
      setOpen(false);
    }
  };

  const stepTitle = () => {
    switch (currentStep()) {
      case 1:
        return t("repoWizard.steps.1");
      case 2:
        return t("repoWizard.steps.2");
      case 3:
        return t("repoWizard.steps.3");
      default:
        return "";
    }
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger
        as={() => (
          <Button variant="outline" class="flex-grow" onClick={handleOpen}>
            + {t("repoWizard.addRepo")}
          </Button>
        )}
      ></DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("repoWizard.addRepo")}</DialogTitle>
          <DialogDescription>
            {stepTitle()} ({currentStep()}/{totalSteps})
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <Show when={currentStep() === 1}>
            <WizardStepBasicInfo wizard={wizard} />
          </Show>
          <Show when={currentStep() === 2}>
            <WizardStepPersistence wizard={wizard} />
          </Show>
          <Show when={currentStep() === 3}>
            <WizardStepAttachment wizard={wizard} />
          </Show>
        </div>

        <DialogFooter>
          <div class="flex justify-between w-full">
            <div class="flex gap-2">
              {currentStep() > 1 && (
                <Button variant="outline" onClick={() => previousStep()}>
                  {t("repoWizard.prevStep")}
                </Button>
              )}
            </div>

            <div class="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("repoWizard.cancel")}
              </Button>
              {currentStep() < totalSteps && (
                <Button
                  onClick={() => nextStep()}
                  disabled={!canProceedToNext()}
                >
                  {t("repoWizard.nextStep")}
                </Button>
              )}
              {currentStep() === totalSteps && (
                <Button onClick={handleFinish} disabled={!canFinish()}>
                  {t("repoWizard.complete")}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
