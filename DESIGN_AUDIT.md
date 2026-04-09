# QuiverShare Design Sweep Audit

Structured checklist for a full manual design review across every meaningful surface, organized by user-state lane. Review each surface on **desktop (1280px+)** and **mobile (375px)** unless noted otherwise.

---

## Global Shell (review first — visible on every page)

| Element | Route / Component | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Header (logged out)** | `Header.svelte` | Both | Logo, Browse Boards / Help / About links, Login / Sign Up button | Mobile hamburger menu |
| **Header (logged in, no shop)** | `Header.svelte` | Both | Logo, Browse Boards / My Boards links, profile avatar button, dropdown | Dropdown open, mobile menu open |
| **Header (logged in, shop owner)** | `Header.svelte` | Both | Logo, Browse Boards / Shop Dashboard links, profile avatar button, dropdown | Dropdown open, mobile menu open |
| **Profile dropdown (no shop)** | `Header.svelte` | Desktop | View Profile, Settings, Start a Shop, My Boards, Help, About, Logout | No username (View Profile hidden) |
| **Profile dropdown (shop owner)** | `Header.svelte` | Desktop | View Profile, Settings, My Shop, Shop Dashboard, Personal Boards, Help, About, Logout | — |
| **Mobile menu (no shop)** | `Header.svelte` | Mobile | Full nav + account links + logout | — |
| **Mobile menu (shop owner)** | `Header.svelte` | Mobile | Full nav + shop links + Personal Boards + logout | — |
| **Footer** | `+layout.svelte` | Both | QuiverShare wordmark, tagline, Browse / About / Help / Terms / Privacy links, copyright, email | — |

**Consistency risks:** Header and footer appear on every page — any token/spacing issue here multiplies across the entire app.

---

## Lane 1: Logged Out / Public User

### 1.1 Discovery / Browse

| Surface | Route | Viewport | Major UI Elements | Adjacent States to Review |
|---|---|---|---|---|
| **Homepage** | `/` | Both | Hero image + frosted content panel (headline, subtext, Browse / List CTAs), featured boards grid (up to 8 cards), 3 entry-point cards, footer | Zero boards (empty grid), all boards missing images |
| **Browse / Search** | `/s` | Both | Search input, location autocomplete, filter bar (style, condition, fin setup, distance), sort dropdown, board card grid, pagination, "no results" state | Empty results, filtered results, location-based sort, single result, many pages |
| **Board detail** | `/surfboards/[id]` | Both | Hero image(s) / gallery grid, lightbox overlay, board specs table, price, location, condition, seller card + Contact Seller form, edit/admin controls (hidden for public) | No images, single image, 3+ images (gallery), curated board (source link), shop-owned board (shop card), contact form submission success/error |
| **Public shop page** | `/shops/[slug]` | Both | Banner image, logo, shop name/location/description, contact info (website/email/phone), board grid | No banner, no logo, no description, no boards (empty state for public vs owner), shop with many boards |
| **Public profile** | `/profile/[username]` | Both | Avatar, username, full name, location, bio, board grid | No avatar, no boards (empty state), long bio |
| **Shops directory (placeholder)** | `/shops` | Both | Heading, "coming soon" copy, link to create shop + browse | — |

### 1.2 Informational Pages

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **About** | `/about` | Both | Heading, mission copy, "who's behind it" section | — |
| **Help / FAQ** | `/help` | Both | Heading, accordion FAQ items (expand/collapse), CTA buttons (List a Board, Browse Boards), contact email | Expanded vs collapsed items |
| **Terms of Service** | `/terms` | Both | Heading, legal copy sections | — |
| **Privacy Policy** | `/privacy` | Both | Heading, legal copy sections | — |

