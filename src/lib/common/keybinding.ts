import { base, keyName } from "w3c-keyname";

const mac =
  typeof navigator != "undefined"
    ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    : false;

function normalizeKeyName(name: string) {
  // eslint-disable-next-line prefer-const
  let parts = name.split(/-(?!$)/),
    result = parts[parts.length - 1];
  if (result == "Space") result = " ";
  let alt, ctrl, shift, meta;
  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i]!;
    if (/^(cmd|meta|m)$/i.test(mod)) meta = true;
    else if (/^a(lt)?$/i.test(mod)) alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;
    else if (/^s(hift)?$/i.test(mod)) shift = true;
    else if (/^mod$/i.test(mod)) {
      if (mac) meta = true;
      else ctrl = true;
    } else throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt) result = "Alt-" + result;
  if (ctrl) result = "Ctrl-" + result;
  if (meta) result = "Meta-" + result;
  if (shift) result = "Shift-" + result;
  return result;
}

export type KeyBinding<Params extends Array<any> = [KeyboardEvent]> = {
  run?: (...params: Params) => boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
};

function normalize<Params extends Array<any> = [KeyboardEvent]>(map: {
  [key: string]: KeyBinding<Params>;
}) {
  const copy: { [key: string]: KeyBinding<Params> } = Object.create(null);
  for (const prop in map) {
    const normalizedProp = normalizeKeyName(prop);
    if (normalizedProp) copy[normalizedProp] = map[prop]!;
  }
  return copy;
}

function modifiers(name: string, event: KeyboardEvent, shift = true) {
  if (event.altKey) name = "Alt-" + name;
  if (event.ctrlKey) name = "Ctrl-" + name;
  if (event.metaKey) name = "Meta-" + name;
  if (shift && event.shiftKey) name = "Shift-" + name;
  return name;
}

export function createKeydownHandler<
  HandlerParams extends Array<any> = [KeyboardEvent],
  KeyBindingParams extends Array<any> = [KeyboardEvent]
>(
  bindings: { [key: string]: KeyBinding<KeyBindingParams> },
  paramsGenerator: (...params: HandlerParams) => KeyBindingParams,
  keyboardEventGetter: (...params: HandlerParams) => KeyboardEvent
): (...params: HandlerParams) => boolean {
  const map = normalize(bindings);
  return function (...params: HandlerParams) {
    // 生成 keyBinding 的参数
    const keyBindingParams = paramsGenerator(...params);
    const event = keyboardEventGetter(...params);
    let baseName;
    const name = keyName(event),
      direct = map[modifiers(name, event)];
    if (direct && direct.run?.(...keyBindingParams)) {
      direct.stopPropagation && event.stopPropagation();
      direct.preventDefault && event.preventDefault();
      return true;
    }
    // A character key
    if (name.length == 1 && name != " ") {
      if (event.shiftKey) {
        // In case the name was already modified by shift, try looking
        // it up without its shift modifier
        const noShift = map[modifiers(name, event, false)];
        if (noShift && noShift.run?.(...keyBindingParams)) {
          noShift.stopPropagation && event.stopPropagation();
          noShift.preventDefault && event.preventDefault();
          return true;
        }
      }
      if (
        (event.shiftKey ||
          event.altKey ||
          event.metaKey ||
          name.charCodeAt(0) > 127) &&
        (baseName = base[event.keyCode]) &&
        baseName != name
      ) {
        // Try falling back to the keyCode when there's a modifier
        // active or the character produced isn't ASCII, and our table
        // produces a different name from the the keyCode. See #668,
        // #1060
        const fromCode = map[modifiers(baseName, event)];
        if (fromCode && fromCode.run?.(...keyBindingParams)) {
          fromCode.stopPropagation && event.stopPropagation();
          fromCode.preventDefault && event.preventDefault();
          return true;
        }
      }
    }
    const wildcard = bindings["*"];
    if (wildcard && wildcard.run?.(...keyBindingParams)) {
      wildcard.stopPropagation && event.stopPropagation();
      wildcard.preventDefault && event.preventDefault();
      return true;
    }
    return false;
  };
}

export function createSimpleKeydownHandler(
  binding: Record<string, KeyBinding>
) {
  return createKeydownHandler(
    binding,
    (event) => [event] as const,
    (event) => event
  );
}
