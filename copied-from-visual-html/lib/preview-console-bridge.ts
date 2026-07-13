/** Inject into preview HTML to forward console and navigation signals via postMessage. */
export const PREVIEW_CONSOLE_BRIDGE_SCRIPT = `
(function(){
  if (window.__pngtoConsoleBridge) return;
  window.__pngtoConsoleBridge = true;

  function emit(payload) {
    try {
      parent.postMessage(payload, window.location.origin || '*');
    } catch(e) {}
  }

  var levels = ['log','warn','error','info'];
  levels.forEach(function(level){
    var orig = console[level];
    console[level] = function(){
      emit({
          type: 'pngto-preview-console',
          level: level,
          args: Array.prototype.slice.call(arguments).map(function(a){
            try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
            catch(e) { return String(a); }
          }),
          ts: Date.now()
      });
      return orig.apply(console, arguments);
    };
  });

  function emitNavigation(navigationType, extras) {
    emit({
      type: 'pngto-preview-navigation',
      navigationType: navigationType,
      url: window.location.href,
      href: extras && extras.href ? extras.href : undefined,
      text: extras && extras.text ? extras.text : undefined,
      ts: Date.now()
    });
  }

  window.addEventListener('error', function(event) {
    emit({
      type: 'pngto-preview-error',
      kind: 'error',
      message: event.message || 'Script error',
      source: event.filename || undefined,
      lineno: typeof event.lineno === 'number' ? event.lineno : undefined,
      colno: typeof event.colno === 'number' ? event.colno : undefined,
      stack: event.error && event.error.stack ? String(event.error.stack) : undefined,
      ts: Date.now()
    });
  });

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var message = 'Unhandled promise rejection';
    var stack;
    if (reason && typeof reason === 'object') {
      message = reason.message ? String(reason.message) : String(reason);
      stack = reason.stack ? String(reason.stack) : undefined;
    } else if (reason !== undefined) {
      message = String(reason);
    }
    emit({
      type: 'pngto-preview-error',
      kind: 'unhandledrejection',
      message: message,
      stack: stack,
      ts: Date.now()
    });
  });

  function emitNetwork(entry) {
    emit(Object.assign({ type: 'pngto-preview-network', ts: Date.now() }, entry));
  }

  if (window.fetch) {
    var origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      var started = Date.now();
      var method = (init && init.method) || 'GET';
      var url = typeof input === 'string' ? input : (input && input.url) ? input.url : String(input);
      return origFetch(input, init).then(function(response) {
        emitNetwork({
          kind: 'fetch',
          method: method,
          url: url,
          status: response.status,
          durationMs: Date.now() - started
        });
        return response;
      }).catch(function(error) {
        emitNetwork({
          kind: 'fetch',
          method: method,
          url: url,
          error: error && error.message ? String(error.message) : String(error),
          durationMs: Date.now() - started
        });
        throw error;
      });
    };
  }

  var OrigXHR = window.XMLHttpRequest;
  if (OrigXHR) {
    window.XMLHttpRequest = function() {
      var xhr = new OrigXHR();
      var method = 'GET';
      var url = '';
      var started = 0;
      var origOpen = xhr.open;
      xhr.open = function(m, u) {
        method = m;
        url = u;
        return origOpen.apply(xhr, arguments);
      };
      var origSend = xhr.send;
      xhr.send = function() {
        started = Date.now();
        xhr.addEventListener('loadend', function() {
          emitNetwork({
            kind: 'xhr',
            method: method,
            url: url,
            status: xhr.status,
            durationMs: Date.now() - started
          });
        });
        return origSend.apply(xhr, arguments);
      };
      return xhr;
    };
  }

  if (window.PerformanceObserver) {
    try {
      var perfObserver = new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          if (entry.entryType !== 'mark' && entry.entryType !== 'measure') return;
          emit({
            type: 'pngto-preview-performance',
            entryType: entry.entryType,
            name: entry.name,
            duration: typeof entry.duration === 'number' ? entry.duration : undefined,
            startTime: typeof entry.startTime === 'number' ? entry.startTime : undefined,
            ts: Date.now()
          });
        });
      });
      perfObserver.observe({ entryTypes: ['mark', 'measure'] });
    } catch(e) {}
  }

  var origPushState = history.pushState;
  history.pushState = function() {
    var result = origPushState.apply(history, arguments);
    emitNavigation('pushState');
    return result;
  };

  var origReplaceState = history.replaceState;
  history.replaceState = function() {
    var result = origReplaceState.apply(history, arguments);
    emitNavigation('replaceState');
    return result;
  };

  window.addEventListener('popstate', function(){
    emitNavigation('popstate');
  });

  window.addEventListener('hashchange', function(){
    emitNavigation('hashchange');
  });

  document.addEventListener('click', function(event){
    var target = event.target;
    if (!target || !target.closest) return;
    var anchor = target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href) return;
    emitNavigation('link', {
      href: href,
      text: (anchor.innerText || anchor.textContent || '').trim().slice(0, 120)
    });
  }, true);

  window.addEventListener('load', function(){
    emitNavigation('load');
  }, { once: true });
})();
`;

