<script lang="ts">
  import { onMount } from 'svelte';
  import imageCompression from 'browser-image-compression';
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';

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
  let uploadingPicture = false;

  // Cropper.js for profile picture
  let CropperCtor: any = null;
  let cropper: any = null;
  let cropImgEl: HTMLImageElement;
  let showCropModal = false;
  let cropImageSrc = '';

  onMount(async () => {
    try {
      const mod = await import('cropperjs');
      CropperCtor = mod.default;
    } catch (e) {
      console.error('Failed to load cropperjs:', e);
    }

    // Load existing profile picture
    if (data.profile.profile_picture_url) {
      profilePicturePreview = data.profile.profile_picture_url;
    }
  });

  // Home break location autocomplete
  let homeBreakQuery = data.profile.home_break_label || '';
  let suggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let homeBreakLat: number | '' = data.profile.home_break_lat || '';
  let homeBreakLon: number | '' = data.profile.home_break_lon || '';
  let homeBreakCity = '';
  let homeBreakRegion = '';
  let homeBreakCountry = '';
  let debounceHandle: any;

  async function searchPlaces(q: string) {
    if (!q || q.length < 2) {
      suggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    suggestions = data.features ?? [];
  }

  function onHomeBreakInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    homeBreakQuery = v;
    homeBreakLat = '';
    homeBreakLon = '';
    homeBreakCity = '';
    homeBreakRegion = '';
    homeBreakCountry = '';

    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => searchPlaces(homeBreakQuery), 200);
  }

  function chooseSuggestion(s: (typeof suggestions)[number]) {
    homeBreakQuery = s.label;
    homeBreakLabel = s.label;
    homeBreakLat = s.lat;
    homeBreakLon = s.lon;
    homeBreakCity = s.city;
    homeBreakRegion = s.region;
    homeBreakCountry = s.country;
    suggestions = [];
  }

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

    // Show crop modal
    const dataUrl = await fileToDataURL(file);
    cropImageSrc = dataUrl;
    showCropModal = true;
  }

  function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  function onCropImgLoad() {
    if (!CropperCtor || !cropImgEl || !cropImageSrc) return;
    destroyCropper();
    cropper = new CropperCtor(cropImgEl, {
      aspectRatio: 1, // Square for profile pictures
      viewMode: 1,
      background: false,
      autoCropArea: 0.8,
      dragMode: 'move',
      responsive: true,
      checkOrientation: true,
    });
  }

  function destroyCropper() {
    if (cropper && typeof cropper.destroy === 'function') cropper.destroy();
    cropper = null;
  }

  async function confirmCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 800,
      maxHeight: 800,
    });
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', 0.92)
    );
    if (!blob) return;

    const croppedFile = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });

    // Compress the image
    const compressed = await imageCompression(croppedFile, {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    profilePictureFile = compressed;
    profilePicturePreview = URL.createObjectURL(compressed);
    
    await closeCropModal();
  }

  async function useOriginalNoCrop() {
    if (!cropImageSrc) return;
    
    // Convert data URL back to file
    const response = await fetch(cropImageSrc);
    const blob = await response.blob();
    const file = new File([blob], 'profile-picture.jpg', { type: blob.type });

    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    profilePictureFile = compressed;
    profilePicturePreview = URL.createObjectURL(compressed);
    
    await closeCropModal();
  }

  async function closeCropModal() {
    destroyCropper();
    showCropModal = false;
    cropImageSrc = '';
  }

  async function removeProfilePicture() {
    if (confirm('Remove your profile picture? It will revert to your Google avatar.')) {
      profilePictureFile = null;
      profilePicturePreview = '/default_profile_picture.jpg';
    }
  }



  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    uploadingPicture = false; // Reset state
    
    // Build FormData
    const formData = new FormData(form);
    
    // Handle profile picture file upload
    if (profilePictureFile) {
      // Add the file to form data (server will handle upload)
      formData.set('profile_picture', profilePictureFile);
      uploadingPicture = true;
    } else if (profilePicturePreview === null || profilePicturePreview === data.profile.profile_picture_url) {
      // User wants to remove the picture
      formData.set('remove_picture', 'true');
      formData.delete('profile_picture_url'); // Remove any existing URL
    } else {
      // Keep existing picture - don't send anything about it
      formData.delete('profile_picture');
      formData.delete('profile_picture_url');
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
              class="inline-flex items-center justify-center px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

    <!-- Home Break -->
    <div class="space-y-1">
      <label for="home_break" class="block text-sm font-medium text-muted-foreground">
        Home Break
      </label>
      <div class="relative">
        <input
          id="home_break"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          name="home_break_query"
          placeholder="Start typing... e.g. Trestles, Pipeline"
          value={homeBreakQuery}
          on:input={onHomeBreakInput}
          autocomplete="off"
        />

        {#if suggestions.length > 0}
          <ul class="absolute z-10 mt-2 w-full max-h-60 overflow-y-auto bg-surface-elevated border border-border rounded-lg shadow-lg text-sm">
            {#each suggestions as s}
              <li>
                <button type="button" class="w-full text-left px-3 py-2 hover:bg-surface transition-colors text-foreground" on:click={() => chooseSuggestion(s)}>
                  {s.label}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <input type="hidden" name="home_break_label" value={homeBreakLabel} />
      <input type="hidden" name="home_break_lat" value={homeBreakLat} />
      <input type="hidden" name="home_break_lon" value={homeBreakLon} />
      <p class="text-xs text-muted-foreground mt-1">
        Your favorite surf spot or home break
      </p>
    </div>

    <!-- Current Location (read-only) -->
    <div class="space-y-1">
      <label class="block text-sm font-medium text-muted-foreground" for="location-input">
        Location
      </label>
      <input
        id="location-input"
        type="text"
        value={data.profile.location_label || [data.profile.city, data.profile.region, data.profile.country].filter(Boolean).join(', ') || 'Not set'}
        class="w-full rounded-lg border border-border bg-surface text-sm text-muted-foreground px-3 py-2 cursor-not-allowed opacity-70"
        disabled
      />
      <p class="text-xs text-muted-foreground mt-1">
        Update your location during onboarding
      </p>
    </div>

    {#if form?.message}
      <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
        <span class="text-muted-foreground">{form.message}</span>
      </div>
    {/if}

    {#if form?.error}
      <div class="mt-4 rounded-lg border border-red-500/60 bg-surface p-3 text-sm text-red-400">
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- Submit Buttons -->
    <div class="flex gap-2 justify-end">
      <a href="/profile/{data.profile.username}" class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background">
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
      class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        
        <div class="bg-surface/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
          <p class="font-medium text-foreground mb-2">What will happen:</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Your account will be permanently deleted</li>
            <li>All active listings will be removed from search</li>
            <li>Boosts and credits will no longer be usable</li>
            <li>You will be logged out and won't be able to log back in</li>
          </ul>
        </div>

        <div class="space-y-2">
          <label for="delete-confirm" class="block text-sm font-medium text-foreground">
            Type <span class="font-mono font-semibold text-red-400">{requiredConfirmText}</span> to confirm:
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

      <form method="POST" use:enhance>
        <input type="hidden" name="intent" value="deleteAccount" />
        <input type="hidden" name="confirm_text" value={deleteConfirmText} />
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            on:click={() => {
              showDeleteConfirm = false;
              deleteConfirmText = '';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={deleteConfirmText !== requiredConfirmText}
          >
            Confirm Delete
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Crop Modal -->
{#if showCropModal}
  <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
    <div class="bg-surface-elevated border border-border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl text-foreground">
      <h2 class="text-lg sm:text-xl font-semibold mb-4">Crop Profile Picture</h2>
      
      <div class="mb-4" style="max-width: 100%; max-height: 60vh;">
        <img
          bind:this={cropImgEl}
          src={cropImageSrc}
          alt="Crop"
          class="max-w-full"
          on:load={onCropImgLoad}
        />
      </div>

      <div class="flex gap-2 justify-end">
        <button type="button" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background" on:click={closeCropModal}>
          Cancel
        </button>
        <button type="button" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-lg border border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background" on:click={useOriginalNoCrop}>
          Use Original
        </button>
        <button type="button" class="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" on:click={confirmCrop}>
          Crop & Use
        </button>
      </div>
    </div>
  </div>
{/if}
