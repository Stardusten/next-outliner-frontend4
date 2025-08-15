import { createSignal, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X } from "lucide-solid";
import { R2AttachmentStorage } from "@/lib/app/attachment/r2-browser";
import type { SettingRenderContext } from "@/composables/useSettings";
import { useI18n } from "@/composables/useI18n";

export default function TestOssConnection(props: {
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

  const testConnection = async () => {
    const { getSetting } = props.context;

    const requiredFields = [
      {
        path: "attachment.endpoint" as const,
        label: t("ossTest.endpoint") as string,
      },
      {
        path: "attachment.accessKeyId" as const,
        label: t("ossTest.accessKey") as string,
      },
      {
        path: "attachment.secretAccessKey" as const,
        label: t("ossTest.secretKey") as string,
      },
      {
        path: "attachment.bucket" as const,
        label: t("ossTest.bucket") as string,
      },
    ];

    const missing = requiredFields.filter((f) => !getSetting(f.path));
    if (missing.length > 0) {
      setTestResult({
        success: false,
        message: `${t("ossTest.fillFirst")} ${missing
          .map((f) => f.label)
          .join(", ")}`,
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const cfg = {
        endpoint: getSetting("attachment.endpoint") as string,
        bucket: getSetting("attachment.bucket") as string,
        accessKeyId: getSetting("attachment.accessKeyId") as string,
        secretAccessKey: getSetting("attachment.secretAccessKey") as string,
      };
      const result = await R2AttachmentStorage.test_conn(cfg);
      setTestResult(result);
    } catch (e) {
      setTestResult({
        success: false,
        message: t("ossTest.testFailed") as string,
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

  return (
    <div class="flex items-center gap-3">
      <Button
        variant="outline"
        class="w-[120px]"
        disabled={testing()}
        onClick={testConnection}
      >
        {t("ossTest.testConnection")}
      </Button>

      <div class="flex items-center gap-2 text-sm">
        <Show when={testing()}>
          <Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
          <span class="text-muted-foreground">{t("ossTest.testing")}</span>
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
      </div>
    </div>
  );
}
