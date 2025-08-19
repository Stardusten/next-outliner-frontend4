import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { useParams } from "@solidjs/router";
import { RepoNotFoundPage } from "./RepoNotFound";
import { createRepo, instantiateApp } from "@/lib/repo/repo";
import { createEffect, createMemo } from "solid-js";
import { MainEditor } from "./MainEditor";

export const EditRepoPage = () => {
  const params = useParams();
  const cfgs = useRepoConfigs();
  const cfg = createMemo(() => cfgs.getConfig(params.repoId));
  const repo = createMemo(() => (cfg() ? createRepo(cfg()) : null));
  const app = createMemo(() => (repo() ? instantiateApp(repo()) : null));

  // 将 app 挂到 globalThis 上，方便在 console 中调试
  createEffect(() => {
    (globalThis as any).app = app();
  });

  return (
    <div class="flex flex-col h-screen">
      {cfg ? <MainEditor app={app()} /> : <RepoNotFoundPage />}
    </div>
  );
};
