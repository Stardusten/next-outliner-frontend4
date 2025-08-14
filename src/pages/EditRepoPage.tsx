import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { useParams } from "@solidjs/router";
import { RepoNotFoundPage } from "./RepoNotFound";
import { createRepo, instantiateApp } from "@/lib/repo/repo";
import { createMemo } from "solid-js";
import { MainEditor } from "./MainEditor";

export const EditRepoPage = () => {
  const params = useParams();
  const cfgs = useRepoConfigs();
  const cfg = createMemo(() => cfgs.getConfig(params.repoId));
  const repo = createMemo(() => (cfg() ? createRepo(cfg()) : null));
  const app = createMemo(() => (repo() ? instantiateApp(repo()) : null));

  return (
    <div class="flex flex-col h-screen">
      {cfg ? <MainEditor app={app()} /> : <RepoNotFoundPage />}
    </div>
  );
};
