import { createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { nanoid } from "nanoid";
import { useRepoConfigs } from "./useRepoConfigs";
import { repoConfigSchema, type RepoConfig } from "@/lib/repo/schema";

type WizardValues = {
  id: string;
  title: string;
  persistence: { type: RepoConfig["persistence"]["type"] };
  attachment: {
    storageType: RepoConfig["attachment"]["storageType"];
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
};

type WizardErrors = {
  id?: string;
  title?: string;
};

function setByPath<T extends object>(
  setter: (v: Partial<T>) => void,
  path: string,
  value: unknown
) {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  const update: any = {};
  let cursor: any = update;
  for (const key of keys) {
    cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[lastKey] = value;
  setter(update);
}

export const useRepoWizard = () => {
  const totalSteps = 3;
  const [currentStep, setCurrentStep] = createSignal(1);
  const repoConfigs = useRepoConfigs();

  const [values, setValues] = createStore<WizardValues>({
    id: "",
    title: "",
    persistence: { type: "local-storage" },
    attachment: {
      storageType: "none",
      endpoint: "",
      bucket: "",
      accessKeyId: "",
      secretAccessKey: "",
    },
  });

  const [errors, setErrors] = createStore<WizardErrors>({});

  const validateTitle = (title: string): string | undefined => {
    if (!title || title.trim().length === 0) return "名称不能为空";
    const exists = repoConfigs
      .configs()
      .some((c) => (c.title || "").trim() === title.trim());
    if (exists) return "名称已存在";
    return undefined;
  };

  const validateId = (id: string): string | undefined => {
    if (!id || id.trim().length === 0) return "ID 不能为空";
    return undefined;
  };

  const validateField = (name: keyof WizardErrors) => {
    if (name === "title") setErrors("title", validateTitle(values.title));
    if (name === "id") setErrors("id", validateId(values.id));
  };

  const validate = (): boolean => {
    setErrors({
      title: validateTitle(values.title),
      id: validateId(values.id),
    });
    return !errors.title && !errors.id;
  };

  const canProceedToNext = createMemo(() => {
    switch (currentStep()) {
      case 1:
        return !validateTitle(values.title) && !validateId(values.id);
      case 2:
        return values.persistence.type === "local-storage";
      case 3:
        return !!values.attachment.storageType;
      default:
        return false;
    }
  });

  const canFinish = createMemo(() => {
    // 基于最小必填字段判断
    return (
      !validateTitle(values.title) &&
      !validateId(values.id) &&
      values.persistence.type === "local-storage" &&
      !!values.attachment.storageType
    );
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setValues({
      id: nanoid(),
      title: "",
      persistence: { type: "local-storage" },
      attachment: {
        storageType: "none",
        endpoint: "",
        bucket: "",
        accessKeyId: "",
        secretAccessKey: "",
      },
    });
    setErrors({});
  };

  const nextStep = () => {
    if (canProceedToNext() && currentStep() < totalSteps) {
      setCurrentStep(currentStep() + 1);
    }
  };

  const previousStep = () => {
    if (currentStep() > 1) setCurrentStep(currentStep() - 1);
  };

  const setFieldValue = (path: string, value: unknown) => {
    const keys = path.split(".");
    (setValues as unknown as (...args: any[]) => void)(...keys, value);
  };

  const submit = () => {
    if (!validate()) return;
    // 使用 schema 生成带默认值的完整配置
    const config = repoConfigSchema.parse({
      id: values.id,
      title: values.title,
      persistence: { type: values.persistence.type, params: {} },
      attachment: { ...values.attachment },
    });
    repoConfigs.addConfig(config);
  };

  return {
    // 状态
    currentStep,
    totalSteps,
    form: {
      values,
      errors,
      setFieldValue,
      validate,
      validateField,
    },

    // 计算属性
    canProceedToNext,
    canFinish,

    // 方法
    resetWizard,
    nextStep,
    previousStep,
    handleSubmit: submit,
  } as const;
};
