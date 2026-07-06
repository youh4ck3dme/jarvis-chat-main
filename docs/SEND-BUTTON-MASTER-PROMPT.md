# SEND BUTTON — MASTER PROMPT (500% verzia)

> Kompletný creative + motion + implementation brief pre Jarvis Chat.
> Žiadna šípka. Žiadny paper-plane. Len AnimatedOrb fyzika.

---

## IMAGE GENERATION PROMPT (copy-paste)

```
Ultra-premium dark-mode UI concept board, 16:9, 4K resolution, Figma-quality product design mockup.

TITLE at top in gradient white-to-pink typography: "Jarvis Chat — Send Button Concepts"

Three equal columns, each column is a glassmorphism card on deep charcoal background (#0c0a09) with subtle pink and purple radial glows.

COLUMN 1 — "01 SINGULARITY LAUNCH":
Show 3 micro-states stacked vertically inside the card:
- IDLE: chat composer bar with textarea placeholder, small iridescent orb button on right — 5 blurred colorful circles orbiting inside cyan orb shell (#cff1f4), colors: lavender #9e9fef, purple #c471ec, green #9bc761, periwinkle #ccd4f2, hot pink #f472b6
- TYPING: same composer with text "Ahoj Jarvis!", all 5 circles collapsed into center white singularity point with pink glow, progress meter above input
- CLICK: explosive burst rings emanating from singularity, dashed pink trajectory line shooting upward to a chat message bubble being born mid-air, composer dimmed

COLUMN 2 — "02 LIVING TYPING ORB":
Three micro-states:
- EMPTY: composer with NO send button — only dashed empty circle ghost outline
- GROWING: short text "Hej", tiny pink droplet orb (only #f472b6) emerging, 16px size
- DETACH: pink droplet flying along bezier curve upward leaving empty dashed socket, message bubble forming at trajectory end

COLUMN 3 — "03 MAGNETIC CONSTELLATION":
Three micro-states:
- DRIFT: normal blurred orb with scattered internal circles
- HOVER: 5 sharp unblurred dots arranged as arrow pointing top-right (constellation shape, no SVG icon), thin connecting lines between dots, label "HOVER"
- CLICK: particle burst — 5 dots exploding outward in different directions, faint AI avatar orb reassembling at top, composer faded to 40% opacity

Bottom bar: color palette swatches with hex labels. Timeline pills: IDLE → TYPING → HOVER → CLICK → FLIGHT → LANDING.

Style: Apple-level polish, soft shadows, no stock icons, no paper plane, no arrow SVG, futuristic organic UI, glass borders rgba(255,255,255,0.07), cinematic lighting, depth of field on orbs, motion implied through particle trails and dashed paths.

Mood: brutal, never-seen-before, alive, gravitational, sentient interface. NOT generic chat app. NOT ChatGPT clone.
```

---

## IMPLEMENTATION PROMPT (pre AI developera / Cursor)

