<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  export let data: {
    board: {
      id: string;
      name: string;
      make: string | null;
      length: number | null;
      width: number | null;
      thickness: number | null;
      volume: number | null;
      fin_system: string | null;
      fin_setup: string | null;
      style: string | null;
      condition: string | null;
      price: number | null;
      city: string | null;
      region: string | null;
      notes: string | null;
      thumbnail_url: string | null;
      user_id: string;
    };
    images: Array<{ id: string; image_url: string }>;
    owner: {
      id: string;
      username: string;
      full_name: string | null;
      profile_picture_url: string | null;
      city: string | null;
      region: string | null;
    } | null;
    canEdit: boolean;
  };

  // Helper: Format dimensions
  export function formatDimensions(
    length: number | null | undefined,
    width: number | null | undefined,
    thickness: number | null | undefined
  ): string {
    const parts: string[] = [];
    if (length != null) {
      const feet = Math.floor(length / 12);
      const inches = length % 12;
      parts.push(`${feet}'${inches}"`);
    }
    if (width != null) parts.push(`${width}"`);
    if (thickness != null) parts.push(`${thickness}"`);
    return parts.length > 0 ? parts.join(' × ') : 'N/A';
  }

  // Get board title for H1 and <title>
  $: boardTitle = (() => {
    const parts: string[] = [];
    if (data.board.length != null) {
      const feet = Math.floor(data.board.length / 12);
      const inches = data.board.length % 12;
      parts.push(`${feet}'${inches}"`);
    }
    if (data.board.make) parts.push(data.board.make);
    if (data.board.name) parts.push(data.board.name);
    return parts.length > 0 ? parts.join(' ') : 'Untitled Board';
  })();

  // Get all images (for gallery modal)
  $: allImages = data.images;
  
  // Get first 3 images for hero grid
  $: heroImages = data.images.slice(0, 3);

  // Lightbox state
  let lightboxOpen = false;
  let lightboxIndex = 0;

  function openLightbox(index: number = 0) {
    if (allImages.length > 0) {
      lightboxIndex = index;
      lightboxOpen = true;
    }
  }
  
  function openGallery() {
    openLightbox(0);
  }

  function closeLightbox() {
    lightboxOpen = false;
  }

  function nextLightboxImage() {
    if (allImages.length > 0) {
      lightboxIndex = (lightboxIndex + 1) % allImages.length;
    }
  }

  function prevLightboxImage() {
    if (allImages.length > 0) {
      lightboxIndex = (lightboxIndex - 1 + allImages.length) % allImages.length;
    }
  }
  
  // Handle keyboard navigation in lightbox
  function handleLightboxKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextLightboxImage();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevLightboxImage();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeLightbox();
    }
  }

  // Focus trap refs for modal
  let lightboxContainer: HTMLElement;
  let lightboxFirstFocusable: HTMLElement;
  let lightboxLastFocusable: HTMLElement;
  
  // Focus trap management
  $: if (lightboxOpen && lightboxContainer) {
    // Find all focusable elements
    const focusableElements = lightboxContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      lightboxFirstFocusable = focusableElements[0] as HTMLElement;
      lightboxLastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
      // Focus first element
      setTimeout(() => lightboxFirstFocusable?.focus(), 100);
    }
  }
  
  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !lightboxOpen) return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === lightboxFirstFocusable) {
        e.preventDefault();
        lightboxLastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lightboxLastFocusable) {
        e.preventDefault();
        lightboxFirstFocusable?.focus();
      }
    }
  }

  // Contact seller email (placeholder for now)
  $: sellerEmail = data.owner ? `${data.owner.username}@quivershare.com` : 'seller@quivershare.com';
</script>

<svelte:head>
  <title>{boardTitle} | QuiverShare</title>
</svelte:head>

