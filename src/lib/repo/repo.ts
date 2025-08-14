import { createApp, destroyApp, type App } from "../app/app";
import { getAttachmentStorage } from "../app/attachment";
import { getPersistence } from "../persistence";
import type { RepoConfig } from "./schema";

export type Repo = {
  config: RepoConfig;
  app: App | null;
};

export function createRepo(config: RepoConfig): Repo {
  return {
    config,
    app: null,
  };
}

export function instantiateApp(repo: Repo): App {
  // persistence 是必须的
  const persistence = getPersistence(repo.config);
  if (!persistence) {
    throw new Error(
      `Persistence not found! config: ${JSON.stringify(repo.config)}`
    );
  }
  console.log("persistence:", persistence);

  // attachment storage 是可选的
  const attachmentStorage = getAttachmentStorage(repo.config);
  console.log("attachment storage:", attachmentStorage);

  // 如果已有实例，先销毁
  if (repo.app) {
    destroyApp(repo.app);
    repo.app = null;
  }

  repo.app = createApp(repo.config.id, persistence, attachmentStorage);
  return repo.app;
}
