import { App } from "@/lib/app/app";
import type { Component } from "solid-js";
import { createSignal } from "solid-js";

// 基础属性（除 divider 外都会有）
interface BaseMenuEntry {
  label?: string;
  icon?: Component<{ size?: number }>;
  danger?: boolean;
  disabled?: boolean;
}

// 可执行项
export interface ActionMenuItem extends BaseMenuEntry {
  type: "item";
  action: () => void;
}

// 分隔线
export interface DividerMenuItem {
  type: "divider";
}

// 子菜单
export interface SubMenuItem extends BaseMenuEntry {
  type: "submenu";
  children: MenuItem[];
}

export type MenuItem = ActionMenuItem | DividerMenuItem | SubMenuItem;

function isMouseEvent(v: unknown): v is MouseEvent {
  return (
    !!v &&
    typeof (v as any).clientX === "number" &&
    typeof (v as any).clientY === "number"
  );
}

function isHTMLElement(v: unknown): v is HTMLElement {
  return !!v && typeof (v as any).getBoundingClientRect === "function";
}

type AnchorArg = { x: number; y: number } | MouseEvent | HTMLElement;

export const useContextMenu = (app: App) => {
  const { isOpenSignal, anchorPointSignal, itemsSignal } = app.contextmenu;
  const [isOpen, setIsOpen] = isOpenSignal;
  const [anchorPoint, setAnchorPoint] = anchorPointSignal;
  const [items, setItems] = itemsSignal;

  function open(anchor: AnchorArg, _items?: MenuItem[]) {
    let point: { x: number; y: number } | null = null;

    if (isMouseEvent(anchor)) {
      point = { x: anchor.clientX, y: anchor.clientY };
    } else if (isHTMLElement(anchor)) {
      const rect = anchor.getBoundingClientRect();
      point = { x: rect.left, y: rect.bottom };
    } else {
      point = anchor;
    }

    setAnchorPoint(point);
    setItems(_items ?? []);
    setIsOpen(true);
  }

  function close() {
    // 仅关闭，不清空 anchor 或 items；
    // 下次 open 会重新设置，避免关闭动画期间锚点丢失导致的闪烁。
    setIsOpen(false);
  }

  return {
    // 状态
    isOpen,
    setIsOpen,
    anchorPoint,
    items,

    // 操作
    open,
    close,
  } as const;
};
