<script lang="ts">
  import { enhance } from '$app/forms';
  import { supabase } from '$lib/supabaseClient';
  import { validateAndFilterImageFiles, MAX_IMAGES_PER_LISTING } from '$lib/imageValidation';
  import ImageManager from '$lib/components/ImageManager.svelte';
  import LocationAutocomplete from '$lib/components/LocationAutocomplete.svelte';
  import type { ManagedImage } from '$lib/types/image';
  import type { StructuredLocation } from '$lib/types/location';

  type ShopOption = {
    id: string;
    name: string;
    location_label: string | null;
    city: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
  };

  export let data: { shops: ShopOption[] };
  export let form;

  let submitting = false;
  let message = "";
  const initialValues: Record<string, string> =
    ((form as { values?: Record<string, string> } | undefined)?.values ?? {});
  const getInitial = (key: string) => (initialValues[key] as string) ?? "";

  // Image state
  let managedImages: ManagedImage[] = [];
  let fileInput: HTMLInputElement;
  let dragActive = false;
  let rejectionReasons: { file: string; reason: string }[] = [];
  const MAX_IMAGES = MAX_IMAGES_PER_LISTING;

  $: uploadingCount = managedImages.filter(img => img.kind === 'new').length;
  $: uploadsInProgress = uploadingCount > 0;

  // Form data
  let name = getInitial("name");
  let make = getInitial("make");
  let length = getInitial("length");
  let width = getInitial("width");
  let thickness = getInitial("thickness");
  let volume = getInitial("volume");
  let fin_system = getInitial("fin_system");
  let fin_setup = getInitial("fin_setup");
  let style = getInitial("style");
  let price = getInitial("price");
  let condition = getInitial("condition");
  let source_type = getInitial("source_type");
  let source_url = getInitial("source_url");
  let shop_id = getInitial("shop_id");
  let notes = getInitial("notes");

  // Location
  let selectedLocation: StructuredLocation | null = null;
  let lastAutoPopulatedShopId = "";


  // Handle form errors
  $: if (form?.message) {
    message = form.message;
  }

  $: if (source_type !== "shop" && shop_id !== "") {
    shop_id = "";
    lastAutoPopulatedShopId = "";
  }

  function getShopLocationLabel(shop: ShopOption): string {
    const label = shop.location_label?.trim();
    if (label) return label;

    const cityPart = shop.city?.trim() ?? "";
    const regionPart = shop.region?.trim() ?? "";
    if (cityPart && regionPart) return `${cityPart}, ${regionPart}`;
    return cityPart || regionPart;
  }

  function applyShopLocation(shop: ShopOption) {
    const nextLabel = getShopLocationLabel(shop);
    const hasCoords = shop.latitude != null && shop.longitude != null;

    selectedLocation = hasCoords
      ? {
          id: '',
          label: nextLabel || "Selected shop location",
          lat: shop.latitude!,
          lon: shop.longitude!,
          city: shop.city?.trim() ?? '',
          region: shop.region?.trim() ?? '',
          country: '',
        }
      : null;
  }

  $: if (source_type === "shop" && shop_id && shop_id !== lastAutoPopulatedShopId) {
    const selectedShop = data.shops.find((shop) => shop.id === shop_id);
    if (selectedShop) {
      applyShopLocation(selectedShop);
      lastAutoPopulatedShopId = shop_id;
    }
  }

  // Image upload handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    if (!event.dataTransfer?.files?.length) return;
    await addSelectedImages(Array.from(event.dataTransfer.files));
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    await addSelectedImages(Array.from(target.files));
    target.value = "";
  }

  async function addSelectedImages(selected: File[]) {
    const existingCount = managedImages.length;
    const { accepted, rejections } = validateAndFilterImageFiles(selected, existingCount);
    rejectionReasons = rejections;

    if (accepted.length > 0) {
      managedImages = [
        ...managedImages,
        ...accepted.map((file) => ({ kind: 'new' as const, file }))
      ];

      for (const file of accepted) {
        uploadFile(file);
      }
    }

    if (rejections.length > 0 && accepted.length === 0) {
      message = `${rejections.length} file(s) could not be added. See details below.`;
    }
  }

  async function uploadFile(file: File) {
    const rand = Math.random().toString(36).slice(2, 8);
    const filePath = `temp_${Date.now()}_${rand}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('surfboard-images')
      .upload(filePath, file);

    if (uploadError) {
      managedImages = managedImages.filter(
        img => !(img.kind === 'new' && img.file === file)
      );
      message = `Failed to upload ${file.name}: ${uploadError.message}`;
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('surfboard-images')
      .getPublicUrl(filePath);

    managedImages = managedImages.map(img =>
      img.kind === 'new' && img.file === file
        ? { kind: 'uploaded' as const, file, image_url: publicUrlData.publicUrl }
        : img
    );
  }
</script>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-center text-foreground mb-6">
      Add Curated Board
    </h1>

    <form method="POST" class="space-y-4" use:enhance={({ formData }) => {
      submitting = true;
      message = "";
      for (const img of managedImages) {
        if (img.kind === 'uploaded') {
          formData.append('image_urls', img.image_url);
        }
      }
      return async ({ update }) => {
        submitting = false;
        await update();
      };
    }}>
      <!-- Board Name (required) -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">
          Board Name <span class="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          placeholder="e.g. Star Cruiser"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Make (required) -->
      <div class="space-y-1">
        <label for="make" class="block text-sm font-medium text-muted-foreground">
          Make / Brand <span class="text-red-400">*</span>
        </label>
        <input
          id="make"
          name="make"
          type="text"
          bind:value={make}
          placeholder="e.g. Album, Firewire, JS"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Length (required) -->
      <div class="space-y-1">
        <label for="length" class="block text-sm font-medium text-muted-foreground">
          Length <span class="text-red-400">*</span>
        </label>
        <select
          id="length"
          name="length"
          bind:value={length}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select length</option>
          {#each Array(79) as _, i}
            {@const inches = i + 54}
            <option value={inches}
              >{Math.floor(inches / 12)}'{inches % 12}"</option
            >
          {/each}
        </select>
      </div>

      <!-- Width (optional) -->
      <div class="space-y-1">
        <label for="width" class="block text-sm font-medium text-muted-foreground">
          Width (in)
        </label>
        <input
          id="width"
          name="width"
          type="number"
          step="0.25"
          min="18"
          max="24"
          bind:value={width}
          placeholder="e.g. 21"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Thickness (optional) -->
      <div class="space-y-1">
        <label for="thickness" class="block text-sm font-medium text-muted-foreground">
          Thickness (in)
        </label>
        <input
          id="thickness"
          name="thickness"
          type="number"
          step="0.01"
          min="2"
          max="4.5"
          bind:value={thickness}
          placeholder="e.g. 2.75"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Volume (optional) -->
      <div class="space-y-1">
        <label for="volume" class="block text-sm font-medium text-muted-foreground">
          Volume (L)
        </label>
        <input
          id="volume"
          name="volume"
          type="number"
          step="0.5"
          min="20"
          max="100"
          bind:value={volume}
          placeholder="e.g. 40"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Fin System (optional) -->
      <div class="space-y-1">
        <label for="fin_system" class="block text-sm font-medium text-muted-foreground">
          Fin System
        </label>
        <select
          id="fin_system"
          name="fin_system"
          bind:value={fin_system}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin system (optional)</option>
          <option>FCS</option>
          <option>FCS II</option>
          <option>Futures</option>
          <option>Glass On</option>
          <option>Single Fin Box</option>
        </select>
      </div>

      <!-- Fin Setup (optional) -->
      <div class="space-y-1">
        <label for="fin_setup" class="block text-sm font-medium text-muted-foreground">
          Fin Setup
        </label>
        <select
          id="fin_setup"
          name="fin_setup"
          bind:value={fin_setup}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin setup (optional)</option>
          <option>Single</option>
          <option>2+1</option>
          <option>Twin</option>
          <option>Twin + Trailer</option>
          <option>Twinzer</option>
          <option>Tri</option>
          <option>Quad</option>
          <option>Tri/Quad</option>
          <option>Bonzer</option>
          <option>4+1</option>
        </select>
      </div>

      <!-- Style (required) -->
      <div class="space-y-1">
        <label for="style" class="block text-sm font-medium text-muted-foreground">
          Board Style <span class="text-red-400">*</span>
        </label>
        <select
          id="style"
          name="style"
          bind:value={style}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select style</option>
          <option>Shortboard</option>
          <option>Mid-length</option>
          <option>Longboard</option>
          <option value="Groveler / Fish">Groveler / Fish</option>
          <option>Gun</option>
        </select>
      </div>

      <!-- Price (required) -->
      <div class="space-y-1">
        <label for="price" class="block text-sm font-medium text-muted-foreground">
          Price ($) <span class="text-red-400">*</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="1"
          min="0"
          bind:value={price}
          placeholder="e.g. 850"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Condition (required) -->
      <div class="space-y-1">
        <label for="condition" class="block text-sm font-medium text-muted-foreground">
          Condition <span class="text-red-400">*</span>
        </label>
        <select
          id="condition"
          name="condition"
          bind:value={condition}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select condition</option>
          <option>New</option>
          <option>Lightly Used</option>
          <option>Used</option>
          <option>Well-loved</option>
          <option>Needs Repair</option>
        </select>
      </div>

      <!-- Source Type (required) -->
      <div class="space-y-1">
        <label for="source_type" class="block text-sm font-medium text-muted-foreground">
          Source Type <span class="text-red-400">*</span>
        </label>
        <select
          id="source_type"
          name="source_type"
          bind:value={source_type}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select source type</option>
          <option>facebook</option>
          <option>shop</option>
          <option>other</option>
        </select>
      </div>

      <!-- Source URL (required) -->
      <div class="space-y-1">
        <label for="source_url" class="block text-sm font-medium text-muted-foreground">
          {source_type === 'shop' ? 'Original Shop Listing URL' : 'Source URL'} <span class="text-red-400">*</span>
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          bind:value={source_url}
          placeholder="https://..."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      {#if source_type === 'shop'}
        <div class="space-y-1">
          <label for="shop_id" class="block text-sm font-medium text-muted-foreground">
            Shop <span class="text-red-400">*</span>
          </label>
          <select
            id="shop_id"
            name="shop_id"
            bind:value={shop_id}
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            required
          >
            <option value="">Select shop</option>
            {#each data.shops as shop}
              <option value={shop.id}>{shop.name}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Location (required) -->
      <LocationAutocomplete
        bind:value={selectedLocation}
        required={true}
        label="Location"
        id="location"
        placeholder="Start typing... e.g. San Diego, CA"
        clearable={true}
      />

      <!-- Notes (optional) -->
      <div class="space-y-1">
        <label for="notes" class="block text-sm font-medium text-muted-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          bind:value={notes}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Images (optional) -->
      <div class="space-y-1">
        <label for="image-upload" class="block text-sm font-medium text-muted-foreground">
          Images
        </label>
        <div
          role="button"
          class="border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer px-4 py-6 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          class:border-primary={dragActive}
          class:bg-surface-elevated={dragActive}
          on:dragover|preventDefault={handleDragOver}
          on:dragleave={() => (dragActive = false)}
          on:drop|preventDefault={handleDrop}
          on:click={() => fileInput?.click()}
          tabindex="0"
          on:keydown={(e) => e.key === "Enter" && fileInput?.click()}
        >
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            bind:this={fileInput}
            on:change={handleFileSelect}
            class="hidden"
          />
          <p class="text-sm text-muted-foreground">
            Drag & drop or click to add images (max {MAX_IMAGES})
          </p>
        </div>

        {#if managedImages.length > 0}
          <div class="mt-3">
            <ImageManager bind:images={managedImages} />
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            {managedImages.length}/{MAX_IMAGES} images
            {#if uploadsInProgress}
              &middot; Uploading {uploadingCount}...
            {/if}
          </p>
        {/if}

        {#if rejectionReasons.length > 0}
          <div class="mt-2 rounded-lg border border-border bg-surface p-3 text-sm">
            <p class="font-medium text-foreground mb-2">Rejected files:</p>
            <ul class="list-disc list-inside space-y-1 text-muted-foreground">
              {#each rejectionReasons as { file, reason }}
                <li><span class="font-mono text-foreground">{file}</span>: {reason}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting || uploadsInProgress}
      >
        {#if uploadsInProgress}
          Uploading images...
        {:else if submitting}
          Creating...
        {:else}
          Create Curated Board
        {/if}
      </button>

      {#if message}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class={message.includes('Failed') ? 'text-red-400' : 'text-green-400'}>{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>

