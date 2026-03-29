<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { pageTitle } from '$lib/title';
  import LocationAutocomplete from '$lib/components/LocationAutocomplete.svelte';
  import type { StructuredLocation } from '$lib/types/location';

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
      latitude: number | null;
      longitude: number | null;
      home_break_label: string | null;
      home_break_lat: number | null;
      home_break_lon: number | null;
      bio: string | null;
    };
  };

  export let form: { message?: string; error?: string } | undefined;

  // Profile form state
  let bio = data.profile.bio || '';
  let homeBreakLabel = data.profile.home_break_label || '';

  // Delete account confirmation state
  let showDeleteConfirm = false;
  let deleteConfirmText = '';
  const requiredConfirmText = 'DELETE';

  // Profile picture upload
  let fileInput: HTMLInputElement;
  let profilePictureFile: File | null = null;
  let profilePicturePreview: string | null = null;
  let profilePictureRemoved = false; // Explicit flag for removal intent
  let uploadingPicture = false;

  onMount(async () => {
    // Load existing profile picture
    if (data.profile.profile_picture_url) {
      profilePicturePreview = data.profile.profile_picture_url;
    }
  });

  // Location — shared component
  let selectedLocation: StructuredLocation | null =
    data.profile.latitude != null && data.profile.longitude != null
      ? {
          id: '',
          label: data.profile.location_label || 'Selected location',
          lat: data.profile.latitude,
          lon: data.profile.longitude,
          city: data.profile.city || '',
          region: data.profile.region || '',
          country: data.profile.country || '',
        }
      : null;

  // Profile picture handling
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const type = file.type.toLowerCase();
    if (type !== 'image/jpeg' && type !== 'image/jpg' && type !== 'image/png' && type !== 'image/webp') {
      alert('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    profilePictureFile = file;
    profilePicturePreview = URL.createObjectURL(file);
    profilePictureRemoved = false; // Clear removal flag when uploading new picture
  }

  async function removeProfilePicture() {
    if (confirm('Remove your profile picture? It will revert to your Google avatar.')) {
      profilePictureFile = null;
      profilePicturePreview = '/default_profile_picture.jpg';
      profilePictureRemoved = true; // Explicit removal flag
    }
  }



  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    uploadingPicture = false; // Reset state
    
    // Build FormData
    const formData = new FormData(form);
    
    // Handle profile picture changes explicitly
    if (profilePictureFile) {
      // User uploaded a new picture
      formData.set('profile_picture', profilePictureFile);
      uploadingPicture = true;
      // Explicitly don't include remove_picture when uploading
      formData.delete('remove_picture');
    } else if (profilePictureRemoved) {
      // User explicitly clicked "Remove"
      formData.set('remove_picture', 'true');
      // Explicitly don't include profile_picture when removing
      formData.delete('profile_picture');
    } else {
      // No change to profile picture - don't include either field
      formData.delete('profile_picture');
      formData.delete('remove_picture');
    }
    
    try {
      const submitUrl = window.location.pathname;
      
      // Submit to the server action (server will handle file upload)
      // Use redirect: 'manual' to handle SvelteKit redirects ourselves
      const response = await fetch(submitUrl, {
        method: 'POST',
        body: formData,
        redirect: 'manual' as RequestRedirect
      });

      // Handle redirect (SvelteKit returns 303 with Location header)
      if (response.status === 303) {
        const location = response.headers.get('location');
        if (location) {
          // Handle both absolute and relative URLs
          const redirectPath = location.startsWith('http') 
            ? new URL(location).pathname 
            : location;
          goto(redirectPath, { invalidateAll: true });
          return;
        }
      }

      // Check response status
      if (response.ok) {
        // Success - redirect to profile page
        goto(`/profile/${data.profile.username}`, { invalidateAll: true });
        return;
      } else {
        // Error response
        uploadingPicture = false;
        try {
          const result = await response.json();
          alert(result.data?.message || result.message || 'Failed to save profile. Please try again.');
        } catch {
          alert(`Failed to save profile (${response.status}). Please try again.`);
        }
      }
    } catch (err) {
      console.error('Form submission error:', err);
      uploadingPicture = false;
      alert('An error occurred while saving. Please try again.');
    }
  }
</script>

