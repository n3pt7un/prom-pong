# PWA Mobile App Experience Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CyberPong PWA behave like a native app on mobile — no zoom, no sidescroll, no input focus zoom, with proper safe area insets for notched devices.

**Architecture:** Pure CSS + HTML meta approach (Approach A). All changes are declarative: a viewport meta update, global CSS rules in `styles.css`, named CSS classes for mobile-only safe area padding, and updated Tailwind classes in `Layout.tsx`. No JS runtime changes.

**Tech Stack:** React, Tailwind CSS, CSS `env()` safe-area variables, CSS `@media` queries, HTML viewport meta

**Spec:** `docs/superpowers/specs/2026-03-11-pwa-mobile-app-experience-design.md`

**Fallback options (in order):**
- B: Set `--sat`/`--sab` CSS vars via JS at startup if `env()` isn't respected in all browsers
- C: `tailwindcss-safe-area` plugin if safe-area values spread to many more components

---

## Chunk 1: Viewport meta + global CSS

### Task 1: Update viewport meta tag

**Files:**
- Modify: `source/index.html` (line 5)

- [ ] **Step 1: Update the viewport meta**

In `source/index.html`, replace line 5:

```html
<!-- before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- after -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

- `maximum-scale=1.0` + `user-scalable=no` — prevents all pinch/double-tap zoom
- `viewport-fit=cover` — extends layout into notch/Dynamic Island area; we control it via `env()` in CSS

- [ ] **Step 2: Commit**

```bash
git add source/index.html
git commit -m "fix(pwa): disable zoom and enable viewport-fit=cover for app-like mobile experience"
```

---

### Task 2: Global mobile CSS fixes

**Files:**
- Modify: `source/styles.css`

The file currently has two `@layer base` blocks (lines 6–30 and 33–44). We add to the second one and append a `@media` block.

- [ ] **Step 1: Extend the second `@layer base` block**

Find the second `@layer base` block (the one that starts with `* { border-color: ... }`). Replace it entirely with this expanded version:

```css
@layer base {
  * {
    border-color: hsl(var(--border));
    touch-action: manipulation;
  }

  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-sans, Inter, sans-serif);
    overflow-x: hidden;
  }

  input, select, textarea, button {
    font-size: max(16px, 1em);
  }
}
```

> - `touch-action: manipulation` on `*` — disables double-tap zoom. Browsers ignore this on scrollable containers so vertical scroll in modals/lists is unaffected.
> - `font-size: max(16px, 1em)` — iOS Safari zooms the viewport on focus when an element's `font-size < 16px`. `max()` never goes below 16px while preserving larger inherited sizes. This fixes the mobile league `<select>` (currently rendered at ≈11px) and any other small inputs.

- [ ] **Step 2: Add mobile-only overflow lock**

After all `@layer` blocks (at the bottom of `styles.css`), add:

```css
/* ─── Mobile app-like viewport lock ──────────────────────────────────── */
@media (max-width: 767px) {
  html {
    overflow: hidden;
    height: 100%;
  }
}
```

> **Why mobile-only:** `overflow: hidden` on `html` removes the document scroll container. On desktop this breaks all page scrolling. The `@media (max-width: 767px)` scope ensures it only applies to the mobile layout where the fixed top bar + fixed bottom nav create the scroll context instead.

- [ ] **Step 3: Verify build compiles cleanly**

```bash
cd source && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add source/styles.css
git commit -m "fix(pwa): prevent double-tap zoom and input focus zoom on iOS, lock mobile viewport"
```

---

## Chunk 2: Safe area insets in Layout

### Task 3: Top bar safe area

**Files:**
- Modify: `source/components/Layout.tsx` (find the mobile `<header>` element)

The mobile header is currently (search for `md:hidden fixed top-0`):
```tsx
<header className="md:hidden fixed top-0 left-0 right-0 z-40 h-[52px] bg-black/80 backdrop-blur-xl border-b border-white/8 flex items-center justify-between px-4">
```

- [ ] **Step 1: Add safe area top padding and height**

Replace it with:
```tsx
<header className="md:hidden fixed top-0 left-0 right-0 z-40 h-[calc(52px+env(safe-area-inset-top))] bg-black/80 backdrop-blur-xl border-b border-white/8 flex items-end justify-between px-4 pb-2 pt-[env(safe-area-inset-top)]">
```

Changes explained:
- `h-[52px]` → `h-[calc(52px+env(safe-area-inset-top))]` — header grows to accommodate the status bar
- `items-center` → `items-end` + `pb-2` — content sits at the bottom of the taller header (looks right on both notched and non-notched devices)
- `pt-[env(safe-area-inset-top)]` — pushes content below the status bar/notch

On devices without a notch `env(safe-area-inset-top)` resolves to `0px`, so the header stays exactly 52px tall and nothing changes visually.

---

### Task 4: Bottom nav safe area

**Files:**
- Modify: `source/components/Layout.tsx` (find the mobile `<nav>` element)

Current (search for `md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px]`):
```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-black/90 backdrop-blur-xl border-t border-white/8 flex items-stretch">
  {BOTTOM_TABS.map(...)}
