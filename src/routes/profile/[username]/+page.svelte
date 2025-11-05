<script lang="ts">
  import { goto } from '$app/navigation';

  export let data: {
    profile: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
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
    }>;
    isOwnProfile: boolean;
    currentUserId: string | null;
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
  };

  let following = data.isFollowing;
  let followerCount = data.followerCount;
  let isProcessing = false;

  // Convert inches to feet and inches format (e.g., 96 -> "8'0\"")
  function formatLength(inches: number | null | undefined): string {
    if (inches == null) return "";
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  }

  // Format location string
  function formatLocation(): string {
    const parts: string[] = [];
    if (data.profile.city) parts.push(data.profile.city);
    if (data.profile.region) parts.push(data.profile.region);
    if (data.profile.country) parts.push(data.profile.country);
    return parts.length > 0 ? parts.join(', ') : (data.profile.location_label || '');
  }

  // Get profile picture URL (prioritize profile_picture_url, fallback to avatar_url, then default)
  function getProfilePictureUrl(): string {
    return data.profile.profile_picture_url || data.profile.avatar_url || '/default_profile_picture.jpg';
  }

  async function toggleFollow() {
    if (!data.currentUserId || data.isOwnProfile || isProcessing) return;
    
    isProcessing = true;
    const endpoint = following ? 'unfollow' : 'follow';
    
    try {
      const response = await fetch(`/profile/${data.profile.username}/${endpoint}`, {
        method: 'POST',
      });

      if (response.ok) {
        following = !following;
        followerCount += following ? 1 : -1;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        alert(`Failed to ${following ? 'unfollow' : 'follow'}: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert(`Failed to ${following ? 'unfollow' : 'follow'} user`);
    } finally {
      isProcessing = false;
    }
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
        <p class="text-gray-500 mb-2">@{data.profile.username}</p>
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
        <div class="flex gap-4 text-sm text-gray-400 mb-2">
          <span>{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</span>
          <span>{data.followingCount} following</span>
        </div>
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
          {:else if data.currentUserId}
            <button
              class="btn btn-sm {following ? 'btn-outline' : 'btn-primary'}"
              on:click={toggleFollow}
              disabled={isProcessing}
            >
              {isProcessing ? '...' : (following ? 'Following' : 'Follow')}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Surfboards Section -->
  <div class="mb-4">
    <h2 class="text-2xl font-bold mb-4">
      {data.isOwnProfile ? 'My Boards' : "Surfboards"} ({data.boards.length})
    </h2>
  </div>

  {#if data.boards.length === 0}
    <div class="text-center py-12 bg-base-100 rounded-xl">
      <p class="text-gray-400">
        {data.isOwnProfile ? "You haven't added any boards yet." : "No boards yet."}
      </p>
      {#if data.isOwnProfile}
        <a href="/create-surfboard" class="btn btn-primary mt-4">
          + Add Board
        </a>
      {/if}
    </div>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center"
    >
      {#each data.boards as board}
        <a
          href={data.isOwnProfile ? `/edit-surfboard/${board.id}` : `/surfboards/${board.id}`}
          data-sveltekit-prefetch
          class="block w-full max-w-xs rounded-xl overflow-hidden bg-base-100 border border-base-300 shadow-sm
         hover:shadow-lg hover:-translate-y-[2px] transition-all duration-200 ease-out"
        >
          <div class="relative aspect-square w-full bg-base-300">
            <img
              src={board.thumbnail_url ??
                board.image_url ??
                "https://via.placeholder.com/800x600?text=No+Image"}
              alt={board.name}
              class="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              on:error={(e) =>
                ((e.currentTarget as HTMLImageElement).src =
                  "https://via.placeholder.com/800x600?text=No+Image")}
            />
          </div>
          <div class="p-4">
            <h3 class="font-semibold text-lg mb-1">{board.name}</h3>
            <p class="text-sm text-gray-400">
              {formatLength(board.length)} × {board.width}" × {board.thickness}"
            </p>
            <p class="text-sm mt-1">{board.condition}</p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
