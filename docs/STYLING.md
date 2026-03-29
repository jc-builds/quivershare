# QuiverShare Styling Guide

## Stack Overview

**Technology Stack:**
- **Framework**: SvelteKit with TypeScript
- **Styling**: Tailwind CSS (v3.4+)
- **Design System**: Custom token-based design system (no DaisyUI)
- **Font**: Inter (Google Fonts)

## Design System Direction

QuiverShare uses a **light, warm marketplace** aesthetic. The base is a warm off-white with white card surfaces, soft neutral borders, and dark text. The primary brand accent is a **coastal sky blue** used for CTAs, links, prices, and interactive elements.

The footer uses `--foreground` (#1a1a2e) as a grounding dark element. The extreme `--dark` (#020617) exists as a token but is not currently used on any active surface. Dark backgrounds should remain the exception, not the rule.

## Design Tokens

All colors are defined as CSS variables in `src/app.css` and mapped to Tailwind utilities in `tailwind.config.js`.

### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `--background` | `#fafaf8` | Main page background (warm off-white) |
| `--background-alt` | `#f2f1ef` | Alternate section backgrounds |

### Surfaces

| Token | Value | Usage |
|---|---|---|
| `--surface` | `#ffffff` | Cards, panels, form containers |
| `--surface-elevated` | `#ffffff` | Modals, dropdowns (differentiated by shadow) |

### Borders

| Token | Value | Usage |
|---|---|---|
| `--border` | `#e0ddd8` | Standard borders (warm gray) |
| `--border-subtle` | `#ece9e4` | Lighter dividers |

### Text

| Token | Value | Usage |
|---|---|---|
| `--foreground` | `#1a1a2e` | Primary text (dark) |
| `--foreground-secondary` | `#6b7280` | Secondary text (mapped to both `text-foreground-secondary` and `text-muted-foreground`) |
| `--foreground-muted` | `#9ca3af` | Tertiary/placeholder text |

### Neutral Fills

| Token | Value | Usage |
|---|---|---|
| `--muted` | `#f0efed` | Hover fills, inactive backgrounds, placeholder areas |

### Primary Brand

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#0891b2` | Primary accent — buttons, links, prices, focus rings |
| `--primary-hover` | `#0e7490` | Primary hover state (mapped to both `hover:bg-primary-hover` and `hover:bg-primary-alt`) |
| `--primary-foreground` | `#ffffff` | Text on primary fills |
| `--primary-tint` | `#f0f9fb` | Subtle sky wash — highlighted areas, selected states (mapped to both `bg-primary-tint` and `bg-primary-soft`) |

### Status Colors

| Token | Value | Usage |
|---|---|---|
| `--success` | `#16a34a` | Success states |
| `--warning` | `#ca8a04` | Warning states |
| `--destructive` | `#dc2626` | Error/destructive actions |
| `--destructive-foreground` | `#ffffff` | Text on destructive fills |

### Dark Accent

| Token | Value | Usage |
|---|---|---|
| `--dark` | `#020617` | Reserved dark accent. Currently unused on active surfaces. **Not** for general app use. |

## Layout Conventions

### Page Containers

```svelte
<section class="min-h-screen bg-background text-foreground px-4 py-6 sm:py-8 max-w-4xl mx-auto">
  <!-- Page content -->
</section>
```

**Width variations:**
- `max-w-2xl` — Narrow forms (onboarding, profile edit)
- `max-w-3xl` — Content pages (about, help)
- `max-w-4xl` — Profile pages
- `max-w-5xl` — Wide pages (listings, dashboards)
- `max-w-7xl` — Full-width layouts (search results)

### Cards & Panels

```svelte
<div class="bg-surface rounded-xl border border-border shadow-sm p-5 sm:p-6">
  <!-- Card content -->
</div>
```

Use solid `bg-surface` for cards. Do not use opacity modifiers on surface tokens.

## Typography

### Headings

```svelte
<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
  Page Title
</h1>

<h2 class="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
  Section Title
</h2>
```

### Body Text

- **Primary**: `text-foreground`
- **Secondary**: `text-muted-foreground`
- **Small**: `text-xs text-muted-foreground` or `text-sm text-muted-foreground`
- **Error**: `text-sm text-destructive`

## Form Conventions

### Labels

```svelte
<label for="field-id" class="block text-sm font-medium text-muted-foreground">
  Field Label
  {#if required}<span class="text-destructive"> *</span>{/if}
</label>
```

### Text Inputs

```svelte
<input
  class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
/>
```

### Select Dropdowns

```svelte
<select
  class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
>
```

### File Inputs

```svelte
<input
  type="file"
  class="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-foreground file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
/>
```

### Error Messages

```svelte
<p class="mt-1 text-xs text-destructive">{errorText}</p>
```

## Button Conventions

### Primary Button

```svelte
<button
  class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
>
  Button Text
</button>
```

### Secondary Button

```svelte
<button
  class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  Secondary Button
</button>
```

### Ghost Button

```svelte
<button
  class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
>
  Ghost Button
</button>
```

### Destructive Button

```svelte
<button
  class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg bg-destructive text-white hover:bg-red-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
>
  Delete
</button>
```

## Table Conventions

```svelte
<div class="bg-surface-elevated border border-border rounded-xl shadow-sm overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="bg-surface text-muted-foreground border-b border-border">
        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-border/50 hover:bg-muted transition-colors">
        <td class="px-4 py-3">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Autocomplete Dropdowns

```svelte
<ul class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg text-sm">
  <li>
    <button class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
      Suggestion
    </button>
  </li>
</ul>
```

## Badges / Chips

```svelte
<!-- Neutral -->
<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border">
  Badge
</span>

<!-- Primary -->
<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground">
  Active
</span>
```

## Status Messages

```svelte
<!-- Success -->
<p class="text-sm text-success">Success message</p>

<!-- Error -->
<p class="text-sm text-destructive">Error message</p>

<!-- Info -->
<div class="rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
  Info message
</div>
```

## Modals

```svelte
<div class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
  <div class="bg-surface-elevated border border-border rounded-xl shadow-xl w-full max-w-md p-6 text-foreground">
    <!-- Modal content -->
  </div>
</div>
```

## Intentionally Dark Surfaces

The following surfaces use `bg-dark` with light text intentionally:

- **Homepage hero**: light (`bg-background`) with dark text — not a dark section
- **Footer**: `bg-foreground` with `text-gray-400`, `hover:text-gray-200`

Do **not** apply `bg-dark` to app pages, forms, dashboards, admin, modals, or general navigation.

## Empty States

```svelte
<div class="text-center py-12 bg-surface border border-border rounded-xl">
  <p class="text-muted-foreground">No items found.</p>
</div>
```

## Rules

- **Light base**: The default app is light. Do not add dark backgrounds to app surfaces.
- **Semantic tokens**: Use token-based classes (`bg-surface`, `text-foreground`, `border-border`) instead of raw Tailwind colors (`bg-gray-100`, `text-gray-700`).
- **No opacity tricks**: Use solid token values. Do not use `bg-surface-elevated/50` or similar opacity modifiers.
- **Hover on light**: Use `hover:bg-muted` for hover states on white surfaces. `hover:bg-surface` provides no visual feedback when the element is already on a white background.
- **Error text**: Use `text-destructive`, not `text-red-400`.
- **Required markers**: Use `text-destructive`, not `text-red-400`.
- **No DaisyUI**: All components are built with Tailwind utilities and design tokens.
- **Responsive**: Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) for mobile-first design.
- **Color only**: Future styling changes should stay semantic and color-only unless a separate visual pass is requested.