### 1.3 Auth / Onboarding

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Login (default)** | `/login` | Both | Heading, Google OAuth button, "Use email and password" reveal link, shop CTA block | Email form revealed, form error, already-signed-in state |
| **Login (shop intent)** | `/login?redirectTo=/shops/new` | Both | "Create your shop" heading, Google OAuth, email/password form, no shop CTA | Same sub-states as default |
| **Login (check email)** | `/login?checkEmail=1` | Both | "Check your email" heading, confirmation message, Google button hidden | With and without `redirectTo` |
| **Login (email verified)** | `/login?verified=1` | Both | "Email confirmed" heading, email form auto-revealed, Google hidden, no Create Account button | With and without `redirectTo` |
| **Login (OAuth error)** | `/login?error=oauth_not_allowed` | Both | Error banner: "This account was created with email and password" | — |
| **Email callback** | `/auth/email-callback` | Both | "Signing you in..." text (transient page) | — |
| **Onboarding (default)** | `/onboarding/username` | Both | Profile picture upload, username input + validation hint, full name, location autocomplete, home break, magic board, submit | Validation errors, existing profile picture, shop-intent copy variant |
| **Onboarding (shop intent)** | `/onboarding/username?redirectTo=/shops/new` | Both | Same form + "Finish your profile to set up your shop" copy variant | — |

**First impression / trust surfaces:** Homepage, `/s` browse, `/login`, board detail, and public shop page are the five highest-stakes surfaces for new visitors.

---

## Lane 2: Logged In Individual User

### 2.1 Profile / Account

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Profile edit** | `/profile/edit` | Both | Profile picture (upload/remove/preview), username (read-only after set?), full name, bio textarea, location autocomplete, home break, save button, delete account danger zone | Picture upload in progress, picture removed, delete confirmation modal, delete text-match input, form success/error |
| **Own public profile** | `/profile/[username]` | Both | Same as public profile but with "Edit Profile" / "My Boards" buttons | — |

### 2.2 Listing Creation / Editing

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Create surfboard** | `/create-surfboard` | Both | Full listing form: name, make, dims (L/W/T/V), fin system/setup, style dropdown, price, condition dropdown, notes textarea, location autocomplete, image upload zone + ImageManager grid, submit | Drag-and-drop active, image validation rejection messages, image reorder, image delete, submitting spinner, form error, max images reached |
| **Edit surfboard** | `/edit-surfboard/[id]` | Both | Same form pre-populated, active/inactive toggle, delete board button + confirmation modal | Toggle state change, delete modal open, delete text-match input, image add to existing, image delete from existing |
| **My Boards** | `/my-boards` | Both | Board list (mobile cards + desktop table), active/inactive badges, state toggle buttons, edit/view/delete actions per board, "List a Board" CTA | Zero boards (empty state), single board, many boards, delete confirmation modal, error messages |

### 2.3 Shop Creation

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Create shop** | `/shops/new` | Both | Shop name (with slug preview), description textarea, website URL, email, phone, address autocomplete (`ShopAddressAutocomplete`), submit | Slug preview updates live, address selection populates hidden fields, form validation errors, submitting state |

---

## Lane 3: Logged In Shop-Owning User

### 3.1 Shop Management

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Shop dashboard** | `/shops/[slug]/dashboard` | Both | Shop name heading, "Shop Inventory" subtext, "Add Board" / "Edit Shop" / "View Shop" buttons, board list (mobile cards + desktop table), active/inactive badges, state toggle, edit/view/delete per board | Zero boards (empty state + CTA), many boards, filter by status, delete confirmation, error messages |
| **Shop edit** | `/shops/[slug]/edit` | Both | Shop name (with slug preview), description, website, email, phone, address autocomplete, logo upload, banner upload, save button | Address change clears structured fields, logo/banner preview, form errors, submitting |
| **Shop board create** | `/shops/[slug]/dashboard/new` | Both | Same listing form as individual create but scoped to shop, location pre-filled from shop | Same adjacent states as individual create |
| **Shop board edit** | `/shops/[slug]/dashboard/[id]/edit` | Both | Same listing form pre-populated, active/inactive toggle, delete board + confirmation modal | Same adjacent states as individual edit |
| **Own public shop page** | `/shops/[slug]` | Both | Same as public but with Edit Shop / Shop Dashboard action buttons visible | — |

### 3.2 Personal Boards (still accessible)

