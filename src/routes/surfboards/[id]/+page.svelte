<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';

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
      state?: 'active' | 'inactive';
      is_curated?: boolean;
      source_type?: string | null;
      source_url?: string | null;
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
    isAdmin: boolean;
    isCurated: boolean;
  };

  export let form;

  // Contact form state
  let firstName = '';
  let lastName = '';
  let email = '';
  let phone = '';
  
  // Initialize message with board details
  function getInitialMessage(): string {
    const boardName = data.board.name || 'this board';
    const priceText = data.board.price != null 
      ? ` for $${data.board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';
    return `I'd like to know if the ${boardName} you have listed on QuiverShare${priceText} is still available.`;
  }
  
  let message = getInitialMessage();

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

  // Hero rendering gate
  let heroReady = false;

  // Lightbox state
  let lightboxOpen = false;
  let lightboxIndex = 0;

  async function openLightbox(index: number = 0) {
    if (allImages.length > 0 && allImages[index]) {
      try {
        const img = new Image();
        img.src = allImages[index].image_url;
        await img.decode();
        lightboxIndex = index;
        lightboxOpen = true;
      } catch (err) {
        // If decode fails, still open lightbox (fallback)
        lightboxIndex = index;
        lightboxOpen = true;
      }
    }
  }
  
  function openGallery() {
    openLightbox(0);
  }

  function closeLightbox() {
    lightboxOpen = false;
  }

  async function nextLightboxImage() {
    if (allImages.length > 0) {
      const nextIndex = (lightboxIndex + 1) % allImages.length;
      if (allImages[nextIndex]) {
        try {
          const img = new Image();
          img.src = allImages[nextIndex].image_url;
          await img.decode();
          lightboxIndex = nextIndex;
        } catch (err) {
          // If decode fails, still switch (fallback)
          lightboxIndex = nextIndex;
        }
      }
    }
  }

  async function prevLightboxImage() {
    if (allImages.length > 0) {
      const prevIndex = (lightboxIndex - 1 + allImages.length) % allImages.length;
      if (allImages[prevIndex]) {
        try {
          const img = new Image();
          img.src = allImages[prevIndex].image_url;
          await img.decode();
          lightboxIndex = prevIndex;
        } catch (err) {
          // If decode fails, still switch (fallback)
          lightboxIndex = prevIndex;
        }
      }
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

  // Preload and decode first hero image on mount
  onMount(async () => {
    if (heroImages.length > 0) {
      const firstImage = heroImages[0];
      try {
        const img = new Image();
        img.src = firstImage.image_url;
        await img.decode();
        heroReady = true;
      } catch (err) {
        // If decode fails, still show images (fallback)
        heroReady = true;
      }
    } else {
      // No images, show placeholder immediately
      heroReady = true;
    }
  });

  // Reset contact form on successful submission
  $: if (form?.context === 'contactSeller' && form?.success) {
    firstName = '';
    lastName = '';
    email = '';
    phone = '';
    message = getInitialMessage();
  }

  // Curated listing handling
  const sourceTypeLabels: Record<string, string> = {
    facebook: 'Facebook Marketplace',
    craigslist: 'Craigslist'
  };

  $: isCurated = data.board.is_curated === true;
  $: curatedSourceLabel = isCurated && data.board.source_type
    ? sourceTypeLabels[data.board.source_type] ?? 'Original source'
    : null;
</script>

<svelte:head>
  <title>{boardTitle} | QuiverShare</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    <!-- Breadcrumb -->
    <nav class="mb-4" aria-label="Breadcrumb">
      <a
        href="/s"
        class="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        Search Results
      </a>
      <span class="text-sm text-muted-foreground mx-2">/</span>
      <span class="text-sm text-muted-foreground">
        {data.board.name || 'Untitled Board'}
      </span>
    </nav>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{boardTitle}</h1>
      {#if data.canEdit || (data.isAdmin && data.isCurated)}
        <div class="flex items-center gap-3">
          {#if data.isAdmin && data.isCurated}
            <!-- Admin edit for curated boards (prioritized) -->
            <a
              href={`/admin/curated-boards/${data.board.id}`}
              class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Edit
            </a>
          {:else if data.canEdit}
            <!-- Owner edit for non-curated boards -->
            <a
              href={`/surfboards/${data.board.id}/boost`}
              class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-surface-elevated border border-border text-foreground hover:bg-surface transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Manage Boost
            </a>
            
            <a
              href={`/edit-surfboard/${data.board.id}`}
              class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Edit
            </a>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Curated Banner -->
    {#if isCurated && curatedSourceLabel}
      <div class="mb-6 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-muted-foreground">
        This is a curated listing from <span class="font-semibold text-foreground">{curatedSourceLabel}</span>. 
        Use the original listing to contact the seller and confirm availability.
      </div>
    {/if}

    <!-- Hero Images: Single portrait on mobile, 3-tile grid on desktop -->
    <div class="w-full mb-8 max-w-6xl">
      <!-- Mobile: Single portrait hero image -->
      <div class="block md:hidden">
        {#if heroReady && heroImages[0]}
          <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-elevated border border-border">
            <button
              type="button"
              class="w-full h-full hover:opacity-90 transition-opacity"
              on:click={() => openLightbox(0)}
              aria-label="View {data.board.name || 'Surfboard'} image gallery"
            >
              <img
                src={heroImages[0].image_url}
                alt="{data.board.name || 'Surfboard'} image 1"
                class="w-full h-full object-cover object-top"
                loading="eager"
                decoding="sync"
                fetchpriority="high"
                on:error={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x533?text=No+Image';
                }}
              />
            </button>
          </div>
        {:else}
          <!-- Placeholder -->
          <div class="aspect-[3/4] rounded-xl bg-surface border border-border"></div>
        {/if}
      </div>

      <!-- Desktop: 3-tile grid -->
      <div class="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-2">
        {#if heroReady}
          {#each heroImages as img, i (img.id)}
            <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-elevated border border-border">
              <button
                type="button"
                class="w-full h-full hover:opacity-90 transition-opacity"
                on:click={() => openLightbox(i)}
                aria-label="View {data.board.name || 'Surfboard'} image {i + 1}"
              >
                <img
                  src={img.image_url}
                  alt="{data.board.name || 'Surfboard'} image {i + 1}"
                  class="w-full h-full object-cover object-top"
                  loading="eager"
                  decoding="sync"
                  fetchpriority="high"
                  on:error={(e) => {
                    (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x533?text=No+Image';
                  }}
                />
              </button>
              
              <!-- "See Gallery" button overlay on right-most tile only -->
              {#if i === 2 && allImages.length > 3}
                <button
                  type="button"
                  class="absolute bottom-3 right-3 bg-surface-elevated/90 backdrop-blur border border-border text-foreground text-xs px-3 py-1.5 rounded-full shadow-sm transition-all hover:bg-surface-elevated"
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
          {/each}
        {:else}
          <!-- Stable placeholder while hero images decode -->
          <div class="aspect-[3/4] rounded-xl bg-surface border border-border"></div>
        {/if}
      </div>
    </div>

    <!-- Details Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <!-- Left: Board Specs Card -->
      <div class="bg-surface-elevated border border-border rounded-xl shadow-sm p-6">
        <h2 class="text-2xl font-bold mb-4 text-foreground tracking-tight">Board Specs</h2>
        <div class="space-y-4">
          {#if data.board.price != null}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Price</p>
              <p class="text-2xl font-bold text-primary">${data.board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          {/if}

          {#if data.board.length != null || data.board.width != null || data.board.thickness != null}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Dimensions</p>
              <p class="text-lg font-semibold text-foreground">{formatDimensions(data.board.length, data.board.width, data.board.thickness)}</p>
            </div>
          {/if}

          {#if data.board.volume != null}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Volume</p>
              <p class="text-lg font-semibold text-foreground">{data.board.volume}L</p>
            </div>
          {/if}

          {#if data.board.fin_system}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Fin System</p>
              <p class="text-lg font-semibold text-foreground">{data.board.fin_system}</p>
            </div>
          {/if}

          {#if data.board.fin_setup}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Fin Setup</p>
              <p class="text-lg font-semibold text-foreground">{data.board.fin_setup}</p>
            </div>
          {/if}

          {#if data.board.style}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Style</p>
              <p class="text-lg font-semibold text-foreground">{data.board.style}</p>
            </div>
          {/if}

          {#if data.board.condition}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Condition</p>
              <p class="text-lg font-semibold text-foreground">{data.board.condition}</p>
            </div>
          {/if}

          {#if data.board.city || data.board.region}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Location</p>
              <p class="text-lg font-semibold text-foreground">
                {[data.board.city, data.board.region].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
          {/if}

          {#if data.board.notes}
            <div>
              <p class="text-sm text-muted-foreground mb-1">Description</p>
              <p class="text-base whitespace-pre-wrap leading-relaxed text-foreground">{data.board.notes}</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right: Contact Seller / How to Buy Card -->
      <div class="bg-surface-elevated border border-border rounded-xl shadow-sm p-6">
        <h2 class="text-2xl font-bold mb-4 text-foreground tracking-tight">
          {isCurated ? 'How to Buy' : 'Contact Seller'}
        </h2>
        {#if isCurated}
          <div class="space-y-4">
            <p class="text-sm text-muted-foreground">
              This board was sourced from {curatedSourceLabel || 'an external marketplace'}. 
              To contact the seller or check if it's still available, open the original listing below.
            </p>

            {#if data.board.source_url}
              <button
                type="button"
                class="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                on:click={() => window.open(data.board.source_url!, '_blank', 'noopener,noreferrer')}
              >
                View listing on {curatedSourceLabel || 'original site'}
              </button>
            {:else}
              <p class="text-sm text-red-400">
                Original listing URL is unavailable. This curated board cannot be contacted via QuiverShare.
              </p>
            {/if}
          </div>
        {:else if data.owner}
          <div class="space-y-4">
            <div>
              <p class="text-sm text-muted-foreground mb-1">Seller</p>
              <p class="text-lg font-semibold text-foreground">{data.owner.full_name || data.owner.username}</p>
              <a
                href="/profile/{data.owner.username}"
                class="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
              >
                @{data.owner.username}
              </a>
            </div>

            {#if data.owner.city || data.owner.region}
              <div>
                <p class="text-sm text-muted-foreground mb-1">Location</p>
                <p class="text-lg font-semibold text-foreground">
                  {[data.owner.city, data.owner.region].filter(Boolean).join(', ') || 'N/A'}
                </p>
              </div>
            {/if}

            <div class="pt-4">
              <form method="POST" action="?/contactSeller" use:enhance class="space-y-4">
                <!-- First Name -->
                <div class="space-y-1">
                  <label for="first_name" class="block text-sm font-medium text-muted-foreground">
                    First Name <span class="text-red-400">*</span>
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    bind:value={firstName}
                    required
                    class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Your first name"
                  />
                </div>

                <!-- Last Name -->
                <div class="space-y-1">
                  <label for="last_name" class="block text-sm font-medium text-muted-foreground">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    bind:value={lastName}
                    class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="Your last name (optional)"
                  />
                </div>

                <!-- Email -->
                <div class="space-y-1">
                  <label for="email" class="block text-sm font-medium text-muted-foreground">
                    Email <span class="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    bind:value={email}
                    required
                    class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="your.email@example.com"
                  />
                </div>

                <!-- Phone -->
                <div class="space-y-1">
                  <label for="phone" class="block text-sm font-medium text-muted-foreground">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    bind:value={phone}
                    class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
                    placeholder="(555) 123-4567 (optional)"
                  />
                </div>

                <!-- Message -->
                <div class="space-y-1">
                  <label for="message" class="block text-sm font-medium text-muted-foreground">
                    Message <span class="text-red-400">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    bind:value={message}
                    required
                    rows="4"
                    class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition resize-y"
                    placeholder="Your message to the seller"
                  ></textarea>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  class="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Send Message
                </button>

                <!-- Success/Error Messages -->
                {#if form?.context === 'contactSeller'}
                  {#if form.success}
                    <p class="text-sm text-green-600 dark:text-green-400">
                      {form.message || 'Your message has been sent to the seller.'}
                    </p>
                  {:else if form.message}
                    <p class="text-sm text-red-400">
                      {form.message}
                    </p>
                  {/if}
                {/if}
              </form>
            </div>

            <div class="pt-4 border-t border-border">
              <p class="text-xs text-muted-foreground">
                Meet in a public place. Inspect before paying.
              </p>
            </div>
          </div>
        {:else}
          <p class="text-muted-foreground">Seller information unavailable</p>
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
    tabindex="-1"
    on:click={closeLightbox}
    on:keydown={handleLightboxKeydown}
    on:keydown={trapFocus}
    bind:this={lightboxContainer}
  >
    <div 
      class="relative max-w-7xl max-h-full" 
      on:click|stopPropagation
      on:keydown={(e) => {
        if (e.key === 'Escape') {
          closeLightbox();
        }
      }}
      role="presentation"
    >
      <!-- Close button -->
      <button
        type="button"
        class="absolute top-4 right-4 z-10 bg-surface-elevated/90 backdrop-blur border border-border text-foreground rounded-full p-2 shadow-sm hover:bg-surface-elevated transition-colors"
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
          loading="lazy"
          decoding="async"
          on:error={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/1200x1200?text=No+Image';
          }}
        />
      {/if}

      <!-- Navigation arrows (if multiple images) -->
      {#if allImages.length > 1}
        <button
          type="button"
          class="absolute left-4 top-1/2 -translate-y-1/2 bg-surface-elevated/90 backdrop-blur border border-border text-foreground rounded-full p-3 shadow-sm hover:bg-surface-elevated transition-colors"
          on:click|stopPropagation={prevLightboxImage}
          aria-label="Previous image"
          tabindex="0"
        >
          <span class="text-xl">‹</span>
        </button>
        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 bg-surface-elevated/90 backdrop-blur border border-border text-foreground rounded-full p-3 shadow-sm hover:bg-surface-elevated transition-colors"
          on:click|stopPropagation={nextLightboxImage}
          aria-label="Next image"
          tabindex="0"
        >
          <span class="text-xl">›</span>
        </button>

        <!-- Image counter -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-elevated/90 backdrop-blur border border-border text-foreground rounded-full px-4 py-2 text-sm shadow-sm">
          {lightboxIndex + 1} / {allImages.length}
        </div>
      {/if}
    </div>
  </div>
{/if}
