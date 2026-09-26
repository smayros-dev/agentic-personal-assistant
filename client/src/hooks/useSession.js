import { useState, useEffect } from 'react';

const SESSION_STORAGE_KEY = 'agentic-assistant-session-id';
const MODEL_STORAGE_KEY = 'agentic-assistant-model';

/**
 * Creates a new session ID using crypto.randomUUID or fallback
 */
export const createSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Retrieves or creates a session ID from localStorage
 */
export const getOrCreateSessionId = () => {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const id = createSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
};

/**
 * Retrieves stored model or returns default
 */
export const getOrCreateModel = () => {
  const stored = localStorage.getItem(MODEL_STORAGE_KEY);
  return stored || 'qwen3.6:latest';
};

/**
 * Stores model selection to localStorage
 */
export const setStoredModel = (model) => {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
};

/**
 * Hook for managing session and model state with localStorage persistence
 * @returns {Object} { sessionId, selectedModel, setSelectedModel, clearSession }
 */
export const useSession = () => {
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());
  const [selectedModel, setSelectedModelState] = useState(() => getOrCreateModel());

  const setSelectedModel = (model) => {
    setSelectedModelState(model);
    setStoredModel(model);
  };

  const clearSession = () => {
    const newSessionId = createSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    setSessionId(newSessionId);
  };

  return {
    sessionId,
    selectedModel,
    setSelectedModel,
    clearSession,
  };
};

export default useSession;
