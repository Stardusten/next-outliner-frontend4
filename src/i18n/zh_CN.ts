const zh_CN = {
  common: {
    cancel: "取消",
    delete: "删除",
  },
  deleteConfirmDialog: {
    title: "确认删除",
    description:
      "确定要删除知识库配置 “{{title}}” 吗？\n此操作不可恢复，但不会删除实际的数据文件。",
  },
  importConfirmDialog: {
    title: "导入确认",
    description: "检测到 {{count}} 个块，是否确定导入？",
    confirm: "确认导入",
  },
  clearStorageConfirmDialog: {
    title: "确认清空存储",
    description: "此操作将永久删除所有块数据，无法恢复。",
    warning: "请谨慎操作，建议在清空前先导出数据备份。",
    confirm: "确认清空",
  },
  repoConfig: {
    titleCannotBeEmpty: "知识库标题不能为空",
    idCannotBeEmpty: "知识库 ID 不能为空",
    attachment: {
      r2: {
        endpointCannotBeEmpty: "R2 存储服务地址不能为空",
        bucketCannotBeEmpty: "R2 存储桶名不能为空",
        accessKeyIdCannotBeEmpty: "R2 存储 Access Key ID 不能为空",
        secretAccessKeyCannotBeEmpty: "R2 存储 Secret Access Key 不能为空",
      },
      invalidAttachmentStorageType: "无效的附件存储方式",
    },
    persistence: {
      invalidPersistenceType: "无效的块存储方式",
    },
  },
  codeblock: {
    copyCode: "复制代码块",
    copied: "代码块已复制到剪贴板",
  },
  blockContextMenu: {
    delete: "删除块",
    copyBlockRef: "复制块引用",
    copyAs: "复制为...",
    copyAsMarkdown: "Markdown",
    copyAsPureText: "纯文本",
    copyAsHtml: "HTML",
    copiedMarkdownToClipboard: "Markdown 已复制到剪贴板",
    pasteAs: "粘贴为...",
    pasteAsMarkdownSingleBlock: "Markdown（单个块）",
    pasteAsMarkdownAutoSplit: "Markdown（自动拆分块）",
    pasteAsPureTextSingleBlock: "纯文本（单个块）",
    pasteAsPureTextAutoSplit: "纯文本（自动拆分块）",
    moveBlock: "移动块",
    cutBlock: "剪切块",
    convertTo: "转换为...",
    convertToTag: "标签块",
    convertToSearch: "搜索块",
  },
  blockRefContextMenu: {
    editAlias: "编辑别名",
    copyBlockRefId: "复制被引用块 ID",
    copyBlockRefIdSuccess: "被引用块 ID 成功复制到剪贴板",
  },
  repoNotFound: "糟糕！没有找到 ID 为 “{{id}}” 的知识库",
  backToSwitchRepo: "返回知识库列表",
  repoList: {
    noRepo: "暂无知识库",
    clickToAddRepo: "点击下方按钮添加一个知识库",
    openRepo: "打开知识库",
    deleteRepo: "删除知识库",
  },
  listItem: {
    editSearchQuery: "编辑查询表达式",
    editViewOptions: "视图选项",
    invalidQuery: "无效的查询表达式",
    nResults: "{{n}} 条结果",
    inRefsTagsTooltip: "{{n}} 个反链",
    refreshSearch: "重新搜索",
    bulletTooltip: "右键打开块菜单",
  },
  repoWizard: {
    repoTitleAlreadyUsed: "存在已打开的同名知识库",
    addRepo: "添加知识库",
    stepProgressPrefix: "第 ",
    stepProgressSuffix: " 步",
    prevStep: "上一步",
    cancel: "取消",
    nextStep: "下一步",
    complete: "完成",
    importFromJson: "从 JSON 导入",
    steps: {
      1: "设置知识库基本信息",
      2: "设置块存储方式",
      3: "设置附件存储方式",
    },
    basicInfo: {
      nameLabel: "知识库名称",
      namePlaceholder: "例如：我的笔记本",
      idLabel: "知识库 ID",
      idHint:
        "知识库 ID 是知识库的唯一标识。如果希望创建新知识库，你可以保持自动生成的 ID 不变。但如果你希望使用块存储中已经存在的知识库，请正确输入其 ID。",
    },
    persistence: {
      placeholder: "选择持久化方式",
      ariaLabel: "持久化方式",
      type: {
        "local-storage": "本地存储",
      },
      existStatus: {
        valid: "本地存储中已存在 ID 为 {{id}} 的文档，可直接打开",
        notFound: "未在本地存储中发现 ID 为 {{id}} 的文档，将创建新文档",
        corrupted: "发现异常数据，建议更换 ID 或清理后再试",
      },
    },
    idDesc:
      "知识库 ID 是知识库的唯一标识。如果希望创建新知识库，你可以保持自动生成的 ID 不变。但如果你希望使用块存储中已经存在的知识库，请正确输入其 ID。",
    existStatus: {
      valid: "检测到 {{persistenceType}} 中已经存在 ID 为 {{id}} 的知识库",
      notFound:
        "{{persistenceType}} 中不存在 ID 为 {{id}} 的知识库，将创建一个新的知识库",
      corrupted:
        "{{persistenceType}} 中存在 ID 为 {{id}} 的知识库，但数据损坏，将创建一个新的知识库",
    },
    attachment: {
      placeholder: "选择附件存储方式",
      ariaLabel: "附件存储",
      storageType: {
        none: "不使用",
        oss: "对象存储",
      },
      ossConfigTitle: "对象存储配置",
      fields: {
        endpoint: {
          label: "Endpoint",
          placeholder: "对象存储 Endpoint URL",
        },
        bucket: {
          label: "Bucket",
          placeholder: "Bucket 名称",
        },
        accessKeyId: {
          label: "Access Key ID",
          placeholder: "Access Key ID",
        },
        secretAccessKey: {
          label: "Secret Access Key",
          placeholder: "Secret Access Key",
        },
      },
    },
  },
  appHeader: {
    more: "更多",
  },
  commands: {
    convertToTagBlock: {
      alreadyTagBlock: "已经是标签块",
      onlyTextBlockCanBeTagBlock: "只有文本块可以转换为标签块",
      tagBlockCannotHaveChildren: "标签块不能有子块",
    },
  },
  settings: {
    sidebar: {
      appearance: "外观",
      editor: "编辑器",
      repo: "知识库",
      ai: "AI",
      about: "软件信息",
    },
    common: {
      theme: "颜色主题",
      themeOptions: {
        light: "明亮",
        dark: "黑暗",
        system: "跟随系统",
      },
      lineSpacing: "行间距",
      lineSpacingOptions: {
        compact: "紧凑",
        normal: "正常",
        loose: "宽松",
      },
    },
    repo: {
      basicInfo: {
        repoName: "知识库名称",
        repoId: "知识库 ID",
        exportAsJson: "导出知识库配置",
        switchRepo: "切换知识库",
      },
    },
  },
  moremenu: {
    theme: "主题",
    lineSpace: "行间距",
  },
  tag: {
    settings: "设置",
    close: "关闭",
    colorLabel: "颜色",
    colorDesc: "选择标签的颜色，仅用于展示",
    inheritsLabel: "继承块",
    inheritsDesc: "输入要继承的块 ID，使用逗号分隔。例如：1@1,2@3,4@5",
    inheritsPlaceholder: "例如：1@1,2@3",
    invalidFormat: "格式不正确，示例：{{example}}",
    blockNotExists: "块不存在：{{id}}",
    discard: "放弃修改",
    save: "保存",
    fieldsLabel: "字段设置",
    fieldsDesc: "为该标签定义自定义字段",
    addField: "添加字段",
    noFieldPlaceholder: "暂无字段，请先添加",
    fieldLabel: "字段名",
    fieldLabelPlaceholder: "请输入字段名",
    fieldType: "类型",
    fieldOptional: "可选",
    selectPlaceholder: "请选择",
    type: {
      text: "文本",
      single: "单选",
      multiple: "多选",
      date: "日期",
      number: "数字",
      checkbox: "复选",
    },
    optionsSource: "选项来源",
    optionsSourceManual: "手动维护",
    optionsSourceFromTag: "从标签聚合",
    optionsFromTagLabel: "来源标签",
    optionsFromTagPlaceholder: "请输入来源标签名",
    addOptionPlaceholder: "输入新选项",
    addOption: "添加选项",
    customColor: "自定义颜色",
  },
  search: {
    tooltip: "搜索",
    showPreview: "显示预览",
    editSearchOptions: "编辑搜索选项",
    noMatch: "未找到匹配结果",
    noMatchDescription: "输入关键字开始搜索",
  },
  menu: {
    undo: "撤销",
    redo: "重做",
    history: "历史版本",
    saveAsTemplate: "保存为模板",
    export: "导出",
    import: "导入",
    print: "打印",
    tutorial: "使用教程",
    shortcuts: "快捷键列表",
    settings: "设置",
    clearHistory: "清空历史版本",
    clearBlockStorage: "清空块存储",
  },
  menuShortcuts: {
    undo: "Cmd + Z",
    redo: "Shift + Cmd + Z",
    print: "Cmd + P",
    shortcuts: "Cmd + /",
    settings: "Cmd + ,",
  },
};

export type Dict = typeof zh_CN;
export default zh_CN;
