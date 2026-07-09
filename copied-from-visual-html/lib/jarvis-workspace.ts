export type JarvisSourceKind = "prompt" | "screenshot" | "figma" | "site";

export interface JarvisSourceItem {
  id: string;
  kind: JarvisSourceKind;
  label: string;
  detail?: string;
  createdAt: number;
}

export interface JarvisSourceBundle {
  id: string;
  items: JarvisSourceItem[];
  updatedAt: number;
}

export type JarvisBehaviorEventType =
  | "prompt"
  | "source"
  | "console"
  | "navigation"
  | "snapshot"
  | "restore"
  | "branch"
  | "compare"
  | "export";

export interface JarvisBehaviorEvent {
  id: string;
  type: JarvisBehaviorEventType;
  title: string;
  detail?: string;
  createdAt: number;
  snapshotId?: string;
  sourceId?: string;
}

export interface JarvisTextDiffLine {
  type: "same" | "add" | "remove";
  text: string;
}

export interface JarvisDeckSnapshot {
  id: string;
  title: string;
  createdAt: number;
  html: string;
  parentSnapshotId?: string | null;
  branchLabel?: string | null;
  previousSnapshotId?: string | null;
  compareSummary?: string | null;
}

export interface JarvisSnapshotLineageEntry {
  id: string;
  createdAt: number;
  branchLabel?: string | null;
}

function createJarvisId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createJarvisSourceItem(
  kind: JarvisSourceKind,
  label: string,
  detail?: string,
): JarvisSourceItem {
  return {
    id: createJarvisId("source"),
    kind,
    label,
    detail: detail?.trim() || undefined,
    createdAt: Date.now(),
  };
}

export function createJarvisSourceBundle(items: JarvisSourceItem[] = []): JarvisSourceBundle {
  return {
    id: createJarvisId("bundle"),
    items: [...items],
    updatedAt: Date.now(),
  };
}

export function upsertJarvisSourceItem(
  bundle: JarvisSourceBundle | null,
  nextItem: JarvisSourceItem,
): JarvisSourceBundle {
  const nextItems = bundle ? [...bundle.items] : [];
  const replacementIndex = nextItems.findIndex((item) => item.kind === nextItem.kind);
  if (replacementIndex >= 0) {
    nextItems.splice(replacementIndex, 1, nextItem);
  } else {
    nextItems.push(nextItem);
  }

  return {
    id: bundle?.id ?? createJarvisId("bundle"),
    items: nextItems,
    updatedAt: Date.now(),
  };
}

export function removeJarvisSourceItem(
  bundle: JarvisSourceBundle | null,
  itemId: string,
): JarvisSourceBundle {
  const nextItems = (bundle?.items ?? []).filter((item) => item.id !== itemId);
  return {
    id: bundle?.id ?? createJarvisId("bundle"),
    items: nextItems,
    updatedAt: Date.now(),
  };
}

export function clearJarvisSourceKind(
  bundle: JarvisSourceBundle | null,
  kind: JarvisSourceKind,
): JarvisSourceBundle {
  const nextItems = (bundle?.items ?? []).filter((item) => item.kind !== kind);
  return {
    id: bundle?.id ?? createJarvisId("bundle"),
    items: nextItems,
    updatedAt: Date.now(),
  };
}

export function summarizeJarvisSourceBundle(bundle: JarvisSourceBundle | null): string {
  if (!bundle || bundle.items.length === 0) return "No fused sources yet";
  return bundle.items.map((item) => item.label).join(" · ");
}

export function describeJarvisSourceBundle(bundle: JarvisSourceBundle | null): string {
  if (!bundle || bundle.items.length === 0) return "Waiting for source references";
  return `${bundle.items.length} fused source${bundle.items.length === 1 ? "" : "s"}`;
}

export function createJarvisBehaviorEvent(
  type: JarvisBehaviorEventType,
  title: string,
  detail?: string,
  extra?: Pick<JarvisBehaviorEvent, "snapshotId" | "sourceId">,
): JarvisBehaviorEvent {
  return {
    id: createJarvisId("event"),
    type,
    title,
    detail: detail?.trim() || undefined,
    createdAt: Date.now(),
    snapshotId: extra?.snapshotId,
    sourceId: extra?.sourceId,
  };
}

