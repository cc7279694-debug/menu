import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PwaRuntime } from "./pwa-runtime";

type ServiceWorkerListener = (event: Event) => void;

function createWorker(state: ServiceWorkerState = "installed") {
  const listeners = new Map<string, Set<ServiceWorkerListener>>();

  return {
    state,
    postMessage: vi.fn(),
    addEventListener: vi.fn((type: string, listener: ServiceWorkerListener) => {
      const current = listeners.get(type) ?? new Set<ServiceWorkerListener>();
      current.add(listener);
      listeners.set(type, current);
    }),
    removeEventListener: vi.fn(),
    emit(type: string) {
      listeners.get(type)?.forEach((listener) => listener(new Event(type)));
    },
  } as unknown as ServiceWorker & { emit: (type: string) => void };
}

function installServiceWorkerMock(registration: Partial<ServiceWorkerRegistration>) {
  const listeners = new Map<string, Set<ServiceWorkerListener>>();
  const completeRegistration = {
    addEventListener: vi.fn((type: string, listener: ServiceWorkerListener) => {
      const current = listeners.get(type) ?? new Set<ServiceWorkerListener>();
      current.add(listener);
      listeners.set(type, current);
    }),
    removeEventListener: vi.fn(),
    ...registration,
  } as ServiceWorkerRegistration;
  const serviceWorker = {
    controller: createWorker("activated"),
    addEventListener: vi.fn((type: string, listener: ServiceWorkerListener) => {
      const current = listeners.get(`container:${type}`) ?? new Set<ServiceWorkerListener>();
      current.add(listener);
      listeners.set(`container:${type}`, current);
    }),
    removeEventListener: vi.fn(),
    register: vi.fn().mockResolvedValue(completeRegistration),
    emit(type: string) {
      listeners.get(`container:${type}`)?.forEach((listener) => listener(new Event(type)));
    },
  } as unknown as ServiceWorkerContainer & { emit: (type: string) => void };

  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });

  return serviceWorker;
}

describe("PwaRuntime", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  it("does not register in an unsupported browser", () => {
    render(<PwaRuntime />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("registers once and prompts for a waiting worker", async () => {
    const waitingWorker = createWorker();
    const serviceWorker = installServiceWorkerMock({ waiting: waitingWorker });

    const { rerender } = render(<PwaRuntime />);
    rerender(<PwaRuntime />);

    expect(serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("发现新版本，更新后可获得最新页面与样式。"))
      .toBeInTheDocument();
  });

  it("asks the waiting worker to skip waiting only after confirmation", async () => {
    const waitingWorker = createWorker();
    installServiceWorkerMock({ waiting: waitingWorker });
    const user = userEvent.setup();

    render(<PwaRuntime />);
    await user.click(await screen.findByRole("button", { name: "立即更新" }));

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
  });

  it("reloads once when the new worker takes control", async () => {
    const waitingWorker = createWorker();
    const serviceWorker = installServiceWorkerMock({ waiting: waitingWorker });
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });

    render(<PwaRuntime />);
    await screen.findByRole("button", { name: "立即更新" });
    serviceWorker.emit("controllerchange");
    serviceWorker.emit("controllerchange");

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("announces offline and online state", async () => {
    const serviceWorker = installServiceWorkerMock({});
    render(<PwaRuntime />);

    const offlineListener = window.addEventListener;
    window.dispatchEvent(new Event("offline"));
    expect(await screen.findByText(/当前离线/)).toBeInTheDocument();

    window.dispatchEvent(new Event("online"));
    await waitFor(() => expect(screen.queryByText(/当前离线/)).not.toBeInTheDocument());
    expect(serviceWorker.register).toHaveBeenCalledTimes(1);
    expect(offlineListener).toBeDefined();
  });
});
