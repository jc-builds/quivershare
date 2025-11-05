<script lang="ts">
  import { onMount } from 'svelte';
  import imageCompression from 'browser-image-compression';
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
    } else if (data.profile.avatar_url) {
      profilePicturePreview = data.profile.avatar_url;
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
      profilePicturePreview = data.profile.avatar_url || '/default_profile_picture.jpg';
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
    } else if (profilePicturePreview === null || profilePicturePreview === data.profile.avatar_url) {
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

<section class="p-6 max-w-2xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">Edit Profile</h1>

  <form method="POST" on:submit|preventDefault={handleSubmit} class="space-y-6">
    <!-- Profile Picture -->
    <div class="form-control">
      <label class="label" for="profile-picture-input">
        <span class="label-text font-semibold">Profile Picture</span>
      </label>
      <div class="flex items-center gap-4">
        <div class="w-24 h-24 rounded-full overflow-hidden bg-base-300 border-4 border-base-200 flex-shrink-0">
          <img
            src={profilePicturePreview || '/default_profile_picture.jpg'}
            alt="Profile"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            on:click={() => fileInput?.click()}
          >
            {profilePicturePreview && profilePicturePreview !== data.profile.avatar_url ? 'Change' : 'Upload'}
          </button>
          {#if profilePicturePreview && profilePicturePreview !== data.profile.avatar_url}
            <button
              type="button"
              class="btn btn-sm btn-ghost"
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
      <p class="text-xs text-gray-500 mt-2">
        Square images work best. Max 1MB.
      </p>
    </div>

    <!-- Bio -->
    <div class="form-control">
      <label for="bio" class="label">
        <span class="label-text font-semibold">Bio</span>
      </label>
      <textarea
        id="bio"
        name="bio"
        bind:value={bio}
        class="textarea textarea-bordered w-full"
        placeholder="Tell us about yourself..."
        rows="4"
        maxlength="500"
      ></textarea>
      <p class="text-xs text-gray-500 mt-1">
        {bio.length}/500 characters
      </p>
    </div>

    <!-- Home Break -->
    <div class="form-control">
      <label for="home_break" class="label">
        <span class="label-text font-semibold">Home Break</span>
      </label>
      <input
        id="home_break"
        class="input input-bordered w-full"
        name="home_break_query"
        placeholder="Start typing... e.g. Trestles, Pipeline"
        value={homeBreakQuery}
        on:input={onHomeBreakInput}
        autocomplete="off"
      />

      {#if suggestions.length > 0}
        <ul class="menu bg-base-100 rounded-box shadow mt-2 w-full border border-base-300">
          {#each suggestions as s}
            <li>
              <button type="button" class="justify-start" on:click={() => chooseSuggestion(s)}>
                {s.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <input type="hidden" name="home_break_label" value={homeBreakLabel} />
      <input type="hidden" name="home_break_lat" value={homeBreakLat} />
      <input type="hidden" name="home_break_lon" value={homeBreakLon} />
      <p class="text-xs text-gray-500 mt-1">
        Your favorite surf spot or home break
      </p>
    </div>

    <!-- Current Location (read-only) -->
    <div class="form-control">
      <label class="label" for="location-input">
        <span class="label-text font-semibold">Location</span>
      </label>
      <input
        id="location-input"
        type="text"
        value={data.profile.location_label || [data.profile.city, data.profile.region, data.profile.country].filter(Boolean).join(', ') || 'Not set'}
        class="input input-bordered w-full"
        disabled
      />
      <p class="text-xs text-gray-500 mt-1">
        Update your location during onboarding
      </p>
    </div>

    {#if form?.message}
      <div class="alert alert-info">
        <span>{form.message}</span>
      </div>
    {/if}

    {#if form?.error}
      <div class="alert alert-error">
        <span>{form.error}</span>
      </div>
    {/if}

    <!-- Submit Buttons -->
    <div class="flex gap-2 justify-end">
      <a href="/profile/{data.profile.username}" class="btn btn-ghost">
        Cancel
      </a>
      <button type="submit" class="btn btn-primary" disabled={uploadingPicture}>
        {uploadingPicture ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  </form>
</section>

<!-- Crop Modal -->
{#if showCropModal}
  <div class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
    <div class="bg-base-100 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
      <h2 class="text-xl font-bold mb-4">Crop Profile Picture</h2>
      
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
        <button type="button" class="btn btn-ghost" on:click={closeCropModal}>
          Cancel
        </button>
        <button type="button" class="btn btn-ghost" on:click={useOriginalNoCrop}>
          Use Original
        </button>
        <button type="button" class="btn btn-primary" on:click={confirmCrop}>
          Crop & Use
        </button>
      </div>
    </div>
  </div>
{/if}
