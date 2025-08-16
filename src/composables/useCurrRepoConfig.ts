import { App } from "@/lib/app/app";
import { useNavigate, useParams } from "@solidjs/router";
import { createMemo } from "solid-js";
import { useRepoConfigs } from "./useRepoConfigs";

export const useCurrRepoConfig = (app?: App) => {
  const repoConfigs = useRepoConfigs();

  const route = app
    ? app.route
    : {
        params: useParams(),
        navigate: useNavigate(),
      };

  const currRepoConfig = createMemo(() => {
    const configs = repoConfigs.configs();
    const config = configs.find((cfg) => cfg.id === route.params.repoId);
    return config ?? null;
  });

  return currRepoConfig;
};
