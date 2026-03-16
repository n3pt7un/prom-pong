# PWA Mobile App Experience — Design Spec

**Date:** 2026-03-11
**Status:** Approved
**Approach:** A (Pure CSS + HTML meta)

## Problem

The CyberPong PWA on mobile behaves like a website:
- Pinch-to-zoom and double-tap zoom are active
- Tapping an input causes iOS Safari to auto-zoom and the user must zoom back out
- Content can sidescroll unexpectedly
- No safe area padding means content collides with notches, Dynamic Islands, and home indicators

## Goal

Make the PWA feel like a native app: static viewport, no zoom, no sidescroll, content that respects device safe areas.

## Fallback Options

- **Approach B:** CSS custom properties (`--sat`, `--sab`) set via JS at startup — more maintainable if safe-area padding spreads to many components
- **Approach C:** `tailwindcss-safe-area` plugin — cleaner class names, adds a dependency

## Changes

### 1. `source/index.html`

Update the viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- `maximum-scale=1.0` + `user-scalable=no` — disables all zoom
- `viewport-fit=cover` — extends layout into notch/island areas, controlled via CSS `env()`

### 2. `source/styles.css`

Add to the `@layer base` block:

```css
html {
  overflow: hidden;
  height: 100%;
}

* {
  touch-action: manipulation;
}

input, select, textarea, button {
  font-size: max(16px, 1em);
}
```

- `html overflow: hidden` — body already has `overflow-x: hidden`; this seals it at root
- `touch-action: manipulation` — disables double-tap zoom; browsers ignore it on scroll containers so lists still scroll
- `font-size: max(16px, 1em)` — iOS Safari zooms on focus when font-size < 16px; `max()` keeps larger sizes intact

### 3. `source/components/Layout.tsx`

Four mobile zones need `env(safe-area-inset-*)` adjustments using Tailwind arbitrary values:

| Zone | Change |
|------|--------|
| Mobile top bar height | `h-[52px]` → `h-[calc(52px+env(safe-area-inset-top))]` |
| Mobile top bar padding | Add `pt-[env(safe-area-inset-top)]` |
| Mobile bottom nav height | `h-[60px]` → `h-[calc(60px+env(safe-area-inset-bottom))]` |
| Mobile bottom nav padding | Add `pb-[env(safe-area-inset-bottom)]` |
| Main content top padding (mobile) | `pt-[60px]` → `pt-[calc(60px+env(safe-area-inset-top))]` |
| Main content bottom padding (mobile) | `pb-[80px]` → `pb-[calc(80px+env(safe-area-inset-bottom))]` |
| More sheet bottom offset | `bottom-[60px]` → `bottom-[calc(60px+env(safe-area-inset-bottom))]` |
| FAB stack bottom offset | `bottom-[72px]` → `bottom-[calc(72px+env(safe-area-inset-bottom))]` |

## Verification

1. Open the app on a physical iPhone (or Safari DevTools with iPhone 14 Pro simulation)
2. Confirm: pinch-to-zoom does nothing
3. Confirm: tapping any input field does not zoom the viewport
4. Confirm: no horizontal scrollbar or sidescroll on any page
5. Confirm: bottom nav sits above the home indicator bar (not overlapping it)
6. Confirm: top bar clears the Dynamic Island / status bar
7. Confirm: desktop layout is unaffected (sidebar, scrolling, inputs all work normally)
