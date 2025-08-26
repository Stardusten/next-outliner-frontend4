import { createMemo, createSignal, type Component, type JSX } from "solid-js";
import { useRepoConfigs } from "./useRepoConfigs";
import type {
  RepoConfig,
  RepoUISettings,
  RepoEditorSettings,
  RepoAttachmentSettings,
  RepoLLMSettings,
} from "@/lib/repo/schema";
import { Brain, Database, Info, PaintRoller, Settings } from "lucide-solid";
import TestOssConnection from "@/components/settings/TestOssConnection";
import TestLLMConnection from "@/components/settings/TestLLMConnection";
import RepoInfo from "@/components/settings/RepoInfo";
import { useCurrRepoConfig } from "./useCurrRepoConfig";
import { App } from "@/lib/app/app";

// 设置路径类型
export type SettingPath =
  | `ui.${keyof RepoUISettings}`
  | `editor.${keyof RepoEditorSettings}`
  | `attachment.${keyof RepoAttachmentSettings}`
  | `llm.${keyof RepoLLMSettings}`;

// 设置项类型
export type SettingType =
  | "toggle"
  | "single-select"
  | "multi-select"
  | "input"
  | "number"
  | "font"
  | "textarea"
  | "custom";

// 选项类型
export interface SettingOption {
  id: string;
  label: string;
  description?: string;
}

// 条件显示类型
export type SettingCondition = (config: RepoConfig) => boolean;

// 渲染上下文
export interface SettingRenderContext {
  config: RepoConfig;
  app: App;
  getSetting: (path: SettingPath) => any;
  saveSetting: (path: SettingPath, value: any) => void;
  resetSetting: (path: SettingPath) => void;
}

// 基础设置项接口
export interface BaseSetting {
  id: string;
  type: SettingType;
  label: string;
  description?: string;
  settingPath: SettingPath | null;
  condition?: SettingCondition;
}

// Toggle 设置项
export interface ToggleSetting extends BaseSetting {
  type: "toggle";
  defaultValue: boolean;
}

// 单选设置项
export interface SingleSelectSetting extends BaseSetting {
  type: "single-select";
  defaultValue: string;
  options: SettingOption[];
}

// 多选设置项
export interface MultiSelectSetting extends BaseSetting {
  type: "multi-select";
  defaultValue: string[];
  options: SettingOption[];
}

// 输入框设置项
export interface InputSetting extends BaseSetting {
  type: "input";
  defaultValue: string;
  placeholder?: string;
  password?: boolean;
  maxLength?: number;
  readonly?: boolean;
}

// 数字设置项
export interface NumberSetting extends BaseSetting {
  type: "number";
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

// 字体设置项
export interface FontSetting extends BaseSetting {
  type: "font";
  defaultValue: string;
  fontList?: string[];
}

// TextArea 设置项
export interface TextAreaSetting extends BaseSetting {
  type: "textarea";
  defaultValue: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  readonly?: boolean;
  code?: boolean; // 是否为代码块，使用等宽字体
}

// 自定义设置项
export interface CustomSetting extends BaseSetting {
  type: "custom";
  render: (context: SettingRenderContext) => JSX.Element | Component;
  noLabel?: boolean;
  defaultValue?: undefined;
  settingPath: null;
}

// 联合类型
export type SettingItem =
  | ToggleSetting
  | SingleSelectSetting
  | MultiSelectSetting
  | InputSetting
  | NumberSetting
  | FontSetting
  | TextAreaSetting
  | CustomSetting;

// 设置分组
export interface SettingsGroup {
  id: string;
  title: string;
  description?: string;
  settings: SettingItem[];
}

// 设置页面
export interface SettingsPageConfig {
  id: string;
  groups: SettingsGroup[];
}

// 侧边栏项
export interface SidebarSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon?: Component;
  }[];
}

