# QuiverShare Styling Guide

## Stack Overview

**Technology Stack:**
- **Framework**: SvelteKit with TypeScript
- **Styling**: Tailwind CSS (v3.4+)
- **Design System**: Custom token-based design system (no DaisyUI)
- **Font**: Inter (Google Fonts)

## Design Tokens

All colors and design values are defined as CSS variables in `src/app.css` and mapped to Tailwind utilities in `tailwind.config.js`.

### Core Color Tokens

**Backgrounds:**
- `bg-background` - Main page background (very dark slate: `#020617`)
- `bg-surface` - Base surface color (same as background)
- `bg-surface-elevated` - Elevated surfaces like cards (currently same, can be adjusted for contrast)

**Borders:**
- `border-border` - Standard border color (slate-800-ish: `#1f2937`)

**Text:**
- `text-foreground` - Primary text color (slate-200: `#e5e7eb`)
- `text-muted-foreground` - Secondary/muted text (slate-400: `#9ca3af`)

**Primary Colors:**
- `bg-primary` - Primary accent (bright sky: `#2ec8ee`)
- `bg-primary-alt` - Primary hover state (lighter sky: `#68ddfd`)
- `text-primary-foreground` - Text on primary (dark: `#020617`)
- `bg-primary-soft` - Subtle primary background (`#082d41`)
- `bg-primary-soft-alt` - Slightly brighter primary soft (`#08354c`)

**Status Colors:**
- `bg-success` / `text-success-foreground` - Success states
- `bg-warning` / `text-warning-foreground` - Warning states
- `bg-destructive` / `text-destructive-foreground` - Error/destructive actions
- `text-red-400` - Error text (used for form validation)

## Layout Conventions

### Page Containers

**Standard page wrapper:**
```svelte
<section class="min-h-screen bg-background text-foreground px-4 py-6 sm:py-8 max-w-4xl mx-auto">
  <!-- Page content -->
</section>
```

**Variations:**
- `max-w-2xl` - Narrow forms (onboarding, profile edit)
- `max-w-3xl` - Content pages (about, help)
- `max-w-4xl` - Profile pages
- `max-w-5xl` - Wide pages (boost, listings)
- `max-w-7xl` - Full-width layouts (search results)

**Responsive padding:**
- `px-4 sm:px-6 lg:px-8` - Horizontal padding
- `py-6 sm:py-8` or `py-8 sm:py-10` - Vertical padding

### Cards & Panels

**Standard card:**
```svelte
<div class="bg-surface-elevated/90 rounded-xl border border-border shadow-sm p-5 sm:p-6">
  <!-- Card content -->
</div>
```

**Variations:**
- `bg-surface-elevated/80` - Slightly more transparent
- `bg-surface-elevated/50` - Very transparent (feature cards)
- `p-6 sm:p-8` - Larger padding for important cards

## Typography

### Headings

**Page titles:**
```svelte
<h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
  Page Title
</h1>
```

**Section headings:**
```svelte
<h2 class="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
  Section Title
</h2>
```

**Subheadings:**
```svelte
<p class="text-sm sm:text-base text-muted-foreground">
  Subtitle text
</p>
```

### Body Text

- **Primary text**: `text-foreground`
- **Secondary text**: `text-muted-foreground`
- **Small text**: `text-xs text-muted-foreground` or `text-sm text-muted-foreground`
- **Error text**: `text-xs text-red-400` or `text-sm text-red-400`

## Form Conventions

### Field Wrapper

```svelte
<div class="space-y-1.5">
  <!-- Label, input, error message -->
</div>
```

### Labels

```svelte
<label for="field-id" class="block text-xs font-medium text-muted-foreground">
  Field Label
  {#if required}
    <span class="text-red-400">*</span>
  {/if}
</label>
```

### Text Inputs

```svelte
<input
  id="field-id"
  name="field_name"
  type="text"
  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  placeholder="Placeholder text"
/>
```

### Select Dropdowns

```svelte
<select
  id="field-id"
  name="field_name"
  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  <option value="">Select option</option>
  <!-- options -->
</select>
```

### Textareas

```svelte
<textarea
  id="field-id"
  name="field_name"
  class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 min-h-[120px] resize-vertical shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  rows="4"
></textarea>
```

### File Inputs

```svelte
<input
  type="file"
  name="file_field"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  class="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-foreground file:text-xs file:font-medium hover:file:bg-surface-elevated cursor-pointer"
/>
```

### Error Messages

```svelte
{#if form?.fieldErrors?.field_name}
  <p id="field_name-error" class="mt-1 text-xs text-red-400">
    {form.fieldErrors.field_name}
  </p>
{/if}
```

### Helper Text

```svelte
<p class="mt-1 text-xs text-muted-foreground">
  Helper text explaining the field
</p>
```

## Button Conventions

### Primary Button

**Standard primary button:**
```svelte
<button
  type="submit"
  class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
>
  Button Text
</button>
```

**Small primary button:**
```svelte
<button
  type="button"
  class="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  Small Button
</button>
```

### Secondary / Ghost Button

