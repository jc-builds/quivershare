<script lang="ts">
  export let data: {
    profile: {
      id: string;
      username: string;
      full_name: string | null;
      profile_picture_url: string | null;
      location_label: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      home_break_label: string | null;
      bio: string | null;
      created_at: string;
    };
    boards: Array<{
      id: string;
      name: string;
      thumbnail_url?: string;
      image_url?: string;
      length?: number;
      width?: number;
      thickness?: number;
      condition?: string;
      price?: number | null;
    }>;
    isOwnProfile: boolean;
  };

  // Format dimensions (reused from board page)
  function formatDimensions(
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

  // Format price as currency
  function formatPrice(price: number | null | undefined): string {
    if (price == null) return '—';
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Format location string
  function formatLocation(): string {
    const parts: string[] = [];
    if (data.profile.city) parts.push(data.profile.city);
    if (data.profile.region) parts.push(data.profile.region);
    if (data.profile.country) parts.push(data.profile.country);
    return parts.length > 0 ? parts.join(', ') : (data.profile.location_label || '');
  }

  // Get profile picture URL (prioritize profile_picture_url, then default)
  function getProfilePictureUrl(): string {
    return data.profile.profile_picture_url || '/default_profile_picture.jpg';
  }

</script>

<section class="p-6 max-w-4xl mx-auto">
  <!-- Profile Header -->
  <div class="bg-base-100 rounded-xl shadow-lg p-6 mb-6">
    <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
      <!-- Profile Picture -->
      <div class="flex-shrink-0">
        <div class="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-base-300 border-4 border-base-200">
          <img
            src={getProfilePictureUrl()}
            alt={data.profile.full_name || data.profile.username}
            class="w-full h-full object-cover"
            loading="lazy"
            on:error={(e) =>
              ((e.currentTarget as HTMLImageElement).src =
                '/default_profile_picture.jpg')}
          />
        </div>
      </div>

      <!-- Profile Info -->
      <div class="flex-1 min-w-0">
        <h1 class="text-3xl font-bold mb-1">
          {data.profile.full_name || data.profile.username}
        </h1>
        {#if formatLocation()}
          <p class="text-gray-600 mb-2">
            📍 {formatLocation()}
          </p>
        {/if}
        {#if data.profile.home_break_label}
          <p class="text-gray-600 mb-2">
            🏄 {data.profile.home_break_label}
          </p>
        {/if}
        {#if data.profile.bio}
          <p class="text-gray-700 mb-2">{data.profile.bio}</p>
        {/if}
        <p class="text-sm text-gray-400">
          Member since {new Date(data.profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>

        <!-- Action Buttons -->
        <div class="mt-4 flex gap-2">
          {#if data.isOwnProfile}
            <a href="/my-boards" class="btn btn-sm btn-primary">
              My Boards
            </a>
            <a href="/profile/edit" class="btn btn-sm btn-outline">
              Edit Profile
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Active Listings Section -->
  <div class="mb-4">
    <h2 class="text-2xl font-bold mb-4">Active Listings</h2>
  </div>

  {#if data.boards.length === 0}
    <div class="text-center py-12 bg-base-100 rounded-xl">
      <p class="text-gray-400">
        This user has no active listings.
      </p>
    </div>
  {:else}
    <div class="bg-base-100 rounded-xl shadow-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Thumb</th>
              <th>Name</th>
              <th>Dims</th>
              <th>Asking Price</th>
            </tr>
          </thead>
          <tbody>
            {#each data.boards as board}
              <tr>
                <td>
                  <div class="avatar">
                    <div class="mask mask-squircle w-16 h-16 bg-base-300">
                      <img
                        src={board.thumbnail_url ??
                          board.image_url ??
                          "https://via.placeholder.com/800x600?text=No+Image"}
                        alt={board.name}
                        loading="lazy"
                        on:error={(e) =>
                          ((e.currentTarget as HTMLImageElement).src =
                            "https://via.placeholder.com/800x600?text=No+Image")}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <a
                    href={`/surfboards/${board.id}`}
                    data-sveltekit-prefetch
                    class="font-semibold hover:text-primary hover:underline"
                  >
                    {board.name}
                  </a>
                </td>
                <td>
                  <div class="text-sm text-base-content/80">
                    {formatDimensions(board.length, board.width, board.thickness)}
                  </div>
                </td>
                <td>
                  <div class="font-semibold text-primary">
                    {formatPrice(board.price)}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</section>
