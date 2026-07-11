import type React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { DeployMenu } from "./deploy-menu-stub";
import type { JarvisSourceBundle } from "../../lib/jarvis-workspace";
import {
  injectConsoleBridge,
  normalizePreviewConsoleMessage,
  normalizePreviewNavigationMessage,
  type PreviewConsoleEntry,
  type PreviewNavigationEntry,
} from "../../lib/preview-console-bridge";
import { summarizeJarvisSourceBundle } from "../../lib/jarvis-workspace";

interface JarvisPreviewPanelProps {
  className?: string;
  htmlContent?: string | null;
  /** Throttled document for iframe updates while streaming. */
  previewHtmlContent?: string | null;
  isStreaming?: boolean;
  isViewingSnapshot?: boolean;
  onBackToLive?: () => void;
  sourceBundle?: JarvisSourceBundle | null;
  onConsoleEntry?: (entry: PreviewConsoleEntry) => void;
  onNavigationEntry?: (entry: PreviewNavigationEntry) => void;
  showSource?: boolean;
  showPreview?: boolean;
  /** Replaces the static preview empty state (e.g. Orb Mind-Map). */
  emptyPreview?: React.ReactNode;
}

const PREVIEW_VIEWPORTS = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: "760px", icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", icon: Smartphone },
] as const;

type PreviewViewport = (typeof PREVIEW_VIEWPORTS)[number]["id"];

