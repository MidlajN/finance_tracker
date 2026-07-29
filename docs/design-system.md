# Design System — Mobile

> Version: 1.0
>
> This document defines the visual language of the mobile application.
> Every screen must follow it. Changes to this language happen here first,
> then in code.

---

# Identity

Calm, monochrome, editorial. Money is the hero; chrome whispers.

A screenshot should be recognisable by:

- Pure white canvas, white cards, hairline borders
- One soft shadow, never layered, never heavy
- Ink numerals with tabular figures, dominant on every screen
- Caps-tracked micro labels
- Colour reserved for data and meaning, never for chrome

---

# Surfaces

| Surface | Recipe |
|---|---|
| Canvas | `#ffffff` |
| Card | `#ffffff` + 1px `colors.border` + `shadow.soft` |
| Sunken field / chip resting | `colors.field`, no border, no shadow |
| List container | Card recipe; rows share one container with hairline dividers |
| Nav bar | Docked, rounded top 26, stroked outline, halo-rim shadow |

Rules:

- `overflow: hidden` never sits on the same view as a shadow (iOS clips it).
  Clip on an inner wrapper.
- Android gets no RN shadows. Every elevated surface must read from its
  border alone. Never use `elevation`.

---

# Typography

| Role | Spec |
|---|---|
| Hero numeral | 30–44, weight 800, tracking −0.8 to −1.2, `tabular-nums` |
| Card numeral | 19–23, weight 800, `tabular-nums` |
| Screen title | 25–27, weight 800, tight tracking |
| Section title | 17–19, weight 800 |
| Body / value | 14–15, weight 700 |
| Support text | 12–13, weight 500–600 |
| Micro label | 10–11, weight 700, uppercase, tracking +0.8 to +1.4 |

Weight 900 is banned. Money is always `tabular-nums`.

---

# Colour

Chrome is monochrome: ink `#0f172a`, secondary, muted, field, divider,
border. Full stop.

Colour appears only as:

- **Meaning** — income green, expense red, transfer blue, savings purple,
  danger, success. Soft tint background + strong foreground, small areas
  only (icon circles, badges).
- **Data** — user-assigned category colours, account-type tints. These are
  content, not decoration. They live in icons and charts, and may tint a
  selection (~8% background, ~35% border; text in the entity colour
  darkened ~30% for contrast, icon at full colour) when the selected item
  *is* that coloured entity — e.g. picking a category.

Never colour a button, card, label, or active state for emphasis.

---

# States

- Active/selected: **selection is elevation.** The resting option sits
  sunken (`colors.field`, quiet secondary text); the selected option
  lifts to a card — white, hairline border, `shadow.soft`, ink 700
  content. Resting siblings carry a transparent border of equal width so
  nothing shifts. Solid ink fill is reserved for primary CTAs and the
  segmented toggle thumb.
- Pressed: opacity 0.82–0.86 + scale 0.98–0.99. Every Pressable has one.
- Disabled: 0.55 opacity, never a colour change.

---

# Components

- **Primary CTA** — ink pill, white text, soft shadow.
- **Chips/pills** — field resting, outlined active.
- **Icon tiles** — rounded square or circle, `colors.field` + ink for
  chrome actions; soft semantic tint + strong colour when the icon encodes
  meaning.
- **Delta chip** — field bg, ink arrow, bold ink percent, quiet caption.
- **Chart** — ink 2px line, ≤7% area fade, dashed whisper grid, one
  endpoint marker, scrubbable. No decoration.
- **Empty states** — never render fake data or a marker pointing at zero.

---

# Honesty rules

- No control may look interactive without doing something.
- No element may look like data without being data.
- Deltas and stats must be computed, never illustrative.
- If a state is empty, show an empty state — not a zeroed chart prop.

Known exception (accepted debt): the metric-card corner wave is
decorative. Candidate for replacement with a real sparkline.

---

# Animation

- Library: moti (springs: damping ~18, stiffness 180–210) or core
  Animated for simple interpolations. One language per screen.
- Motion is functional: reveal, confirm, transition. Nothing loops except
  progress indicators.

---

# Current state

Aligned: Dashboard, bottom navigation, Add Transaction (Events screen).

Not yet aligned (old language: weight 900, purple chrome, ad-hoc
shadows): Transactions list, Event Review, Merchants, Categories,
Budgets, Reports, Analytics, Financial Intelligence, Settings, Login.

Alignment order follows user-visible frequency:

1. Transactions list + Event Review (core loop)
2. Budgets, Analytics
3. Financial Intelligence, Merchants, Categories
4. Settings, Login
