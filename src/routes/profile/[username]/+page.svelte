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

<section class="min-h-screen bg-background text-foreground px-4 py-6 sm:py-8 max-w-4xl mx-auto">
  <!-- Profile Header -->
  <div class="bg-surface-elevated border border-border rounded-xl shadow-sm p-6 sm:p-8 mb-6">
    <div class="flex flex-col md:flex-row gap-6 items-start md:items-center">
      <!-- Profile Picture -->
      <div class="flex-shrink-0">
        <div class="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-surface border-4 border-border">
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
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight mb-1 text-foreground">
          {data.profile.full_name || data.profile.username}
        </h1>
        {#if formatLocation()}
          <p class="text-sm text-muted-foreground mb-1">
            📍 {formatLocation()}
          </p>
        {/if}
        {#if data.profile.home_break_label}
          <p class="text-sm text-muted-foreground mb-1">
            🏄 {data.profile.home_break_label}
          </p>
        {/if}
        {#if data.profile.bio}
          <p class="text-sm text-foreground mb-2">{data.profile.bio}</p>
        {/if}
        <p class="text-xs text-muted-foreground">
          Member since {new Date(data.profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>

        <!-- Action Buttons -->
        <div class="mt-4 flex gap-2">
          {#if data.isOwnProfile}
            <a href="/my-boards" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm">
              My Boards
            </a>
            <a href="/profile/edit" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Edit Profile
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Active Listings Section -->
  <div class="mb-4">
    <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mb-4 text-foreground">Active Listings</h2>
  </div>

  {#if data.boards.length === 0}
    <div class="text-center py-12 bg-surface-elevated border border-border rounded-xl">
      <p class="text-muted-foreground">
        This user has no active listings.
      </p>
    </div>
  {:else}
    <div class="bg-surface-elevated border border-border rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface text-muted-foreground border-b border-border">
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Thumb</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Name</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Dims</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Asking Price</th>
            </tr>
          </thead>
          <tbody>
            {#each data.boards as board}
              <tr class="border-b border-border/60 last:border-0 hover:bg-surface/80 transition-colors">
                <td class="px-4 py-3 align-middle">
                  <div class="w-16 h-16 rounded-md overflow-hidden bg-surface border border-border">
                    <img
                      src={board.thumbnail_url ??
                        board.image_url ??
                        "https://via.placeholder.com/800x600?text=No+Image"}
                      alt={board.name}
                      class="w-full h-full object-cover"
                      loading="lazy"
                      on:error={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/800x600?text=No+Image")}
                    />
                  </div>
                </td>
                <td class="px-4 py-3 align-middle">
                  <a
                    href={`/surfboards/${board.id}`}
                    data-sveltekit-prefetch
                    class="text-sm font-semibold text-foreground hover:text-primary hover:underline underline-offset-2"
                  >
                    {board.name}
                  </a>
                </td>
                <td class="px-4 py-3 align-middle">
                  <div class="text-sm text-muted-foreground">
                    {formatDimensions(board.length, board.width, board.thickness)}
                  </div>
                </td>
                <td class="px-4 py-3 align-middle">
                  <div class="text-sm font-semibold text-primary">
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
