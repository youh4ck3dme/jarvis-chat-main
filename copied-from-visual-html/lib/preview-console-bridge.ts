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

export function parsePreviewConsoleMessage(data: unknown): PreviewConsoleEntry | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== "pngto-preview-console") return null;
  const level = msg.level;
  if (level !== "log" && level !== "warn" && level !== "error" && level !== "info") return null;
  const args = Array.isArray(msg.args) ? msg.args.map(String) : [];
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
  return { id: `${ts}-${Math.random().toString(36).slice(2, 8)}`, level, args, ts };
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
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    navigationType,
    url,
    href: typeof msg.href === "string" ? msg.href : undefined,
    text: typeof msg.text === "string" ? msg.text : undefined,
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

export const PREVIEW_CONSOLE_MAX_ENTRIES = 100;

/** Cap console stream length to avoid main-thread churn in long preview sessions. */
export function capPreviewConsoleEntries(entries: PreviewConsoleEntry[]): PreviewConsoleEntry[] {
  return entries.length > PREVIEW_CONSOLE_MAX_ENTRIES
    ? entries.slice(-PREVIEW_CONSOLE_MAX_ENTRIES)
    : entries;
}
