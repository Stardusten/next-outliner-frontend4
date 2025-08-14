import type { AttachmentStorage } from "./storage";
import { R2AttachmentStorage } from "./r2-browser";
import type { RepoConfig } from "@/lib/repo/schema";

export function getAttachmentStorage(
  config: RepoConfig
): AttachmentStorage | null {
  if (config.attachment.storageType === "oss") {
    return new R2AttachmentStorage({
      endpoint: config.attachment.endpoint,
      bucket: config.attachment.bucket,
      accessKeyId: config.attachment.accessKeyId,
      secretAccessKey: config.attachment.secretAccessKey,
    });
  }

  return null;
}
