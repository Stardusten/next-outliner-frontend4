import type { JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core";
import * as SwitchPrimitive from "@kobalte/core/switch";

import { cn } from "@/lib/common/utils/tailwindcss";

const Switch = SwitchPrimitive.Root;
const SwitchDescription = SwitchPrimitive.Description;
const SwitchErrorMessage = SwitchPrimitive.ErrorMessage;

type SwitchControlProps = SwitchPrimitive.SwitchControlProps & {
  class?: string | undefined;
  children?: JSX.Element;
};

const SwitchControl = <T extends ValidComponent = "input">(
  props: PolymorphicProps<T, SwitchControlProps>
) => {
  const [local, others] = splitProps(props as SwitchControlProps, [
    "class",
    "children",
  ]);
  return (
    <>
      <SwitchPrimitive.Input
        class={cn(
          "[&:focus-visible+div]:outline-none [&:focus-visible+div]:ring-2 [&:focus-visible+div]:ring-ring [&:focus-visible+div]:ring-offset-2 [&:focus-visible+div]:ring-offset-background",
          local.class
        )}
      />
      <SwitchPrimitive.Control
        class={cn(
          // 对齐 Vue 版本的尺寸与样式
          // h-[1.15rem] ≈ 18.4px, w-8 = 32px
          "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none",
          // 未选中默认背景；选中时主色
          "bg-input data-[checked]:bg-primary",
          // 禁用态
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          local.class
        )}
        {...others}
      >
        {local.children}
      </SwitchPrimitive.Control>
    </>
  );
};

type SwitchThumbProps = SwitchPrimitive.SwitchThumbProps & {
  class?: string | undefined;
};

const SwitchThumb = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SwitchThumbProps>
) => {
  const [local, others] = splitProps(props as SwitchThumbProps, ["class"]);
  return (
    <SwitchPrimitive.Thumb
      class={cn(
        // 基础尺寸与背景
        "pointer-events-none block size-4 rounded-full bg-background ring-0 shadow-lg transition-transform",
        // 位置：未选中在起点，选中时移动到最右，留 2px 间距
        "translate-x-0 data-[checked]:translate-x-[calc(100%-2px)]",
        local.class
      )}
      {...others}
    />
  );
};

type SwitchLabelProps = SwitchPrimitive.SwitchLabelProps & {
  class?: string | undefined;
};

const SwitchLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, SwitchLabelProps>
) => {
  const [local, others] = splitProps(props as SwitchLabelProps, ["class"]);
  return (
    <SwitchPrimitive.Label
      class={cn(
        "text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70",
        local.class
      )}
      {...others}
    />
  );
};

export {
  Switch,
  SwitchControl,
  SwitchThumb,
  SwitchLabel,
  SwitchDescription,
  SwitchErrorMessage,
};
