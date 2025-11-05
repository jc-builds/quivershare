<script lang="ts">
  import { goto } from '$app/navigation';

  export let data: {
    surfboard: {
      id: string;
      name: string;
      make: string | null;
      length: number | null;
      width: number | null;
      thickness: number | null;
      volume: number | null;
      fins: string | null;
      condition: string | null;
      notes: string | null;
      thumbnail_url: string | null;
      user_id: string;
    };
    images: Array<{ id: string; image_url: string }>;
    owner: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
      profile_picture_url: string | null;
    } | null;
    isOwner: boolean;
  };

  // Get all images for carousel
  $: allImages = [
    ...(data.surfboard.thumbnail_url ? [{ id: 'thumb', image_url: data.surfboard.thumbnail_url }] : []),
    ...data.images
  ].filter((img, index, self) => 
    index === self.findIndex((i) => i.image_url === img.image_url)
  );

  // If no images, use placeholder
  $: displayImages = allImages.length > 0 
    ? allImages 
    : [{ id: 'placeholder', image_url: "https://via.placeholder.com/1200x800?text=No+Image" }];

  let currentImageIndex = 0;

  function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % displayImages.length;
  }

  function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + displayImages.length) % displayImages.length;
  }

  function goToImage(index: number) {
    currentImageIndex = index;
  }

  // Convert inches to feet and inches format (e.g., 96 -> "8'0\"")
  function formatLength(inches: number | null | undefined): string {
    if (inches == null) return "N/A";
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  }

  // Get profile picture URL
  function getProfilePictureUrl(): string {
    if (!data.owner) return '/default_profile_picture.jpg';
    return data.owner.profile_picture_url || data.owner.avatar_url || '/default_profile_picture.jpg';
  }
</script>

<section class="min-h-screen bg-base-200">
  <!-- Back Button -->
  <div class="sticky top-0 z-20 bg-base-200/80 backdrop-blur-sm py-4 px-6">
    <button 
      class="btn btn-ghost btn-sm" 
      on:click={() => history.back()}
    >
      ← Back
    </button>
  </div>

  <!-- Board Name -->
  <div class="max-w-7xl mx-auto px-6 py-6">
    <h1 class="text-4xl font-bold mb-2">{data.surfboard.name}</h1>
    {#if data.surfboard.make}
      <p class="text-xl text-gray-600">by {data.surfboard.make}</p>
    {/if}
  </div>

  <!-- Image Carousel -->
  <div class="relative w-full bg-base-300">
    <div class="relative aspect-[4/3] w-full max-w-5xl mx-auto overflow-hidden">
      {#each displayImages as img, index}
        <img
          src={img.image_url}
          alt="{data.surfboard.name} - Image {index + 1}"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 {index === currentImageIndex ? 'opacity-100' : 'opacity-0'}"
          loading={index === 0 ? 'eager' : 'lazy'}
          on:error={(e) =>
            ((e.currentTarget as HTMLImageElement).src =
              "https://via.placeholder.com/1200x800?text=No+Image")}
        />
      {/each}

      <!-- Navigation Arrows -->
      {#if displayImages.length > 1}
        <button
          type="button"
          class="absolute left-4 top-1/2 -translate-y-1/2 bg-base-100/90 hover:bg-base-100 rounded-full p-2 shadow-lg transition-all"
          on:click={prevImage}
          aria-label="Previous image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 bg-base-100/90 hover:bg-base-100 rounded-full p-2 shadow-lg transition-all"
          on:click={nextImage}
          aria-label="Next image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Image Indicators -->
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {#each displayImages as _, index}
            <button
              type="button"
              class="w-2 h-2 rounded-full transition-all {index === currentImageIndex ? 'bg-base-100 w-8' : 'bg-base-100/50'}"
              on:click={() => goToImage(index)}
              aria-label="Go to image {index + 1}"
            />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Thumbnail Strip (if multiple images) -->
    {#if displayImages.length > 1}
      <div class="bg-base-100 px-4 sm:px-6 py-4 overflow-x-auto">
        <div class="flex gap-2 max-w-7xl mx-auto justify-center sm:justify-start">
          {#each displayImages as img, index}
            <button
              type="button"
              class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all {index === currentImageIndex ? 'border-primary' : 'border-transparent'}"
              on:click={() => goToImage(index)}
            >
              <img
                src={img.image_url}
                alt="Thumbnail {index + 1}"
                class="w-full h-full object-cover"
                on:error={(e) =>
                  ((e.currentTarget as HTMLImageElement).src =
                    "https://via.placeholder.com/80x80?text=No+Image")}
              />
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Details Section -->
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Main Content -->
      <div class="lg:col-span-2">
        <!-- Owner Info -->
        {#if data.owner}
          <div class="flex items-center gap-3 mb-6 pb-6 border-b border-base-300">
            <div class="w-12 h-12 rounded-full overflow-hidden bg-base-300 border-2 border-base-200">
              <img
                src={getProfilePictureUrl()}
                alt={data.owner.full_name || data.owner.username}
                class="w-full h-full object-cover"
                on:error={(e) =>
                  ((e.currentTarget as HTMLImageElement).src =
                    '/default_profile_picture.jpg')}
              />
            </div>
            <div>
              <p class="font-semibold">{data.owner.full_name || data.owner.username}</p>
              <a 
                href="/profile/{data.owner.username}" 
                class="text-sm text-gray-500 hover:text-primary"
                data-sveltekit-prefetch
              >
                @{data.owner.username}
              </a>
            </div>
          </div>
        {/if}

        <!-- Specifications -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Specifications</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {#if data.surfboard.length}
              <div>
                <p class="text-sm text-gray-500 mb-1">Length</p>
                <p class="text-xl font-semibold">{formatLength(data.surfboard.length)}</p>
              </div>
            {/if}
            {#if data.surfboard.width}
              <div>
                <p class="text-sm text-gray-500 mb-1">Width</p>
                <p class="text-xl font-semibold">{data.surfboard.width}"</p>
              </div>
            {/if}
            {#if data.surfboard.thickness}
              <div>
                <p class="text-sm text-gray-500 mb-1">Thickness</p>
                <p class="text-xl font-semibold">{data.surfboard.thickness}"</p>
              </div>
            {/if}
            {#if data.surfboard.volume}
              <div>
                <p class="text-sm text-gray-500 mb-1">Volume</p>
                <p class="text-xl font-semibold">{data.surfboard.volume}L</p>
              </div>
            {/if}
            {#if data.surfboard.fins}
              <div>
                <p class="text-sm text-gray-500 mb-1">Fin Setup</p>
                <p class="text-xl font-semibold">{data.surfboard.fins}</p>
              </div>
            {/if}
            {#if data.surfboard.condition}
              <div>
                <p class="text-sm text-gray-500 mb-1">Condition</p>
                <p class="text-xl font-semibold">{data.surfboard.condition}</p>
              </div>
            {/if}
          </div>
        </div>

        {#if data.surfboard.notes}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4">About this board</h2>
            <p class="text-gray-700 whitespace-pre-wrap leading-relaxed">{data.surfboard.notes}</p>
          </div>
        {/if}
      </div>

      <!-- Sidebar Actions -->
      <div class="lg:col-span-1">
        <div class="sticky top-24 bg-base-100 rounded-xl shadow-lg p-6 border border-base-300">
          <div class="flex flex-col gap-3">
            {#if data.isOwner}
              <a href="/edit-surfboard/{data.surfboard.id}" class="btn btn-primary w-full">
                Edit Board
              </a>
            {/if}
            <a href="/profile/{data.owner?.username}" class="btn btn-outline w-full">
              View Profile
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

