import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

const createStorageMock = () => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
		__getStore: () => store,
		__setStore: (newStore: Record<string, string>) => {
			store = newStore;
		},
	};
};

const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	writable: true,
});

Object.defineProperty(globalThis, "sessionStorage", {
	value: sessionStorageMock,
	writable: true,
});

Object.defineProperty(globalThis, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
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

class ResizeObserverMock {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

Object.defineProperty(globalThis, "ResizeObserver", {
	value: ResizeObserverMock,
	writable: true,
});

class IntersectionObserverMock {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
	root = null;
	rootMargin = "";
	thresholds = [];
}

Object.defineProperty(globalThis, "IntersectionObserver", {
	value: IntersectionObserverMock,
	writable: true,
});

Object.defineProperty(globalThis, "scrollTo", {
	value: vi.fn(),
	writable: true,
});

const fetchMock = vi.fn();
Object.defineProperty(globalThis, "fetch", {
	value: fetchMock,
	writable: true,
});

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
	vi.clearAllMocks();

	localStorageMock.clear();
	sessionStorageMock.clear();

	fetchMock.mockReset();
});

afterEach(() => {
	console.error = originalConsoleError;
	console.warn = originalConsoleWarn;
});

export { fetchMock, localStorageMock, sessionStorageMock };
