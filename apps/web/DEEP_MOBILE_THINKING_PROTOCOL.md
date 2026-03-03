# Unified Mobile Thinking Protocol (iOS, Android, Mobile Web)

This document prevents AI from relying on memorized defaults and forces genuine, context-aware thinking.

It defines mechanisms to avoid standard AI training defaults in **Mobile App** and **Mobile Web** development.

The layout decomposition approach is applied to the constraints of handheld devices.

---

## 🧠 Deep Mobile Thinking Protocol

> **Mandatory before every mobile project (Native or Web).**

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DEEP MOBILE THINKING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ CONTEXT SCAN                                               │
│     └── What are my assumptions for this project?               │
│         └── QUESTION these assumptions                          │
│                                                                 │
│  2️⃣ ANTI-DEFAULT ANALYSIS                                      │
│     └── Am I applying a memorized pattern?                      │
│         └── Is this pattern REALLY the best for THIS project?   │
│                                                                 │
│  3️⃣ TRI-PLATFORM DECOMPOSITION                                 │
│     └── Did I think about iOS, Android AND Mobile Web?          │
│         └── How does the Browser Chrome (URL bar) affect this?  │
│                                                                 │
│  4️⃣ TOUCH INTERACTION BREAKDOWN                                │
│     └── Did I analyze each interaction individually?            │
│         └── Fitts' Law / Thumb Zone / No Hover States?          │
│                                                                 │
│  5️⃣ PERFORMANCE IMPACT ANALYSIS                                │
│     └── Native: Memory/Battery | Web: Bundle Size/First Paint   │
│         └── Is the default solution performant on 4G/LTE?       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚫 AI Mobile Defaults (Forbidden List)

Using these patterns automatically is **forbidden**.

The following patterns are “defaults” commonly learned from training data.
Before using any of them, **question** and **consider alternatives**.

```text
┌─────────────────────────────────────────────────────────────────┐
│                 🚫 AI MOBILE SAFE HARBOR                        │
│           (Default Patterns - Never Use Without Questioning)    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NAVIGATION DEFAULTS:                                           │
│  ├── Tab bar for every project (Would drawer be better?)        │
│  ├── Hamburger menu on Web (Is it hiding core features?)        │
│  ├── "Home" tab on left (What does user behavior say?)          │
│  └── Back button in UI (Does it conflict with Browser Back?)    │
│                                                                 │
│  STATE & URL MANAGEMENT DEFAULTS:                               │
│  ├── Redux everywhere (Is Zustand/Context sufficient?)          │
│  ├── Hiding state in memory (Should it be in the URL?)          │
│  ├── Modals without routes (Does "Back" close modal or exit?)   │
│  └── BLoC for every Flutter project (Is Riverpod more modern?)  │
│                                                                 │
│  LIST & LAYOUT DEFAULTS:                                        │
│  ├── FlatList/VirtualScroll default (Is pagination needed?)     │
│  ├── 100vh on Mobile Web (Does address bar cut off content?)    │
│  ├── Fixed Headers (Do they consume too much landscape mode?)   │
│  └── Hover effects (Do they require "double tap" on mobile?)    │
│                                                                 │
│  UI PATTERN DEFAULTS:                                           │
│  ├── FAB bottom-right (Is bottom-left more accessible?)         │
│  ├── Pull-to-refresh (Does it trigger Browser Refresh?)         │
│  ├── Swipe-to-delete (Does it trigger Browser History Nav?)     │
│  └── Bottom sheet for everything (Is full screen better?)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Component Decomposition (Mandatory)

Perform this analysis before designing any screen:

```text
SCREEN: [Screen Name]
├── PRIMARY ACTION: [What is the main action?]
│   └── Is it in thumb zone? [Yes/No → Why?]
│
├── TOUCH TARGETS: [All tappable elements]
│   ├── [Element 1]: [Size]pt/px → >44px/48px?
│   ├── [Element 2]: [Size]pt/px → >44px/48px?
│   └── Spacing: [Gap] → Accidental tap risk?
│
├── SCROLLABLE CONTENT:
│   ├── Native: FlatList/FlashList
│   ├── Web: Windowing/Virtualization needed?
│   └── Height Strategy: 100dvh vs 100vh? (Address bar shift)
│
├── STATE & URL REQUIREMENTS:
│   ├── Is local state sufficient?
│   ├── Should this state be shareable? (URL Params)
│   └── Does the "Back" button break the flow?
│
├── TRI-PLATFORM DIFFERENCES:
│   ├── iOS: [System gestures/SafeArea]
│   ├── Android: [Hardware Back Button]
│   └── Web: [Browser Chrome/Address Bar/History API]
│
├── OFFLINE CONSIDERATION:
│   ├── Native: Local DB/AsyncStorage
│   └── Web: Service Worker/LocalStorage/React Query
│
└── PERFORMANCE IMPACT:
    ├── JS Bundle Size (Web Critical)
    ├── Image Optimization (WebP/AVIF + srcset)
    └── Animation performance (CSS Transform vs JS)
