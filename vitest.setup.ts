import "@testing-library/jest-dom/vitest";

// JSDOM doesn't implement scrollIntoView; mock it for keyboard navigation tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// JSDOM's media methods throw "Not implemented"; stub them to avoid noise/errors.
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: () => undefined,
});

Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: () => Promise.resolve(),
});

type IOEntryLike = Partial<IntersectionObserverEntry> & { target: Element };

class IntersectionObserverMock implements IntersectionObserver {
  static instances: IntersectionObserverMock[] = [];

  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];

  private readonly callback: IntersectionObserverCallback;
  private readonly observed = new Set<Element>();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? "";
    this.thresholds = Array.isArray(options?.threshold)
      ? options?.threshold
      : [options?.threshold ?? 0];
    IntersectionObserverMock.instances.push(this);
  }

  observe = (target: Element) => {
    this.observed.add(target);
  };

  unobserve = (target: Element) => {
    this.observed.delete(target);
  };

  disconnect = () => {
    this.observed.clear();
  };

  takeRecords = () => [];

  // Test helper to drive visibility changes.
  trigger(entries: IOEntryLike[]) {
    const normalized = entries.map((e) => ({
      boundingClientRect: e.boundingClientRect ?? ({} as DOMRectReadOnly),
      intersectionRatio: e.intersectionRatio ?? 0,
      intersectionRect: e.intersectionRect ?? ({} as DOMRectReadOnly),
      isIntersecting: e.isIntersecting ?? false,
      rootBounds: e.rootBounds ?? null,
      target: e.target,
      time: e.time ?? 0,
    })) as IntersectionObserverEntry[];

    this.callback(normalized, this);
  }

  getObserved() {
    return new Set(this.observed);
  }
}

Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  value: IntersectionObserverMock,
});

// Expose to tests
Object.defineProperty(globalThis, "__io", {
  configurable: true,
  value: IntersectionObserverMock,
});