// 设置配置（Solid 版本：自定义组件先使用占位渲染）
const settingsConfig: SettingsPageConfig[] = [
  {
    id: "appearance",
    groups: [
      {
        id: "ui",
        title: "UI",
        settings: [
          {
            id: "theme",
            type: "single-select",
            label: "颜色主题",
            settingPath: "ui.theme",
            defaultValue: "light",
            options: [
              { id: "light", label: "Light" },
              { id: "dark", label: "Dark" },
              { id: "system", label: "System" },
            ],
          },
          {
            id: "uiFontSize",
            type: "number",
            label: "UI 字体大小",
            settingPath: "ui.fontSize",
            defaultValue: 16,
            min: 12,
            max: 24,
          },
          {
            id: "uiFontFamily",
            type: "font",
            label: "UI 字体",
            settingPath: "ui.fontFamily",
            defaultValue: "Inter",
          },
          {
            id: "uiScale",
            type: "number",
            label: "UI 缩放比例",
            settingPath: "ui.scale",
            defaultValue: 100,
            min: 50,
            max: 200,
          },
          {
            id: "customCSS",
            type: "textarea",
            label: "自定义 CSS",
            description: "添加自定义 CSS 样式来个性化界面外观",
            settingPath: "ui.customCSS",
            defaultValue: "",
            placeholder:
              "/* 在这里输入自定义 CSS */\n.custom-style {\n  color: #333;\n}",
            rows: 10,
            code: true,
          },
        ],
      },
      {
        id: "editor",
        title: "编辑器",
        settings: [
          {
            id: "editorLineSpacing",
            type: "single-select",
            label: "行间距",
            settingPath: "editor.lineSpacing",
            defaultValue: "normal",
            options: [
              { id: "compact", label: "Compact" },
              { id: "normal", label: "Normal" },
              { id: "loose", label: "Loose" },
            ],
          },
          {
            id: "editorFontSize",
            type: "number",
            label: "编辑器字体大小",
            settingPath: "editor.fontSize",
            defaultValue: 16,
            min: 12,
            max: 24,
            step: 1,
          },
          {
            id: "editorFontFamily",
            type: "font",
            label: "编辑器文本字体",
            settingPath: "editor.fontFamily",
            defaultValue: "Inter",
          },
          {
            id: "editorMonospaceFontSize",
            type: "number",
            label: "编辑器等宽字体大小",
            settingPath: "editor.monospaceFontSize",
            defaultValue: 16,
            min: 12,
          },
          {
            id: "editorMonospaceFontFamily",
            type: "font",
            label: "编辑器等宽字体",
            settingPath: "editor.monospaceFontFamily",
            defaultValue: "Inter",
          },
        ],
      },
    ],
  },
  {
    id: "editor",
    groups: [
      {
        id: "upload",
        title: "附件默认显示模式",
        description:
          "编辑器中，一个附件可以显示为 (1) 引用 (2) 卡片 (3) 嵌入预览。下面的设置项目用于指定不同类型的文件，上传时的默认显示模式。",
        settings: [
          {
            id: "imageFileDefaultDisplayMode",
            type: "single-select",
            label: "图片文件",
            settingPath: "editor.imageFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "videoFileDefaultDisplayMode",
            type: "single-select",
            label: "视频文件",
            settingPath: "editor.videoFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "audioFileDefaultDisplayMode",
            type: "single-select",
            label: "音频文件",
            settingPath: "editor.audioFileDefaultDisplayMode",
            defaultValue: "preview",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "textFileDefaultDisplayMode",
            type: "single-select",
            label: "文本文件",
            settingPath: "editor.textFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "archiveFileDefaultDisplayMode",
            type: "single-select",
            label: "压缩文件",
            settingPath: "editor.archiveFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
          {
            id: "unknownFileDefaultDisplayMode",
            type: "single-select",
            label: "未知文件",
            settingPath: "editor.unknownFileDefaultDisplayMode",
            defaultValue: "expanded",
            options: [
              { id: "inline", label: "引用" },
              { id: "expanded", label: "卡片" },
              { id: "preview", label: "嵌入预览" },
            ],
          },
        ],
      },
      {
        id: "experimental",
        title: "实验性功能",
        settings: [
          {
            id: "incrementalUpdate",
            type: "toggle",
            label: "增量更新",
            settingPath: "editor.incrementalUpdate",
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    id: "repo",
    groups: [
      {
        id: "basicInfo",
        title: "知识库信息",
        settings: [
          {
            id: "basicInfoComponent",
            type: "custom",
            label: "知识库信息",
            settingPath: null,
            noLabel: true,
            render: () => (RepoInfo as any)({}) as JSX.Element,
          },
        ],
      },
      {
        id: "attachment",
        title: "附件存储",
        settings: [
          {
            id: "attachmentStorageType",
            type: "single-select",
            label: "存储方式",
            settingPath: "attachment.storageType",
            defaultValue: "none",
            options: [
              { id: "none", label: "不设置" },
              { id: "oss", label: "对象存储" },
            ],
          },
          {
            id: "ossEndpoint",
            type: "input",
            label: "对象存储服务地址",
            settingPath: "attachment.endpoint",
            defaultValue: "",
            condition: (config) => config.attachment?.storageType === "oss",
          },
          {
            id: "ossAccessKey",
            type: "input",
            label: "对象存储 Access Key",
            settingPath: "attachment.accessKeyId",
            defaultValue: "",
            password: true,
            condition: (config) => config.attachment?.storageType === "oss",
          },
          {
            id: "ossSecretKey",
            type: "input",
            label: "对象存储 Secret Key",
            settingPath: "attachment.secretAccessKey",
            defaultValue: "",
            password: true,
            condition: (config) => config.attachment?.storageType === "oss",
          },
          {
            id: "ossBucket",
            type: "input",
            label: "存储桶名",
            settingPath: "attachment.bucket",
            defaultValue: "",
            condition: (config) => config.attachment?.storageType === "oss",
          },
          {
            id: "ossTest",
            type: "custom",
            label: "测试对象存储连接",
            settingPath: null,
            noLabel: true,
            condition: (config) => config.attachment?.storageType === "oss",
            render: (context) =>
              (TestOssConnection as any)({ context }) as JSX.Element,
          },
        ],
      },
    ],
  },
  {
    id: "ai",
    groups: [
      {
        id: "llm",
        title: "接入大模型",
        settings: [
          {
            id: "llmServiceProvider",
            type: "single-select",
            label: "模型提供商",
            settingPath: "llm.serviceProvider",
            defaultValue: "openai",
            options: [
              { id: "openai", label: "OpenAI" },
              { id: "anthropic", label: "Anthropic" },
              { id: "google", label: "Google" },
              { id: "xai", label: "XAI" },
              { id: "grok", label: "Grok" },
              { id: "deepseek", label: "DeepSeek" },
              { id: "ollama", label: "Ollama" },
              { id: "custom", label: "自定义" },
            ],
          },
          {
            id: "llmBaseUrl",
            type: "input",
            label: "模型服务地址",
            settingPath: "llm.baseUrl",
            defaultValue: "",
            condition: (config) => config.llm?.serviceProvider === "custom",
          },
          {
            id: "llmApiKey",
            type: "input",
            label: "API Key",
            settingPath: "llm.apiKey",
            defaultValue: "",
          },
          {
            id: "llmModelName",
            type: "input",
            label: "模型名称",
            settingPath: "llm.modelName",
            defaultValue: "",
          },
          {
            id: "llmTemperature",
            type: "number",
            label: "模型温度",
            settingPath: "llm.temperature",
            defaultValue: 1,
            min: 0,
            max: 2,
            step: 0.1,
          },
          {
            id: "llmEnableThinking",
            type: "toggle",
            label: "启用思考",
            settingPath: "llm.enableThinking",
            defaultValue: true,
          },
          {
            id: "llmTestConnection",
            type: "custom",
            label: "测试连接",
            settingPath: null,
            noLabel: true,
            render: (context) =>
              (TestLLMConnection as any)({ context }) as JSX.Element,
          },
        ],
      },
    ],
  },
  {
    id: "about",
    groups: [],
  },
];

// 侧边栏配置
const sidebarSections: SidebarSection[] = [
  {
    title: "Settings",
    items: [
      { id: "appearance", label: "外观", icon: PaintRoller },
      { id: "editor", label: "编辑器", icon: Settings },
      { id: "repo", label: "知识库", icon: Database },
      { id: "ai", label: "AI", icon: Brain },
      { id: "about", label: "软件信息", icon: Info },
    ],
  },
];

export function useSettings(app: App) {
  const { visibleSignal, currentPageSignal } = app.settings;
  const [visible, setVisible] = visibleSignal;
  const [currentPage, setCurrentPage] = currentPageSignal;

  const { addConfig } = useRepoConfigs();
  const currentRepo = useCurrRepoConfig();

  // 获取嵌套属性的值
  const getNestedValue = (obj: any, path: string): any => {
    const keys = path.split(".");
    let result = obj;
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) break;
    }
    return result;
  };

  // 设置嵌套属性的值（不可变更新）
  const setNestedValue = (obj: any, path: string, value: any): any => {
    const keys = path.split(".");
    const result = { ...obj };
    let cursor: any = result;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]!;
      cursor[key] = { ...cursor[key] };
      cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]!] = value;
    return result;
  };

  // 保存设置到当前仓库配置
  const saveSetting = (settingPath: SettingPath, value: any) => {
    if (!currentRepo()) {
      console.warn("No current repo, cannot save setting");
      return;
    }
    const updatedConfig = setNestedValue(currentRepo()!, settingPath, value);
    addConfig(updatedConfig as RepoConfig);
  };

  // 获取设置值
  const getSetting = (settingPath: SettingPath) => {
    if (!currentRepo()) return undefined;
    return getNestedValue(currentRepo()!, settingPath);
  };

  // 重置设置为默认值
  const resetSetting = (settingPath: SettingPath) => {
    const setting = findSettingByPath(settingPath);
    if (setting && setting.type !== "custom") {
      saveSetting(settingPath, (setting as any).defaultValue);
    }
  };

  // 根据 settingPath 查找设置项
  const findSettingByPath = (settingPath: SettingPath): SettingItem | null => {
    for (const page of settingsConfig) {
      for (const group of page.groups) {
        for (const setting of group.settings) {
          if (setting.settingPath === settingPath) return setting;
        }
      }
    }
    return null;
  };

  // 评估设置项条件
  const evaluateCondition = (
    condition: SettingCondition | undefined,
    config: RepoConfig
  ): boolean => {
    if (!condition) return true;
    try {
      return condition(config);
    } catch (error) {
      console.warn("条件评估函数执行出错:", error);
      return true;
    }
  };

  // 计算属性
  const currentPageConfig = createMemo(() => {
    return settingsConfig.find((page) => page.id === currentPage());
  });

  return {
    // 响应式状态
    visible,
    setVisible,
    currentPage,
    setCurrentPage,

    // 计算属性
    currentPageConfig,

    // 配置
    sidebarSections,
    settingsConfig,

    // 工具方法
    getSetting,
    saveSetting,
    resetSetting,
    evaluateCondition,
  } as const;
}
