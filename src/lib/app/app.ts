import type { Schema } from "@tiptap/pm/model";
import mitt from "mitt";
import type { Persistence } from "../persistence/persistence";
import { detachedSchema } from "../tiptap/schema";
import type { AttachmentStorage } from "./attachment/storage";
import { initBlockManageApis } from "./block-manage";
import { initCompacter } from "./compacter";
import { initFullTextIndex } from "./index/fulltext";
import { initInRefsAndInTags } from "./index/in-refs";
import { initTextContent } from "./index/text-content";
import { initSaver } from "./saver";
import {
  initTransactionManager,
  type TxExecutedOperation,
  type TxMeta,
} from "./tx";
import { initUndoRedoManager } from "./undo-redo";
import { initAppViews } from "./views";

export type AppEvents = {
  "tx-committed": {
    executedOps: TxExecutedOperation[];
    meta: TxMeta;
  };
  save: {};
  compact: {};
};

export type EditorId = string;

export type InitialApp = {
  docId: string;
  persistence: Persistence;
  attachmentStorage: AttachmentStorage | null;
  detachedSchema: Schema;
};

export function createApp(
  docId: string,
  persistence: Persistence,
  attachmentStorage: AttachmentStorage | null
): App {
  const app: InitialApp = {
    docId,
    persistence,
    attachmentStorage,
    detachedSchema,
  };

  const app1 = initEb(app);
  const app2 = initDocAndTree(app1);
  const app3 = initBlockManageApis(app2);
  const app4 = initInRefsAndInTags(app3);
  const app5 = initTextContent(app4);
  const app6 = initFullTextIndex(app5);
  const app7 = initUpdatesCounts(app6);
  const app8 = initSaver(app7);
  const app9 = initCompacter(app8);
  const app10 = initAppViews(app9);
  const app11 = initTransactionManager(app10);
  const app12 = initUndoRedoManager(app11);

  return app12;
}

export function destroyApp(app: App) {
  // TODO
}

export type AppStep1 = ReturnType<typeof initEb>;
export type AppStep2 = ReturnType<typeof initDocAndTree>;
export type AppStep3 = ReturnType<typeof initBlockManageApis>;
export type AppStep4 = ReturnType<typeof initInRefsAndInTags>;
export type AppStep5 = ReturnType<typeof initTextContent>;
export type AppStep6 = ReturnType<typeof initFullTextIndex>;
export type AppStep7 = ReturnType<typeof initUpdatesCounts>;
export type AppStep8 = ReturnType<typeof initSaver>;
export type AppStep9 = ReturnType<typeof initCompacter>;
export type AppStep10 = ReturnType<typeof initAppViews>;
export type AppStep11 = ReturnType<typeof initTransactionManager>;
export type AppStep12 = ReturnType<typeof initUndoRedoManager>;
export type App = AppStep11;

function initEb(app: InitialApp) {
  const eb = mitt<AppEvents>();
  return Object.assign(app, {
    eb,
    emit: eb.emit,
    on: eb.on,
    off: eb.off,
  });
}

function initDocAndTree(app: AppStep1) {
  const [doc, tree] = app.persistence.load();
  return Object.assign(app, {
    doc,
    tree,
  });
}

function initUpdatesCounts(app: AppStep6) {
  const stat = app.persistence.getStorageStats(app.docId);
  return Object.assign(app, {
    updatesCount: stat.updatesCount,
  });
}
