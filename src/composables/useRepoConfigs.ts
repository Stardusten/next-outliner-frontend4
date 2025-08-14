import { createSignal, createMemo } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { z } from "zod";
import { showToast } from "@/components/ui/toast";
import { repoConfigSchema, type RepoConfig } from "@/lib/repo/schema";

const REPO_CONFIGS_STORAGE_KEY = "repo-configs";
const [_configs, setConfigs] = createSignal<RepoConfig[]>([]);
let _initialized = false;

// 从 localStorage 加载配置
const loadConfigsFromStorage = (): void => {
  const stored = localStorage.getItem(REPO_CONFIGS_STORAGE_KEY);
  if (!stored) {
    setConfigs([]);
    return;
  }

  try {
    const configs = JSON.parse(stored);
    if (!Array.isArray(configs)) {
      throw new Error("Invalid config format");
    }

    const validConfigs: RepoConfig[] = [];
    for (const config of configs) {
      const res = repoConfigSchema.safeParse(config);
      if (res.success) {
        validConfigs.push(res.data);
      } else {
        console.warn("跳过无效配置:", config, res.error);
      }
    }

    setConfigs(validConfigs);

    // 如果有迁移，保存新格式
    if (validConfigs.length > 0) {
      saveConfigsToStorage();
    }
  } catch (error) {
    console.error("加载配置失败:", error);
    setConfigs([]);
    saveConfigsToStorage();
    showToast({
      title: "加载知识库配置失败，已重置配置列表",
      variant: "error",
    });
  }

  // 按 ID 字母排序
  setConfigs((prevConfigs) =>
    [...prevConfigs].sort((a, b) => a.id.localeCompare(b.id))
  );
};

// 保存配置到 localStorage
const saveConfigsToStorage = (): void => {
  try {
    localStorage.setItem(REPO_CONFIGS_STORAGE_KEY, JSON.stringify(_configs()));
  } catch (error) {
    console.error("保存知识库配置失败:", error);
    showToast({
      title: "保存知识库配置失败",
      variant: "error",
    });
  }
};

export const useRepoConfigs = () => {
  // 确保只初始化一次，并且在组件内部
  if (!_initialized) {
    _initialized = true;
    loadConfigsFromStorage();
  }

  const navigate = useNavigate();
  const params = useParams();
  const configs = createMemo(() => _configs());

  // 重新加载配置
  const loadConfigs = () => {
    loadConfigsFromStorage();
  };

  // 添加或更新知识库配置
  const addConfig = (config: RepoConfig): void => {
    // 检查是否已存在
    const existingIndex = _configs().findIndex((c) => c.id === config.id);

    if (existingIndex >= 0) {
      // 更新现有配置
      setConfigs((prevConfigs) => {
        const newConfigs = [...prevConfigs];
        newConfigs[existingIndex] = config;
        return newConfigs;
      });
      // toast.success(`已更新知识库 ${config.title}`);
    } else {
      // 添加新配置
      setConfigs((prevConfigs) => [...prevConfigs, config]);
      showToast({
        title: `已添加知识库 ${config.title}`,
        variant: "success",
      });
    }

    // 重新排序并保存
    setConfigs((prevConfigs) =>
      [...prevConfigs].sort((a, b) => a.id.localeCompare(b.id))
    );
    saveConfigsToStorage();
  };

  // 删除知识库配置
  const removeConfig = (repoId: string): boolean => {
    const config = getConfig(repoId);
    const initialLength = _configs().length;
    setConfigs((prevConfigs) =>
      prevConfigs.filter((config) => config.id !== repoId)
    );

    if (_configs().length !== initialLength) {
      saveConfigsToStorage();
      showToast({
        title: `已删除知识库 ${config?.title || repoId}`,
        variant: "success",
      });
      return true;
    }
    return false;
  };

  // 获取指定知识库配置
  const getConfig = (repoId: string): RepoConfig | null => {
    return _configs().find((config) => config.id === repoId) || null;
  };

  // 清空所有配置
  const clearAllConfigs = (): void => {
    setConfigs([]);
    localStorage.removeItem(REPO_CONFIGS_STORAGE_KEY);
    showToast({
      title: "已清空所有知识库配置",
      variant: "success",
    });
  };

  // 打开知识库
  const openRepo = (repoId: string) => {
    const config = getConfig(repoId);
    const res = repoConfigSchema.safeParse(config);
    if (res.success) {
      navigate(`/edit/${repoId}`, { replace: false });
    } else {
      showToast({
        title: "知识库配置无效",
        variant: "error",
      });
    }
  };

  const currentRepo = createMemo(() => {
    const repoId = params.repoId as string;
    return getConfig(repoId);
  });

  return {
    // 状态
    configs,
    currentRepo,

    // 方法
    loadConfigs,
    addConfig,
    removeConfig,
    getConfig,
    clearAllConfigs,
    openRepo,
  };
};
