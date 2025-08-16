import { Button } from "@/components/ui/button"; // Ensure this path is correct
import { useI18n } from "@/composables/useI18n";
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import { Eye, Trash2 } from "lucide-solid";
import { createMemo } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"; // Ensure this path is correct
import DeleteConfirmDialog from "./DeleteConfirmDialog"; // Ensure this path is correct
import { useNavigate } from "@solidjs/router";

const RepoList = () => {
  const navigate = useNavigate();
  const { configs, openRepo } = useRepoConfigs();
  const { t } = useI18n();
  const hasConfigs = createMemo(() => configs().length > 0);

  return (
    <div class="space-y-3">
      {/* 空状态 */}
      {!hasConfigs() && (
        <div class="text-center py-8 text-muted-foreground">
          <p class="font-medium mb-1">{t("repoList.noRepo")}</p>
          <p class="text-sm">{t("repoList.clickToAddRepo")}</p>
        </div>
      )}

      {/* 知识库列表 */}
      {hasConfigs() &&
        configs().map((config) => (
          <div class="group p-3 rounded-lg border border-border transition-colors hover:bg-accent">
            <div class="flex items-center justify-between">
              {/* 左侧：知识库信息 */}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium text-foreground text-sm truncate">
                    {config.title || config.id}
                  </h3>
                </div>
                <p class="text-xs text-muted-foreground truncate">
                  {config.id}
                </p>
              </div>

              {/* 右侧：删除按钮 */}
              <div class="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger
                    as={() => (
                      <Button
                        variant="ghost"
                        class="size-7 text-muted-foreground hover:text-muted-foreground hover:bg-muted-foreground/10"
                        size="icon"
                        onClick={() => openRepo(navigate, config.id)}
                      >
                        <Eye class="size-4" />
                      </Button>
                    )}
                  ></TooltipTrigger>
                  <TooltipContent>{t("repoList.openRepo")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <DeleteConfirmDialog
                      toDelete={config}
                      trigger={() => (
                        <Button
                          variant="ghost"
                          class="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          size="icon"
                        >
                          <Trash2 class="size-4" />
                        </Button>
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t("repoList.deleteRepo")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default RepoList;