<section class="min-h-screen bg-base-200">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <!-- Breadcrumb -->
    <nav class="mb-4" aria-label="Breadcrumb">
      <a
        href="/s"
        class="text-sm text-base-content/60 hover:text-base-content hover:underline"
      >
        Search Results
      </a>
      <span class="text-sm text-base-content/60 mx-2">/</span>
      <span class="text-sm text-base-content/60">
        {data.board.name || 'Untitled Board'}
      </span>
    </nav>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <h1 class="text-3xl sm:text-4xl font-bold">{boardTitle}</h1>
      {#if data.canEdit}
        <a
          href={`/edit-surfboard/${data.board.id}`}
          class="inline-flex items-center justify-center bg-primary text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-primary-focus transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-200"
        >
          Edit
        </a>
      {/if}
    </div>

    <!-- Hero Images Grid: 3 equal tiles -->
    <div class="w-full mb-8 max-w-6xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {#each Array(3) as _, i}
          {#if heroImages[i]}
            <div class="relative aspect-square rounded-lg overflow-hidden bg-base-300">
              <button
                type="button"
                class="w-full h-full hover:opacity-90 transition-opacity"
                on:click={() => openLightbox(i)}
                aria-label="View {data.board.name || 'Surfboard'} image {i + 1}"
              >
                <img
                  src={heroImages[i].image_url}
                  alt="{data.board.name || 'Surfboard'} image {i + 1}"
                  class="w-full h-full object-cover"
                  on:error={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=No+Image';
                  }}
                />
              </button>
              
              <!-- "See Gallery" button overlay on right-most tile only -->
              {#if i === 2 && allImages.length > 3}
                <button
                  type="button"
                  class="absolute bottom-2 right-2 bg-base-100/90 hover:bg-base-100 text-base-content px-4 py-2 rounded-lg shadow-lg transition-all"
                  on:click|stopPropagation={openGallery}
                  on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openGallery();
                    }
                  }}
                aria-label="See gallery with {allImages.length} images"
                >
                  See Gallery
                </button>
              {/if}
            </div>
          {:else}
            <!-- Placeholder slot -->
            <div class="aspect-square rounded-lg bg-base-300/50"></div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Details Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <!-- Left: Board Specs Card -->
      <div class="bg-base-100 rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold mb-4">Board Specs</h2>
        <div class="space-y-4">
          {#if data.board.price != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Price</p>
              <p class="text-2xl font-bold text-primary">${data.board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          {/if}

          {#if data.board.length != null || data.board.width != null || data.board.thickness != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Dimensions</p>
              <p class="text-lg font-semibold">{formatDimensions(data.board.length, data.board.width, data.board.thickness)}</p>
            </div>
          {/if}

          {#if data.board.volume != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Volume</p>
              <p class="text-lg font-semibold">{data.board.volume}L</p>
            </div>
          {/if}

          {#if data.board.fin_system}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Fin System</p>
              <p class="text-lg font-semibold">{data.board.fin_system}</p>
            </div>
          {/if}

          {#if data.board.fin_setup}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Fin Setup</p>
              <p class="text-lg font-semibold">{data.board.fin_setup}</p>
            </div>
          {/if}

          {#if data.board.style}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Style</p>
              <p class="text-lg font-semibold">{data.board.style}</p>
            </div>
          {/if}

          {#if data.board.condition}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Condition</p>
              <p class="text-lg font-semibold">{data.board.condition}</p>
            </div>
          {/if}

          {#if data.board.city || data.board.region}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Location</p>
              <p class="text-lg font-semibold">
                {[data.board.city, data.board.region].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
          {/if}

          {#if data.board.notes}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Description</p>
              <p class="text-base whitespace-pre-wrap leading-relaxed">{data.board.notes}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right: Contact Seller Card -->
      <div class="bg-base-100 rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-bold mb-4">Contact Seller</h2>
        {#if data.owner}
          <div class="space-y-4">
            <div>
              <p class="text-sm text-base-content/70 mb-1">Seller</p>
              <p class="text-lg font-semibold">{data.owner.full_name || data.owner.username}</p>
              <p class="text-sm text-base-content/60">@{data.owner.username}</p>
            </div>

            {#if data.owner.city || data.owner.region}
              <div>
                <p class="text-sm text-base-content/70 mb-1">Location</p>
                <p class="text-lg font-semibold">
                  {[data.owner.city, data.owner.region].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            {/if}

            <div class="pt-4">
              <a
                href="mailto:{sellerEmail}?subject=Inquiry about {data.board.name}"
                class="btn btn-primary w-full"
                aria-label="Contact seller via email"
              >
                Contact Seller
              </a>
            </div>

            <div class="pt-4 border-t border-base-300">
              <p class="text-xs text-base-content/60">
                Meet in a public place. Inspect before paying.
              </p>
            </div>
          </div>
        {:else}
          <p class="text-base-content/60">Seller information unavailable</p>
        {/if}
      </div>
    </div>
  </div>
</section>

<!-- Lightbox Modal / Gallery -->
{#if lightboxOpen}
  <div
    class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Image gallery"
    on:click={closeLightbox}
    on:keydown={handleLightboxKeydown}
    on:keydown={trapFocus}
    bind:this={lightboxContainer}
  >
    <div class="relative max-w-7xl max-h-full" on:click|stopPropagation>
      <!-- Close button -->
      <button
        type="button"
        class="absolute top-4 right-4 z-10 bg-base-100/90 hover:bg-base-100 rounded-full p-2 text-base-content"
        on:click={closeLightbox}
        aria-label="Close gallery"
        tabindex="0"
      >
        <span class="text-2xl">×</span>
      </button>

      <!-- Image -->
      {#if allImages[lightboxIndex]}
        <img
          src={allImages[lightboxIndex].image_url}
          alt="{data.board.name || 'Surfboard'} image {lightboxIndex + 1} of {allImages.length}"
          class="max-w-full max-h-[90vh] object-contain rounded-lg"
          on:error={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/1200x1200?text=No+Image';
          }}
        />
      {/if}

      <!-- Navigation arrows (if multiple images) -->
      {#if allImages.length > 1}
        <button
          type="button"
          class="absolute left-4 top-1/2 -translate-y-1/2 bg-base-100/90 hover:bg-base-100 rounded-full p-3 text-base-content"
          on:click|stopPropagation={prevLightboxImage}
          aria-label="Previous image"
          tabindex="0"
        >
          <span class="text-xl">‹</span>
        </button>
        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 bg-base-100/90 hover:bg-base-100 rounded-full p-3 text-base-content"
          on:click|stopPropagation={nextLightboxImage}
          aria-label="Next image"
          tabindex="0"
        >
          <span class="text-xl">›</span>
        </button>

        <!-- Image counter -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-base-100/90 rounded-full px-4 py-2 text-sm">
          {lightboxIndex + 1} / {allImages.length}
        </div>
      {/if}
    </div>
  </div>
{/if}
