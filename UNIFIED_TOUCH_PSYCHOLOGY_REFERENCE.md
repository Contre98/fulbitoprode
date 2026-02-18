# Unified Touch Psychology Reference

Deep dive into mobile touch interaction, Fitts’ Law for touch, thumb zone anatomy, gesture psychology, and haptic feedback.

Adapted for **Native (iOS/Android)** and **Mobile Web (PWA)**.

---

## 1) Fitts’ Law for Touch

### The Fundamental Difference

```text
DESKTOP (Mouse/Trackpad):
├── Cursor size: 1 pixel (precision)
├── Visual feedback: Hover states (critical)
├── Error cost: Low (easy to retry)
└── Target acquisition: Fast, precise

MOBILE NATIVE & WEB (Finger):
├── Contact area: ~7mm - 10mm diameter (imprecise blob)
├── Visual feedback: NO HOVER (or worse, "Sticky Hover")
├── Error cost: High (frustrating retries, zoom accidents)
├── Occlusion: Finger covers the target
└── Target acquisition: Slower, needs larger targets
```

### The “Sticky Hover” Problem (Web-Exclusive)

On Mobile Web, assuming `:hover` exists is a UX crime.

- **Issue:** Tapping an element applies the `:hover` style, which can remain active until the next tap elsewhere.
- **Fix:** Wrap hover styles in media queries:

```css
@media (hover: hover) {
  /* hover styles here */
}
```

- **Substitute:** Use `:active` styles for immediate touch feedback.

### Minimum Touch Target Sizes

| Platform | Minimum | Recommended | CSS Implementation |
|---|---:|---:|---|
| iOS (HIG) | 44pt × 44pt | 48pt+ | `min-height: 44px; min-width: 44px;` |
| Android (Material) | 48dp × 48dp | 56dp+ | `padding: 12px;` (expand hit area) |
| Mobile Web (WCAG) | 24px × 24px* | 44px+ | WCAG 2.2 allows 24px if spaced 8px apart. Prefer 44px. |
| Critical Actions | — | 56–64px | Main CTAs (e.g., “Buy Now”, “Post”) |

### Visual Size vs Hit Area (CSS Padding Trick)

```text
┌─────────────────────────────────────┐
│         HIT AREA (Padding)          │
│    ┌─────────────────────────┐      │
│    │      VISUAL BUTTON      │      │
│    │    (Can be smaller)     │      │
│    └─────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

```css
.icon-button {
  width: 24px;       /* Visual size */
  height: 24px;
  padding: 12px;     /* Adds 12px around -> 48px hit area */
  margin: -12px;     /* Optional: pull layout back if needed */
  box-sizing: content-box;
}
```

---

## 2) Thumb Zone Anatomy (Browser-Aware)

### The “Browser Sandwich” Effect

On Mobile Web, the usable screen is smaller than it appears because of system/browser bars.

```text
┌─────────────────────────────────────┐
│    STATUS BAR (System)              │
├─────────────────────────────────────┤
│    URL / ADDRESS BAR (Top/Bottom)   │ ← Can collapse/expand!
├─────────────────────────────────────┤
│                                     │
│           SAFE CONTENT              │
│             AREA                    │
│                                     │
├─────────────────────────────────────┤
│    BROWSER TOOLBAR (Safari Bottom)  │ ← 44px - 80px occlusion
├─────────────────────────────────────┤
│    HOME INDICATOR (System Swipe)    │ ← Dangerous for clicks
└─────────────────────────────────────┘
```

### The “Safe” Bottom Zone

You cannot just place a button at `bottom: 0`.

- **Native:** Respect Safe Area Layout Guide.
- **Web:** Use `env(safe-area-inset-bottom)`.

### Placement Guidelines

| Element Type | Ideal Position | Web Consideration |
|---|---|---|
| Primary CTA | Bottom | Must add `padding-bottom: env(safe-area-inset-bottom)` |
| Tab bar | Bottom | Avoid fixed tabs on Web if browser bar is also bottom (visual clutter) |
| FAB | Bottom-right | Ensure `margin-bottom` clears Safari toolbar |
| Navigation | Top/Drawer | Top-left is safest from accidental browser gestures |
| Back Button | Top-left | Critical: do not rely only on Browser Back for in-app modal nav |

---

## 3) Touch vs Click Psychology

### Expectation Differences

| Aspect | Click (Desktop) | Touch (Mobile Web/Native) |
|---|---|---|
| Latency | < 10ms | Web can lag (~100–300ms) if not optimized |
| Feedback | Hover + Click | Active state only. Use `touch-action: manipulation` to remove tap delay |
| Precision | Pixel-perfect | “Fat finger” error radius (~10mm) |
| Context menu | Right-click | Long press (can conflict with Browser Copy/Share) |

### The “Fat Finger” Problem & Web Inputs

```text
Problem: Finger occludes target.
├── User can't see the checkbox they are tapping.
├── Native input fields zoom in automatically on focus (Web).

