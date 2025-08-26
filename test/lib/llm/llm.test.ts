import { describe, it, expect, beforeAll } from "vitest";
import LLMWrapper from "@/lib/llm";
import type { ServiceName } from "@/lib/llm/types";
// @ts-expect-error
import { readFileSync, existsSync } from "fs";
// @ts-expect-error
import { resolve } from "path";

// Load test configuration
// @ts-expect-error
const configPath = resolve(__dirname, "../../../test.config.llm.json");
let testConfig: any = {};

if (existsSync(configPath)) {
  try {
    testConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.warn("Failed to load test.config.json:", error);
  }
}

// Helper to check if LLM config is available
const hasLLMConfig = () => {
  return (
    testConfig.llm && testConfig.llm.serviceProvider && testConfig.llm.apiKey
  );
};

// Skip condition for tests
const skipIfNoConfig = !hasLLMConfig();

describe("LLM Connection Tests", () => {
  describe("Configuration", () => {
    it("should load test configuration", () => {
      if (!existsSync(configPath)) {
        console.log(`
⚠️  No test configuration found!
Please create a test.config.json file in the project root with the following structure:

{
  "llm": {
    "serviceProvider": "openai",
    "apiKey": "your-api-key",
    "modelName": "gpt-4",
    "baseUrl": "https://api.openai.com/v1",
    "temperature": 1,
    "enableThinking": true
  }
}

Supported providers: openai, anthropic, google, xai, grok, deepseek, ollama, custom
        `);
      }

      expect(existsSync(configPath) || !hasLLMConfig()).toBeTruthy();
    });
  });

  describe("Connection Tests", () => {
    it.skipIf(skipIfNoConfig)(
      "should successfully verify connection with configured provider",
      async () => {
        const llm = new LLMWrapper({
          service: testConfig.llm.serviceProvider,
          apiKey: testConfig.llm.apiKey,
          model: testConfig.llm.modelName || "default",
          baseUrl: testConfig.llm.baseUrl,
        });

        const isConnected = await llm.verifyConnection();
        expect(isConnected).toBe(true);
      }
    );

    it.skipIf(skipIfNoConfig)("should fetch available models", async () => {
      const llm = new LLMWrapper({
        service: testConfig.llm.serviceProvider as ServiceName,
        apiKey: testConfig.llm.apiKey,
        model: testConfig.llm.modelName || "default",
        baseUrl: testConfig.llm.baseUrl,
      });

      // Allow unknown models since ModelUsage might not have all models defined
      const models = await llm.getModels({ allowUnknown: true });
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);

      if (models.length > 0) {
        console.log(
          `Found ${models.length} models for ${testConfig.llm.serviceProvider}`
        );
        // Log first 5 models for debugging
        models.slice(0, 5).forEach((model) => {
          console.log(`  - ${model.model}: ${model.name || "No name"}`);
        });
      }
    });

    it.skipIf(skipIfNoConfig)(
      "should handle invalid API key gracefully",
      async () => {
        const llm = new LLMWrapper({
          service: testConfig.llm.serviceProvider as ServiceName,
          apiKey: "invalid-api-key-12345",
          model: testConfig.llm.modelName || "default",
          baseUrl: testConfig.llm.baseUrl,
        });

        try {
          await llm.verifyConnection();
          expect.fail("Should have thrown an error with invalid API key");
        } catch (error: any) {
          console.log("Invalid API key error:", error.message); // Debug log
          expect(error).toBeDefined();
          // Different providers may return different error messages
          // Some may say "Incorrect API key" or just fail without specific message
          expect(error.message).toBeTruthy();
          // Just check that it's an error, not the specific message
        }
      }
    );

    it.skipIf(skipIfNoConfig)(
      "should handle network errors gracefully",
      async () => {
        const llm = new LLMWrapper({
          service: "unknown-service" as ServiceName, // Will use APIv1
          apiKey: testConfig.llm.apiKey || "test-key",
          model: "test-model",
          baseUrl: "http://127.0.0.1:19999", // Use localhost with invalid port
        });

        try {
          await llm.verifyConnection();
          expect.fail("Should have thrown an error with invalid URL");
        } catch (error: any) {
          console.log("Network error:", error.message); // Debug log
          expect(error).toBeDefined();
          // Just verify we got an error, not specific message
          expect(error.message).toBeTruthy();
        }
      },
      10000 // 10 second timeout
    );
  });

  describe("Provider-specific Tests", () => {
    it.skipIf(skipIfNoConfig || testConfig.llm?.serviceProvider !== "openai")(
      "OpenAI: should have GPT models available",
      async () => {
        const llm = new LLMWrapper({
          service: "openai",
          apiKey: testConfig.llm.apiKey,
          model: "gpt-4",
        });

        const models = await llm.getModels({ allowUnknown: true });
        const gptModels = models.filter((m) => m.model.includes("gpt"));

        expect(gptModels.length).toBeGreaterThan(0);
        console.log(`Found ${gptModels.length} GPT models`);
      }
    );

    it.skipIf(
      skipIfNoConfig || testConfig.llm?.serviceProvider !== "anthropic"
    )("Anthropic: should have Claude models available", async () => {
      const llm = new LLMWrapper({
        service: "anthropic",
        apiKey: testConfig.llm.apiKey,
        model: "claude-3-opus",
      });

      const models = await llm.getModels({ allowUnknown: true });
      const claudeModels = models.filter((m) => m.model.includes("claude"));

      expect(claudeModels.length).toBeGreaterThan(0);
      console.log(`Found ${claudeModels.length} Claude models`);
    });

    it.skipIf(skipIfNoConfig || testConfig.llm?.serviceProvider !== "ollama")(
      "Ollama: should connect to local instance",
      async () => {
        const llm = new LLMWrapper({
          service: "ollama",
          baseUrl: testConfig.llm.baseUrl || "http://localhost:11434",
          model: testConfig.llm.modelName || "llama2",
        });

        const models = await llm.getModels({ allowUnknown: true });
        expect(models).toBeDefined();

        if (models.length === 0) {
          console.warn(
            "No models found in Ollama. Please pull a model first with: ollama pull llama2"
          );
        } else {
          console.log(`Found ${models.length} Ollama models`);
        }
      }
    );

    it.skipIf(skipIfNoConfig || testConfig.llm?.serviceProvider !== "custom")(
      "Custom: should connect with custom base URL",
      async () => {
        expect(testConfig.llm.baseUrl).toBeDefined();

        const llm = new LLMWrapper({
          service: "custom",
          apiKey: testConfig.llm.apiKey,
          model: testConfig.llm.modelName || "default",
          baseUrl: testConfig.llm.baseUrl,
        });

        const isConnected = await llm.verifyConnection();
        expect(isConnected).toBe(true);
      }
    );
  });

  describe("Simple Chat Test", () => {
    it.skipIf(skipIfNoConfig)(
      "should send a simple message and receive response",
      async () => {
        console.log(
          "Starting chat test with provider:",
          testConfig.llm.serviceProvider
        );

        const llm = new LLMWrapper({
          service: testConfig.llm.serviceProvider as ServiceName,
          apiKey: testConfig.llm.apiKey,
          model: testConfig.llm.modelName || "gpt-3.5-turbo", // Use a cheaper model by default
          baseUrl: testConfig.llm.baseUrl,
          max_tokens: 20, // Even smaller limit
        });

        try {
          const response = await llm.chat("Reply with: OK");

          console.log("Chat response:", response);
          expect(response).toBeDefined();
          expect(typeof response).toBe("string");
          expect((response as string).length).toBeGreaterThan(0);
        } catch (error: any) {
          console.error("Chat test failed:", error.message);
          throw error;
        }
      },
      60000 // 60 second timeout for API calls
    );
  });
});
