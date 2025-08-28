import { useI18n } from "@/composables/useI18n";
import { setTagsOfCurrBlock } from "@/lib/app-views/editable-outline/commands";
import { EditableOutlineView } from "@/lib/app-views/editable-outline/editable-outline";
import { App } from "@/lib/app/app";
import { extractBlockRefs } from "@/lib/app/util";
import { createSimpleKeydownHandler } from "@/lib/common/keybinding";
import { BlockId } from "@/lib/common/types";
import { mac } from "@/lib/utils";
import { ReactiveSet } from "@solid-primitives/set";
import { Check, Loader2, WandSparkles } from "lucide-solid";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Switch,
  Match,
} from "solid-js";
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

  // AI 建议状态管理
  type AiSuggestState =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success" }
    | { status: "error"; message: string };

  const [aiSuggestState, setAiSuggestState] = createSignal<AiSuggestState>({
    status: "idle",
  });

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

  const handleAiSuggest = async () => {
    // 如果正在加载或刚完成，不处理
    const currentState = aiSuggestState();
    if (
      currentState.status === "loading" ||
      currentState.status === "success"
    ) {
      return;
    }

    setAiSuggestState({ status: "loading" });

    try {
      // 获取 LLM 实例
      const llm = props.app.getLLM();
      if (!llm) {
        const errorMsg = t("tagSelector.noLLMConfig");
        if (errorMsg) {
          setAiSuggestState({ status: "error", message: errorMsg });
        }
        return;
      }

      // 获取当前块的内容
      const blockId = props.app.tagSelector.blockId;
      if (!blockId) return;

      // 获取当前块的文本内容
      const blockContent = props.app.getTextContent(blockId);

      // 获取当前块所在子树的内容（包含子块）
      const blockNode = props.app.getBlockNode(blockId);
      if (!blockNode) return;

      // 递归获取子树内容
      const getSubtreeContent = (nodeId: BlockId, depth = 0): string => {
        if (depth > 3) return ""; // 限制深度避免太多内容
        const node = props.app.getBlockNode(nodeId);
        if (!node) return "";

        const indent = "  ".repeat(depth);
        let content = indent + props.app.getTextContent(nodeId);

        const children = node.children();
        if (!children) return content;
        for (const child of children) {
          const childContent = getSubtreeContent(child.id, depth + 1);
          if (childContent) {
            content += "\n" + childContent;
          }
        }

        return content;
      };

      const subtreeContent = getSubtreeContent(blockId);

      // 获取所有现有标签
      const existingTags = availableTags().map(([id, attrs]) => ({
        name: props.app.getTextContent(id),
        color: attrs.color,
      }));

      // 构建 prompt
      const prompt = `分析以下内容，为其推荐最适合的标签。

当前块内容：
${blockContent}

完整上下文（包含子块）：
${subtreeContent}

现有标签库：
${existingTags.map((tag) => `#${tag.name}`).join(", ")}

请基于内容的主题、类型和关键概念，返回 3-5 个最适合的标签名称。
- 优先从现有标签库中选择
- 如果现有标签不够准确，可以建议新标签
- 只返回标签名称，用逗号分隔，不要包含 # 符号
- 不要返回任何解释或其他文字

示例输出格式：工作, 项目管理, 待办事项`;

      // 调用 LLM - chat 方法返回的是字符串
      const response = await llm.chat(prompt);

      if (!response || typeof response !== "string") {
        throw new Error("No response from LLM");
      }

      // 解析响应
      const suggestedTagNames = response
        .split(/[,，]/)
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      // 找到对应的标签 ID 或创建新标签
      const newSelectedTags = new ReactiveSet(selectedTags());

      for (const tagName of suggestedTagNames) {
        // 查找现有标签
        const existingTag = availableTags().find(([id]) => {
          const name = props.app.getTextContent(id);
          return name.toLowerCase() === tagName.toLowerCase();
        });

        if (existingTag) {
          newSelectedTags.add(existingTag[0]);
        } else {
          // 如果是新标签，可以提示用户
          console.log(`建议的新标签: ${tagName}`);
        }
      }

      setSelectedTags(newSelectedTags);

      // 如果有建议的新标签，可以显示提示
      const newTags = suggestedTagNames.filter((tagName: string) => {
        return !availableTags().some(([id]) => {
          const name = props.app.getTextContent(id);
          return name.toLowerCase() === tagName.toLowerCase();
        });
      });

      if (newTags.length > 0) {
        console.log(`AI 建议创建新标签: ${newTags.join(", ")}`);
      }

      // 显示成功状态
      setAiSuggestState({ status: "success" });

      // 2秒后恢复初始状态
      setTimeout(() => {
        setAiSuggestState({ status: "idle" });
      }, 2000);
    } catch (error) {
      console.error("AI suggestion error:", error);
      const errorMsg = t("tagSelector.aiSuggestError");
      if (errorMsg) {
        setAiSuggestState({ status: "error", message: errorMsg });
      }
    }
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
            <div class="flex flex-col gap-2 items-start">
              <Tooltip>
                <TooltipTrigger
                  as={(p: any) => (
                    <ColorfulButton
                      {...p}
                      onClick={handleAiSuggest}
                      disabled={
                        aiSuggestState().status === "loading" ||
                        aiSuggestState().status === "success"
                      }
                    >
                      <Switch>
                        <Match when={aiSuggestState().status === "loading"}>
                          <Loader2 class="animate-spin" />
                        </Match>
                        <Match when={aiSuggestState().status === "success"}>
                          <Check />
                        </Match>
                        <Match
                          when={
                            aiSuggestState().status === "idle" ||
                            aiSuggestState().status === "error"
                          }
                        >
                          <WandSparkles />
                        </Match>
                      </Switch>
                      <Switch>
                        <Match when={aiSuggestState().status === "loading"}>
                          {t("tagSelector.aiSuggestLoading")}
                        </Match>
                        <Match when={aiSuggestState().status === "success"}>
                          {t("tagSelector.aiSuggestSuccess")}
                        </Match>
                        <Match
                          when={
                            aiSuggestState().status === "idle" ||
                            aiSuggestState().status === "error"
                          }
                        >
                          {t("tagSelector.aiSuggest")}
                        </Match>
                      </Switch>
                    </ColorfulButton>
                  )}
                />
                <TooltipContent>
                  {t("tagSelector.aiSuggestTooltip", {
                    kbd: mac ? "⌘-3" : "Ctrl-3",
                  })}
                </TooltipContent>
              </Tooltip>
              <Show when={aiSuggestState().status === "error"}>
                <span class="text-xs text-destructive">
                  {
                    (aiSuggestState() as { status: "error"; message: string })
                      .message
                  }
                </span>
              </Show>
            </div>

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