Solutions:
├── Web: Input font-size MUST be >= 16px to prevent auto-zoom on iOS.
├── Web: Use custom styled inputs (checkboxes) that are larger (24px+).
└── Feedback: Ripple effects (Material) or Active State (iOS) are mandatory.
```

---

## 4) Gesture Psychology & Conflicts

### The “Browser Conflict” Matrix

Before implementing a gesture on Mobile Web, check this matrix.
The browser usually wins unless explicitly mitigated.

| Your Gesture | Browser Conflict | Risk Level | Mitigation |
|---|---|---|---|
| Swipe Right (Nav) | History Back (iOS/Android) | 🔴 High | Avoid for critical nav. Use visible buttons. |
| Swipe Down | Refresh Page | 🟠 Medium | `overscroll-behavior-y: contain;` |
| Long Press | Context Menu (Copy/Image) | 🔴 High | `user-select: none` + `onContextMenu` prevention |
| Edge Swipe | Switch Tab (Android) | 🔴 High | Impossible to override reliably. Avoid edge gestures. |
| Pinch | Zoom Page | 🟡 Low | `touch-action: none` / viewport strategy |

### Gesture Affordance Design

Since hover is gone, users need visual clues:

1. **Visual Peek:** Show next card peeking from the side.
2. **Pagination Dots:** Communicate horizontal scroll.
3. **Onboarding Overlay:** “Swipe to delete” (use sparingly).
4. **Scrollbars:** Often hidden on mobile; don’t rely on them.

---

## 5) Haptic Feedback (The Great Divide)

### Native vs Web Gap

- **Native app:** Full access to advanced haptics.
- **Android Web:** Good support via `navigator.vibrate()`.
- **iOS Web:** Historically unreliable/no support in Safari.

### Haptic Strategy

Design for **visual haptics first**.

Because vibration cannot be trusted on iOS Web:

1. **Visual Flash:** Button background changes instantly on touch start.
2. **Audio (rare):** Subtle click (risky, often muted).
3. **Android enhancement:** Add vibration for compatible devices, but never depend on it.

### Android Web Patterns (`navigator.vibrate`)

| Action | Pattern (ms) | Usage |
|---|---|---|
| Tap | `vibrate(5)` | Ultra-short tick (if hardware supports) |
| Success | `vibrate([50, 50, 50])` | Double blip |
| Error | `vibrate([50, 100, 50, 100])` | Long shake pattern |

---

## 6) Mobile Cognitive Load

### “Tourist” vs “Resident” Mindset

- **Native users (Residents):** Installed app, higher commitment, willing to learn gestures.
- **Web users (Tourists):** Arrive via link, low commitment, quick to bounce if confused.

### Reducing Load (Web-Specific)

1. **One primary action per screen.**
   - Avoid clutter (e.g., immediate “Install App” banners).

2. **Login friction**
   - Web: Support WebAuthn + password autofill attributes.
   - Native: Biometrics.

3. **Back button trauma**
   - Users fear Back will exit app/site.
   - Use History API so Back closes modals/menus first.

---

## 7) Touch Accessibility

### WCAG 2.5.8 (Target Size)

Target size must be **≥ 44×44 CSS px**.

Exception: smaller targets are acceptable only with sufficient spacing (e.g., 8px radius) from nearby targets.

```css
button {
  min-height: 44px;
  min-width: 44px;
  margin: 8px; /* Safe spacing */
}
```

### Semantic HTML for Touch

Mobile screen readers depend on proper semantics.

- `div onClick={...}` = **Bad** (weak focus/keyboard behavior)
- `button onClick={...}` = **Good** (native focus + keyboard support, including iPad hardware keyboards)

---

## 8) Emotion in Touch

### The “App-Like” Feel on Web

To make Web feel native-like, tune interaction physics:

1. **Scroll bounce**
   - iOS Native uses rubber-banding.
   - Web: `-webkit-overflow-scrolling: touch;` (legacy but relevant).

2. **Tap highlight color**
   - Browsers may add gray highlight on tap.
   - Fix: `-webkit-tap-highlight-color: transparent;` (then provide your own active state).

3. **Scroll chaining**
   - Modal reaches end → body starts scrolling.
   - Fix: `overscroll-behavior: contain;` on modals.

---

## 9) Touch Psychology Checklist (Before Every Screen)

- [ ] Are touch targets ≥ 44px (or padded hit area)?
- [ ] Is the primary CTA in the safe zone (above home indicator)?
- [ ] Did I remove `:hover` styles or wrap them in `@media (hover: hover)`?
- [ ] Web: Did I set input font-size to 16px (prevent iOS auto-zoom)?
- [ ] Web: Did I manage Browser Back behavior for modals?
- [ ] Web: Is `user-select: none` applied where accidental text selection is harmful?
- [ ] Android: Is haptic feedback present? iOS: Is visual feedback immediate?

---

## 10) Quick Reference Card

### Touch Target Sizes (CSS)

```css
/* Golden rule for mobile CSS */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;                /* for smaller visual icons */
  touch-action: manipulation;   /* removes tap delay */
}
```

### Safe Areas (CSS)

```css
/* Golden rule for bottom bars */
.bottom-bar {
  padding-bottom: env(safe-area-inset-bottom);
  bottom: 0;
  position: fixed;
}
```

### Browser Gestures to Watch

- Swipe Right → History Back (avoid conflict)
- Swipe Down → Refresh (use `overscroll-behavior-y: contain`)
- Long Press → Context Menu (use `onContextMenu` prevention where appropriate)

> Users don’t care whether it’s Native or Web.
> They care whether it feels broken.
>
> If they tap and nothing happens for 100ms, or the page zooms when they tap a control, trust is broken.
