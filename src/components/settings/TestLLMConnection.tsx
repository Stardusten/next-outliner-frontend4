import { createSignal, Show, createMemo } from "solid-js";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-solid";
import type { SettingRenderContext } from "@/composables/useSettings";
import { useI18n } from "@/composables/useI18n";
import { LLMWrapper } from "@/lib/llm";
import type { ServiceName } from "@/lib/llm/types";

export default function TestLLMConnection(props: {
  context: SettingRenderContext;
}) {
  const { t } = useI18n();
  const [testing, setTesting] = createSignal(false);
  const [testResult, setTestResult] = createSignal<{
    success: boolean;
    message: string;
    messageKey?: string;
    params?: Record<string, any>;
  } | null>(null);

  // 根据不同的服务提供商，确定需要的配置
  const getLLMConfig = () => {
    const { getSetting } = props.context;
    const provider = getSetting("llm.serviceProvider") as ServiceName;
    const apiKey = getSetting("llm.apiKey") as string;
    const modelName = getSetting("llm.modelName") as string;

    const config: any = {
      service: provider,
      model: modelName || "default", // 提供默认值，verifyConnection 不一定需要有效的模型名
      apiKey: apiKey,
    };

    // 自定义服务需要 baseUrl
    if (provider === "custom") {
      const baseUrl = getSetting("llm.baseUrl") as string;
      if (baseUrl) {
        config.baseUrl = baseUrl;
      }
    } else if (provider === "ollama") {
      // Ollama 默认本地服务
      config.baseUrl = getSetting("llm.baseUrl") || "http://localhost:11434";
    }

    return config;
  };

  // 检查必填字段
  const checkRequiredFields = () => {
    const { getSetting } = props.context;
    const provider = getSetting("llm.serviceProvider") as ServiceName;
    const requiredFields: Array<{
      path: any;
      label: string;
      condition?: boolean;
    }> = [];

    // 根据不同的服务提供商，确定必需字段
    if (provider === "custom") {
      requiredFields.push({
        path: "llm.baseUrl",
        label: t("llmTest.baseUrl") as string,
        condition: true,
      });
    }

    // 大多数服务都需要 API Key（除了 Ollama）
    if (provider !== "ollama") {
      requiredFields.push({
        path: "llm.apiKey",
        label: t("llmTest.apiKey") as string,
        condition: true,
      });
    }

    const missing = requiredFields
      .filter((f) => f.condition !== false)
      .filter((f) => !getSetting(f.path));

    return missing;
  };

  const testConnection = async () => {
    const missing = checkRequiredFields();
    if (missing.length > 0) {
      setTestResult({
        success: false,
        message: `${t("llmTest.fillFirst")} ${missing
          .map((f) => f.label)
          .join(", ")}`,
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const config = getLLMConfig();

      // 创建 LLM 实例并验证连接
      const llm = new LLMWrapper(config);
      const isConnected = await llm.verifyConnection();

      if (isConnected) {
        // 如果需要，可以进一步获取模型列表
        try {
          const models = await llm.getModels();
          if (models.length > 0) {
            setTestResult({
              success: true,
              messageKey: "llmTest.connectionSuccessful",
              message: t("llmTest.connectionSuccessful", {
                count: models.length,
              }) as string,
              params: { count: models.length },
            });
          } else {
            // 连接成功但没有找到模型
            setTestResult({
              success: true,
              messageKey: "llmTest.connectionSuccessfulNoModel",
              message: t("llmTest.connectionSuccessfulNoModel") as string,
            });
          }
        } catch {
          // 即使获取模型列表失败，连接本身可能是成功的
          setTestResult({
            success: true,
            messageKey: "llmTest.connectionSuccessfulNoModel",
            message: t("llmTest.connectionSuccessfulNoModel") as string,
          });
        }
      } else {
        throw new Error("Connection verification failed");
      }
    } catch (error: any) {
      console.error("LLM connection test failed:", error);

      // 分析错误类型并提供有用的反馈
      let errorMessage = t("llmTest.testFailed") as string;
      let messageKey = "llmTest.testFailed";

      if (
        error?.message?.includes("401") ||
        error?.message?.includes("Unauthorized")
      ) {
        errorMessage = t("llmTest.invalidApiKey") as string;
        messageKey = "llmTest.invalidApiKey";
      } else if (error?.message?.includes("404")) {
        errorMessage = t("llmTest.modelNotFound") as string;
        messageKey = "llmTest.modelNotFound";
      } else if (
        error?.message?.includes("Failed to fetch") ||
        error?.message?.includes("NetworkError")
      ) {
        errorMessage = t("llmTest.networkError") as string;
        messageKey = "llmTest.networkError";
      } else if (error?.message?.includes("429")) {
        errorMessage = t("llmTest.rateLimitExceeded") as string;
        messageKey = "llmTest.rateLimitExceeded";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setTestResult({
        success: false,
        messageKey: messageKey,
        message: errorMessage,
      });
    } finally {
      setTesting(false);
    }
  };

  const messageText = () => {
    const r = testResult();
    if (!r) return "";
    if (r.messageKey)
      return (t(r.messageKey as any, r.params) as string) ?? r.message;
    return r.message;
  };

  // 判断是否可以测试
  const canTest = createMemo(() => {
    const { getSetting } = props.context;
    const provider = getSetting("llm.serviceProvider");
    return provider && provider !== "";
  });

  return (
    <div class="flex items-center gap-3">
      <Button
        variant="outline"
        class="w-[120px]"
        disabled={testing() || !canTest()}
        onClick={testConnection}
      >
        {t("llmTest.testConnection")}
      </Button>

      <div class="flex items-center gap-2 text-sm">
        <Show when={testing()}>
          <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
          <span class="text-muted-foreground">{t("llmTest.testing")}</span>
        </Show>
        <Show when={!testing() && testResult()}>
          <Show
            when={testResult()!.success}
            fallback={<X class="w-4 h-4 text-red-500" />}
          >
            <Check class="w-4 h-4 text-green-500" />
          </Show>
          <span
            class={testResult()!.success ? "text-green-600" : "text-red-600"}
          >
            {messageText()}
          </span>
        </Show>
        <Show when={!testing() && !testResult() && !canTest()}>
          <span class="text-muted-foreground">
            {t("llmTest.selectProviderFirst")}
          </span>
        </Show>
      </div>
    </div>
  );
}
