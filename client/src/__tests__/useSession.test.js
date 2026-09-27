import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSession,
  createSessionId,
  getOrCreateSessionId,
  getOrCreateModel,
  setStoredModel,
} from '../hooks/useSession';

describe('useSession Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('createSessionId', () => {
    it('should create a valid session ID', () => {
      const id = createSessionId();
      expect(id).toBeDefined();
      expect(id).toHaveLength(36); // UUID length
      expect(id).toMatch(/^[a-f0-9-]+$/i);
    });

    it('should create different IDs on multiple calls', () => {
      const id1 = createSessionId();
      const id2 = createSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateSessionId', () => {
    it('should return existing session ID from localStorage', () => {
      const existingId = 'test-session-123';
      localStorage.setItem('agentic-assistant-session-id', existingId);

      const id = getOrCreateSessionId();
      expect(id).toBe(existingId);
    });

    it('should create and store new session ID if none exists', () => {
      const id = getOrCreateSessionId();
      expect(id).toBeDefined();
      expect(localStorage.getItem('agentic-assistant-session-id')).toBe(id);
    });

    it('should return same ID on multiple calls', () => {
      const id1 = getOrCreateSessionId();
      const id2 = getOrCreateSessionId();
      expect(id1).toBe(id2);
    });
  });

  describe('getOrCreateModel', () => {
    it('should return stored model from localStorage', () => {
      localStorage.setItem('agentic-assistant-model', 'mistral:7b');
      const model = getOrCreateModel();
      expect(model).toBe('mistral:7b');
    });

    it('should return default model if none stored', () => {
      const model = getOrCreateModel();
      expect(model).toBe('qwen3.6:latest');
    });
  });

  describe('setStoredModel', () => {
    it('should store model in localStorage', () => {
      setStoredModel('mistral:7b');
      expect(localStorage.getItem('agentic-assistant-model')).toBe('mistral:7b');
    });

    it('should overwrite existing model', () => {
      localStorage.setItem('agentic-assistant-model', 'qwen2:7b');
      setStoredModel('neural-chat:7b');
      expect(localStorage.getItem('agentic-assistant-model')).toBe('neural-chat:7b');
    });
  });

  describe('useSession hook', () => {
    it('should initialize with session ID and default model', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current.sessionId).toBeDefined();
      expect(result.current.selectedModel).toBe('qwen3.6:latest');
    });

    it('should return same session ID on re-renders', () => {
      const { result, rerender } = renderHook(() => useSession());
      const initialSessionId = result.current.sessionId;

      rerender();
      expect(result.current.sessionId).toBe(initialSessionId);
    });

    it('should persist selected model to localStorage', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.setSelectedModel('mistral:7b');
      });

      expect(result.current.selectedModel).toBe('mistral:7b');
      expect(localStorage.getItem('agentic-assistant-model')).toBe('mistral:7b');
    });

    it('should update selected model state and localStorage together', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.setSelectedModel('neural-chat:7b');
      });

      expect(result.current.selectedModel).toBe('neural-chat:7b');
      expect(localStorage.getItem('agentic-assistant-model')).toBe('neural-chat:7b');
    });

    it('should clear session and create new session ID', () => {
      const { result } = renderHook(() => useSession());
      const oldSessionId = result.current.sessionId;

      act(() => {
        result.current.clearSession();
      });

      expect(result.current.sessionId).not.toBe(oldSessionId);
      expect(localStorage.getItem('agentic-assistant-session-id')).toBe(
        result.current.sessionId
      );
    });

    it('should handle multiple model changes', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.setSelectedModel('model-1');
      });
      expect(result.current.selectedModel).toBe('model-1');

      act(() => {
        result.current.setSelectedModel('model-2');
      });
      expect(result.current.selectedModel).toBe('model-2');

      act(() => {
        result.current.setSelectedModel('model-3');
      });
      expect(result.current.selectedModel).toBe('model-3');
    });

    it('should restore state from localStorage on new hook instance', () => {
      const { result: result1 } = renderHook(() => useSession());

      act(() => {
        result1.current.setSelectedModel('persistent-model');
      });

      const { result: result2 } = renderHook(() => useSession());
      expect(result2.current.selectedModel).toBe('persistent-model');
    });
  });

  describe('useSession edge cases', () => {
    it('should handle rapid model changes', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.setSelectedModel('model-1');
        result.current.setSelectedModel('model-2');
        result.current.setSelectedModel('model-3');
      });

      expect(result.current.selectedModel).toBe('model-3');
    });

    it('should handle clearing session multiple times', () => {
      const { result } = renderHook(() => useSession());
      const initialSessionId = result.current.sessionId;

      act(() => {
        result.current.clearSession();
      });
      const firstClearedId = result.current.sessionId;

      act(() => {
        result.current.clearSession();
      });
      const secondClearedId = result.current.sessionId;

      expect(firstClearedId).not.toBe(initialSessionId);
      expect(secondClearedId).not.toBe(firstClearedId);
      expect(secondClearedId).not.toBe(initialSessionId);
    });
  });
});
