import { createSignal } from "solid-js";
import type { App } from "@/lib/app/app";
import { showToast } from "@/components/ui/toast";
import { useI18n } from "@/composables/useI18n";

export type UploadOptions = {
  prefix?: string;
};

type ConfirmCallback = ((file: File, prefix: string) => Promise<void>) | null;

export const useAttachment = (app: App) => {
  const { t } = useI18n();
  // 确认对话框状态
  const [uploadConfirmVisible, setUploadConfirmVisible] = createSignal(false);
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [confirmCallback, setConfirmCallback] =
    createSignal<ConfirmCallback>(null);

  /**
   * 通过原生文件选择器获取文件
   */
  const getFileFromPopWindow = (
    accept: string = "*/*"
  ): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;

      input.onchange = (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        resolve(file || null);
      };

      // Safari 等环境不一定触发 oncancel，这里容错：超时 1 分钟依然未选择则返回 null
      let timeoutId: number | null = window.setTimeout(() => {
        timeoutId = null;
        resolve(null);
      }, 60_000);

      input.addEventListener("cancel", () => {
        if (timeoutId != null) window.clearTimeout(timeoutId);
        resolve(null);
      });

      input.click();
    });
  };

  /**
   * 上传文件
   * @param file 要上传的文件
   * @param needConfirm 是否需要确认弹窗
   */
  const upload = async (
    file: File,
    needConfirm: boolean = false,
    options: UploadOptions = {}
  ): Promise<void> => {
    if (needConfirm) {
      setSelectedFile(file);
      setConfirmCallback(() => async (confirmedFile: File, prefix: string) => {
        await performUpload(confirmedFile, {
          prefix: prefix || options.prefix,
        });
      });
      setUploadConfirmVisible(true);
      return;
    }

    await performUpload(file, options);
  };

  /**
   * 实际上传
   */
  const performUpload = async (file: File, options: UploadOptions = {}) => {
    try {
      const storage = app.attachmentStorage;
      if (!storage) {
        showToast({
          title: t("attachment.storageNotConfigured") as string,
          variant: "destructive",
        });
        return;
      }

      showToast({
        title: t("attachment.uploadingStart", { name: file.name }) as string,
        variant: "default",
      });

      const result = await storage.upload(file, {
        prefix: options.prefix || undefined,
      });

      showToast({
        title: t("attachment.uploadSuccess", {
          filename: result.filename,
        }) as string,
        variant: "success",
      });
      // 这里暂时只提示成功，不做额外处理（如插入到编辑器），后续可按需扩展
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : (t("common.unknownError") as string) ?? "未知错误";
      showToast({
        title: t("attachment.uploadFailed", { message }) as string,
        variant: "destructive",
      });
      // 不中断调用链
    }
  };

  /**
   * 确认上传
   */
  const handleConfirm = async (file: File, prefix: string) => {
    setUploadConfirmVisible(false);
    const cb = confirmCallback();
    if (cb) await cb(file, prefix);
    setConfirmCallback(null);
    setSelectedFile(null);
  };

  /**
   * 取消上传
   */
  const handleCancel = () => {
    setUploadConfirmVisible(false);
    setSelectedFile(null);
    setConfirmCallback(null);
  };

  return {
    // 状态
    uploadConfirmVisible,
    selectedFile,

    // 方法
    getFileFromPopWindow,
    upload,
    handleConfirm,
    handleCancel,
  } as const;
};
