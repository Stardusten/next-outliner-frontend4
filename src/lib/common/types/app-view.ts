import type { App } from "@/lib/app/app";
import type { Emitter } from "mitt";
import { BlockId } from "./block";

export type AppViewId = string;

export type AppViewMinimalEvents = {
  focus: void;
};

export type AppView<
  Events extends AppViewMinimalEvents = AppViewMinimalEvents
> = {
  get id(): AppViewId;
  get app(): App;
  mount(el: HTMLElement): void;
  unmount(): void;
  hasFocus(): boolean;
  on: Emitter<Events>["on"];
  off: Emitter<Events>["off"];
};

export type ViewParams = {
  viewId: string;
  selection?: {
    blockId: BlockId;
    anchor: number;
    head?: number;
  };
  scrollIntoView?: boolean;
  highlight?: boolean;
  rootBlockIds?: BlockId[];
};
export type RenderOptions = {
  // 是否只渲染根块，不渲染子块
  rootOnly: boolean;
  // 如果根块只有一个，且是折叠的，是否需要视这个块是展开的
  expandFoldedRoot: boolean;
};
