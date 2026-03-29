<script lang="ts">
  import { enhance } from "$app/forms";
  import ShopAddressAutocomplete from "$lib/components/ShopAddressAutocomplete.svelte";
  import type { StructuredLocation } from "$lib/types/location";

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

  let name = form?.values?.name ?? '';
  let description = form?.values?.description ?? '';
  let website_url = form?.values?.website_url ?? '';
  let email = form?.values?.email ?? '';
  let phone = form?.values?.phone ?? '';
  let submitting = false;
  let message = '';

  $: if (form?.message) {
    message = form.message;
  }

  // Slug preview — mirrors the server-side slugify function
  function slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  $: slugPreview = slugify(name);

  // Location state
  let selectedLocation: StructuredLocation | null = null;

  // Logo drag-and-drop state
  let logoFile: File | null = null;
  let logoPreview: string | null = null;
  let logoDragActive = false;
  let logoInput: HTMLInputElement;

  function onLogoDragOver(e: DragEvent) {
    e.preventDefault();
    logoDragActive = true;
  }

  function onLogoDrop(e: DragEvent) {
    e.preventDefault();
    logoDragActive = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && isAllowedImage(file)) {
      setLogoFile(file);
    }
  }

  function onLogoSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setLogoFile(file);
  }

  function setLogoFile(file: File) {
    logoFile = file;
    logoPreview = URL.createObjectURL(file);
    // Sync the hidden file input via DataTransfer
    const dt = new DataTransfer();
    dt.items.add(file);
    logoInput.files = dt.files;
  }

  function clearLogo() {
    logoFile = null;
    logoPreview = null;
    logoInput.value = '';
  }

  // Banner drag-and-drop state
  let bannerFile: File | null = null;
  let bannerPreview: string | null = null;
  let bannerDragActive = false;
  let bannerInput: HTMLInputElement;

  function onBannerDragOver(e: DragEvent) {
    e.preventDefault();
    bannerDragActive = true;
  }

  function onBannerDrop(e: DragEvent) {
    e.preventDefault();
    bannerDragActive = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && isAllowedImage(file)) {
      setBannerFile(file);
    }
  }

  function onBannerSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) setBannerFile(file);
  }

  function setBannerFile(file: File) {
    bannerFile = file;
    bannerPreview = URL.createObjectURL(file);
    const dt = new DataTransfer();
    dt.items.add(file);
    bannerInput.files = dt.files;
  }

  function clearBanner() {
    bannerFile = null;
    bannerPreview = null;
    bannerInput.value = '';
  }

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  function isAllowedImage(file: File): boolean {
    return ALLOWED_TYPES.includes(file.type.toLowerCase());
  }
</script>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">
      Create Your Shop
    </h1>

    <!-- Overlay during submission -->
    {#if submitting}
      <div class="mb-4 rounded-lg border border-border bg-surface p-4 text-sm text-foreground flex items-center gap-3">
        <svg class="animate-spin h-4 w-4 text-primary flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-muted-foreground">Creating your shop{logoFile || bannerFile ? ' and uploading branding' : ''}...</span>
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
      <fieldset disabled={submitting} class="space-y-4">
        <!-- Name -->
        <div class="space-y-1">
          <label for="name" class="block text-sm font-medium text-muted-foreground">Shop Name</label>
          <input
            id="name"
            name="name"
            type="text"
            bind:value={name}
            placeholder="e.g. Westside Surf Co."
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-60"
            required
          />
          {#if slugPreview}
            <p class="text-xs text-muted-foreground mt-1">
              Shop URL preview: <span class="font-mono text-foreground">quivershare.com/shops/{slugPreview}</span>
            </p>
          {/if}
          <p class="text-xs text-muted-foreground">
            Your shop URL is generated from the name and cannot be changed later.
          </p>
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label for="description" class="block text-sm font-medium text-muted-foreground">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            bind:value={description}
            placeholder="Tell surfers about your shop..."
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-60"
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
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-60"
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
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-60"
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
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition disabled:opacity-60"
          />
        </div>

        <!-- Location -->
        <ShopAddressAutocomplete
          bind:value={selectedLocation}
          required={true}
          label="Shop Address"
          id="shop-address"
          placeholder="Start typing an address..."
        />

        <!-- Logo -->
        <div class="space-y-1">
          <label for="logo" class="block text-sm font-medium text-muted-foreground">Logo (optional)</label>
          <p class="text-xs text-muted-foreground">Square or near-square. Keep it simple and readable at small sizes. PNG/JPG/WebP, at least 400×400px.</p>
          <div
            role="button"
            class="border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer px-4 py-5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            class:border-primary={logoDragActive}
            class:bg-muted={logoDragActive}
            on:dragover|preventDefault={onLogoDragOver}
            on:dragleave={() => (logoDragActive = false)}
            on:drop|preventDefault={onLogoDrop}
            on:click={() => logoInput?.click()}
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && logoInput?.click()}
          >
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              bind:this={logoInput}
              on:change={onLogoSelect}
              class="hidden"
            />
            {#if logoPreview}
              <div class="flex flex-col items-center gap-2">
                <img src={logoPreview} alt="Logo preview" class="h-20 w-20 rounded-lg object-cover border border-border" />
                <p class="text-xs text-muted-foreground">{logoFile?.name}</p>
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">
                Drag & drop your logo here, or click to select
              </p>
            {/if}
          </div>
          {#if logoFile}
            <button type="button" class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1" on:click={clearLogo}>
              Remove logo
            </button>
          {/if}
        </div>

        <!-- Banner -->
        <div class="space-y-1">
          <label for="banner" class="block text-sm font-medium text-muted-foreground">Banner (optional)</label>
          <p class="text-xs text-muted-foreground">Wide landscape image. Keep key content centered — edges may be cropped on smaller screens. Avoid small text. PNG/JPG/WebP, at least 1200×200px.</p>
          <div
            role="button"
            class="border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer px-4 py-5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            class:border-primary={bannerDragActive}
            class:bg-muted={bannerDragActive}
            on:dragover|preventDefault={onBannerDragOver}
            on:dragleave={() => (bannerDragActive = false)}
            on:drop|preventDefault={onBannerDrop}
            on:click={() => bannerInput?.click()}
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && bannerInput?.click()}
          >
            <input
              id="banner"
              name="banner"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              bind:this={bannerInput}
              on:change={onBannerSelect}
              class="hidden"
            />
            {#if bannerPreview}
              <div class="flex flex-col items-center gap-2">
                <img src={bannerPreview} alt="Banner preview" class="w-full h-28 rounded-lg object-cover border border-border" />
                <p class="text-xs text-muted-foreground">{bannerFile?.name}</p>
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">
                Drag & drop your banner here, or click to select
              </p>
            {/if}
          </div>
          {#if bannerFile}
            <button type="button" class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline mt-1" on:click={clearBanner}>
              Remove banner
            </button>
          {/if}
        </div>
      </fieldset>

      <!-- Submit -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {#if submitting}
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Creating Shop...
        {:else}
          Create Shop
        {/if}
      </button>

      {#if message && !submitting}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class="text-destructive">{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>
