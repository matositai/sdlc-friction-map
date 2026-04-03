# Design System Specification: The Kinetic Console

## 1. Overview & Creative North Star
**Creative North Star: "The Neural Command Center"**

This design system is engineered to transform dense engineering data into high-velocity insights. Moving beyond the "flat dashboard" trope, it adopts a high-tech, cinematic aesthetic inspired by advanced telemetry and performance engineering. We break the "template" look through **Tonal Depth** and **Asymmetric Information Density**. 

The interface should feel like a living machine—precise, deep, and illuminated from within. We prioritize "Optical Weight" over structural lines; hierarchy is defined by light and layering, creating a professional environment that rewards the technical rigor of EA Sports engineering teams.

---

## 2. Colors & Surface Philosophy
The palette utilizes a deep, "Void" background (`#0c0e11`) to allow vibrant data accents to pop with maximum contrast.

### Surface Hierarchy & The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. They clutter the UI and distract from the data. Instead:
- **Spatial Separation:** Define sections by shifting from `surface` to `surface-container-low` or `surface-container-high`.
- **Nesting:** Treat the UI as stacked sheets of darkened glass. A `surface-container-lowest` card should sit atop a `surface-container-low` section to create a soft, natural inset.
- **The Glass & Gradient Rule:** For floating modals or "Heads-Up Display" (HUD) elements, use `surface-bright` with a 60% opacity and a `20px` backdrop-blur. 
- **Signature Glow:** Use a subtle linear gradient on primary actions: `primary` (#69daff) to `primary-container` (#00cffc) at a 135-degree angle.

### Key Tokens
*   **Background:** `#0c0e11` (The Foundation)
*   **Primary:** `#69daff` (Electric Cyan - Action/Focus)
*   **Secondary:** `#00ffa3` (Neon Mint - Success/Flow)
*   **Tertiary:** `#ffc965` (Amber - Warning/Attention)
*   **Error:** `#ff716c` (Critical/Blocker)

---

## 3. Typography
We use a dual-typeface system to balance technical precision with high-end editorial flair.

*   **Display & Headlines (Space Grotesk):** A geometric sans-serif that feels engineered. Use `display-lg` to `headline-sm` for high-level metrics and page titles. The wide apertures and technical look reflect the "Neural Command Center" aesthetic.
*   **Interface & Data (Inter):** A workhorse for readability. Used for all `title`, `body`, and `label` roles. 
*   **Hierarchy Note:** High-density data tables should utilize `label-sm` (0.6875rem) with increased letter-spacing (+0.02em) to maintain clarity in complex engineering logs.

---

## 4. Elevation & Depth
In this system, elevation is an atmospheric property, not a shadow effect.

*   **The Layering Principle:** Depth is achieved by stacking. 
    *   *Level 0:* `surface` (Base)
    *   *Level 1:* `surface-container-low` (Content Areas)
    *   *Level 2:* `surface-container-highest` (Interactive Cards/Tools)
*   **Ambient Shadows:** For floating elements (Popovers/Modals), use a "Nebula Shadow": `0px 24px 48px rgba(0, 0, 0, 0.5)`. Never use pure black shadows; let the background color influence the shadow's tint.
*   **The Ghost Border:** If visual containment is required for accessibility, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Complex Data Tables
*   **Structure:** No vertical or horizontal lines. Use `surface-container-low` for the header and alternating `surface-container-lowest` for rows (zebra striping) only if the table exceeds 20 rows.
*   **Spacing:** Use `spacing-2.5` (0.5rem) for compact density.

### Status Indicators (High-Tech Signage)
*   **Style:** Do not use simple circles. Use small, rectangular "pills" with a `0.25rem` radius. 
*   **Illumination:** Apply an inner-glow effect using the `on-primary-container` or `on-secondary-container` colors to make indicators look like backlit LEDs.

### Flowcharts & Heatmaps
*   **Flow Lines:** Use `outline` at 40% opacity with `primary` or `secondary` "pulse" animations for active data streams.
*   **Heatmaps:** Use a gradient ramp from `surface-container-highest` (Cold) to `primary` (Mid) to `tertiary` (Hot). Avoid red for heatmaps to prevent confusion with `error` states.

### Interactive Elements
*   **Buttons:** 
    *   *Primary:* Solid `primary` gradient, `on-primary` text, `0.375rem` radius.
    *   *Tertiary:* Transparent background with `primary` text. On hover, shift background to `surface-container-high`.
*   **Input Fields:** Use `surface-container-highest` for the field body. The "active" state is indicated by a 2px `primary` bottom-border only—no full box focus.

---

## 6. Do’s and Don'ts

### Do
*   **DO** use `surface-container` shifts to group related engineering metrics.
*   **DO** use `spaceGrotesk` for large, single-number metrics to give them "hero" importance.
*   **DO** leverage the `secondary` (Neon Mint) color for "System Healthy" indicators to provide a calming contrast to the dark theme.
*   **DO** use `spacing-16` (3.5rem) for top-level margins to let dense data breathe.

### Don’t
*   **DON'T** use `outline` (100% opacity) for card borders. It breaks the "Neural" immersion.
*   **DON'T** use standard tooltips. Use "HUD-style" tooltips with `backdrop-blur` and a `primary` left-edge accent.
*   **DON'T** use 90-degree corners. Even in a "technical" tool, use at least the `sm` (0.125rem) or `md` (0.375rem) roundedness to keep the UI from feeling dated and "Windows 95."
*   **DON'T** clutter the view with dividers. If you think you need a line, use `spacing-4` (0.9rem) of empty space instead.