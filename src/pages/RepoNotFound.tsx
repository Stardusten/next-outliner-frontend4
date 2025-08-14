import { useI18n } from "@/composables/useI18n";
import { useNavigate, useParams } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-solid";

const notFoundEmojis = ["🥵", "🤔", "😭", "☹️", "😅"];

export const RepoNotFoundPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useI18n();

  return (
    <div class="flex flex-col items-center justify-center h-screen">
      <div class="text-6xl mb-4">
        {notFoundEmojis[Math.floor(Math.random() * notFoundEmojis.length)]}
      </div>
      <div class="text-lg">{t("repoNotFound", { id: params.repoId })}</div>
      <Button
        onClick={() => navigate("/switch-repo")}
        class="mt-4"
        variant="outline"
      >
        <ArrowLeft />
        {t("backToSwitchRepo")}
      </Button>
    </div>
  );
};
