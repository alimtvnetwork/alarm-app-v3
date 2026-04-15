import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { JSDOM } from "jsdom";

function ensureDom(): void {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (typeof globalThis.localStorage === "undefined" && "localStorage" in window) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: window.localStorage,
      });
    }
    return;
  }

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: dom.window.document,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: dom.window.localStorage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: dom.window.sessionStorage,
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: dom.window.HTMLElement,
  });
  Object.defineProperty(globalThis, "Node", {
    configurable: true,
    value: dom.window.Node,
  });
  Object.defineProperty(globalThis, "Event", {
    configurable: true,
    value: dom.window.Event,
  });
  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: dom.window.CustomEvent,
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: dom.window.getComputedStyle.bind(dom.window),
  });
}

ensureDom();

if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
