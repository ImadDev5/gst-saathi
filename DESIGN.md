---
name: GSTSaathi
colors:
  background: "#0a0e1a"
  on-background: "#ffffff"
  void: "#0a0e1a"
  surface:
    DEFAULT: "#111625"
    raised: "#1a1f30"
    overlay: "#0e121f"
    sidebar: "#030712"
  on-surface:
    primary: "#ffffff"
    secondary: "#9ca3af"
    muted: "#6b7280"
  outline:
    DEFAULT: rgba(255, 255, 255, 0.08)
    strong: rgba(255, 255, 255, 0.15)
    input: "#374151"
  primary:
    DEFAULT: "#00d4ff"
    dim: "#009fc4"
    on-primary: "#000000"
  accent:
    violet: "#7c3aed"
    gold: "#fbbf24"
    emerald: "#34d399"
    amber: "#f59e0b"
    red: "#ef4444"
    orange: "#f97316"
    yellow: "#eab308"
    blue: "#3b82f6"
    purple: "#a855f7"
    pink: "#ec4899"
  gradient:
    primary-solid: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)
    text-white: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)
    text-accent: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)
    footer-cta: linear-gradient(to right, #38bdf8, #6366f1)
    progress-bar: linear-gradient(to right, #06b6d4, #a855f7)
  status:
    eligible:
      background: rgba(52, 211, 153, 0.10)
      color: "#34d399"
      border: rgba(52, 211, 153, 0.30)
    blocked:
      background: rgba(239, 68, 68, 0.10)
      color: "#ef4444"
      border: rgba(239, 68, 68, 0.30)
    rcm:
      background: rgba(168, 85, 247, 0.10)
      color: "#a855f7"
      border: rgba(168, 85, 247, 0.30)
    conditional:
      background: rgba(249, 115, 22, 0.15)
      color: "#f97316"
    needs_invoice:
      background: rgba(59, 130, 246, 0.15)
      color: "#3b82f6"
    at_risk:
      background: rgba(234, 179, 8, 0.15)
      color: "#eab308"
    time_barred:
      background: rgba(168, 85, 247, 0.15)
      color: "#a855f7"
    personal:
      background: rgba(236, 72, 153, 0.15)
      color: "#ec4899"
    unknown:
      background: rgba(107, 114, 128, 0.10)
      color: "#6b7280"
      border: rgba(107, 114, 128, 0.30)
  glass:
    background: rgba(255, 255, 255, 0.02)
    background-hover: rgba(255, 255, 255, 0.05)
    border: rgba(255, 255, 255, 0.05)
    border-hover: rgba(0, 212, 255, 0.30)
    border-strong: rgba(255, 255, 255, 0.06)
typography:
  fonts:
    display:
      family: Space Grotesk
      weights: [300, 400, 500, 600, 700]
      usage: Headings, display text, brand name, hero sections
    sans:
      family: Plus Jakarta Sans
      weights: [300, 400, 500, 600]
      usage: Body text, form labels, UI copy
    mono:
      family: JetBrains Mono
      weights: [400, 700]
      usage: Code, terminal text, data values, navigation items, status badges
  scale:
    hero:
      fontSize: 54px
      fontSizeMobile: 72px
      fontWeight: 700
      fontFamily: display
      letterSpacing: "-0.02em"
    heading-1:
      fontSize: 44px
      fontSizeMobile: 56px
      fontWeight: 700
      fontFamily: display
      letterSpacing: "-0.01em"
    heading-2:
      fontSize: 32px
      fontWeight: 700
      fontFamily: display
    heading-3:
      fontSize: 24px
      fontWeight: 700
      fontFamily: display
    heading-4:
      fontSize: 22px
      fontWeight: 600
      fontFamily: display
    body-lg:
      fontSize: 18px
      fontWeight: 400
      fontFamily: sans
      lineHeight: 1.75
    body-md:
      fontSize: 14px
      fontWeight: 400
      fontFamily: sans
      lineHeight: 1.6
    body-sm:
      fontSize: 12px
      fontWeight: 400
      fontFamily: sans
    label-lg:
      fontSize: 14px
      fontWeight: 600
      fontFamily: sans
    label-md:
      fontSize: 12px
      fontWeight: 500
      fontFamily: sans
      letterSpacing: "0.05em"
      textTransform: uppercase
    label-sm:
      fontSize: 10px
      fontWeight: 500
      fontFamily: mono
      textTransform: uppercase
      letterSpacing: "0.1em"
    metric-value:
      fontSize: 32px
      fontWeight: 700
      fontFamily: mono
      lineHeight: 1
    nav-item:
      fontSize: 14px
      fontWeight: 400
      fontFamily: mono
      letterSpacing: "0.02em"
    badge:
      fontSize: 10px
      fontWeight: 500
      fontFamily: mono
    table-header:
      fontSize: 12px
      fontWeight: 500
      fontFamily: sans
      letterSpacing: "0.05em"
      textTransform: uppercase
  tracking:
    tight: "-0.02em"
    normal: "0"
    wide: "0.02em"
    wider: "0.05em"
    widest: "0.1em"
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
  container-padding: 24px
  section-vertical: 96px
  card-padding:
    compact: 16px
    standard: 24px
    spacious: 32px
    hero: 40px
  input-padding-y: 12px
  input-padding-x: 16px
  button-padding-y-lg: 16px
  button-padding-x-lg: 32px
  button-padding-y-md: 12px
  button-padding-x-md: 24px
  button-padding-y-sm: 6px
  button-padding-x-sm: 12px
  sidebar-width: 224px
  grid-gap:
    tight: 8px
    standard: 16px
    relaxed: 24px
    wide: 32px
radii:
  none: 0
  xs: 2px
  sm: 4px
  DEFAULT: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 16px
  full: 9999px
elevation:
  glass-card-default:
    backdrop-blur: 12px
    shadow: 0 0 30px rgba(0, 212, 255, 0)
    shadow-hover: 0 0 30px rgba(0, 212, 255, 0.1)
    transform-hover: translateY(-5px)
  button-solid:
    shadow: 0 4px 15px rgba(0, 212, 255, 0.3)
    shadow-hover: 0 0 30px rgba(0, 212, 255, 0.5)
  button-neon:
    shadow-hover: 0 0 20px rgba(0, 212, 255, 0.5)
  modal:
    backdrop-opacity: 0.80
    shadow: 0 25px 50px rgba(0, 212, 255, 0.10)
  process-dot:
    shadow-active: 0 0 20px #00d4ff
    shadow-violet: 0 0 20px #7c3aed
    shadow-green: 0 0 20px #22c55e
  navbar:
    backdrop-blur: 24px
  input-focus:
    shadow: 0 0 20px rgba(0, 212, 255, 0.1)
  circuit-line:
    shadow: 0 0 10px #00d4ff
  system-indicator:
    shadow: 0 0 8px rgba(52, 211, 153, 0.5)
motion:
  duration:
    instant: 150ms
    fast: 200ms
    standard: 300ms
    slow: 400ms
    glacial: 500ms
    reveal: 600ms
    marquee: 30000ms
  easing:
    standard: ease
    decelerate: cubic-bezier(0.25, 0.46, 0.45, 0.94)
    spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
  stagger:
    children: 120ms
    delay: 200ms
  backdrop-blur:
    subtle: 4px
    standard: 12px
    strong: 24px
effects:
  noise-overlay:
    opacity: 0.03
    base-frequency: 0.65
    octaves: 3
    blend: normal
    position: fixed
components:
  glass-card:
    background: rgba(255, 255, 255, 0.02)
    backdrop-blur: 12px
    border: 1px solid rgba(255, 255, 255, 0.05)
    border-radius: 16px
    padding: 32px
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    hover:
      border: rgba(0, 212, 255, 0.30)
      background: rgba(255, 255, 255, 0.05)
      shadow: 0 0 30px rgba(0, 212, 255, 0.1)
      transform: translateY(-5px)
  btn-solid:
    background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)
    color: "#ffffff"
    fontWeight: 700
    border-radius: 12px
    shadow: 0 4px 15px rgba(0, 212, 255, 0.3)
    transition: all 0.3s ease
    hover:
      transform: scale(1.05)
      shadow: 0 0 30px rgba(0, 212, 255, 0.5)
  btn-neon:
    background: rgba(0, 212, 255, 0.10)
    color: "#00d4ff"
    border: 1px solid rgba(0, 212, 255, 0.30)
    fontFamily: Space Grotesk
    textTransform: uppercase
    letterSpacing: 1px
    border-radius: 2px
    transition: all 0.3s ease
    hover:
      background: "#00d4ff"
      color: "#000000"
      shadow: 0 0 20px rgba(0, 212, 255, 0.5)
  btn-primary:
    background: "#06b6d4"
    color: "#000000"
    fontWeight: 600
    fontSize: 14px
    border-radius: 12px
    padding: 12px 24px
    transition: background-color 150ms ease
    hover:
      background: "#22d3ee"
  btn-secondary:
    background: "#1f2937"
    color: "#ffffff"
    fontSize: 14px
    border-radius: 4px
    padding: 6px 12px
    transition: background-color 150ms ease
    hover:
      background: "#374151"
  btn-filter-pill:
    borderRadius: 9999px
    padding: 4px 12px
    fontSize: 12px
    active:
      background: rgba(0, 212, 255, 0.20)
      color: "#00d4ff"
      border: 1px solid rgba(0, 212, 255, 0.30)
    inactive:
      background: "#1f2937"
      color: "#9ca3af"
      border: 1px solid #374151
  status-badge:
    borderRadius: 9999px
    padding: 2px 8px
    fontSize: 10px
    fontWeight: 500
    fontFamily: mono
    display: inline-flex
    border: 1px solid
  status-indicator:
    borderRadius: 9999px
    padding: 4px 16px
    fontSize: 14px
    border: 1px solid rgba(0, 212, 255, 0.30)
    background: rgba(0, 212, 255, 0.05)
    backdrop-blur: 4px
    dot-color: "#22c55e"
    dot-size: 6px
  input-filled:
    background: "#111827"
    border: 1px solid #374151
    border-radius: 12px
    padding: 12px 16px
    fontSize: 14px
    color: "#ffffff"
    placeholder-color: "#4b5563"
    fontFamily: mono
    focus:
      border: "#00d4ff"
  input-underline:
    background: transparent
    border-bottom: 1px solid rgba(55, 65, 81, 0.60)
    padding: 8px 0
    fontSize: 14px
    color: "#ffffff"
    placeholder-color: "#9ca3af"
    focus:
      border-bottom: "#00d4ff"
  navbar:
    position: fixed
    background: rgba(10, 14, 26, 0.80)
    backdrop-blur: 24px
    border-bottom: 1px solid rgba(255, 255, 255, 0.05)
  sidebar:
    width: 224px
    background: "#030712"
    border-right: 1px solid #1f2937
    header-color: "#00d4ff"
    nav-item:
      borderRadius: 8px
      padding: 8px 12px
      fontSize: 14px
      color: "#9ca3af"
      hover:
        color: "#ffffff"
        background: "#111827"
  modal-card:
    background: "#030712"
    border: 1px solid #1f2937
    borderRadius: 16px
    padding: 32px
    maxWidth: 448px
    backdrop-blur: 4px
  drawer-panel:
    background: "#030712"
    border-left: 1px solid #1f2937
    padding: 24px
    maxWidth: 448px
    backdrop-blur: 4px
  table-row:
    hover:
      background: rgba(17, 24, 39, 0.30)
    border-bottom: 1px solid rgba(255, 255, 255, 0.05)
  progress-bar:
    height: 4px
    background: linear-gradient(to right, #06b6d4, #a855f7)
    transition: width 0.5s ease
  circuit-timeline:
    line-width: 2px
    line-color: rgba(255, 255, 255, 0.10)
    progress-color: "#00d4ff"
    progress-shadow: 0 0 10px #00d4ff
    dot-active-color: "#00d4ff"
    dot-violet-color: "#7c3aed"
    dot-green-color: "#22c55e"
    dot-size: 16px
  section-label:
    fontSize: 12px
    fontWeight: 500
    fontFamily: mono
    textTransform: uppercase
    letterSpacing: "0.1em"
    color: "#9ca3af"
  decorative-divider:
    fontSize: 12px
    fontFamily: mono
    letterSpacing: "0.3em"
    color: "#4b5563"
---

# Brand & Style

GSTSaathi presents a dark, cyberpunk-inspired terminal aesthetic that fuses the precision of financial technology with the forward-looking energy of AI-powered automation. The visual identity communicates three core brand values: **intelligence** (through cyan accents and mono typography), **trust** (through deep navy backgrounds and glass-morphism depth), and **precision** (through grid-aligned layouts and all-caps technical labeling).

The interface operates exclusively in dark mode. The void-black background (#0a0e1a) serves as an infinite canvas onto which content surfaces float as translucent glass layers. This choice deliberately evokes a command-center or terminal environment -- a space where data is processed, analyzed, and optimized. A subtle SVG noise overlay at 3% opacity adds tactile grain that prevents the dark background from feeling sterile or flat.

The emotional response is intended to be confident and futuristic -- users should feel they are accessing something powerful and precise, not merely using another SaaS dashboard. The cyan accent (#00d4ff) acts as a beacon throughout the interface, drawing attention to actions, statuses, and key data points while the violet-to-cyan gradient provides moments of visual drama on primary CTAs.

## Visual Pillars

1. **Glass over Void.** Content lives on translucent glass cards that float above the deep background. Blur, subtle borders, and cyan-tinted glows create a sense of layered depth without heaviness.
2. **Terminal Precision.** Mono typography is reserved for data values, status codes, navigation labels, and technical identifiers. This establishes a clear visual separation between "machine output" (mono) and "human communication" (sans-serif).
3. **Cyan as Signal.** Cyan is used exclusively for interactive elements, focus states, progress indicators, and the brand logotype. It never appears as decoration -- every instance of cyan communicates a call to action or a state change.
4. **Gradient as Celebration.** The cyan-to-violet gradient is reserved for primary CTAs and the brand mark, signaling moments of commitment (sign-in, upload, submit). Its rarity makes it impactful.

---

# Colors

The palette is built on a deep navy-black foundation with a restrained set of accent colors. There is no light mode -- all color decisions are made for dark-surface legibility.

## Background Hierarchy

The background stack moves from deepest void to elevated charcoal:

- **Void (#0a0e1a):** The page-level background. Used behind all content. Also the scrollbar track.
- **Charcoal (#111625):** Section-level backgrounds that need slight differentiation from the void.
- **Sidebar (#030712):** The sidebar is the darkest surface, visually anchoring the navigation as a stable frame.
- **Input fields (#111827):** Form inputs sit slightly lighter than the background to indicate they are interactive fill zones.

## Surface & Glass

Glass cards are the primary content container. They are not opaque -- they use translucency, backdrop blur, and subtle borders to layer content in z-space:

- **Default:** 2% white background with 12px blur and a 5% white border. Perceptible as a surface but never blocks the void beneath.
- **Hover:** The border shifts to cyan at 30% opacity, background lifts to 5% white, and a 30px cyan glow appears. A 5px upward translation reinforces the z-stack metaphor.

Solid cards (modals, drawers, sidebars) use opaque backgrounds (#030712 / #111827) with 8% white borders, sitting firmly in the foreground.

## Accent Strategy

- **Cyan (#00d4ff):** The single source of truth for interaction. Buttons, links, focus rings, progress indicators, active nav states, status dots, and the brand mark "AGI" all use cyan. Dim variant (#009fc4) is used for hover-down states.
- **Violet (#7c3aed):** Used exclusively in the cyan-to-violet gradient for primary CTAs and text accents. Never used alone.
- **Gold (#fbbf24):** Reserved for trust signals -- rating stars, HIPAA badges, certification indicators. Warm contrast against the cool void.
- **Semantic status colors:** A full spectrum (emerald, amber, orange, yellow, blue, purple, pink, red) is employed for ITC classification badges. Each status uses a low-opacity (10--15%) background with a saturated text color and a matching 30% border. This creates a consistent pill-shaped taxonomy that is scannable at a glance.

---

# Typography

The type system uses three fonts with clearly separated responsibilities:

## Space Grotesk (Display)

The brand face. Used for all headings, hero text, product names, and the "APEX AGI" logotype. Its geometric character and wide apertures give headings a futuristic, architectural quality. Always set in bold (700) at large sizes, with tight tracking on the brand name (`tracking-tight`). The font communicates confidence and modernity.

## Plus Jakarta Sans (Body)

The workhorse face. Used for body copy, form labels, table headers, descriptions, and general UI text. Its rounded terminals and generous x-height make it highly legible at small sizes on dark backgrounds. Available in weights 300 (light), 400 (regular), 500 (medium), and 600 (semibold). Light weight is used sparingly for hero descriptions to create typographic contrast against bold headings.

## JetBrains Mono (Code/Data)

The data face. Used for metric values, status badges, navigation items, transaction IDs, bank names, and all-caps section labels. Its monospaced character signals "machine precision" and is never used for body copy -- only for data, labels, and technical identifiers. Available in 400 (regular) and 700 (bold). Bold mono is used for large metric values (32px) in dashboard stat cards.

## Typographic Hierarchy

The size scale runs from 10px (status badges) to 72px (hero headings on desktop). A critical design rule: **mono and display fonts never mix within the same visual group.** Headings are always Space Grotesk. Data values are always JetBrains Mono. UI labels are always Plus Jakarta Sans or uppercase JetBrains Mono. This tripartite separation creates instant visual parsing -- the user knows whether they are reading a title, a piece of data, or an instruction without needing to process the content.

All-caps tracking is graduated: `tracking-wider` (0.05em) for small UI labels, `tracking-widest` (0.1em) for section headers like "CAPABILITIES MATRIX". Decorative dividers like `/// TAXAPEX ///` use 0.3em tracking for maximum visual separation.

---

# Layout & Spacing

The layout follows a **container-based fluid model** with a maximum content width of 80rem (1280px) centered via `container mx-auto`. Horizontal padding is a consistent 24px on all viewports.

## Vertical Rhythm

Sections are separated by 96px of vertical space (py-24). This generous spacing is intentional -- the dark background needs breathing room to prevent visual claustrophobia. Within sections, elements use a 16px (space-y-4) to 32px (space-y-8) spacing scale.

The sidebar layout (dashboards, admin, retail ledger) uses a fixed 224px left rail with a flex-grow content area. The sidebar is always visible on desktop and provides persistent navigation context.

## Grid Patterns

- **Metric cards:** 2-column on mobile, 3-column on tablet, 6-column on desktop. Each card occupies equal width.
- **Service cards:** 1-column on mobile, 3-column on desktop with the first card sometimes spanning 2 rows for visual hierarchy.
- **Country flags:** 2-column on mobile, 5-column on desktop -- a small, dense grid for trust signals.
- **Two-column layouts:** Used for side-by-side content comparison (1-column on mobile, 2-column on desktop).

## Input & Button Spacing

Form inputs use 12px vertical padding and 16px horizontal padding. This generous internal space prevents the dark background from collapsing into the input field. Buttons use a scale: 16px/32px for large CTAs, 12px/24px for standard actions, and 6px/12px for compact filter pills and sidebar items.

---

# Shapes & Radii

The shape language is predominantly **rounded** to soften the stark dark background and create a sense of approachability for a financial tool.

- **Cards:** 16px (rounded-2xl) for glass cards on the landing page; 12px (rounded-xl) for dashboard metric cards and form containers.
- **Buttons:** 12px (rounded-xl) for primary CTAs. This radius feels substantial and clickable.
- **Pills & Badges:** 9999px (rounded-full) for all status badges, filter pills, and compliance indicators. The pill shape creates a clear taxonomy -- anything round is a classification or toggle.
- **Inputs:** 12px (rounded-xl) for filled inputs, 8px (rounded-lg) for compact entry forms.
- **Modals:** 16px (rounded-2xl) for the card itself.
- **The compliance bar:** Unique full-pill container -- a horizontal bar with fully rounded ends (`rounded-full`), creating a distinctive visual anchor for trust badges.

The neon outline button (`.btn-neon`) is the deliberate exception -- it uses 2px radius (`rounded-sm`) to evoke a terminal/CLI feel, matching its uppercase mono text and slash-prefix convention.

---

# Elevation & Depth

Depth in this design system is communicated through three mechanisms working in concert:

## 1. Backdrop Blur

Blur creates the illusion of physical layers without introducing heavy drop shadows. Three intensities are used:

- **4px (subtle):** Badges, modals backdrops, overlay panels. Just enough to separate from content beneath.
- **12px (standard):** Glass cards. The primary depth cue -- content appears to float above the void.
- **24px (strong):** Fixed navbar. Maximum separation ensures the nav remains legible over any scrollable content.

## 2. Glow Shadows

Traditional drop shadows (dark, spread) are replaced with **colored glow shadows** using cyan tint. These create a neon/terminal aesthetic:

- **Button solid:** 15px spread at 30% opacity cyan. On hover, expands to 30px at 50%.
- **Glass card hover:** 30px spread at 10% opacity cyan. Extremely diffuse -- more of an aura than a shadow.
- **Process dots:** 20px tight glow in cyan, violet, or green depending on pipeline stage.
- **Circuit line:** 10px tight cyan glow for the animated timeline bar.

## 3. Translucency & Border Light

Glass card borders are white at 5% opacity -- nearly invisible at rest, but they catch the eye on hover when they shift to cyan. The border functions as an edge-light, simulating refraction at the edge of a glass pane. The upward translation on hover (-5px) completes the illusion that the card is physically rising toward the viewer.

Modal backdrops use 80% black, which is darker than the typical 50--60% to intentionally obscure background content and focus attention on the modal surface.

---

# Motion

Animation is used sparingly and with purpose -- never for decoration alone.

## Page-Load Reveals

The TaxApex page uses a staggered fade-up animation: children animate from `y: 24px` to `y: 0` with a 0.6s deceleration curve (`cubic-bezier(0.25, 0.46, 0.45, 0.94)`). Children are staggered by 120ms. This creates a cascading reveal that draws the eye down the page.

The homepage uses GSAP ScrollTrigger for scroll-based reveals: sections fade and translate upward as they enter the viewport. Counter values animate with a snap effect for metric cards.

## Interactive Transitions

- **Buttons:** 150ms color transition. The instant response feels crisp and technical.
- **Glass cards:** 0.4s spring-like ease (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`). The slight overshoot conveys a physical glass material.
- **Neon/CTA buttons:** 0.3s standard ease. Hover states include scale (1.05x) and shadow expansion.
- **Progress bar:** 0.5s ease for fill transitions. Slow enough to feel substantive.
- **Circuit line:** 0.5s ease for height animation, tied to scroll position via GSAP.

## Continuous Animations

- **Marquee:** The client logo strip scrolls at 30s linear infinite. A constant, slow scroll that conveys momentum.
- **Canvas particles:** The hero section features a 60fps particle network rendered on a canvas element. Particles connect with thin lines when within proximity, creating a neural-network visual metaphor.
- **Spinning globe:** A Three.js globe rotates continuously at 0.002 rad/frame -- nearly imperceptible, a background detail that rewards attentive viewing.
- **Loading shimmer:** A 2s ease-in-out shimmer bar animates across progress bars during data processing.
- **Status dots:** A green dot pulses (`animate-pulse`) on the "System Online" indicator, providing a live-system reassurance cue.

## Spinner

Loading spinners use a continuous 360-degree rotation at 0.8s duration -- a compact, fast spinner styled in cyan to match the accent color.

---

# Components

## Buttons

Three button tiers exist:

1. **Solid Gradient CTA (`.btn-solid`):** Cyan-to-violet gradient, white text, 700 weight. Used for primary actions: sign-in, upload, submit. The gradient makes it the most visually prominent element on any page. Hover scales to 105% and intensifies glow.

2. **Filled Cyan (`btn-primary`):** Solid cyan (#06b6d4) background with black text. Used for standard form submissions, dashboard actions, and modal confirmations. Hover lightens to #22d3ee. Disabled state reduces opacity to 30%.

3. **Neon Outline (`.btn-neon`):** Transparent background with cyan border and cyan text, uppercase mono font. Used for secondary navigation actions like "INITIALIZE". On hover, the background fills solid cyan and text inverts to black -- a dramatic reveal that feels like a terminal command executing.

4. **Ghost/Secondary:** Gray background (#1f2937) with white text. Used for cancel actions, secondary dashboard controls. Hover darkens to #374151.

Filter pills toggle between an active state (cyan-tinted background, cyan text, cyan border) and inactive state (gray background, gray text, gray border). The cyan active state visually groups selected filters.

## Glass Cards

The `.glass-card` class is the signature container. It combines translucency, blur, subtle border, and a spring-like hover animation. Glass cards are used on the landing page for service descriptions, country flags, testimonials, and the compliance bar. Key variants:

- **Default square cards:** 32px padding, 16px radius, containing icon + heading + description.
- **Compliance bar:** Full-width horizontal pill with fully rounded ends, flex-wrapped badges with 16px gaps, and a 20% cyan border on top and bottom.
- **Testimonial cards:** 32px padding, 12px radius, with a subtle hover lift (-8px).

## Status Badges (Pills)

ITC classification uses a standardized pill system. All badges share:

- Fully rounded (`rounded-full`)
- 2px vertical padding, 8--10px horizontal
- 10px font size, 500 weight, JetBrains Mono
- A low-opacity background (10--15%), a saturated text color, and a 30% opacity border

Nine statuses are defined: ELIGIBLE (emerald), BLOCKED (red), RCM (purple), CONDITIONAL (orange), NEEDS_INVOICE (blue), AT_RISK (yellow), TIME_BARRED (purple), PERSONAL (pink), UNKNOWN (gray). The color coding is intuitive -- green means go, red means stop, amber/yellow means caution, gray means uncertain.

## Inputs

Two input styles exist:

- **Underline inputs:** Used in the contact form footer. Transparent background, bottom-only border that transitions from gray to cyan on focus. Minimal and elegant -- the input feels like writing on the surface itself.
- **Filled inputs:** Used in dashboards, sign-in, and ITC checker. Dark gray background (#111827) with full border. Uses JetBrains Mono for the input text and placeholder. Focus shifts the border to cyan with a subtle 20px cyan glow.

All inputs use 14px font size and consistent padding (12px vertical, 16px horizontal). Error states use red-tinted containers with a red border and red text.

## Navigation

The fixed navbar uses 24px backdrop blur with an 80% opaque void background, separated from content by a 5% white bottom border. Nav items use JetBrains Mono at 14px with slash-prefix notation (`/ SERVICES`, `/ WHY INDIA`).

The sidebar is the primary navigation for authenticated pages. It's a fixed 224px rail in the darkest surface color (#030712) with an 8% white right border. Nav items are 14px gray text on transparent backgrounds that highlight to white text on gray-900 on hover. The sidebar header uses cyan for the product name prefix (e.g., "GST" in cyan, "User" in white). The admin variant replaces cyan with amber for visual role differentiation.

## Progress Indicators

- **Upload progress bar:** 4px tall, gradient fill (cyan to violet), with a shimmer loading animation during processing.
- **Circuit timeline:** A vertical 2px line with animated height driven by scroll position. Active segment glows cyan (10px blur). Process dots at each milestone glow with stage-specific colors (cyan, violet, green) at 20px blur.
- **System status dot:** 6px green dot with an 8px emerald glow, pulsing continuously.

---

# Decorative Elements

## Noise Overlay

A fixed-position SVG fractal noise filter at 3% opacity covers the entire viewport. It is pointer-events: none and sits at z-index 50. The noise uses 3 octaves at 0.65 base frequency with stitched tiles. This subtle grain is a hallmark of the cyberpunk aesthetic -- it prevents large dark areas from appearing as pure flat color and gives the interface a physical, analog quality.

## Grid Pattern (TaxApex)

The TaxApex authentication page features a subtle cyan grid in its hero area: two perpendicular linear gradients (1px cyan lines at 30% opacity) repeating every 60px, masked by a radial gradient (black at center, transparent at edges). This creates a holographic/terminal grid that fades at the periphery.

## Canvas Animations

Two canvas elements provide background motion:

- **Particle network:** Nodes connected by proximity-based lines, rendered at 60fps. Creates a neural-network metaphor.
- **Rotating globe:** A Three.js sphere with dot-matrix texturing, rotating slowly. Represents the "India to the World" brand message.

## Decorative Text

Section labels use all-caps JetBrains Mono at 12px with 0.1em letter-spacing (e.g., "CAPABILITIES MATRIX", "SECURE TERMINAL"). Slash-delimited decorative dividers (`/// TAXAPEX ///`) use 0.3em letter-spacing for maximum visual separation from headings.

---

# Accessibility Notes

- All interactive elements maintain at least a 3:1 contrast ratio against their immediate background.
- Primary text is #ffffff on #0a0e1a (21:1 contrast ratio).
- Secondary text is #9ca3af on #0a0e1a (5.6:1 contrast ratio).
- Focus states are communicated through border-color changes (not outline rings), which may be insufficient for keyboard-only users. The cyan border shift provides clear visual feedback but does not add a focus-ring for assistive technology.
- The fixed noise overlay may impact users with vestibular disorders; it is rendered at very low opacity (3%) to minimize this risk.
- Scroll-smooth is enabled on the HTML element for reduced-motion-aware scroll behavior.
- Font sizes do not drop below 10px, ensuring text remains readable even on high-DPI displays.
- The application does not currently provide a light mode or high-contrast mode.