export function JarvisPreviewPanel({
  className,
  htmlContent,
  previewHtmlContent,
  isStreaming = false,
  isViewingSnapshot = false,
  onBackToLive,
  sourceBundle = null,
  onConsoleEntry,
  onNavigationEntry,
  showSource = true,
  showPreview = true,
  emptyPreview,
}: JarvisPreviewPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const activeViewport = useMemo(
    () => PREVIEW_VIEWPORTS.find((item) => item.id === viewport) ?? PREVIEW_VIEWPORTS[0],
    [viewport],
  );
  const iframeDoc = previewHtmlContent ?? htmlContent;
  const resolvedHtmlContent = useMemo(
    () =>
      iframeDoc && (onConsoleEntry || onNavigationEntry)
        ? injectConsoleBridge(iframeDoc)
        : iframeDoc,
    [iframeDoc, onConsoleEntry, onNavigationEntry],
  );
  const sourceSummary = useMemo(() => summarizeJarvisSourceBundle(sourceBundle), [sourceBundle]);
  const visibleSectionCount = Number(showSource) + Number(showPreview);
  const canFullscreen = Boolean(showPreview && resolvedHtmlContent);

  useLockBodyScroll(isFullscreen);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!canFullscreen) return;
    setIsFullscreen((current) => !current);
  }, [canFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "F11") {
        event.preventDefault();
        exitFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    if (canFullscreen) return;
    setIsFullscreen(false);
  }, [canFullscreen]);

  useEffect(() => {
    if (!onConsoleEntry && !onNavigationEntry) return;
    const handler = (event: MessageEvent) => {
      const consoleEntry = normalizePreviewConsoleMessage(event.data);
      if (consoleEntry && onConsoleEntry) {
        onConsoleEntry(consoleEntry);
        return;
      }

      const navigationEntry = normalizePreviewNavigationMessage(event.data);
      if (navigationEntry && onNavigationEntry) {
        onNavigationEntry(navigationEntry);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onConsoleEntry, onNavigationEntry]);

  const handleDownload = useCallback(() => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jarvis-output.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [htmlContent]);

  const handleCopy = useCallback(async () => {
    if (!htmlContent) return;
    await navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [htmlContent]);

  return (
    <div className={cn("flex h-full flex-col bg-canvas text-fg", className)}>
      <div className="flex h-12 items-center justify-between border-b border-border/80 bg-panel px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-fg">Artifact</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Preview</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden max-w-[18rem] truncate rounded-full border border-border bg-background px-2 py-1 text-muted-foreground md:inline-flex">
            {sourceSummary}
          </span>
          {isStreaming && (
            <span
              className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-1 text-emerald-400"
              data-testid="jarvis-preview-live-badge"
            >
              Live
            </span>
          )}

          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-muted-foreground lg:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Sandboxed
          </span>

          <div className="hidden items-center rounded-md border border-border bg-background p-0.5 md:flex">
            {PREVIEW_VIEWPORTS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === viewport;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewport(item.id)}
                  title={item.label}
                  aria-label={`Preview ${item.label}`}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors",
                    isActive && "bg-zinc-800 text-fg",
                    !isActive && "hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>

          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Fullscreen preview"
              aria-label="Fullscreen preview"
              data-testid="jarvis-preview-fullscreen-btn"
              className="hidden h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-300 transition-colors hover:bg-surface hover:text-fg md:inline-flex"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Fullscreen</span>
            </button>
          )}

          {htmlContent && !isStreaming && (
            <>
              <button
                onClick={handleCopy}
                title="Copy HTML"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-zinc-300 transition-colors hover:bg-surface hover:text-fg"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleDownload}
                title="Download HTML"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-zinc-300 transition-colors hover:bg-surface hover:text-fg"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <DeployMenu
                html={htmlContent}
                origin="jarvis"
                className="[&_button]:h-8 [&_button]:border-border [&_button]:bg-background [&_button]:text-zinc-300"
              />
            </>
          )}
        </div>
      </div>

      {isViewingSnapshot && (
        <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-background px-4 py-2 text-xs text-muted-foreground">
          <span>Viewing restored snapshot</span>
          <button
            type="button"
            onClick={onBackToLive}
            className="rounded-md border border-border bg-panel px-2.5 py-1 font-medium text-fg transition-colors hover:bg-surface hover:text-fg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Back to live
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 overflow-hidden",
          visibleSectionCount === 2 && "lg:grid-cols-2",
        )}
      >
        {showSource && (
          <section
            className={cn(
              "flex min-h-0 flex-col",
              showPreview && "border-b border-border/80 lg:border-b-0 lg:border-r",
            )}
          >
            <div className="flex h-10 items-center justify-between border-b border-border/80 bg-panel px-4">
              <span className="text-xs font-medium text-zinc-300">Source</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {htmlContent ? `${htmlContent.length.toLocaleString()} chars` : "idle"}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-canvas p-4 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700/60 [&::-webkit-scrollbar-track]:bg-transparent">
              {htmlContent ? (
                <pre className="m-0 min-w-full whitespace-pre-wrap break-words font-mono text-xs leading-5 text-zinc-300">
                  <code>{htmlContent}</code>
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-xs rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center">
                    <p className="text-sm font-medium text-zinc-300">No artifact yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Generate or restore an HTML artifact to inspect the source here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {showPreview && (
          <section className="flex min-h-0 flex-col">
            <div className="flex h-10 items-center justify-between border-b border-border/80 bg-panel px-4">
              <span className="text-xs font-medium text-zinc-300">Sandbox</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{activeViewport.label}</span>
                {canFullscreen && (
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    title="Fullscreen preview"
                    aria-label="Fullscreen preview"
                    data-testid="jarvis-preview-fullscreen-btn-sandbox"
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] font-medium uppercase tracking-wide text-zinc-300 transition-colors hover:bg-surface hover:text-fg"
                  >
                    <Maximize2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-background p-4 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700/60 [&::-webkit-scrollbar-track]:bg-transparent">
              <div
                className="relative mx-auto h-full min-h-[360px] max-w-full overflow-hidden rounded-lg border border-border bg-white shadow-sm shadow-black/30 transition-[width] duration-200"
                style={{ width: activeViewport.width }}
              >
                {resolvedHtmlContent ? (
                  <iframe
                    srcDoc={resolvedHtmlContent}
                    sandbox="allow-scripts"
                    className="h-full w-full border-none"
                    title="Jarvis Sandbox Preview"
                  />
                ) : emptyPreview ? (
                  emptyPreview
                ) : isStreaming ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas text-sm text-muted-foreground">
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-surface">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-zinc-400" />
                    </div>
                    <span>Building live preview…</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-canvas text-sm text-muted-foreground">
                    Awaiting render...
                  </div>
                )}

                {isStreaming && resolvedHtmlContent && (
                  <div className="absolute inset-x-0 top-0 h-px bg-zinc-100 opacity-80 shadow-[0_0_18px_rgba(255,255,255,0.65)]" />
                )}
              </div>
            </div>
          </section>
        )}

        {!showSource && !showPreview && (
          <div className="flex min-h-0 items-center justify-center bg-canvas p-6">
            <div className="max-w-sm rounded-lg border border-border bg-panel p-5 text-center">
              <p className="text-sm font-medium text-fg">Artifact panels are hidden</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the layout controls to show Source, Preview, or reset the workspace.
              </p>
            </div>
          </div>
        )}
      </div>

      {isFullscreen &&
        resolvedHtmlContent &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex flex-col bg-canvas text-fg"
            style={{ height: "100dvh", maxHeight: "100dvh" }}
            data-testid="jarvis-preview-fullscreen"
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen HTML preview"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-panel px-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-fg">Preview</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">Fullscreen</span>
                {isStreaming && (
                  <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] text-emerald-400">
                    Live
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exitFullscreen}
                  title="Exit fullscreen"
                  aria-label="Exit fullscreen"
                  data-testid="jarvis-preview-fullscreen-exit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium uppercase tracking-wide text-zinc-300 transition-colors hover:bg-surface hover:text-fg"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
                <button
                  type="button"
                  onClick={exitFullscreen}
                  title="Close fullscreen"
                  aria-label="Close fullscreen"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-zinc-300 transition-colors hover:bg-surface hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-white">
              <iframe
                srcDoc={resolvedHtmlContent}
                sandbox="allow-scripts"
                className="h-full w-full border-none"
                style={{ height: "100%", minHeight: 0 }}
                title="Jarvis Fullscreen Preview"
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
