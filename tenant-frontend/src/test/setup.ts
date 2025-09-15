import { vi } from 'vitest';
import '@testing-library/jest-dom';
// Polyfill WebSocket for jsdom environment using 'ws'
// Only if not provided by the environment
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const WS = require('ws');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.WebSocket = WS;
}

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLElement.scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLElement.hasPointerCapture
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLElement.setPointerCapture
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  writable: true,
  value: vi.fn(),
});

// Mock HTMLElement.releasePointerCapture
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  writable: true,
  value: vi.fn(),
});

// Ensure env is available in tests (allows setting VITE_API_URL via process.env)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!(import.meta as any).env) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (import.meta as any).env = {};
}