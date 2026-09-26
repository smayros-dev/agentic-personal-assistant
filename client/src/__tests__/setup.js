/* global global */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage with proper jsdom handling
if (typeof window !== 'undefined' && !window.localStorage) {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch globally as a proper vi.fn()
if (typeof global !== 'undefined') {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({}),
      ok: true,
      status: 200,
    })
  );
}

// Suppress console errors in tests (optional)
if (typeof global !== 'undefined') {
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
  };
}