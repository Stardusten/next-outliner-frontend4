import { getSchema } from "@tiptap/core";
import { markExtensions } from "./marks";
import { nodeExtensions } from "./nodes";

export const schemaExts = [...nodeExtensions, ...markExtensions];
export const detachedSchema = getSchema(schemaExts);
