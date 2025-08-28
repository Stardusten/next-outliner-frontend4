import { App, AppStep14 } from "./app";
import { LLMWrapper, type LLMServices } from "@/lib/llm";
import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";

export function initAiService(app: AppStep14) {
  /**
   * 获取当前配置的 LLMWrapper 实例
   * 每次调用时动态读取配置，以便响应设置变更
   */
  const getLLM = (): LLMServices | null => {
    const currRepoConfig = useCurrRepoConfig(app as App);
    const config = currRepoConfig();

    if (!config?.llm) {
      return null;
    }

    const {
      serviceProvider,
      apiKey,
      modelName,
      baseUrl,
      temperature,
      enableThinking,
    } = config.llm;

    if (!serviceProvider || !apiKey || !modelName) {
      return null;
    }

    try {
      // LLMWrapper 构造函数只接受 service, model, apiKey, baseUrl 等基础配置
      // temperature 和 enableThinking 需要在调用时传递
      return new LLMWrapper({
        service: serviceProvider,
        apiKey,
        model: modelName,
        ...(serviceProvider === "custom" && baseUrl && { baseUrl }),
      });
    } catch (error) {
      console.error("Failed to create LLMWrapper:", error);
      return null;
    }
  };

  return Object.assign(app, {
    getLLM,
  });
}