<svelte:head>
  <title>{pageTitle('Edit Profile')}</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground px-4 py-6 sm:py-8 max-w-2xl mx-auto">
  <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight mb-6 text-foreground">Edit Profile</h1>

  <form method="POST" on:submit|preventDefault={handleSubmit} class="space-y-6">
    <input type="hidden" name="intent" value="updateProfile" />
    <!-- Profile Picture -->
    <div class="space-y-1">
      <label class="block text-sm font-medium text-muted-foreground" for="profile-picture-input">
        Profile Picture
      </label>
      <div class="flex items-center gap-4">
        <div class="w-24 h-24 rounded-full overflow-hidden bg-surface border-4 border-border flex-shrink-0">
          <img
            src={profilePicturePreview || '/default_profile_picture.jpg'}
            alt="Profile"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-sm"
            on:click={() => fileInput?.click()}
          >
            {profilePicturePreview && profilePicturePreview !== data.profile.profile_picture_url ? 'Change' : 'Upload'}
          </button>
          {#if profilePicturePreview && profilePicturePreview !== data.profile.profile_picture_url}
            <button
              type="button"
              class="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              on:click={removeProfilePicture}
            >
              Remove
            </button>
          {/if}
        </div>
        <input
          id="profile-picture-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="hidden"
        />
      </div>
      <p class="text-xs text-muted-foreground mt-2">
        Square images work best. Max 1MB.
      </p>
    </div>

    <!-- Bio -->
    <div class="space-y-1">
      <label for="bio" class="block text-sm font-medium text-muted-foreground">
        Bio
      </label>
      <textarea
        id="bio"
        name="bio"
        bind:value={bio}
        class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        placeholder="Tell us about yourself..."
        rows="4"
        maxlength="500"
      ></textarea>
      <p class="text-xs text-muted-foreground mt-1">
        {bio.length}/500 characters
      </p>
    </div>

    <!-- Home Break (plain text) -->
    <div class="space-y-1">
      <label for="home_break" class="block text-sm font-medium text-muted-foreground">
        Home Break
      </label>
      <input
        id="home_break"
        name="home_break_label"
        type="text"
        class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        placeholder="e.g. 2nd Jetty on the Left, Trestles, Pipeline"
        bind:value={homeBreakLabel}
        maxlength="200"
      />
      <p class="text-xs text-muted-foreground mt-1">
        Optional — can be specific or playful (e.g. "2nd Jetty on the Left")
      </p>
    </div>

    <!-- Location -->
    <LocationAutocomplete
      bind:value={selectedLocation}
      required={false}
      label="Location"
      id="location"
      placeholder="Start typing... e.g. Brooklyn"
    />

    {#if form?.message}
      <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
        <span class="text-muted-foreground">{form.message}</span>
      </div>
    {/if}

    {#if form?.error}
      <div class="mt-4 rounded-lg border border-destructive/60 bg-surface p-3 text-sm text-destructive">
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- Submit Buttons -->
    <div class="flex gap-2 justify-end">
      <a href="/profile/{data.profile.username}" class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        Cancel
      </a>
      <button type="submit" class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed" disabled={uploadingPicture}>
        {uploadingPicture ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </form>

  <!-- Delete Account Section -->
  <div class="mt-12 pt-8 border-t border-border">
    <h2 class="text-lg font-semibold text-foreground mb-2">Danger Zone</h2>
    <p class="text-sm text-muted-foreground mb-4">
      Once you delete your account, there is no going back. Please be certain.
    </p>
    <button
      type="button"
      class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-destructive/60 bg-destructive/10 text-destructive hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      on:click={() => {
        showDeleteConfirm = true;
        deleteConfirmText = '';
      }}
    >
      Delete account
    </button>
  </div>
</section>

<!-- Delete Account Confirmation Modal -->
{#if showDeleteConfirm}
  <div 
    class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-account-title"
    on:click={() => showDeleteConfirm = false} 
    on:keydown={(e) => e.key === 'Escape' && (showDeleteConfirm = false)}
    tabindex="-1"
  >
    <div 
      class="bg-surface-elevated border border-border rounded-xl p-6 max-w-md w-full shadow-xl text-foreground" 
      role="presentation"
      on:click|stopPropagation={(e) => e.stopPropagation()}
      on:keydown={(e) => e.stopPropagation()}
    >
      <h2 id="delete-account-title" class="text-xl font-semibold mb-4 text-foreground">Delete Account</h2>
      
      <div class="space-y-4 mb-6">
        <p class="text-sm text-foreground">
          Are you sure you want to delete your account? This action cannot be undone.
        </p>
        
        <div class="bg-surface rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
          <p class="font-medium text-foreground mb-2">What will happen:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Your account will be permanently deleted</li>
            <li>All active listings will be removed from search</li>
            <li>You will be logged out and won't be able to log back in</li>
          </ul>
        </div>

        <div class="space-y-2">
          <label for="delete-confirm" class="block text-sm font-medium text-foreground">
            Type <span class="font-mono font-semibold text-destructive">{requiredConfirmText}</span> to confirm:
          </label>
          <input
            id="delete-confirm"
            type="text"
            bind:value={deleteConfirmText}
            class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            placeholder={requiredConfirmText}
            autocomplete="off"
          />
        </div>
      </div>

      <form method="POST">
        <input type="hidden" name="intent" value="deleteAccount" />
        <input type="hidden" name="confirm_text" value={deleteConfirmText} />
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            on:click={() => {
              showDeleteConfirm = false;
              deleteConfirmText = '';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-white hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={deleteConfirmText !== requiredConfirmText}
          >
            Confirm Delete
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

