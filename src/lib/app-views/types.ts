import type { Emitter } from "mitt";
import type { App } from "../app/app";

export type AppViewId = string;

export type AppViewMinimalEvents = {
  focus: void;
};

export type AppView<
  Events extends AppViewMinimalEvents = AppViewMinimalEvents,
> = {
  get id(): AppViewId;
  get app(): App;
  mount(el: HTMLElement): void;
  unmount(): void;
  hasFocus(): boolean;
  on: Emitter<Events>["on"];
  off: Emitter<Events>["off"];
};
