import { createSignal, Signal } from "solid-js";

export function useLocalStorage<T>(key: string, defaultValue: T): Signal<T> {
  const initialValue = localStorage.getItem(key)
    ? (JSON.parse(localStorage.getItem(key)) as T)
    : defaultValue;

  const [value, setValue] = createSignal<T>(initialValue);

  const setValueAndStore = ((arg) => {
    const v = setValue(arg);
    localStorage.setItem(key, JSON.stringify(v));
    return v;
  }) as typeof setValue;

  return [value, setValueAndStore];
}
