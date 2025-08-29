import type { BlockId } from "@/lib/common/types/block";
import type { FieldSchema } from "@/lib/common/types/block-field";

export function parseInheritsInput(
  input: string
): { ok: true; ids: BlockId[] } | { ok: false } {
  if (input.trim() === "") return { ok: true, ids: [] };
  const reg = /^\d+@\d+(,\d+@\d+)*$/;
  if (!reg.test(input)) return { ok: false };
  const ids = input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s as BlockId);
  return { ok: true, ids };
}

export function validateBlockIdsExist(
  ids: BlockId[],
  getNode: (id: BlockId) => any
): { ok: true } | { ok: false; missing: BlockId } {
  for (const id of ids) {
    if (!getNode(id)) return { ok: false, missing: id };
  }
  return { ok: true };
}

export function cloneTagFields(src: FieldSchema[]): FieldSchema[] {
  return src.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type as any,
    optional: (f as any).optional,
    optionsMode: (f as any).optionsMode,
    options: Array.isArray((f as any).options)
      ? ([...(f as any).options] as string[])
      : undefined,
    fromTag: (f as any).fromTag,
  })) as FieldSchema[];
}