| Surface | Route | Notes |
|---|---|---|
| **My Boards** | `/my-boards` | Still accessible from dropdown as "Personal Boards" |
| **Create surfboard** | `/create-surfboard` | Individual listing creation, separate from shop |
| **Edit surfboard** | `/edit-surfboard/[id]` | Only for individually-owned boards |

---

## Lane 4: Admin

| Surface | Route | Viewport | Major UI Elements | Adjacent States |
|---|---|---|---|---|
| **Admin layout** | `/admin` | Both | Admin header bar with "Curated Boards" nav link, redirects to curated-boards | — |
| **Curated boards list** | `/admin/curated-boards` | Both | Board list (mobile cards + desktop table), status filter (all/active/inactive), active/inactive badges, state toggle, review modal, edit/view/delete per board, "Add Curated Board" CTA | Zero boards, review modal open (result dropdown, price update, source URL update), delete confirmation, error messages |
| **Curated board create** | `/admin/curated-boards/new` | Both | Extended listing form: standard fields + source type dropdown, source URL, source shop dropdown, image upload, location autocomplete | Shop-sourced with pre-filled location, form errors |
| **Curated board edit** | `/admin/curated-boards/[id]` | Both | Same extended form pre-populated, active/inactive toggle, delete + confirmation modal, image management | Same adjacent states as create + existing images |

---

## Lane 5: Cross-Cutting UI / System States

### 5.1 Empty States

| Context | Where | What to review |
|---|---|---|
| No boards on homepage | `/` | Is the inventory section hidden gracefully? |
| No search results | `/s` | Is the empty state helpful (suggests clearing filters)? |
| No boards on profile | `/profile/[username]` | Is the empty message appropriate for own profile vs others? |
| No boards in My Boards | `/my-boards` | Is the CTA to list a board prominent? |
| No boards in shop dashboard | `/shops/[slug]/dashboard` | Is the "add first board" CTA clear? |
| No boards on public shop | `/shops/[slug]` | Owner vs public visitor messaging |
| No boards in curated list | `/admin/curated-boards` | Is the add-board CTA visible? |

### 5.2 Loading / Submitting States

| Context | Where | What to review |
|---|---|---|
| Form submission spinners | All create/edit forms | Button disabled + text changes ("Submitting...", "Signing in...") |
| Image upload in progress | Create/edit surfboard, profile edit | Upload indicator, disabled submit |
| OAuth redirect | `/login` → `/auth/start` → Google → `/auth/callback` | Is there a loading indicator during redirect? |
| Email callback | `/auth/email-callback` | "Signing you in..." transient page |

### 5.3 Error States

| Context | Where | What to review |
|---|---|---|
| Form validation errors | All forms (`/login`, `/onboarding/username`, `/create-surfboard`, `/edit-surfboard/[id]`, `/shops/new`, `/shops/[slug]/edit`, shop board create/edit, admin curated create/edit, `/profile/edit`) | Error text styling, placement, accessibility (aria-invalid, aria-errormessage) |
| OAuth error | `/login?error=oauth_not_allowed` | Error banner visibility and clarity |
| Server errors | All form actions | Generic error fallback copy |
| Image validation rejections | Create/edit surfboard (all types) | Rejection reason messages per file |
| Turnstile failure | `/login` (signup only) | "Please complete the verification" message |

### 5.4 Validation States

| Context | Where | What to review |
|---|---|---|
| Username validation | `/onboarding/username` | Hint text, regex pattern, min/max length, error messages, reserved words |
| Email/password validation | `/login` | Required fields, min password length |
| Listing form validation | All create/edit routes | Required fields behavior, number input constraints (step, min) |
| Shop name / slug preview | `/shops/new`, `/shops/[slug]/edit` | Live slug generation, character restrictions |
| Delete confirmation text match | `/profile/edit`, `/my-boards`, `/edit-surfboard/[id]`, shop board edit, admin curated edit | "DELETE" text-match gate |

### 5.5 Modals / Overlays