</nav>
```

- [ ] **Step 1: Wrap tab buttons and add safe area padding**

Replace the `<nav>` opening tag and wrap the tab map in an inner `div`:

```tsx
<nav
  className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-xl border-t border-white/8"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  <div className="h-[60px] flex items-stretch">
    {BOTTOM_TABS.map(({ tab, icon: Icon, label, badge }) => {
      /* ... existing map body unchanged ... */
    })}
  </div>
</nav>
```

Changes explained:
- The outer `<nav>` loses its fixed height and gains `paddingBottom: env(safe-area-inset-bottom)` via inline style (inline style is correct here — this is mobile-only and there's no desktop override needed for this element, so specificity is not a concern)
- The inner `<div className="h-[60px]">` preserves the fixed 60px tap area for the nav buttons
- The nav background color now extends down through the safe area, giving a solid "filled" look above the home indicator

> **Why inline style here:** This `<nav>` is inside `md:hidden` so it never renders on desktop. No Tailwind desktop class needs to override this value. Inline `env()` is reliable and straightforward in this case.

---

### Task 5: Main content padding

**Files:**
- Modify: `source/styles.css` (add to the `@media (max-width: 767px)` block added in Task 2)
- Modify: `source/components/Layout.tsx` (update `<main>` className)

The current `<main>` (search for `pt-[60px] pb-[80px]`):
```tsx
<main
  className={cn(
    'relative z-10 px-4 pt-[60px] pb-[80px] md:pt-8 md:pb-8 transition-all duration-300',
    collapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'
  )}
>
```

> **Why not inline styles:** CSS `@media` rules cannot override inline styles (inline styles have `(1,0,0,0)` specificity, beating any class or media-query class). We instead use a named CSS class scoped to the mobile media query, which avoids the conflict entirely.

- [ ] **Step 1: Add `.app-main` CSS rule to the mobile media query in `styles.css`**

Find the `@media (max-width: 767px)` block added in Task 2 and extend it:

```css
@media (max-width: 767px) {
  html {
    overflow: hidden;
    height: 100%;
  }

  .app-main {
    padding-top: calc(60px + env(safe-area-inset-top));
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
  }
}
```

- [ ] **Step 2: Update `<main>` in `Layout.tsx`**

Replace the `<main>` element:

```tsx
<main
  className={cn(
    'app-main relative z-10 px-4 md:pt-8 md:pb-8 transition-all duration-300',
    collapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'
  )}
