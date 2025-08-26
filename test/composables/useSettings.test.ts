import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'solid-js';
import { useSettings } from '@/composables/useSettings';
import type { App } from '@/lib/app/app';

describe('useSettings', () => {
  let mockApp: App;

  beforeEach(() => {
    // Mock the App object
    mockApp = {
      settings: {
        visibleSignal: [() => false, vi.fn()],
        currentPageSignal: [() => 'appearance', vi.fn()],
      },
    } as any;
  });

  it('should initialize with default values', () => {
    createRoot((dispose) => {
      const settings = useSettings(mockApp);
      
      expect(settings.visible()).toBe(false);
      expect(settings.currentPage()).toBe('appearance');
      expect(settings.sidebarSections).toBeDefined();
      expect(settings.settingsConfig).toBeDefined();
      
      dispose();
    });
  });

  it('should evaluate conditions correctly', () => {
    createRoot((dispose) => {
      const settings = useSettings(mockApp);
      
      const mockConfig = {
        llm: { serviceProvider: 'custom' }
      } as any;
      
      const condition = (config: any) => config.llm?.serviceProvider === 'custom';
      const result = settings.evaluateCondition(condition, mockConfig);
      
      expect(result).toBe(true);
      
      dispose();
    });
  });
});