| Modal | Where | What to review |
|---|---|---|
| **Delete board confirmation** | `/my-boards`, `/edit-surfboard/[id]`, `/shops/[slug]/dashboard/[id]/edit`, `/admin/curated-boards/[id]` | Backdrop opacity (`bg-black/60`), button styling (destructive tokens), text-match input, cancel/confirm layout |
| **Delete account confirmation** | `/profile/edit` | Same destructive pattern, different copy |
| **Curated board review modal** | `/admin/curated-boards` | Review result dropdown, price/URL inputs, save/cancel |
| **Image lightbox** | `/surfboards/[id]` | Full-screen overlay, prev/next navigation, close button, keyboard nav |

### 5.6 Image Flows

| Flow | Where | What to review |
|---|---|---|
| **Image upload (drag + click)** | `/create-surfboard`, `/edit-surfboard/[id]`, shop board create/edit, admin curated create/edit | Drop zone styling (drag active state), file picker, validation feedback |
| **ImageManager grid** | Same as above | Thumbnail grid, "1" badge on first image, drag-to-reorder, delete per image |
| **Profile picture upload** | `/onboarding/username`, `/profile/edit` | Preview circle, file picker, remove button (edit only) |
| **Shop logo / banner upload** | `/shops/[slug]/edit` | Preview rendering, file picker |
| **No-image placeholder** | All card/grid surfaces, board detail | Local `/no-image.svg` fallback rendering |

### 5.7 Destructive Actions

| Action | Where | What to review |
|---|---|---|
| Delete board | `/my-boards`, `/edit-surfboard/[id]`, shop board edit, admin curated edit | Confirmation modal, destructive button styling |
| Delete account | `/profile/edit` | Confirmation modal, "DELETE" text match, destructive button |
| Toggle board inactive | `/my-boards`, shop dashboard, admin curated list | Button state change, badge update |

### 5.8 Auth Redirects

| Scenario | What to review |
|---|---|
| Logged-out user hits protected route | Redirect to `/login?redirectTo=...`, then back after auth |
| Shop-intent flow (email login) | `/login?redirectTo=/shops/new` → auth → onboarding → `/shops/new` |
| Shop-intent flow (email signup) | Same but through check-email → verify → manual login → onboarding |
| Shop-intent flow (OAuth) | `/login?redirectTo=/shops/new` → Google → callback → onboarding → `/shops/new` |
| Onboarding skip (already complete) | Direct redirect to `redirectTo` destination |
| Already-signed-in on `/login` | "You're already signed in" state |

### 5.9 Responsive / Mobile-Specific

| Element | What to review |
|---|---|
| Mobile hamburger menu | Open/close animation, link order, account section, logout |
| Board card grids | 2-column on mobile, 4-column on desktop; verify no overflow |
| Board detail gallery | Stacked on mobile, grid on desktop; lightbox touch handling |
| Forms on mobile | Input sizing, keyboard type (numeric for dimensions/price), autocomplete dropdown positioning |
| Shop dashboard mobile cards vs desktop table | Card layout on mobile, table layout on desktop; parity of actions |
| My Boards mobile cards vs desktop table | Same dual-layout pattern |
| Admin curated list mobile vs desktop | Same dual-layout pattern |

---

## Duplicate Behavior / Consistency Risks

These surfaces share similar UI patterns but are implemented separately. Visual drift between them is the most likely source of inconsistency.

| Pattern | Surfaces sharing it | Risk |
|---|---|---|
| **Board card (marketplace grid)** | Homepage, `/s` browse, `/shops/[slug]`, `/profile/[username]` | Card chrome, hover, price styling, image aspect ratio, title formatting |
| **Board list (management table + mobile cards)** | `/my-boards`, `/shops/[slug]/dashboard`, `/admin/curated-boards` | Row layout, badge styling, action buttons, empty states |
| **Listing create/edit form** | `/create-surfboard`, `/edit-surfboard/[id]`, `/shops/[slug]/dashboard/new`, `/shops/[slug]/dashboard/[id]/edit`, `/admin/curated-boards/new`, `/admin/curated-boards/[id]` | Input styling, layout, image upload zone, location autocomplete, submit button |
| **Delete confirmation modal** | `/my-boards`, `/edit-surfboard/[id]`, `/shops/[slug]/dashboard/[id]/edit`, `/admin/curated-boards/[id]`, `/profile/edit` | Backdrop, button styling, text-match input |
| **Location autocomplete** | Onboarding, profile edit, individual create/edit, shop board create/edit, admin curated create/edit (`LocationAutocomplete.svelte`) vs shop create/edit (`ShopAddressAutocomplete.svelte`) | Two separate components — verify they feel visually identical |
| **Primary CTA button** | Every form submit, header Login button, hero CTA, help page CTA | `bg-primary text-primary-foreground` — verify contrast and readability everywhere after color change |

