# Surfboard Ownership Model — V1

## Purpose

QuiverShare V1 supports three surfboard ownership types, tracked via the `surfboards.owner_type` column:

| `owner_type` | Meaning |
|---|---|
| `individual` | Board belongs to a user |
| `shop` | Board belongs to a shop |
| `curated` | Board is admin-managed curated inventory |

`owner_type` is the **primary ownership discriminator** for all ownership-related branching going forward.

---

## Ownership Types

### `owner_type = 'individual'`

The board is owned by a single user.

- **Ownership identifier**: `surfboards.user_id` — the owning user's auth ID.
- **Who can edit**: The user whose `id` matches `surfboards.user_id`.
- **Canonical create route**: `/create-surfboard`
- **Canonical edit route**: `/edit-surfboard/[id]`
- **Canonical list/manage route**: `/my-boards`
- **Public detail**: `/surfboards/[id]` — shows individual owner controls (Edit).
- **Contact**: Buyer contacts the user directly via the contact form.

### `owner_type = 'shop'`

The board is owned by a shop entity.

- **Ownership identifier**: `surfboards.shop_id` → `shops.owner_user_id`. The shop's owner (or an admin) controls the board.
- **Who can edit**: The user whose `id` matches `shops.owner_user_id` for the board's `shop_id`, or any admin.
- **Canonical create route**: `/shops/[slug]/dashboard/new`
- **Canonical edit route**: `/shops/[slug]/dashboard/[id]/edit`
- **Canonical list/manage route**: `/shops/[slug]/dashboard`
- **Public detail**: `/surfboards/[id]` — shows shop owner controls (Edit, Shop Dashboard link). No state toggle on the public detail page; inventory management lives in the shop dashboard.
- **Contact**: Not yet implemented for V1. Public detail currently shows "Seller information unavailable" for shop boards without a `user_id`.
- **Landing Page URL**: Shop boards may have a `source_url` pointing to the shop's own product page. When `source_url` is set, `source_type` is `'shop'`.

### `owner_type = 'curated'`

The board is admin-managed curated inventory sourced from external marketplaces.

- **Ownership identifier**: Admin access. There is no single-user owner; any admin can manage curated boards.
- **Who can edit**: Any user with `profiles.is_admin = true`.
- **Canonical create route**: `/admin/curated-boards/new`
- **Canonical edit route**: `/admin/curated-boards/[id]`
- **Canonical list/manage route**: `/admin/curated-boards`
- **Public detail**: `/surfboards/[id]` — shows admin edit controls. Contact card shows "How to Buy" with link to the original external listing (`source_url`).
- **Legacy field**: `surfboards.is_curated` may still be `true` on these boards. New logic should branch on `owner_type = 'curated'`, not `is_curated`.

---

## V1 Invariants

These must hold true across the codebase:

1. **`owner_type` is the primary ownership discriminator.** All new ownership-related logic must branch on `owner_type` first, then use the appropriate related identifier (`user_id`, `shop_id`, or admin rules).

2. **`owner_type = 'shop'` requires a valid `shop_id`.** A shop board without a `shop_id` is invalid. The shop must exist and be active.

3. **`owner_type = 'individual'` should not carry a `shop_id`.** Individual boards are user-owned. If `shop_id` is present on an individual board, it is stale/invalid data.

4. **`owner_type = 'curated'` stays admin-controlled.** Curated boards are not user-editable or shop-editable. Only admins manage them.

5. **`is_curated` is a legacy/read-compatibility field.** It may still be `true` on curated boards, but new code should not use `is_curated` as the primary branching mechanism. Use `owner_type = 'curated'` instead. The public detail page currently checks both (`owner_type === 'curated' || is_curated === true`) for safety during the transition.

6. **Shop boards do not set `user_id`.** Shop board ownership is resolved through `shop_id` → `shops.owner_user_id`, not through `surfboards.user_id`.

7. **Individual boards do not set `shop_id`.** Individual board ownership is resolved through `surfboards.user_id` directly.

8. **`source_type` is not an ownership discriminator.** It describes the external source of a listing (e.g. `'craigslist'`, `'facebook'`, `'shop'`). It should never be used to branch ownership logic.

---

## V1 Route Model

### By ownership type

| Ownership | Create | Edit | List / Manage | Public Detail |
|---|---|---|---|---|
| Individual | `/create-surfboard` | `/edit-surfboard/[id]` | `/my-boards` | `/surfboards/[id]` |
| Shop | `/shops/[slug]/dashboard/new` | `/shops/[slug]/dashboard/[id]/edit` | `/shops/[slug]/dashboard` | `/surfboards/[id]` |
| Curated | `/admin/curated-boards/new` | `/admin/curated-boards/[id]` | `/admin/curated-boards` | `/surfboards/[id]` |

### Shared public routes

| Route | Purpose |
|---|---|
| `/surfboards/[id]` | Public board detail — ownership-aware for owner controls |
| `/s` | Browse/search all active boards (all ownership types) |
| `/shops/[slug]` | Public shop page — shows active shop boards |
| `/profile/[username]` | Public profile — shows individual boards only |

### Shop management routes

| Route | Purpose |
|---|---|
| `/shops/new` | Create a shop (one per user) |
| `/shops/[slug]/edit` | Edit shop settings |
| `/shops/[slug]/dashboard` | Shop inventory management |

### Supporting API routes

| Route | Serves |
|---|---|
| `/api/surfboards/[id]/images` | Image add for **individual** boards (`user_id` auth) |
| `/api/admin/curated-boards/[id]/images` | Image add for **curated** boards (admin auth) |
| Shop board image add | Handled via form actions on `/shops/[slug]/dashboard/[id]/edit` |

---

## V1 Decisions

### No individual → shop board conversion

Individual boards cannot be converted to shop-owned boards in V1. If a user creates a shop, their existing individual boards remain individual. The user must create new boards through the shop dashboard.

### No curated → shop board conversion

Curated boards cannot be reassigned to a shop in V1. The `shop_id` field on curated boards (used when `source_type = 'shop'`) is metadata about the source, not an ownership transfer.

### Deleting a shop is blocked if shop-owned boards exist

A shop with active (`is_deleted = false`) shop-owned boards should not be deletable. The shop owner must delete or reassign all boards before the shop can be removed. This prevents orphaned boards with a `shop_id` pointing to a nonexistent shop.

### Shop boards do not expose state toggle on the public detail page

Active/inactive state management for shop boards is handled exclusively in the shop dashboard (`/shops/[slug]/dashboard`). The public detail page (`/surfboards/[id]`) does not render state toggle controls for shop boards. Individual boards retain their existing state toggle behavior on their edit surface.

---

## Guidance for Future Development

When writing new code that touches board ownership:

1. **Branch on `owner_type` first.** Do not assume `user_id` is the owner. Do not branch on `is_curated` or `source_type` for ownership decisions.

2. **Resolve the owner through the correct path:**
   - `individual` → `surfboards.user_id`
   - `shop` → `surfboards.shop_id` → `shops.owner_user_id`
   - `curated` → admin check via `profiles.is_admin`

3. **Compute edit routes server-side.** The public detail page computes `editHref` on the server based on `owner_type` and returns it to the client. Follow this pattern rather than hardcoding edit paths in templates.

4. **Guard actions by ownership type.** Form actions and API routes that modify boards must verify the caller has the correct ownership relationship for that board's `owner_type`. Do not rely solely on `user_id` checks.

5. **Default unknown `owner_type` to `'individual'`.** Legacy boards without `owner_type` set should be treated as individual boards for backward compatibility.
