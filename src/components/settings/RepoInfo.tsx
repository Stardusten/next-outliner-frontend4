import { Show } from "solid-js";
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { clipboard } from "@/lib/common/utils/clipboard";
import { showToast } from "@/components/ui/toast";
import { useI18n } from "@/composables/useI18n";
import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";

export default function RepoInfo() {
  const { t } = useI18n();
  const currentRepo = useCurrRepoConfig();

  const handleExportRepoConfigAsJson = () => {
    const repo = currentRepo();
    if (repo) {
      const json = JSON.stringify(repo, null, 2);
      clipboard.writeText(json);
      showToast({
        title: t("settingsRepo.exportCopied") as string,
        variant: "success",
      });
    }
  };

  const handleSwitchRepo = () => {
    // 这里没有 Vue Router，使用现有页面路由方式
    // 项目已有 SwitchRepoPage.tsx，通过跳转 URL 访问
    window.location.href = "/switch-repo";
  };

  return (
    <div class="space-y-4">
      <div class="space-y-2">
        <div class="flex">
          <Label class="text-sm font-semibold w-[100px]">
            {t("settings.repo.basicInfo.repoName")}
          </Label>
          <div class="text-sm text-muted-foreground">
            {currentRepo()?.title ??
              (t("settingsRepo.unknownRepoTitle") as string)}
          </div>
        </div>

        <div class="flex">
          <Label class="text-sm w-[100px]">
            {t("settings.repo.basicInfo.repoId")}
          </Label>
          <div class="text-sm text-muted-foreground font-mono">
            {currentRepo()?.id ?? (t("settingsRepo.unknownRepoId") as string)}
          </div>
        </div>
      </div>

      <div class="flex gap-2">
        <Button variant="outline" onClick={handleExportRepoConfigAsJson}>
          {t("settings.repo.basicInfo.exportAsJson")}
        </Button>
        <Button variant="outline" onClick={handleSwitchRepo}>
          {t("settings.repo.basicInfo.switchRepo")}
        </Button>
      </div>
    </div>
  );
}