---

## High-Value Surfaces for First Impression / Trust / Conversion

These should be reviewed with extra care — they are the surfaces that determine whether a visitor trusts the product enough to sign up, list a board, or create a shop.

1. **Homepage** (`/`) — first thing everyone sees; hero, board grid, entry points
2. **Browse / Search** (`/s`) — primary discovery surface; card quality, filter UX, empty state
3. **Board detail** (`/surfboards/[id]`) — the "product page"; image gallery, specs, seller trust, contact flow
4. **Login** (`/login`) — conversion gate; all conditional states matter
5. **Public shop page** (`/shops/[slug]`) — first impression for shop owners sharing their page
6. **Shop dashboard** (`/shops/[slug]/dashboard`) — the primary "tool" for shop owners; must feel solid
7. **Create surfboard** (`/create-surfboard`) — listing conversion; image upload UX is critical
8. **Onboarding** (`/onboarding/username`) — first post-auth experience; must feel fast and intentional

---

## Recommended Sweep Order

Review in this order to cover the highest-value paths first, then fill in management and edge-case surfaces.

### Phase 1: Public-facing critical path (logged out)
1. Homepage (`/`)
2. Browse (`/s`) — with and without results, filters, location sort
3. Board detail (`/surfboards/[id]`) — with images, without images, curated, shop-owned
4. Public shop page (`/shops/[slug]`) — with boards, without boards
5. Public profile (`/profile/[username]`) — with boards, without boards

### Phase 2: Auth and onboarding
6. Login default (`/login`)
7. Login shop intent (`/login?redirectTo=/shops/new`)
8. Login check-email (`/login?checkEmail=1`)
9. Login verified (`/login?verified=1`)
10. Login already-signed-in
11. Onboarding default (`/onboarding/username`)
12. Onboarding shop intent (`/onboarding/username?redirectTo=/shops/new`)

### Phase 3: Individual user management
13. My Boards (`/my-boards`) — zero boards, active/inactive, delete flow
14. Create surfboard (`/create-surfboard`) — full form + image upload
15. Edit surfboard (`/edit-surfboard/[id]`) — pre-populated + toggle + delete
16. Profile edit (`/profile/edit`) — picture upload/remove, delete account flow

### Phase 4: Shop owner management
17. Shop creation (`/shops/new`)
18. Shop dashboard (`/shops/[slug]/dashboard`) — zero boards, board management
19. Shop board create (`/shops/[slug]/dashboard/new`)
20. Shop board edit (`/shops/[slug]/dashboard/[id]/edit`)
21. Shop edit (`/shops/[slug]/edit`) — logo/banner/address

### Phase 5: Admin
22. Admin curated list (`/admin/curated-boards`) — review modal, status filter
23. Admin curated create (`/admin/curated-boards/new`)
24. Admin curated edit (`/admin/curated-boards/[id]`)

### Phase 6: Informational + edge pages
25. About (`/about`)
26. Help / FAQ (`/help`)
27. Terms (`/terms`)
28. Privacy (`/privacy`)
29. Shops directory placeholder (`/shops`)
30. Goodbye / account deleted (`/goodbye`)

### Phase 7: Cross-cutting states (overlay on all phases)
31. All empty states (revisit each surface with zero data)
32. All delete confirmation modals
33. All form error/validation states
34. Image lightbox on board detail
35. Mobile header / hamburger menu in all 3 user states
36. Footer on 3-4 representative pages
37. Primary button contrast check across 5+ surfaces (after `#53c7ff` color change)