export function summarizeJarvisBehaviorEvent(event: JarvisBehaviorEvent): string {
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} · ${event.title}`;
}

export function findJarvisPreviousSnapshot<T extends JarvisSnapshotLineageEntry>(
  snapshots: T[],
  snapshotId: string,
): T | null {
  const index = snapshots.findIndex((snapshot) => snapshot.id === snapshotId);
  if (index < 0) return null;
  return snapshots[index + 1] ?? null;
}

export function diffJarvisText(previous: string, current: string): JarvisTextDiffLine[] {
  const previousLines = previous.trim().split("\n");
  const currentLines = current.trim().split("\n");
  const diff: JarvisTextDiffLine[] = [];

  let i = 0;
  let j = 0;

  while (i < previousLines.length || j < currentLines.length) {
    const prev = previousLines[i];
    const next = currentLines[j];

    if (prev === next) {
      if (prev !== undefined) {
        diff.push({ type: "same", text: prev });
      }
      i += 1;
      j += 1;
      continue;
    }

    const nextPrev = previousLines[i + 1];
    const nextCurr = currentLines[j + 1];

    if (next !== undefined && nextPrev === next) {
      diff.push({ type: "remove", text: prev ?? "" });
      i += 1;
      continue;
    }

    if (prev !== undefined && nextCurr === prev) {
      diff.push({ type: "add", text: next ?? "" });
      j += 1;
      continue;
    }

    if (prev !== undefined) {
      diff.push({ type: "remove", text: prev });
      i += 1;
    }
    if (next !== undefined) {
      diff.push({ type: "add", text: next });
      j += 1;
    }
  }

  return diff;
}

export function summarizeJarvisDiff(previous: string, current: string): string {
  const lines = diffJarvisText(previous, current);
  const added = lines.filter((line) => line.type === "add").length;
  const removed = lines.filter((line) => line.type === "remove").length;
  return `${added} added, ${removed} removed`;
}

export function buildJarvisDeckHtml(options: {
  title: string;
  sources?: JarvisSourceBundle | null;
  snapshots: JarvisDeckSnapshot[];
  events?: JarvisBehaviorEvent[];
}): string {
  const { title, sources, snapshots, events = [] } = options;
  const sourceSummary = summarizeJarvisSourceBundle(sources ?? null);
  const eventSummaryLimit = 5;

  const branchEventsBySnapshot = new Map<string, JarvisBehaviorEvent[]>();
  const compareEventsBySnapshot = new Map<string, JarvisBehaviorEvent[]>();
  events.forEach((event) => {
    if (!event.snapshotId) return;
    if (event.type === "branch") {
      branchEventsBySnapshot.set(event.snapshotId, [
        ...(branchEventsBySnapshot.get(event.snapshotId) ?? []),
        event,
      ]);
    }
    if (event.type === "compare") {
      compareEventsBySnapshot.set(event.snapshotId, [
        ...(compareEventsBySnapshot.get(event.snapshotId) ?? []),
        event,
      ]);
    }
  });

  const snapshotsWithLineage = snapshots.map((snapshot) => {
    const previousSnapshot = findJarvisPreviousSnapshot(snapshots, snapshot.id);
    const previousSnapshotId = snapshot.previousSnapshotId ?? previousSnapshot?.id ?? null;
    const compareSummary =
      snapshot.compareSummary ??
      (previousSnapshot ? summarizeJarvisDiff(previousSnapshot.html, snapshot.html) : null);
    const branchEvents = branchEventsBySnapshot.get(snapshot.id) ?? [];
    const compareEvents = compareEventsBySnapshot.get(snapshot.id) ?? [];

    return {
      ...snapshot,
      previousSnapshot,
      previousSnapshotId,
      compareSummary,
      branchEvents,
      compareEvents,
    };
  });

  interface JarvisDeckSlide {
    kicker: string;
    heading: string;
    body: string;
    code?: string;
    meta?: Array<{ label: string; value: string }>;
  }

  const slides: JarvisDeckSlide[] = [
    {
      kicker: "Jarvis",
      heading: title,
      body: sourceSummary,
    },
    ...(snapshotsWithLineage.length
      ? [
          {
            kicker: "Lineage",
            heading: "Snapshot genealogy",
            body: snapshotsWithLineage
              .map((snapshot, index) => {
                const label = snapshot.branchLabel ?? (index === 0 ? "Latest" : "Snapshot");
                const parent = snapshot.parentSnapshotId ?? "none";
                const previous = snapshot.previousSnapshotId ?? "none";
                const compare = snapshot.compareSummary ?? "root snapshot";
                return `${index + 1}. ${label} / ${snapshot.id} / parent: ${parent} / previous: ${previous} / compare: ${compare}`;
              })
              .join("\n"),
          },
        ]
      : []),
    ...snapshotsWithLineage.map((snapshot, index) => {
      const branchEvents = snapshot.branchEvents
        .slice(0, eventSummaryLimit)
        .map((event) => event.detail ?? event.title)
        .join("\n");
      const compareEvents = snapshot.compareEvents
        .slice(0, eventSummaryLimit)
        .map((event) => event.detail ?? event.title)
        .join("\n");

      return {
        kicker: snapshot.branchLabel ?? (index === 0 ? "Latest" : "Snapshot"),
        heading: snapshot.title,
        body: [
          `Saved at ${new Date(snapshot.createdAt).toLocaleString()}`,
          snapshot.compareSummary ? `Compare with previous: ${snapshot.compareSummary}` : null,
          branchEvents ? `Branch events:\n${branchEvents}` : null,
          compareEvents ? `Compare events:\n${compareEvents}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
        code: snapshot.html,
        meta: [
          { label: "Snapshot", value: snapshot.id },
          { label: "Parent", value: snapshot.parentSnapshotId ?? "none" },
          { label: "Previous", value: snapshot.previousSnapshotId ?? "none" },
          { label: "Branch", value: snapshot.branchLabel ?? (index === 0 ? "Latest" : "Root") },
          { label: "Compare", value: snapshot.compareSummary ?? "root snapshot" },
        ],
      };
    }),
    ...(events.length
      ? [
          {
            kicker: "Replay",
            heading: "Behavior timeline",
            body: events
              .slice(0, 8)
              .map(
                (event) =>
                  `${summarizeJarvisBehaviorEvent(event)}${event.detail ? ` — ${event.detail}` : ""}`,
              )
              .join("\n"),
          },
        ]
      : []),
  ];

  const slideMarkup = slides
    .map(
      (slide) => `
      <section class="slide">
        <p class="kicker">${escapeHtml(slide.kicker)}</p>
        <h1>${escapeHtml(slide.heading)}</h1>
        <p class="body">${escapeHtml(slide.body)}</p>
        ${
          slide.meta?.length
            ? `<div class="meta-grid">${slide.meta
                .map(
                  (item) => `
          <div class="meta">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>`,
                )
                .join("")}</div>`
            : ""
        }
        ${slide.code ? `<pre><code>${escapeHtml(slide.code)}</code></pre>` : ""}
      </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} — Jarvis deck</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #070707;
      color: #f5f5f5;
    }
    .deck {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px;
      display: grid;
      gap: 24px;
    }
    .slide {
      border: 1px solid #262626;
      background: #0b0b0b;
      border-radius: 12px;
      padding: 28px;
      min-height: 280px;
    }
    .kicker {
      margin: 0 0 12px;
      color: #7f7f7f;
      text-transform: uppercase;
      letter-spacing: .12em;
      font-size: 11px;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 30px;
      line-height: 1.15;
    }
    .body {
      margin: 0 0 20px;
      color: #b4b4b4;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 8px;
      margin: 0 0 20px;
    }
    .meta {
      min-width: 0;
      border: 1px solid #1f1f1f;
      border-radius: 8px;
      background: #080808;
      padding: 10px 12px;
    }
    .meta span {
      display: block;
      margin-bottom: 4px;
      color: #737373;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .meta strong {
      display: block;
      overflow-wrap: anywhere;
      color: #e5e5e5;
      font-size: 12px;
      line-height: 1.4;
    }
    pre {
      margin: 0;
      overflow: auto;
      padding: 16px;
      border-radius: 12px;
      background: #050505;
      border: 1px solid #1f1f1f;
      color: #e6e6e6;
      font-size: 12px;
      line-height: 1.5;
    }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
  </style>
</head>
<body>
  <main class="deck">
    ${slideMarkup}
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