```
Implement one of three AnimatedOrb send button concepts in Jarvis Chat composer.tsx.
Replace the static 36px AnimatedOrb button with a stateful SendOrb component.

EXISTING DESIGN SYSTEM (DO NOT BREAK):
- Composer: rounded-3xl white/dark card, fixed bottom, max-w-2xl
- AnimatedOrb: 5 circles (orb-circle-1..5), hue-rotate animations, colors:
  bg #cff1f4, c1 #9e9fef, c2 #c471ec, c3 #9bc761, c4 #ccd4f2, c5 #f472b6
- Stop state: AnimatedOrb variant="red" + Square overlay (keep as-is)
- Click sound already exists: playClickSound()
- Props: value (textarea), uploadedImage, isStreaming, disabled

REQUIREMENT: Zero lucide send icons. Zero ArrowUp. The orb IS the button.

═══════════════════════════════════════════════════════
CONCEPT 01 — SINGULARITY LAUNCH
═══════════════════════════════════════════════════════

STATES:
1. IDLE (value empty, no image):
   - Full AnimatedOrb 36px, circles orbit normally (existing CSS)

2. TYPING (value.length > 0 || uploadedImage):
   - collapseProgress = clamp(value.length / 50, 0.2, 1)
   - All 5 circles lerp transform toward center (50%, 50%) based on collapseProgress
   - White core dot fades in at center when collapseProgress > 0.6
   - Optional: char progress bar 2px above composer interior, pink gradient fill

3. HOVER (canSend && mouse enter):
   - scale(1.08), orbit speed ×1.5, pink ring pulse
   - box-shadow intensifies: 0 0 24px rgba(244,114,182,0.4)

4. CLICK (handleSend):
   - Phase A (0-50ms): all circles scale to 0, core expands to 2px white
   - Phase B (50-200ms): 2 burst rings scale 1→2.5 opacity 0.8→0 (CSS keyframe send-burst)
   - Phase C (200-600ms): trigger message-list "birth" — new user bubble animates from composer button getBoundingClientRect() to list position (FLIP or View Transitions API)
   - Composer textarea flashes opacity 0.3 then recovers
   - THEN call onSend() as today

5. DISABLED: opacity-50, no collapse, no hover

CSS KEYFRAMES TO ADD (globals.css):
- send-collapse (circles to center)
- send-singularity-pulse (core glow)
- send-burst-ring (expanding ring)
- send-bubble-birth (for message-list coordination)

═══════════════════════════════════════════════════════
CONCEPT 02 — LIVING TYPING ORB
═══════════════════════════════════════════════════════

STATES:
1. EMPTY: render NOTHING in send slot — empty 36px dashed border circle (border-stone-200/20)

2. GROWING (1-20 chars):
   - size = lerp(14, 28, value.length/20)
   - ONLY circle-5 (#f472b6) visible, no other circles
   - background: radial-gradient(#fda4d0, #f472b6)

3. MATURE (21+ chars or uploadedImage):
   - Full AnimatedOrb 36px
   - Overlay: last 3 chars of value in 5px white text center (optional glass)

4. HOVER: droplet wobble animation (translateY -2px oscillate)

5. CLICK:
   - Clone orb position, animate detached pink drop along cubic-bezier path upward 120px over 400ms
   - Send slot becomes dashed ghost again
   - onSend() fires at animation midpoint (200ms)
   - Drop fades into message bubble in list (shared transition)

SIZE FORMULA:
  const sendSize = value.length === 0 ? 0 : value.length < 21 ? 14 + (value.length/20)*14 : 36

═══════════════════════════════════════════════════════
CONCEPT 03 — MAGNETIC CONSTELLATION
═══════════════════════════════════════════════════════

STATES:
1. IDLE: normal AnimatedOrb with blur

2. TYPING: circle-5 (#f472b6) drifts toward right edge of orb (magnetize toward "exit")
   - transform based on min(value.length/30, 1)

3. HOVER:
   - Remove blur filter on all circles
   - Snap circles to ARROW CONSTELLATION positions (5 points):
     pt1 (top):    translate(-50%, -25%)  #9e9fef
     pt2 (mid-L):  translate(-78%,  5%)   #c471ec
     pt3 (mid-R):  translate(-22%,  5%)   #f472b6  ← tip
     pt4 (bot-L):  translate(-62%, 42%)   #9bc761
     pt5 (bot-R):  translate(-38%, 42%)   #ccd4f2
   - Draw SVG lines connecting points (opacity 0.3)
   - Transition 200ms cubic-bezier(0.16, 1, 0.3, 1)

4. CLICK:
   - Each circle gets random --dx/--dy CSS vars, particle-drift animation 400ms
   - Composer opacity 0.4 for 300ms
   - Particles converge on typing-indicator AnimatedOrb position in message-list
   - onSend() immediate

5. STREAMING: not applicable (stop button takes over)

═══════════════════════════════════════════════════════
SHARED TECHNICAL RULES
═══════════════════════════════════════════════════════

- Component: <SendOrb state={...} onSend={...} value={value} canSend={...} />
- aria-label="Send message" always
- disabled when !canSend
- prefers-reduced-motion: skip burst/flight, instant send
- Keep composer.test.tsx passing — update only if aria/state changes
- No new dependencies
- Match existing Tailwind + CSS animation patterns in globals.css

ACCEPTANCE CRITERIA:
□ User sees different visual for empty vs typing vs hover vs click
□ No send arrow icon anywhere
□ Pink #f472b6 (circle-5) is the hero particle in every concept
□ Click still plays playClickSound()
□ Stop button unchanged
□ Animation completes in <600ms total before message appears
```

---

## MOTION DESIGN SPEC (milliseconds)

| Fáza | Singularity | Living Orb | Constellation |
|------|-------------|------------|---------------|
| IDLE orbit period | 6s | — | 6s |
| TYPING response | 200ms lerp | 150ms grow | 200ms magnet |
| HOVER | scale 1.08, 150ms | wobble 1.5s loop | arrow snap 200ms |
| CLICK phase 1 | collapse 50ms | detach 0ms | burst 0ms |
| CLICK phase 2 | singularity 50ms | flight 400ms | drift 400ms |
| CLICK phase 3 | burst 200ms | land 200ms | merge 300ms |
| Total perceived | ~600ms | ~600ms | ~700ms |

**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` pre všetky transformácie (zhodné s `composer-intro`).

**Sound sync:** `playClickSound()` na frame 0 clicku. Pre Singularity: pridať optional low "whoosh" na burst (budúce).

---

## COPY PRE MIDJOURNEY / DALL-E / IMAGEN

```
Cinematic UI design sheet, dark luxury tech aesthetic, three-panel comparison layout, 
Jarvis AI chat send button evolution, iridescent glass orbs with internal colored 
particles, hot pink #f472b6 accent, singularity collapse effect, particle explosion, 
bezier flight trails, constellation arrow made of dots not icons, 
message bubble birth animation storyboard, 
Figma presentation quality, 8k, sharp typography, Slovak labels optional,
no paper plane, no generic send icon, brutalist organic futurism
--ar 16:9 --style raw --v 6
```

---

## ONE-LINER (ak potrebuješ len esenciu)

> **Tri send buttony bez ikoniek: (1) gravitácia — orb sa zrúti do singularity a exploduje do správy, (2) organika — ružová kvapka rastie s textom a odletí, (3) geometria — 5 bodov sa zoradí do šípky a rozletia sa do AI avatara. Kompletný lifecycle IDLE→LANDING, paleta #f472b6 hero, dark glass UI, 600ms motion.**