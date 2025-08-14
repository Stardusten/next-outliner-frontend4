import RepoList from "@/components/repo-list/RepoList";
import RepoWizard from "@/components/repo-wizard/RepoWizard";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useRepoConfigs } from "@/composables/useRepoConfigs";

export const SwitchRepoPage = () => {
  const repoConfig = useRepoConfigs();

  return (
    <div class="min-h-screen bg-muted dark:bg-muted flex items-center justify-center p-4">
      <Card class="w-full max-w-md shadow-xl">
        <CardHeader class="text-center space-y-4">
          <div class="flex items-center justify-center gap-4 text-2xl font-medium mt-3">
            <img src="/logo.png" alt="Next Outliner" class="size-12" />
            <span class="font-old-serif">Next Outliner 3</span>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          <RepoList />
        </CardContent>

        <CardFooter>
          <RepoWizard />
        </CardFooter>
      </Card>
    </div>
  );
};