**Standard secondary button:**
```svelte
<button
  type="button"
  class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  Secondary Button
</button>
```

**Small secondary button:**
```svelte
<button
  type="button"
  class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  Small Secondary
</button>
```

**Text-only ghost button:**
```svelte
<button
  type="button"
  class="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  Ghost Button
</button>
```

### Destructive Button

```svelte
<button
  type="button"
  class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
>
  Delete
</button>
```

## Table Conventions

### Table Container

```svelte
<div class="bg-surface-elevated border border-border rounded-xl shadow-sm overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <!-- Table content -->
    </table>
  </div>
</div>
```

### Table Header

```svelte
<thead>
  <tr class="bg-surface text-muted-foreground border-b border-border">
    <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">
      Column Header
    </th>
  </tr>
</thead>
```

### Table Rows

```svelte
<tbody>
  {#each items as item}
    <tr class="border-b border-border/60 last:border-0 hover:bg-surface/80 transition-colors">
      <td class="px-4 py-3 align-middle">
        <!-- Cell content -->
      </td>
    </tr>
  {/each}
</tbody>
```

## Autocomplete Dropdowns

```svelte
<div class="relative">
  <input
    id="autocomplete-input"
    class="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    autocomplete="off"
    aria-autocomplete="list"
    aria-controls="suggestions-list"
  />
  
  {#if suggestions.length > 0}
    <ul
      id="suggestions-list"
      class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg text-sm"
    >
      {#each suggestions as suggestion}
        <li>
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors"
            on:click={() => chooseSuggestion(suggestion)}
          >
            {suggestion.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

## Image Containers

### Profile Picture / Avatar

```svelte
<div class="w-20 h-20 rounded-full bg-surface border border-border overflow-hidden flex items-center justify-center">
  <img
    src={imageUrl}
    alt="Profile"
    class="w-full h-full object-cover"
  />
</div>
```

### Thumbnail Grid

```svelte
<div class="w-16 h-16 rounded-md overflow-hidden bg-surface border border-border">
  <img
    src={thumbnailUrl}
    alt="Thumbnail"
    class="w-full h-full object-cover"
  />
</div>
```

## Badges / Chips

### Standard Badge

```svelte
<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border">
  Badge Text
</span>
```

### Primary Badge

```svelte
<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground">
  Primary Badge
</span>
```

## Success / Error Messages

### Success Message

```svelte
<div class="mb-6 rounded-lg border border-border/60 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm">
  <span>Success message text</span>
</div>
```

### Error Message

```svelte
<div class="mt-4 rounded-lg border border-red-500/60 bg-surface p-3 text-sm text-red-400">
  <span>Error message text</span>
</div>
```

### Info Message

```svelte
<div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
  <span class="text-muted-foreground">Info message text</span>
</div>
```

## Modals / Overlays

### Modal Overlay

```svelte
<div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
  <div class="bg-surface-elevated border border-border rounded-xl shadow-xl w-full max-w-2xl overflow-auto text-foreground">
    <!-- Modal content -->
  </div>
</div>
```

### Modal Header

```svelte
<div class="p-3 border-b border-border flex items-center justify-between">
  <span class="font-semibold text-sm">Modal Title</span>
</div>
```

### Modal Footer

```svelte
<div class="p-3 border-t border-border flex justify-end gap-2">
  <!-- Action buttons -->
</div>
```

## Accessibility

### Form Fields

- Always use proper `id` and `for` attributes linking labels to inputs
- Include `aria-invalid` and `aria-errormessage` for validation
- Use `aria-autocomplete`, `aria-controls`, `aria-expanded` for autocomplete inputs

### Buttons

- Always include `type="button"` for non-submit buttons
- Use `aria-label` for icon-only buttons
- Include proper focus states with `focus-visible:ring-*`

### Semantic HTML

- Use `<section>` for page containers
- Use `<nav>` for navigation
- Use `<header>` for page headers
- Use `<footer>` for page footers
- Use `<article>` for main content
- Use proper heading hierarchy (h1 → h2 → h3)

## Common Patterns

### Breadcrumbs

```svelte
<nav class="mb-4" aria-label="Breadcrumb">
  <a href="/path" class="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:underline">
    Home
  </a>
  <span class="text-xs sm:text-sm text-muted-foreground mx-2">/</span>
  <span class="text-xs sm:text-sm text-muted-foreground">Current Page</span>
</nav>
```

### Empty States

```svelte
<div class="text-center py-12 bg-surface-elevated border border-border rounded-xl">
  <p class="text-muted-foreground">
    No items found.
  </p>
</div>
```

### Loading States

```svelte
<button
  type="submit"
  class="..."
  disabled={loading}
>
  {loading ? 'Saving...' : 'Save'}
</button>
```

## Notes

- **No DaisyUI**: This project does not use DaisyUI. All components are built with Tailwind utilities and design tokens.
- **Consistency**: Always reuse existing patterns rather than creating new variations.
- **Responsive**: Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) for mobile-first design.
- **Dark Theme**: The design system is built for dark mode. All tokens assume dark backgrounds.

