<script lang="ts">
  import { enhance } from "$app/forms";
  import LocationAutocomplete from "$lib/components/LocationAutocomplete.svelte";
  import type { StructuredLocation } from "$lib/types/location";

  export let data: {
    shop: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      website_url: string | null;
      email: string | null;
      phone: string | null;
      location_label: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
      logo_image_url: string | null;
      banner_image_url: string | null;
      owner_user_id: string;
      is_active: boolean;
    };
    notice: string | null;
  };

  export let form: {
    message?: string;
    values?: {
      name: string;
      description: string;
      website_url: string;
      email: string;
      phone: string;
      location_label: string;
    };
  } | null;

  const shop = data.shop;

  let name = form?.values?.name ?? shop.name ?? '';
  let description = form?.values?.description ?? shop.description ?? '';
  let website_url = form?.values?.website_url ?? shop.website_url ?? '';
  let email = form?.values?.email ?? shop.email ?? '';
  let phone = form?.values?.phone ?? shop.phone ?? '';
  let submitting = false;
  let message = '';

  $: if (form?.message) {
    message = form.message;
  }

  // Notice from redirect (e.g. already_has_shop)
  $: if (data.notice === 'already_has_shop' && !message) {
    message = 'You already have a shop! If you own multiple shops, reach out to info@quivershare.com.';
  }

  // Location state
  let selectedLocation: StructuredLocation | null =
    shop.latitude && shop.longitude
      ? {
          id: '',
          label: shop.location_label || 'Selected location',
          lat: shop.latitude,
          lon: shop.longitude,
          city: shop.city ?? '',
          region: shop.region ?? '',
          country: shop.country ?? '',
        }
      : null;

  // Image previews
  let logoPreview: string | null = null;
  let bannerPreview: string | null = null;

  function onLogoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    logoPreview = file ? URL.createObjectURL(file) : null;
  }

  function onBannerChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    bannerPreview = file ? URL.createObjectURL(file) : null;
  }
</script>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
      Edit Shop
    </h1>
    <p class="text-sm text-muted-foreground mb-6">
      Slug: <span class="font-mono text-foreground">{shop.slug}</span>
    </p>

    {#if message}
      <div class="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
        <span class={message.startsWith('You already') ? 'text-primary' : 'text-red-400'}>{message}</span>
      </div>
    {/if}

    <form method="POST" enctype="multipart/form-data" class="space-y-4" use:enhance={() => {
      submitting = true;
      message = '';
      return async ({ update }) => {
        submitting = false;
        await update();
      };
    }}>
      <!-- Name -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">Shop Name</label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          placeholder="e.g. Westside Surf Co."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Description -->
      <div class="space-y-1">
        <label for="description" class="block text-sm font-medium text-muted-foreground">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          bind:value={description}
          placeholder="Tell surfers about your shop..."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        ></textarea>
      </div>

      <!-- Website URL -->
      <div class="space-y-1">
        <label for="website_url" class="block text-sm font-medium text-muted-foreground">Website URL</label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          bind:value={website_url}
          placeholder="https://www.yourshop.com"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Email -->
      <div class="space-y-1">
        <label for="email" class="block text-sm font-medium text-muted-foreground">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          bind:value={email}
          placeholder="contact@yourshop.com"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Phone -->
      <div class="space-y-1">
        <label for="phone" class="block text-sm font-medium text-muted-foreground">Phone (optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          bind:value={phone}
          placeholder="(555) 123-4567"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Location -->
      <LocationAutocomplete
        bind:value={selectedLocation}
        required={false}
        label="Location (optional)"
        id="location"
        placeholder="Start typing... e.g. San Diego, CA"
      />

      <!-- Branding section divider -->
      <div class="pt-4 mt-2 border-t border-border">
        <h2 class="text-base font-semibold text-foreground">Shop Branding</h2>
        <p class="text-xs text-muted-foreground mt-1">Your logo and banner appear on your public shop page.</p>
      </div>

      <!-- Logo -->
      <div class="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div>
          <label for="logo" class="block text-sm font-medium text-foreground">Logo</label>
          <p class="text-xs text-muted-foreground mt-0.5">Square or near-square. Keep it simple and readable at small sizes. PNG/JPG/WebP, at least 400×400px.</p>
        </div>
        <div class="flex items-start gap-4">
          <div class="w-20 h-20 rounded-lg border border-border bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
            {#if logoPreview}
              <img src={logoPreview} alt="Logo preview" class="w-full h-full object-cover" />
            {:else if shop.logo_image_url}
              <img src={shop.logo_image_url} alt="Current logo" class="w-full h-full object-cover" />
            {:else}
              <span class="text-xs text-muted-foreground">No logo</span>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              on:change={onLogoChange}
              class="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-elevated file:transition file:cursor-pointer"
            />
            <p class="text-xs text-muted-foreground mt-1.5">Upload a new file to replace the current logo.</p>
          </div>
        </div>
      </div>

      <!-- Banner -->
      <div class="rounded-xl border border-border bg-surface p-4 space-y-3">
        <div>
          <label for="banner" class="block text-sm font-medium text-foreground">Banner</label>
          <p class="text-xs text-muted-foreground mt-0.5">Wide landscape image. Keep key content centered — edges may be cropped on smaller screens. Avoid small text. At least 1200×200px.</p>
        </div>
        <div class="rounded-lg border border-border bg-muted overflow-hidden">
          {#if bannerPreview}
            <img src={bannerPreview} alt="Banner preview" class="w-full h-36 object-cover" />
          {:else if shop.banner_image_url}
            <img src={shop.banner_image_url} alt="Current banner" class="w-full h-36 object-cover" />
          {:else}
            <div class="w-full h-24 flex items-center justify-center">
              <span class="text-xs text-muted-foreground">No banner</span>
            </div>
          {/if}
        </div>
        <div>
          <input
            id="banner"
            name="banner"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            on:change={onBannerChange}
            class="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-elevated file:transition file:cursor-pointer"
          />
          <p class="text-xs text-muted-foreground mt-1.5">Upload a new file to replace the current banner.</p>
        </div>
      </div>

      <!-- Submit -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  </div>
</main>