export type PreviewConsoleEntry = {
  id: string;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  ts: number;
};

export type PreviewNavigationEntry = {
  id: string;
  navigationType: "load" | "link" | "pushState" | "replaceState" | "popstate" | "hashchange";
  url: string;
  href?: string;
  text?: string;
  ts: number;
};

export type PreviewErrorEntry = {
  id: string;
  kind: "error" | "unhandledrejection";
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  ts: number;
};

export type PreviewNetworkEntry = {
  id: string;
  kind: "fetch" | "xhr";
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  error?: string;
  ts: number;
};

export type PreviewPerformanceEntry = {
  id: string;
  entryType: "mark" | "measure";
  name: string;
  duration?: number;
  startTime?: number;
  ts: number;
};

const PREVIEW_MESSAGE_TYPES = new Set([
  "pngto-preview-console",
  "pngto-preview-navigation",
  "pngto-preview-error",
  "pngto-preview-network",
  "pngto-preview-performance",
]);

function createEntryId(ts: number): string {
  return `${ts}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isKnownPreviewMessageType(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const type = (data as Record<string, unknown>).type;
  return typeof type === "string" && PREVIEW_MESSAGE_TYPES.has(type);
}

/** srcdoc sandbox iframes report origin "null". */
export function isTrustedPreviewMessage(event: MessageEvent): boolean {
  if (!isKnownPreviewMessageType(event.data)) return false;
  if (typeof window === "undefined") return true;
  return event.origin === "null" || event.origin === window.location.origin;
}

export function parsePreviewConsoleMessage(data: unknown): PreviewConsoleEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-console") return null;
  const level = msg.level;
  if (level !== "log" && level !== "warn" && level !== "error" && level !== "info") return null;
  const args = Array.isArray(msg.args) ? msg.args.map(String) : [];
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return { id: createEntryId(ts), level, args, ts };
}

export function parsePreviewNavigationMessage(data: unknown): PreviewNavigationEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-navigation") return null;

  const navigationType = msg.navigationType;
  if (
    navigationType !== "load" &&
    navigationType !== "link" &&
    navigationType !== "pushState" &&
    navigationType !== "replaceState" &&
    navigationType !== "popstate" &&
    navigationType !== "hashchange"
  ) {
    return null;
  }

  const url =
    typeof msg.url === "string"
      ? msg.url
      : typeof window !== "undefined"
        ? window.location.href
        : "";
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return {
    id: createEntryId(ts),
    navigationType,
    url,
    href: typeof msg.href === "string" ? msg.href : undefined,
    text: typeof msg.text === "string" ? msg.text : undefined,
    ts,
  };
}

export function parsePreviewErrorMessage(data: unknown): PreviewErrorEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-error") return null;
  if (msg.kind !== "error" && msg.kind !== "unhandledrejection") return null;
  if (typeof msg.message !== "string") return null;
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return {
    id: createEntryId(ts),
    kind: msg.kind,
    message: msg.message,
    source: typeof msg.source === "string" ? msg.source : undefined,
    lineno: typeof msg.lineno === "number" ? msg.lineno : undefined,
    colno: typeof msg.colno === "number" ? msg.colno : undefined,
    stack: typeof msg.stack === "string" ? msg.stack : undefined,
    ts,
  };
}

export function parsePreviewNetworkMessage(data: unknown): PreviewNetworkEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-network") return null;
  if (msg.kind !== "fetch" && msg.kind !== "xhr") return null;
  if (typeof msg.method !== "string" || typeof msg.url !== "string") return null;
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return {
    id: createEntryId(ts),
    kind: msg.kind,
    method: msg.method,
    url: msg.url,
    status: typeof msg.status === "number" ? msg.status : undefined,
    durationMs: typeof msg.durationMs === "number" ? msg.durationMs : undefined,
    error: typeof msg.error === "string" ? msg.error : undefined,
    ts,
  };
}

export function parsePreviewPerformanceMessage(data: unknown): PreviewPerformanceEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-performance") return null;
  if (msg.entryType !== "mark" && msg.entryType !== "measure") return null;
  if (typeof msg.name !== "string") return null;
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return {
    id: createEntryId(ts),
    entryType: msg.entryType,
    name: msg.name,
    duration: typeof msg.duration === "number" ? msg.duration : undefined,
    startTime: typeof msg.startTime === "number" ? msg.startTime : undefined,
    ts,
  };
}

export function injectConsoleBridge(html: string): string {
  if (html.includes("__pngtoConsoleBridge")) return html;
  const script = `<script>${PREVIEW_CONSOLE_BRIDGE_SCRIPT}</script>`;
  if (html.includes("</head>")) return html.replace("</head>", `${script}</head>`);
  if (html.includes("<body")) return html.replace(/<body([^>]*)>/i, `<body$1>${script}`);
  return script + html;
}

export function isPreviewConsoleMessage(
  data: unknown,
): data is { type: "entry"; entry: PreviewConsoleEntry } {
  if (!data || typeof data !== "object") return false;
  const msg = data as Record<string, unknown>;
  return msg.type === "entry" && typeof msg.entry === "object" && msg.entry !== null;
}

/** Normalize legacy bridge postMessage payloads into PreviewConsoleEntry. */
export function normalizePreviewConsoleMessage(data: unknown): PreviewConsoleEntry | null {
  const legacy = parsePreviewConsoleMessage(data);
  if (legacy) return legacy;
  if (isPreviewConsoleMessage(data)) return data.entry;
  return null;
}

export function normalizePreviewNavigationMessage(data: unknown): PreviewNavigationEntry | null {
  return parsePreviewNavigationMessage(data);
}

export function normalizePreviewErrorMessage(data: unknown): PreviewErrorEntry | null {
  return parsePreviewErrorMessage(data);
}

export function normalizePreviewNetworkMessage(data: unknown): PreviewNetworkEntry | null {
  return parsePreviewNetworkMessage(data);
}

export function normalizePreviewPerformanceMessage(data: unknown): PreviewPerformanceEntry | null {
  return parsePreviewPerformanceMessage(data);
}

export const PREVIEW_CONSOLE_MAX_ENTRIES = 100;

/** Cap console stream length to avoid main-thread churn in long preview sessions. */
export function capPreviewConsoleEntries(entries: PreviewConsoleEntry[]): PreviewConsoleEntry[] {
  return entries.length > PREVIEW_CONSOLE_MAX_ENTRIES
    ? entries.slice(-PREVIEW_CONSOLE_MAX_ENTRIES)
    : entries;
}

export function capPreviewEntries<T>(entries: T[], max = PREVIEW_CONSOLE_MAX_ENTRIES): T[] {
  return entries.length > max ? entries.slice(-max) : entries;
}