```

---

## 🎯 Pattern Questioning Matrix

Ask these questions for every default pattern.

### Navigation Pattern Questioning

| Assumption | Question | Alternative |
|---|---|---|
| “I’ll use tab bar” | How many destinations? | 3 → minimal tabs, 6+ → drawer |
| “Bottom nav” | Does keyboard break it? | `interactive-widget=resizes-content` |
| “Stack navigation” | Does URL update? (Web) | Deep linking strategy is **mandatory** |
| “Custom Back Button” | Does it duplicate browser back? | Use system/browser back exclusively |

### State & Data Pattern Questioning

| Assumption | Question | Alternative |
|---|---|---|
| “Global Store” | Is it shareable? | URL State (Search Params) |
| “Pull to Refresh” | Web conflict? | Button or “New Content” toast |
| “Infinite Scroll” | Is footer accessible? | “Load More” button |
| “Auto-playing video” | Data saver mode? | Click to play / low-res preview |

### Layout Pattern Questioning

| Assumption | Question | Alternative |
|---|---|---|
| “100vh height” | Mobile Safari safe? | `100dvh` or JS-calculated height |
| “Hover states” | Touch-device friendly? | Active states or focus rings |
| “Fixed Bottom” | Safari bottom bar? | `env(safe-area-inset-bottom)` |
| “Modals” | Does Back close it? | Intercept back press / hash routing |

---

## 🧪 Anti-Memorization Test

Ask yourself before every solution:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ANTI-MEMORIZATION CHECKLIST                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  □ Did I pick this solution "because I always do it this way"?  │
│    → If YES: STOP. Consider alternatives.                       │
│                                                                 │
│  □ Is this a pattern I've seen frequently in training data?     │
│    → If YES: Is it REALLY suitable for THIS project?            │
│                                                                 │
│  □ Did I consider the "Browser Chrome" (Address Bar/Nav)?       │
│    → If NO: Redesign vertical spacing (dvh units).              │
│                                                                 │
│  □ Did I consider an alternative approach?                      │
│    → If NO: Think of at least 2 alternatives, then decide.      │
│                                                                 │
│  □ Did I think platform-specifically (iOS/Android/Web)?         │
│    → If NO: Analyze all three contexts separately.              │
│                                                                 │
│  □ Did I consider performance impact (Network/CPU)?             │
│    → If NO: Check Bundle size, First Paint, Re-renders.         │
│                                                                 │
│  □ Is this solution suitable for THIS project's CONTEXT?        │
│    → If NO: Customize based on context.                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Context-Based Decision Protocol

Think differently based on project type:

```text
DETERMINE PROJECT TYPE:
        │
        ├── E-Commerce App
        │   ├── Nav: Tab (Home, Search, Cart, Account)
        │   ├── Lists: Product grids (virtualized, image optimized)
        │   ├── Native: Push notifications, Apple/Google Pay
        │   ├── Web: SEO (SSR), auto-fill inputs
        │   └── Offline: Cart persistence
        │
        ├── Social/Content App
        │   ├── Nav: Tab (Feed, Search, Create, Notify, Profile)
        │   ├── Lists: Infinite scroll with restoration
        │   ├── Native: Background uploads, haptics
        │   ├── Web: Shareable URLs for every post/modal
        │   └── Performance: Feed skeleton loading
        │
        ├── Productivity/SaaS App
        │   ├── Nav: Drawer/Rail (responsive to tablet/desktop)
        │   ├── Lists: Data tables, complex forms
        │   ├── Native: File system access, biometrics
        │   ├── Web: Keyboard shortcuts, PWA installation
        │   └── Offline: Optimistic UI updates
        │
        └── Utility App
            ├── Nav: Minimal (stack-only possible)
            ├── Lists: Minimal
            ├── Native: Widgets, fast startup
            ├── Web: Instant load (small bundle), manifest
            └── Special: Geolocation permissions
