import { EditableOutlineView } from "../app-views/editable-outline/editable-outline";
import type { AppView, AppViewId } from "../common/types/app-view";
import type { AppStep9 } from "./app";

export function initAppViews(app: AppStep9) {
  const ret = Object.assign(app, {
    appViews: {},
    lastFocusedAppViewId: null,
    registerAppView: (view: AppView<any>) => registerAppView(ret, view),
    unregisterAppView: (viewId: AppViewId) => unregisterAppView(ret, viewId),
    getLastFocusedAppView: (rollback: AppViewId = "main") =>
      getLastFocusedAppView(ret, rollback),
    getFocusingAppView: () => getFocusingAppView(ret),
    getAppViewById: (viewId: AppViewId) => getAppViewById(ret, viewId),
    getLastFocusedBlockId: () => getLastFocusedBlockId(ret),
    getFocusedBlockId: () => getFocusedBlockId(ret),
    refocus: () => refocus(ret),
  });
  return ret;
}

type AppWithAppViews = AppStep9 & {
  appViews: Record<AppViewId, AppView<any>>;
  lastFocusedAppViewId: AppViewId | null;
};

function getAppViewById(app: AppWithAppViews, viewId: AppViewId) {
  const view = app.appViews[viewId];
  return view ?? null;
}

/**
 * @deprecated
 */
export function registerAppView(app: AppWithAppViews, view: AppView<any>) {
  const oldView = app.appViews[view.id];
  if (oldView) throw new Error(`View ${view.id} already registered`);
  else {
    app.appViews[view.id] = view;

    // 监听 focus 事件，更新 lastFocusedEditorId
    view.on("focus", () => {
      app.lastFocusedAppViewId = view.id;
    });
  }
}

/**
 * @deprecated
 */
export function unregisterAppView(app: AppWithAppViews, viewId: AppViewId) {
  const view = app.appViews[viewId];
  if (!view) return;
  delete app.appViews[viewId];
}

/**
 * @deprecated
 */
export function getLastFocusedAppView(
  app: AppWithAppViews,
  rollback: AppViewId = "main"
) {
  const res = app.lastFocusedAppViewId
    ? app.appViews[app.lastFocusedAppViewId]
    : null;
  return res ?? app.appViews[rollback];
}

/**
 * @deprecated
 */
export function getFocusingAppView(app: AppWithAppViews) {
  const lastFocused = app.lastFocusedAppViewId
    ? app.appViews[app.lastFocusedAppViewId]
    : null;
  if (!lastFocused) return null;
  return lastFocused.hasFocus() ? lastFocused : null;
}

export function getLastFocusedBlockId(app: AppWithAppViews) {
  const view = getLastFocusedAppView(app);
  if (view instanceof EditableOutlineView) {
    const [getter] = view.lastFocusedBlockId;
    return getter();
  }
  return null;
}

export function getFocusedBlockId(app: AppWithAppViews) {
  const view = getFocusingAppView(app);
  if (view instanceof EditableOutlineView) {
    const [getter] = view.lastFocusedBlockId;
    return getter();
  }
  return null;
}

export function refocus(app: AppWithAppViews) {
  const view = getLastFocusedAppView(app);
  if (view instanceof EditableOutlineView) {
    view.tiptap?.view.focus();
  }
}
