import { App } from "@/lib/app/app";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { createSignal, For } from "solid-js";
import { Button, ColorfulButton } from "./ui/button";
import { WandSparkles } from "lucide-solid";
import { BlockId } from "@/lib/common/types";
import { ReactiveSet } from "@solid-primitives/set";
import { useI18n } from "@/composables/useI18n";

export const TagSelector = (props: { app: App }) => {
  const { t } = useI18n();
  const [open, setOpen] = props.app.tagSelector.openSignal;
  const [tags] = props.app.tags;
  const [selectedTags, setSelectedTags] = createSignal(
    new ReactiveSet<BlockId>()
  );

  const handleTagClick = (tagId: BlockId) => {
    const selected = selectedTags();
    if (selected.has(tagId)) selected.delete(tagId);
    else selected.add(tagId);
    setSelectedTags(selected);
  };

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger class="hidden" />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tagSelector.title")}</DialogTitle>
        </DialogHeader>

        <div class="flex gap-2 flex-row flex-wrap">
          <For each={[...tags().entries()]}>
            {([blockId, attrs]) => (
              <span
                class="block-ref tag text-sm! opacity-50! select-none cursor-pointer"
                classList={{
                  "opacity-100!": selectedTags().has(blockId),
                  [`tag-color-${attrs.color}`]: !!attrs.color,
                }}
                onClick={() => handleTagClick(blockId)}
              >
                #{props.app.getTextContent(blockId)}
              </span>
            )}
          </For>
        </div>

        <DialogFooter>
          <div class="w-full flex flex-row justify-between">
            <ColorfulButton>
              <WandSparkles />
              {t("tagSelector.aiSuggest")}
            </ColorfulButton>
            <div class="flex flex-row gap-2">
              <Button variant="outline">{t("common.cancel")}</Button>
              <Button variant="default">{t("common.apply")}</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