```

---

## 🔄 Interaction Breakdown

Perform this analysis before adding any gesture:

```text
GESTURE: [Gesture Type]
├── DISCOVERABILITY:
│   └── How will users discover this gesture?
│       ├── Is there a visual hint?
│       └── Is there a visible button alternative? (MANDATORY)
│
├── PLATFORM CONVENTION:
│   ├── iOS: Edge swipe back, pull-down search
│   ├── Android: Universal Back, long-press selection
│   └── Web: Long press = context menu (Caution)
│
├── CONFLICT CHECK:
│   ├── Does it conflict with system gestures?
│   │   ├── iOS: Swipe back / Home indicator
│   │   ├── Android: Back gesture
│   │   └── Web: Swipe nav, pull-to-refresh, text selection
│   └── Is it consistent with other app gestures?
│
└── FEEDBACK:
    ├── Native: Haptics + visual
    └── Web: Visual (haptics support is limited)
```

---

## 🎭 Spirit Over Checklist (Tri-Platform Edition)

Passing the checklist is not enough.

| ❌ Self-Deception | ✅ Honest Assessment |
|---|---|
| “Touch target is 44px” (but grouped tightly) | “Can user fat-finger this without error?” |
| “It’s responsive” (just shrinks width) | “Does the layout adapt to device context?” |
| “Works on my iPhone” | “Did I test on a $100 Android and Mobile Chrome?” |
| “Offline support exists” | “Does the PWA/App recover gracefully from airplane mode?” |
| “URL updates” (but modal doesn’t close on back) | “Does Back do exactly what users expect?” |

> 🔴 Passing the checklist is **not** the goal. Creating great mobile UX **is** the goal.

---

## 📝 Mobile Design Commitment

Fill this at the start of every mobile project.

```text
📱 MOBILE DESIGN COMMITMENT

Project: _______________
Target: iOS / Android / Mobile Web (PWA)

1. Default pattern I will NOT use in this project:
   └── _______________

2. Context-specific focus for this project:
   └── _______________

3. Platform-specific differences I will implement:
   ├── iOS: _______________
   ├── Android: _______________
   └── Web: _______________ (e.g., URL routing, PWA manifest)

4. Area I will specifically optimize for performance:
   └── _______________ (e.g., Bundle size, image loading)

5. Unique challenge of this project:
   └── _______________

🧠 If I can't fill this commitment → I don't understand the project well enough.
   → Go back, understand context better, ask the user.
```

---

## 🚨 Mandatory Before Every Mobile Work

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PRE-WORK VALIDATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  □ Did I complete Component Decomposition?                      │
│  □ Did I fill the Pattern Questioning Matrix?                   │
│  □ Did I pass the Anti-Memorization Test?                       │
│  □ Did I make context-based decisions?                          │
│  □ Did I analyze Interaction Breakdown (Native vs Web)?         │
│  □ Did I fill the Mobile Design Commitment?                     │
│                                                                 │
│  ⚠️ Do not write code without completing these!                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
