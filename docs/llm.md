# LLM 库架构与使用指南

## 目录
- [架构概览](#架构概览)
- [核心类说明](#核心类说明)
- [使用方式](#使用方式)
- [支持的服务](#支持的服务)
- [高级功能](#高级功能)
- [注意事项](#注意事项)

## 架构概览

### 类层次结构

```
LLMWrapper (统一入口/工厂类) - index.ts
    ↓
LLM (抽象基类) - llm.ts
    ├── OpenAI - openai.ts
    ├── Anthropic - anthropic.ts  
    ├── Google - google.ts
    ├── Ollama - ollama.ts
    ├── xAI - xai.ts
    ├── Groq - groq.ts
    ├── DeepSeek - deepseek.ts
    └── APIv1 (通用兼容层) - api-v1.ts
```

### 核心文件说明

- **`index.ts`** - 导出 LLMWrapper，提供统一的入口点
- **`llm.ts`** - LLM 基类，定义核心功能和接口
- **`api-v1.ts`** - OpenAI API v1 兼容的通用实现
- **`types.ts`** - TypeScript 类型定义
- **`model-usage.ts`** - 模型使用信息和定价
- **`parsers.ts`** - 响应解析器
- **`attachment.ts`** - 附件处理
- **`utils.ts`** - 工具函数

## 核心类说明

### LLM 基类
所有 LLM 服务的抽象基类，提供：
- 消息管理 (`messages`, `user()`, `assistant()`, `system()`)
- API 请求 (`send()`, `chat()`)
- 响应解析 (`parseContent()`, `parseTools()`)
- 流式响应 (`streamResponse()`, `extendedStreamResponse()`)
- 连接验证 (`verifyConnection()`)
- 模型列表 (`getModels()`, `fetchModels()`)
- 工具调用支持 (`toolCall()`, `parseTools()`)

### LLMWrapper
统一的入口和工厂类，支持两种使用方式：
1. **函数式调用** - 一次性对话
2. **实例化调用** - 多轮对话

### APIv1
OpenAI API v1 兼容的通用实现：
- 作为未知服务的后备选择
- 支持任何兼容 OpenAI API 格式的服务
- 自定义服务端点的默认处理器

## 使用方式

### 基础用法

#### 1. 快速对话（函数式）
```typescript
import LLMWrapper from '@/lib/llm';

// 直接调用，返回响应
const response = await LLMWrapper("Hello, how are you?", {
  service: "openai",
  apiKey: "sk-xxx",
  model: "gpt-4"
});
console.log(response); // string
```

#### 2. 多轮对话（实例化）
```typescript
import LLMWrapper from '@/lib/llm';

// 创建实例
const llm = new LLMWrapper({
  service: "anthropic",
  apiKey: "sk-xxx", 
  model: "claude-3-opus"
});

// 添加消息
llm.system("You are a helpful assistant");
llm.user("What's the weather like?");

// 发送并获取响应
const response = await llm.send();
console.log(response);

// 继续对话
llm.user("Tell me more");
const response2 = await llm.send();
```

#### 3. 使用特定服务类
```typescript
// 直接使用 OpenAI 类
const openai = new LLMWrapper.OpenAI({
  apiKey: "sk-xxx",
  model: "gpt-4"
});

// 直接使用 Anthropic 类
const claude = new LLMWrapper.Anthropic({
  apiKey: "sk-xxx",
  model: "claude-3-opus"
});
```

### 流式响应

```typescript
const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx",
  model: "gpt-4",
  stream: true  // 启用流式响应
});

const response = await llm.chat("Tell me a story");

// 处理流式响应
if (response && typeof response === 'object' && 'stream' in response) {
  for await (const chunk of response.stream) {
    console.log(chunk.content);
  }
}
```

### 工具调用（Function Calling）

```typescript
const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx",
  model: "gpt-4",
  tools: [
    {
      name: "get_weather",
      description: "Get weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name"
          }
        },
        required: ["location"]
      }
    }
  ]
});

const response = await llm.chat("What's the weather in Tokyo?");

// 检查工具调用
if (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    console.log(`Tool: ${toolCall.name}`);
    console.log(`Arguments: ${JSON.stringify(toolCall.arguments)}`);
    
    // 执行工具并返回结果
    const result = await executeToolFunction(toolCall);
    llm.toolCall(result);
  }
}
```

### 附件支持

```typescript
import Attachment from '@/lib/llm/attachment';

const attachment = new Attachment(imageBuffer, 'image/png');

const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx",
  model: "gpt-4-vision"
});

const response = await llm.chat("What's in this image?", {
  attachments: [attachment]
});
```

## 支持的服务

### 内置服务提供商

| 服务 | Service 名称 | 特点 |
|-----|------------|------|
| OpenAI | `"openai"` | GPT-3.5, GPT-4, GPT-4 Vision |
| Anthropic | `"anthropic"` | Claude 3 系列模型 |
| Google | `"google"` | Gemini 系列模型 |
| Ollama | `"ollama"` | 本地运行的开源模型 |
| xAI | `"xai"` | Grok 模型 |
| Groq | `"groq"` | 快速推理服务 |
| DeepSeek | `"deepseek"` | DeepSeek 模型 |

### 自定义服务（使用 APIv1）

对于不在上述列表中的服务，系统会自动使用 `APIv1` 类处理：

```typescript
// 使用自定义 OpenAI 兼容服务
const llm = new LLMWrapper({
  service: "my-custom-service", // 未知服务，会使用 APIv1
  baseUrl: "https://my-api.com/v1",
  apiKey: "xxx",
  model: "custom-model"
});
```

## 高级功能

### 模型管理

```typescript
const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx"
});

// 获取可用模型列表
const models = await llm.getModels({ 
  allowUnknown: true  // 允许未知模型
});

// 验证连接
const isConnected = await llm.verifyConnection();

// 获取高质量模型
const qualityModels = await llm.getQualityModels();
```

### 响应扩展模式

```typescript
const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx",
  model: "gpt-4",
  extended: true  // 启用扩展模式，返回更多信息
});

const response = await llm.send();
// response 包含: content, usage, thinking, tool_calls, messages
```

### 思考模式（Thinking）

```typescript
const llm = new LLMWrapper({
  service: "anthropic",
  apiKey: "sk-xxx",
  model: "claude-3-opus",
  think: true,  // 启用思考模式
  max_thinking_tokens: 1000
});

const response = await llm.send();
if (response.thinking) {
  console.log("Model's thinking:", response.thinking);
}
```

### 中止请求

```typescript
const llm = new LLMWrapper({
  service: "openai",
  apiKey: "sk-xxx"
});

// 发起请求
const promise = llm.chat("Tell me a long story");

// 中止请求
setTimeout(() => {
  llm.abort();
}, 1000);
```

## 注意事项

### 1. API Key 管理

API Key 可以通过多种方式提供：

```typescript
// 方式 1: 直接传递
const llm = new LLMWrapper({
  apiKey: "sk-xxx"
});

// 方式 2: 环境变量 (Node.js)
// 设置 OPENAI_API_KEY, ANTHROPIC_API_KEY 等

// 方式 3: localStorage (浏览器)
// 存储为 OPENAI_API_KEY, ANTHROPIC_API_KEY 等
```

### 2. 服务选择逻辑

```typescript
// 服务选择优先级：
// 1. 明确指定的 service
const llm1 = new LLMWrapper({ service: "anthropic" });

// 2. 配置中的默认服务
// 如果没有指定，使用 config.service

// 3. 未知服务使用 APIv1
const llm2 = new LLMWrapper({ 
  service: "unknown-service"  // 会使用 APIv1
});
```

### 3. 错误处理

```typescript
try {
  const response = await llm.chat("Hello");
} catch (error) {
  if (error.message.includes("401")) {
    console.error("Invalid API key");
  } else if (error.message.includes("429")) {
    console.error("Rate limit exceeded");
  } else if (error.message.includes("Failed to fetch")) {
    console.error("Network error");
  }
}
```

### 4. 模型信息缺失处理

当使用 `getModels()` 时，某些模型可能不在 `ModelUsage` 数据库中：

```typescript
// 允许未知模型（推荐）
const models = await llm.getModels({ 
  allowUnknown: true 
});

// 严格模式（会抛出错误）
try {
  const models = await llm.getModels({ 
    allowUnknown: false 
  });
} catch (error) {
  console.error("Model not found in ModelUsage");
}
```

### 5. Ollama 本地服务

使用 Ollama 时需要确保本地服务运行：

```typescript
const llm = new LLMWrapper({
  service: "ollama",
  baseUrl: "http://localhost:11434",  // 默认地址
  model: "llama2"
});

// 确保已拉取模型：ollama pull llama2
```

### 6. 自定义服务端点

对于自托管或第三方兼容服务：

```typescript
const llm = new LLMWrapper({
  service: "custom-api",  // 触发 APIv1
  baseUrl: "https://your-api.com/v1",
  apiKey: "your-key",
  model: "your-model"
});
```

### 7. TypeScript 类型

```typescript
import type { 
  Options, 
  Response, 
  ServiceName,
  Message,
  Tool,
  ToolCall 
} from '@/lib/llm/types';

// 使用类型安全的配置
const options: Options = {
  service: "openai",
  model: "gpt-4",
  temperature: 0.7,
  max_tokens: 1000
};

const llm = new LLMWrapper(options);
```

## 测试

查看 `test/lib/llm/llm.test.ts` 了解完整的测试示例。

配置测试：
1. 复制 `test.config.example.json` 到 `test.config.json`
2. 填入你的 API 密钥
3. 运行 `pnpm test test/lib/llm/llm.test.ts`

## 调试

启用调试日志：

```typescript
// 调试信息会通过 logger 输出
import logger from '@/lib/llm/logger';
const log = logger('llm:debug');
log.debug('Debug message');
```

在 `getModels()` 中添加了调试日志：
```typescript
console.log(`[DEBUG] Model ${model.model} not found in ModelUsage, isLocal: ${this.isLocal}, allowUnknown: ${quality_filter.allowUnknown}`);
```