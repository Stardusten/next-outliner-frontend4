import { Dict } from "@/i18n/zh_CN";
import { createResource, createSignal } from "solid-js";
import * as i18n from "@solid-primitives/i18n";

export type Locale = "zh_CN";
export type FlattenDict = i18n.Flatten<Dict>;

async function fetchDict(locale: Locale): Promise<FlattenDict> {
  const dict = (await import(`@/i18n/${locale}.ts`)) as any;
  return i18n.flatten(dict.default as Dict);
}

const [locale, setLocale] = createSignal<Locale>("zh_CN");
const [dict] = createResource(locale, fetchDict);
const t = i18n.translator(dict, i18n.resolveTemplate);

export const useI18n = () => {
  return {
    locale,
    setLocale,
    dict,
    t,
  };
};
