import z from "zod";

// 持久化设置 schema - 简化为只有 local-storage
const persistenceSchema = z.object({
  type: z.literal("local-storage").default("local-storage"),
  params: z.object({}).default({}),
});

// UI 设置 schema
const uiSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("light"),
  fontSize: z.number().min(12).max(24).default(16),
  fontFamily: z.string().default("Inter"),
  scale: z.number().min(50).max(200).default(100),
});

// 编辑器设置 schema
const editorSchema = z.object({
  lineSpacing: z.enum(["compact", "normal", "loose"]).default("normal"),
  fontSize: z.number().min(12).max(24).default(16),
  fontFamily: z.string().default("Inter"),
  monospaceFontSize: z.number().min(12).default(16),
  monospaceFontFamily: z.string().default("Inter"),

  // 附件默认显示模式
  imageFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("preview"),
  videoFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("preview"),
  audioFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("preview"),
  textFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("expanded"),
  archiveFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("expanded"),
  unknownFileDefaultDisplayMode: z
    .enum(["inline", "expanded", "preview"])
    .default("expanded"),
  incrementalUpdate: z.boolean().default(false),
});

// 附件存储设置 schema - 标准化
const attachmentSchema = z.object({
  storageType: z.enum(["none", "oss"]).default("none"),
  endpoint: z.string().default(""),
  bucket: z.string().default(""),
  accessKeyId: z.string().default(""),
  secretAccessKey: z.string().default(""),
});

// LLM 设置 schema
const llmSchema = z.object({
  serviceProvider: z.string().default("openai"),
  baseUrl: z.string().default(""),
  apiKey: z.string().default(""),
  modelName: z.string().default(""),
  temperature: z.number().min(0).max(2).default(1),
  enableThinking: z.boolean().default(true),
});

export const repoConfigSchema = z.object({
  id: z.string().min(1).default(""),
  title: z.string().min(1).default(""),
  persistence: persistenceSchema.default(persistenceSchema.parse({})),
  ui: uiSchema.default(uiSchema.parse({})),
  editor: editorSchema.default(editorSchema.parse({})),
  attachment: attachmentSchema.default(attachmentSchema.parse({})),
  llm: llmSchema.default(llmSchema.parse({})),
});

export type RepoConfig = z.infer<typeof repoConfigSchema>;
export type RepoUISettings = z.infer<typeof uiSchema>;
export type RepoEditorSettings = z.infer<typeof editorSchema>;
export type RepoAttachmentSettings = z.infer<typeof attachmentSchema>;
export type RepoLLMSettings = z.infer<typeof llmSchema>;
