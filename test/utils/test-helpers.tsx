import { render as solidRender } from '@solidjs/testing-library';
import { Component, JSX } from 'solid-js';
import { Router } from '@solidjs/router';

// Custom render function with Router wrapper for components that use routing
export function renderWithRouter(
  component: Component<any>,
  options?: any
): ReturnType<typeof solidRender> {
  return solidRender(() => <Router>{component({})}</Router>, options);
}

// Mock data generators
export const mockRepoConfig = (overrides = {}) => ({
  id: 'test-repo',
  title: 'Test Repository',
  persistenceType: 'local-storage',
  ui: {
    theme: 'light',
    fontSize: 16,
    fontFamily: 'Inter',
    scale: 100,
    customCSS: '',
  },
  editor: {
    lineSpacing: 'normal',
    fontSize: 16,
    fontFamily: 'Inter',
    monospaceFontSize: 16,
    monospaceFontFamily: 'Inter',
    incrementalUpdate: false,
  },
  attachment: {
    storageType: 'none',
  },
  llm: {
    serviceProvider: 'openai',
    temperature: 1,
    enableThinking: true,
  },
  ...overrides,
});

// Wait for async updates in tests
export const waitFor = (ms: number = 100): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Mock fetch for API tests
export const mockFetch = (response: any) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Headers(),
      status: 200,
      statusText: 'OK',
    } as Response)
  );
};