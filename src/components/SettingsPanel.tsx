import { For, Show, createMemo, createSignal, createEffect } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextField, TextFieldInput } from "@/components/ui/text-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DialogContent as BaseDialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, AlertTriangle, CircleCheck } from "lucide-solid";
import { checkFontAvailability, COMMON_FONTS } from "@/lib/common/font-utils";
import { useSettings } from "@/composables/useSettings";
import { useRepoConfigs } from "@/composables/useRepoConfigs";
import type {
  SettingItem,
  ToggleSetting,
  SingleSelectSetting,
  MultiSelectSetting,
  InputSetting,
  NumberSetting,
  FontSetting,
  CustomSetting,
  SettingRenderContext,
} from "@/composables/useSettings";
import { useCurrRepoConfig } from "@/composables/useCurrRepoConfig";

export const SettingsPanel = () => {
  const {
    visible,
    setVisible,
    currentPage,
    setCurrentPage,
    currentPageConfig,
    sidebarSections,
    getSetting,
    saveSetting,
    resetSetting,
    evaluateCondition,
  } = useSettings();

  const currentRepo = useCurrRepoConfig();

  const renderContext = createMemo<SettingRenderContext>(() => ({
    config: currentRepo()!,
    getSetting,
    saveSetting,
    resetSetting,
  }));

  // 不在这里克隆/重建分组，避免导致组件重挂载引起输入框失焦
  // 仅在渲染时按条件过滤设置项

  const onOpenChange = (open: boolean) => {
    if (!open) setVisible(false);
  };

  return (
    <Dialog open={visible()} onOpenChange={onOpenChange}>
      <DialogContent class="flex flex-row gap-0 max-w-[90vw]! max-h-[80vh]! w-[800px] h-[600px] p-0 !outline-none overflow-hidden">
        <DialogHeader class="hidden">
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        {/* 左侧边栏 */}
        <div class="left w-[200px] bg-sidebar border-r border-sidebar-border p-2 pr-1 flex flex-col text-sidebar-foreground">
          <div class="text-sm text-muted-foreground font-semibold px-4 py-2">
            Settings
          </div>
          <div class="flex flex-col gap-1.5 px-1">
            <For each={sidebarSections}>
              {(section) => (
                <div>
                  <For each={section.items}>
                    {(item) => (
                      <Button
                        variant="ghost"
                        data-active={item.id === currentPage()}
                        class="w-full h-7 justify-start font-normal truncate text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground rounded-md my-[2px]"
                        onClick={() => setCurrentPage(item.id)}
                      >
                        {item.icon && (
                          <span class="w-4 h-4 mr-2 inline-flex items-center justify-center">
                            <item.icon />
                          </span>
                        )}
                        {item.label}
                      </Button>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div class="right w-0 flex flex-col items-center flex-grow pr-1">
          <div class="flex flex-col gap-y-6 w-full overflow-y-auto overflow-x-hidden px-4 py-8">
            <Show when={currentPage() === "about"}>
              <div class="flex py-5 items-center justify-center gap-4">
                <img src="/logo.png" alt="Next Outliner" class="w-16" />
                <div class="flex flex-col">
                  <h2 class="text-xl font-semibold">Next Outliner 3</h2>
                  <p class="text-muted-foreground">by Krisxin</p>
                </div>
              </div>
            </Show>

            <Show when={currentPageConfig() && currentRepo()}>
              <For each={currentPageConfig()!.groups}>
                {(group) => {
                  const cfg = currentRepo()!;
                  const hasVisible = group.settings.some((s) =>
                    evaluateCondition(s.condition, cfg)
                  );
                  return (
                    <Show when={hasVisible}>
                      <div class="flex flex-col gap-4">
                        <h3 class="text-lg font-semibold mb-2">
                          {group.title}
                        </h3>
                        <Show when={group.description}>
                          <p class="text-sm text-muted-foreground mt-[-.5em] mb-2 whitespace-pre-wrap">
                            {group.description}
                          </p>
                        </Show>

                        <For each={group.settings}>
                          {(setting) => (
                            <Show
                              when={evaluateCondition(setting.condition, cfg)}
                            >
                              <div class="flex flex-col">
                                <Show
                                  when={
                                    !(
                                      setting.type === "custom" &&
                                      (setting as any).noLabel
                                    )
                                  }
                                >
                                  <Label class="block mb-2">
                                    {setting.label}
                                  </Label>
                                </Show>
                                <Show when={setting.description}>
                                  <Label class="block text-[.8em] text-muted-foreground mb-2 whitespace-pre-wrap">
                                    {setting.description as any}
                                  </Label>
                                </Show>
                                <SettingItemView
                                  setting={setting}
                                  renderContext={renderContext()}
                                />
                              </div>
                            </Show>
                          )}
                        </For>
                      </div>
                    </Show>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---- Setting renderers ----

const SettingItemView = (props: {
  setting: SettingItem;
  renderContext: SettingRenderContext;
}) => {
  switch (props.setting.type) {
    case "toggle":
      return <SwitchComp setting={props.setting} />;
    case "single-select":
      return <SingleSelectComp setting={props.setting} />;
    case "multi-select":
      return <MultiSelectComp setting={props.setting} />;
    case "input":
      return <TextInputComp setting={props.setting} />;
    case "number":
      return <NumberInputComp setting={props.setting} />;
    case "font":
      return <FontSelectorComp setting={props.setting} />;
    case "custom":
      return (
        <CustomComp
          setting={props.setting}
          renderContext={props.renderContext}
        />
      );
    default:
      return null as any;
  }
};

const SwitchComp = (props: { setting: ToggleSetting }) => {
  const { getSetting, saveSetting } = useSettings();
  const val = () =>
    (getSetting(props.setting.settingPath) as boolean | undefined) ??
    props.setting.defaultValue;
  const onChange = (checked: boolean) =>
    saveSetting(props.setting.settingPath, checked);
  return (
    <Switch checked={!!val()} onChange={onChange}>
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
    </Switch>
  );
};

const SingleSelectComp = (props: { setting: SingleSelectSetting }) => {
  const { getSetting, saveSetting } = useSettings();
  const value = () =>
    (getSetting(props.setting.settingPath) as string | undefined) ??
    props.setting.defaultValue;
  const options = props.setting.options;
  const idToLabel = (id?: string) =>
    options.find((o) => o.id === id)?.label ?? "";
  return (
    <div>
      <Select
        value={value()}
        onChange={(v) => saveSetting(props.setting.settingPath, v as string)}
        options={options.map((o) => o.id)}
        multiple={false}
        itemComponent={(opt) => (
          <SelectItem item={opt.item}>
            {idToLabel(opt.item.rawValue as string)}
          </SelectItem>
        )}
        modal={true}
      >
        <SelectTrigger class="w-[240px]">
          <SelectValue<string>>
            {(state) => idToLabel(state.selectedOption() as string)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </div>
  );
};

const MultiSelectComp = (props: { setting: MultiSelectSetting }) => {
  const { getSetting, saveSetting } = useSettings();
  const value = () =>
    ((getSetting(props.setting.settingPath) as string[] | undefined) ??
      props.setting.defaultValue) as string[];
  const options = props.setting.options;
  const toggle = (id: string) => {
    const set = new Set(value());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    saveSetting(props.setting.settingPath, Array.from(set));
  };
  return (
    <div class="flex flex-wrap gap-1">
      <For each={options}>
        {(opt) => (
          <Button
            variant={value().includes(opt.id) ? "secondary" : "outline"}
            size="sm"
            class="h-7"
            onClick={() => toggle(opt.id)}
          >
            {opt.label}
          </Button>
        )}
      </For>
    </div>
  );
};

const TextInputComp = (props: { setting: InputSetting }) => {
  const { getSetting, saveSetting } = useSettings();
  const current = () =>
    (getSetting(props.setting.settingPath) as string | undefined) ??
    props.setting.defaultValue;
  const [localValue, setLocalValue] = createSignal<string>(current());
  createEffect(() => {
    // 外部值变化（如重置）时同步本地值
    setLocalValue(current());
  });
  const inputType = () => (props.setting.password ? "password" : "text");
  const onInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    setLocalValue(e.currentTarget.value);
  };
  const onBlur = () => {
    saveSetting(props.setting.settingPath, localValue());
  };
  return (
    <TextField class="w-[320px]">
      <TextFieldInput
        type={inputType()}
        value={localValue()}
        placeholder={props.setting.placeholder}
        onInput={onInput}
        onBlur={onBlur}
      />
    </TextField>
  );
};

const NumberInputComp = (props: { setting: NumberSetting }) => {
  const { getSetting, saveSetting } = useSettings();
  const current = () =>
    (getSetting(props.setting.settingPath) as number | undefined) ??
    props.setting.defaultValue;
  const [localValue, setLocalValue] = createSignal<string>(String(current()));
  createEffect(() => {
    setLocalValue(String(current()));
  });
  const onInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    setLocalValue(e.currentTarget.value);
  };
  const onBlur = () => {
    const v = localValue();
    if (v === "") {
      // 若允许空值则可选择不保存；此处保存空串
      saveSetting(props.setting.settingPath, "");
      return;
    }
    const n = Number(v);
    if (!Number.isNaN(n)) saveSetting(props.setting.settingPath, n);
  };
  return (
    <TextField class="w-[200px]">
      <TextFieldInput
        type="number"
        value={localValue()}
        min={props.setting.min}
        max={props.setting.max}
        step={props.setting.step}
        onInput={onInput}
        onBlur={onBlur}
      />
    </TextField>
  );
};

const FontSelectorComp = (props: { setting: FontSetting }) => {
  const { getSetting, saveSetting, resetSetting } = useSettings();
  const value = () =>
    (getSetting(props.setting.settingPath) as string | undefined) ??
    props.setting.defaultValue;

  const systemFonts = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Courier New",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Georgia",
    "Impact",
    "Palatino Linotype",
    "Century Gothic",
    "Gill Sans",
    "Lucida Sans Unicode",
    "Lucida Console",
    "Comic Sans MS",
    "Arial Black",
    "Garamond",
    "Franklin Gothic Medium",
    "Book Antiqua",
    "Calibri",
    "Cambria",
    "Candara",
    "Consolas",
    "Constantia",
    "Corbel",
    "Segoe UI",
    // Google Fonts 示例
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Source Sans Pro",
    "Poppins",
    "Raleway",
    "Merriweather",
    "Nunito",
    "Ubuntu",
    "Noto Sans",
    // 中文常见
    "Microsoft YaHei",
    "SimSun",
    "SimHei",
    "FangSong",
    "Source Han Sans",
    "Source Han Serif",
    // 特殊类
    "Monospace",
    "Cursive",
  ];
  const unique = Array.from(
    new Set([
      ...(props.setting.fontList ?? []),
      ...COMMON_FONTS,
      ...systemFonts,
    ])
  );
  const [fontNames, setFontNames] = createSignal<string[]>(unique);
  const availability = () => checkFontAvailability(fontNames());
  const [showAdd, setShowAdd] = createSignal(false);
  const [customFont, setCustomFont] = createSignal("");
  const [isAvailable, setIsAvailable] = createSignal(false);

  const openAddFontDialog = () => {
    setShowAdd(true);
    setCustomFont("");
    setIsAvailable(false);
  };
  const checkCustom = () => {
    const name = customFont();
    if (!name) return setIsAvailable(false);
    setIsAvailable(checkFontAvailability([name])[0]);
  };
  const addCustomFont = () => {
    const name = customFont();
    if (!name) return;
    if (!fontNames().includes(name)) setFontNames([...fontNames(), name]);
    saveSetting(props.setting.settingPath, name);
    setShowAdd(false);
  };

  return (
    <div class="flex items-center gap-2">
      <Select
        value={value()}
        onChange={(v) => saveSetting(props.setting.settingPath, v as string)}
        options={fontNames()}
        multiple={false}
        itemComponent={(opt) => (
          <SelectItem
            item={opt.item}
            style={{ "font-family": String(opt.item.rawValue) }}
          >
            <div class="flex items-center">
              <div>{String(opt.item.rawValue)}</div>
              <div class="text-muted-foreground ml-2">
                {availability()[fontNames().indexOf(String(opt.item.rawValue))]
                  ? ""
                  : "不可用"}
              </div>
            </div>
          </SelectItem>
        )}
        modal={true}
      >
        <SelectTrigger class="w-[240px]">
          <span
            class="text-muted-foreground"
            style={{ "font-family": value() || "inherit" }}
          >
            {value() || "未指定"}
          </span>
        </SelectTrigger>
        <SelectContent />
      </Select>

      <Tooltip>
        <TooltipTrigger
          as={(p: ButtonProps) => (
            <Button
              variant="ghost"
              size="xs-icon"
              {...p}
              onClick={openAddFontDialog}
            >
              <Plus class="size-4" />
            </Button>
          )}
        />
        <TooltipContent>添加自定义字体</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          as={(p: ButtonProps) => (
            <Button
              variant="ghost"
              size="xs-icon"
              {...p}
              onClick={() => resetSetting(props.setting.settingPath!)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="size-4"
              >
                <path
                  d="M21 12a9 9 0 1 1-3-6.7"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 3v6h-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </Button>
          )}
        />
        <TooltipContent>重置</TooltipContent>
      </Tooltip>

      <Dialog open={showAdd()} onOpenChange={(o) => setShowAdd(o)}>
        <BaseDialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加自定义字体</DialogTitle>
            <DialogDescription>输入您系统中已安装的字体名称</DialogDescription>
          </DialogHeader>
          <div>
            <div class="mt-2">
              <Show
                when={isAvailable()}
                fallback={
                  <div class="flex items-center gap-2 text-yellow-500 text-sm mb-3">
                    <AlertTriangle class="size-4" />
                    <span>字体未安装</span>
                  </div>
                }
              >
                <div class="flex items-center gap-2 text-green-500 text-sm mb-3">
                  <CircleCheck class="size-4" />
                  <span>字体已安装</span>
                </div>
              </Show>
              <Show when={customFont()}>
                <div
                  class="text-base mb-4 p-3 border rounded"
                  style={{ "font-family": customFont()! }}
                >
                  AbCdEfGh 中文字体 あいうえお ÀàÈèÙù
                </div>
              </Show>
            </div>

            <TextField>
              <TextFieldInput
                value={customFont()}
                placeholder="请输入字体名称"
                onInput={(e) => {
                  setCustomFont((e.currentTarget as HTMLInputElement).value);
                  checkCustom();
                }}
              />
            </TextField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              取消
            </Button>
            <Button onClick={addCustomFont} disabled={!customFont()}>
              确认
            </Button>
          </DialogFooter>
        </BaseDialogContent>
      </Dialog>
    </div>
  );
};

const CustomComp = (props: {
  setting: CustomSetting;
  renderContext: SettingRenderContext;
}) => {
  const render = props.setting.render;
  if (!render) return null as any;
  return render(props.renderContext);
};

export default SettingsPanel;