>
```

Changes:
- Add `app-main` class — at `< 768px` this sets `padding-top` and `padding-bottom` with safe area calculation
- Remove `pt-[60px] pb-[80px]` — `.app-main` handles this at mobile; `md:pt-8 md:pb-8` handles desktop
- `md:pt-8 md:pb-8` are inside a `@media (min-width: 768px)` block; `.app-main` is inside `@media (max-width: 767px)`. They don't conflict.

---

### Task 6: More sheet and FAB safe area offsets

**Files:**
- Modify: `source/styles.css` (add `.fab-stack` mobile rule)
- Modify: `source/components/Layout.tsx` (more sheet inline style, FAB class)

**More sheet** — this element is already inside `md:hidden`, so inline style is safe (no desktop override needed):

- [ ] **Step 1: Fix More sheet bottom offset**

Find the inner more-sheet div (search for `absolute bottom-[60px] left-0 right-0 bg-\[#0a0a0a\]`):

```tsx
className={cn(
  'absolute bottom-[60px] left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl transition-transform duration-300 max-h-[75vh] overflow-y-auto',
  moreOpen ? 'translate-y-0' : 'translate-y-full'
)}
```

Replace with (remove `bottom-[60px]` from className, add inline style):

```tsx
className={cn(
  'absolute left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-2xl transition-transform duration-300 max-h-[75vh] overflow-y-auto',
  moreOpen ? 'translate-y-0' : 'translate-y-full'
)}
style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
```

**FAB stack** — this element uses `md:bottom-8` for desktop override, so we must use a named CSS class (same reason as `<main>`):

- [ ] **Step 2: Add `.fab-stack` CSS rule to the mobile media query in `styles.css`**

Extend the `@media (max-width: 767px)` block:

```css
@media (max-width: 767px) {
  html {
    overflow: hidden;
    height: 100%;
  }

  .app-main {
    padding-top: calc(60px + env(safe-area-inset-top));
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
  }

  .fab-stack {
    bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
```

- [ ] **Step 3: Update FAB stack in `Layout.tsx`**

Find (search for `fixed bottom-[72px] md:bottom-8`):
```tsx
<div className="fixed bottom-[72px] md:bottom-8 right-5 z-[45] flex flex-col items-center gap-3">
```

Replace with:
```tsx
<div className="fab-stack fixed md:bottom-8 right-5 z-[45] flex flex-col items-center gap-3">
```

- Remove `bottom-[72px]` (`.fab-stack` handles it at mobile via the CSS rule)
- Keep `md:bottom-8` (desktop still uses this Tailwind class; it's in a `@media (min-width: 768px)` block, which doesn't conflict with `.fab-stack` in `@media (max-width: 767px)`)

---

### Task 7: Verify and commit

- [ ] **Step 1: Verify build compiles cleanly**

```bash
cd source && npm run build
```

Expected: no errors.

- [ ] **Step 2: Manual verification checklist**

Test on a physical iPhone or Safari DevTools with iPhone 14 Pro simulation (has Dynamic Island):

**Mobile:**
- [ ] Pinch-to-zoom does nothing
- [ ] Double-tap zoom does nothing
- [ ] Tapping the league `<select>` in the top bar does not zoom the viewport
- [ ] Tapping any text input does not zoom the viewport
- [ ] No horizontal scrollbar or sidescroll on any page
- [ ] Top bar clears the Dynamic Island / status bar (no content overlap)
- [ ] Bottom nav sits above the home indicator bar (no overlap), background extends to edge
- [ ] More sheet bottom edge clears the home indicator
- [ ] FAB buttons are above the home indicator
- [ ] Page content does not overlap with top bar or bottom nav

**Desktop (must be unaffected):**
- [ ] Sidebar scrolls normally
- [ ] Page content scrolls normally
- [ ] Inputs work and don't have unexpected large font sizes
- [ ] No unexpected overflow cutting off content

- [ ] **Step 3: Commit**

```bash
git add source/components/Layout.tsx source/styles.css
git commit -m "fix(pwa): add safe area insets to mobile header, bottom nav, more sheet, and FABs"
```

---

## Troubleshooting

**`env()` values not reflected (all zeros on non-Apple devices):**
This is expected on most Android devices and desktop — those devices have `safe-area-inset-*` = 0px. The layout will still work correctly; it just won't add any extra padding.

**Still zooming on input focus on iOS:**
The `font-size: max(16px, 1em)` rule may not override a more specific selector. Try:
```css
input:focus, select:focus, textarea:focus {
  font-size: 16px !important;
}
```

**Desktop page no longer scrolls:**
The `@media (max-width: 767px)` scope on `html { overflow: hidden }` should prevent this. If it still breaks at some breakpoint, narrow the media query to `(max-width: 640px)` or confirm the browser viewport width.

**More sheet or FAB `bottom` position wrong on Android:**
Android's safe-area-inset values are typically 0. If the layout looks off, check that `env(safe-area-inset-bottom)` is resolving to `0px` rather than an unexpected value.

**`md:bottom-8` not taking effect on FAB on desktop:**
Verify Tailwind's JIT has generated the `md:bottom-8` class. Run `npm run build` and inspect the built CSS for `.md\:bottom-8`.
