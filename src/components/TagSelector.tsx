import { useI18n } from "@/composables/useI18n";
import { setTagsOfCurrBlock } from "@/lib/app-views/editable-outline/commands";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { App } from "@/lib/app/app";
import { extractBlockRefs } from "@/lib/app/util";
import { createSimpleKeydownHandler } from "@/lib/common/keybinding";
import { BlockId } from "@/lib/common/types";
import { mac } from "@/lib/utils";
import { ReactiveSet } from "@solid-primitives/set";
import { WandSparkles } from "lucide-solid";
import { createEffect, createMemo, createSignal, For } from "solid-js";
import { Button, ColorfulButton } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const TagSelector = (props: { app: App }) => {
  const { t } = useI18n();
  const [open, setOpen] = props.app.tagSelector.openSignal;
  const [tags] = props.app.tags;
  const [selectedTags, setSelectedTags] = createSignal(
    new ReactiveSet<BlockId>()
  );
  const [focusedIndex, setFocusedIndex] = createSignal(-1);

  // 获取当前可用的标签列表
  const availableTags = createMemo(() => [...tags().entries()]);

  // 获取当前聚焦的标签ID
  const focusedTagId = createMemo(() => {
    const index = focusedIndex();
    const tagList = availableTags();
    return index >= 0 && index < tagList.length ? tagList[index]![0] : null;
  });

  const handleTagClick = (tagId: BlockId) => {
    const selected = selectedTags();
    if (selected.has(tagId)) selected.delete(tagId);
    else selected.add(tagId);
    setSelectedTags(selected);
  };

  const handleApply = () => {
    const view = props.app.getLastFocusedAppView();
    if (!(view instanceof EditableOutlineView)) return;
    const editor = view.tiptap;
    if (!editor) return;
    const blockId = props.app.tagSelector.blockId;
    if (!blockId) return;
    const cmd = setTagsOfCurrBlock(editor, [...selectedTags()], blockId);
    view.execCommand(cmd, true);
    setOpen(false);

    // 添加完标签后恢复焦点
    setTimeout(() => props.app.refocus());
  };

  const handleCancel = () => {
    setOpen(false);

    // 关闭后恢复焦点
    props.app.refocus();
  };

  const handleAiSuggest = () => {
    console.log("AI 建议功能待实现");
  };

  // 键盘导航处理函数
  const moveFocusNext = () => {
    const tagList = availableTags();
    const current = focusedIndex();
    const next = current < tagList.length - 1 ? current + 1 : 0;
    setFocusedIndex(next);
  };

  const moveFocusPrev = () => {
    const tagList = availableTags();
    const current = focusedIndex();
    const prev = current > 0 ? current - 1 : tagList.length - 1;
    setFocusedIndex(prev);
  };

  // 二维导航辅助函数
  const getTagPositions = () => {
    const container = document.querySelector(".tag-selector .tags-container");
    if (!container) return [];

    const tags = container.querySelectorAll(".block-ref.tag");
    return Array.from(tags).map((tag, index) => {
      const rect = tag.getBoundingClientRect();
      return {
        index,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
  };

  const findTagInDirection = (direction: "up" | "down") => {
    const positions = getTagPositions();
    const currentIndex = focusedIndex();
    if (currentIndex < 0 || currentIndex >= positions.length) return -1;

    const current = positions[currentIndex];
    if (!current) return -1;

    const candidates = positions.filter((pos, index) => {
      if (index === currentIndex) return false;

      if (direction === "up") {
        return pos.y < current.y;
      } else {
        return pos.y > current.y;
      }
    });

    if (candidates.length === 0) return -1;

    // 找到在相同水平范围内最近的标签
    const horizontalOverlap = candidates.filter((pos) => {
      const currentCenter = current.x + current.width / 2;
      return currentCenter >= pos.x && currentCenter <= pos.x + pos.width;
    });

    let target = horizontalOverlap.length > 0 ? horizontalOverlap : candidates;

    // 按距离排序
    target.sort((a, b) => {
      const distA = Math.abs(a.y - current.y);
      const distB = Math.abs(b.y - current.y);
      if (distA !== distB) return distA - distB;

      // 如果距离相同，选择水平距离最近的
      const currentCenter = current.x + current.width / 2;
      const hDistA = Math.abs(a.x + a.width / 2 - currentCenter);
      const hDistB = Math.abs(b.x + b.width / 2 - currentCenter);
      return hDistA - hDistB;
    });

    return target[0]?.index ?? -1;
  };

  const moveFocusUp = () => {
    const nextIndex = findTagInDirection("up");
    if (nextIndex >= 0) {
      setFocusedIndex(nextIndex);
    }
  };

  const moveFocusDown = () => {
    const nextIndex = findTagInDirection("down");
    if (nextIndex >= 0) {
      setFocusedIndex(nextIndex);
    }
  };

  const toggleFocusedTag = () => {
    const tagId = focusedTagId();
    if (tagId) {
      handleTagClick(tagId);
      moveFocusNext();
    }
  };

  const handleKeydown = createSimpleKeydownHandler({
    Enter: {
      run: (e) => {
        if (e.isComposing) return false;
        handleApply();
        return true;
      },
      preventDefault: true,
      stopPropagation: true,
    },
    Escape: {
      run: () => (handleCancel(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    "Mod-1": {
      run: () => (handleAiSuggest(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    Tab: {
      run: () => (moveFocusNext(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    "Shift-Tab": {
      run: () => (moveFocusPrev(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowRight: {
      run: () => (moveFocusNext(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowDown: {
      run: () => (moveFocusDown(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowLeft: {
      run: () => (moveFocusPrev(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    ArrowUp: {
      run: () => (moveFocusUp(), true),
      preventDefault: true,
      stopPropagation: true,
    },
    " ": {
      run: () => (toggleFocusedTag(), true),
      preventDefault: true,
      stopPropagation: true,
    },
  });

  createEffect(() => {
    const openStatus = open(); // 当 open 状态改变时

    // 打开时监听键盘事件，关闭时移除监听
    if (openStatus) {
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }

    if (!openStatus) {
      // 关闭时重置焦点
      setFocusedIndex(-1);
    }

    if (openStatus) {
      const blockId = props.app.tagSelector.blockId;
      if (!blockId) return;
      const blockData = props.app.getBlockData(blockId);
      if (!blockData) return;
      const json = JSON.parse(blockData.content);
      const node = props.app.detachedSchema.nodeFromJSON(json);
      const tags = extractBlockRefs(node, true);
      setSelectedTags(new ReactiveSet(tags));

      // 初始化焦点到第一个标签（如果有的话）
      const tagList = availableTags();
      if (tagList.length > 0) {
        setFocusedIndex(0);
      }
    }
  });

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class="hidden" />
      <DialogContent class="tag-selector">
        <DialogHeader>
          <DialogTitle>{t("tagSelector.title")}</DialogTitle>
          <p class="text-sm text-muted-foreground">
            {t("tagSelector.keyboardHint")}
          </p>
        </DialogHeader>

        <div class="flex gap-2 flex-row flex-wrap tags-container">
          <For each={availableTags()}>
            {([blockId, attrs], index) => (
              <span
                class="block-ref tag text-sm! opacity-50! select-none cursor-pointer transition-all duration-150 focus:outline-none!"
                classList={{
                  "opacity-100!": selectedTags().has(blockId),
                  [`tag-color-${attrs.color}`]: !!attrs.color,
                  "ring-2 ring-blue-500": focusedIndex() === index(),
                }}
                tabIndex={index() === 0 ? 0 : -1}
                onClick={() => handleTagClick(blockId)}
              >
                #{props.app.getTextContent(blockId)}
              </span>
            )}
          </For>
        </div>

        <DialogFooter>
          <div class="w-full flex flex-row justify-between">
            <Tooltip>
              <TooltipTrigger
                as={(p: any) => (
                  <ColorfulButton onClick={handleAiSuggest} {...p}>
                    <WandSparkles />
                    {t("tagSelector.aiSuggest")}
                  </ColorfulButton>
                )}
              />
              <TooltipContent>
                {t("tagSelector.aiSuggestTooltip", {
                  kbd: mac ? "⌘-3" : "Ctrl-3",
                })}
              </TooltipContent>
            </Tooltip>

            <div class="flex flex-row gap-2">
              <Tooltip>
                <TooltipTrigger
                  as={(p: any) => (
                    <Button {...p} variant="outline" onClick={handleCancel}>
                      {t("common.cancel")}
                    </Button>
                  )}
                />
                <TooltipContent>
                  {t("tagSelector.cancelTooltip", { kbd: "Escape" })}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  as={(p: any) => (
                    <Button {...p} variant="default" onClick={handleApply}>
                      {t("common.apply")}
                    </Button>
                  )}
                />
                <TooltipContent>
                  {t("tagSelector.applyTooltip", { kbd: "Enter" })}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
