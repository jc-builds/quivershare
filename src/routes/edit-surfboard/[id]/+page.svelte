<script lang="ts">
  import { onMount } from "svelte";
  import imageCompression from "browser-image-compression";
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { enhance } from '$app/forms';

  export let data: {
    surfboard: any;
    existingImages: { id: string; image_url: string }[] | null;
  };

  export let form;

  // ---------------------------------------------------------
  // Constants / Types
  // ---------------------------------------------------------
  const BUCKET = "surfboard-images";
  type ExistingImage = { id: string; image_url: string };

  // Cropper.js (lazy loaded)
  let CropperCtor: any = null;
  onMount(async () => {
    try {
      const mod = await import("cropperjs");
      CropperCtor = mod.default;
    } catch (e) {
      console.error("Failed to load cropperjs:", e);
    }
  });

  // Choose your default crop aspect ratio: 1 (square), 4/3, 16/9, etc.
  let cropAspect = 1;

  // ---------------------------------------------------------
  // 1. Surfboard data (defensive init)
  // ---------------------------------------------------------
  const sb = data?.surfboard ?? {};
  let surfboard = {
    id: sb.id ?? "",
    name: sb.name ?? "",
    make: sb.make ?? "",
    length: sb.length ?? "",
    width: sb.width ?? "",
    thickness: sb.thickness ?? "",
    volume: sb.volume ?? "",
    fin_system: sb.fin_system ?? "",
    fin_setup: sb.fin_setup ?? "",
    style: sb.style ?? "",
    price: sb.price ?? "",
    condition: sb.condition ?? "",
    notes: sb.notes ?? "",
    thumbnail_url: sb.thumbnail_url ?? "",
    city: sb.city ?? "",
    region: sb.region ?? "",
    lat: sb.lat ?? "",
    lon: sb.lon ?? "",
    state: sb.state ?? 'active',
  };

  // Local state for the toggle
  let boardState: 'active' | 'inactive' = surfboard.state === 'active' ? 'active' : 'inactive';
  let updatingState = false;

  // Update state when form succeeds
  $: if (form?.success && form?.state) {
    boardState = form.state as 'active' | 'inactive';
    surfboard.state = boardState;
    updatingState = false;
  }

  // Reset updating state if form fails
  $: if (form && 'error' in form && form.error) {
    updatingState = false;
    // Revert to original state on error
    boardState = (sb.state ?? 'active') === 'active' ? 'active' : 'inactive';
  }

  // Location fields
  let locationQuery = sb.city && sb.region ? `${sb.city}, ${sb.region}` : "";
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let locationDebounceHandle: any;

  // Initialize selected location from existing data
  if (sb.lat && sb.lon) {
    selectedLocation = {
      label: locationQuery || "Selected location",
      lat: sb.lat,
      lon: sb.lon,
      city: sb.city || "",
      region: sb.region || ""
    };
  }

  let existingImages: ExistingImage[] = (data?.existingImages ??
    []) as ExistingImage[];

  let loading = false;
  let message = "";

  // ---------------------------------------------------------
  // 2. Location search functions
  // ---------------------------------------------------------
  async function searchLocationPlaces(q: string) {
    if (!q || q.length < 2) {
      locationSuggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    locationSuggestions = data.features ?? [];
  }

  function onLocationInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    locationQuery = v;
    
    // If user clears the input, clear location data
    if (!v || v.trim() === "") {
      clearLocation();
      return;
    }
    
    selectedLocation = null;

    clearTimeout(locationDebounceHandle);
    locationDebounceHandle = setTimeout(() => searchLocationPlaces(locationQuery), 200);
  }

  function chooseLocationSuggestion(s: (typeof locationSuggestions)[number]) {
    locationQuery = s.label;
    selectedLocation = {
      label: s.label,
      lat: s.lat,
      lon: s.lon,
      city: s.city,
      region: s.region
    };
    locationSuggestions = [];
    // Update surfboard object with location data
    surfboard.city = s.city;
    surfboard.region = s.region;
    surfboard.lat = s.lat;
    surfboard.lon = s.lon;
  }

  function clearLocation() {
    locationQuery = "";
    selectedLocation = null;
    surfboard.city = "";
    surfboard.region = "";
    surfboard.lat = "";
    surfboard.lon = "";
  }

  // ---------------------------------------------------------
  // 3. Upload & UI state
  // ---------------------------------------------------------
  let fileInput: HTMLInputElement;
  let dragActive = false;
  let files: File[] = [];
  const MAX_IMAGES = 6;

  // Allow picking a thumbnail from NEW files before upload
  let pendingThumbIndex: number | null = null;

  // ---------------------------------------------------------
  // 3. Drag + Drop handlers
  // ---------------------------------------------------------
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    if (!event.dataTransfer?.files?.length) return;

    const dropped = Array.from(event.dataTransfer.files).filter((f) => {
      const type = f.type.toLowerCase();
      return type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp";
    });

    if (dropped.length === 0) {
      message = "⚠️ Only JPEG, PNG, and WebP images are supported.";
      return;
    }

    await addSelectedImages(dropped);
  }

  // ---------------------------------------------------------
  // 4. File input handler
  // ---------------------------------------------------------
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    await addSelectedImages(Array.from(target.files));
  }

  // ---------------------------------------------------------
  // 5. Crop-before-upload flow (lazy Cropper)
  // ---------------------------------------------------------
  let cropper: any = null;
  let cropImgEl: HTMLImageElement;
  let showCropModal = false;
  let cropImageSrc = "";
  let pendingQueue: File[] = [];
  let currentOriginalFile: File | null = null;

  async function addSelectedImages(selected: File[]) {
    // Filter out unsupported image formats
    const validFiles = selected.filter((f) => {
      const type = f.type.toLowerCase();
      return type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp";
    });

    if (validFiles.length < selected.length) {
      message = `⚠️ Skipped ${selected.length - validFiles.length} file(s): Only JPEG, PNG, and WebP are supported.`;
    }

    if (validFiles.length === 0) {
      if (selected.length > 0) {
        message = "⚠️ Only JPEG, PNG, and WebP images are supported.";
      }
      return;
    }

    const total = files.length + validFiles.length;
    if (total > MAX_IMAGES) {
      const allowed = MAX_IMAGES - files.length;
      message = `⚠️ You can only upload ${MAX_IMAGES} images total. ${
        allowed > 0
          ? `You can add ${allowed} more.`
          : "You've reached the limit."
      }`;
      return;
    }
    pendingQueue.push(...validFiles);
    if (!showCropModal) {
      await startNextCrop();
    }
  }

  async function startNextCrop() {
    destroyCropper();
    currentOriginalFile = null;
    cropImageSrc = "";

    const next = pendingQueue.shift();
    if (!next) return;

    currentOriginalFile = next;
    const dataUrl = await fileToDataURL(next);
    cropImageSrc = dataUrl;
    showCropModal = true; // Cropper will init on <img> load
  }

  function onCropImgLoad() {
    if (!CropperCtor || !cropImgEl || !cropImageSrc) return;
    destroyCropper();
    cropper = new CropperCtor(cropImgEl, {
      aspectRatio: cropAspect,
      viewMode: 1,
      background: false,
      autoCropArea: 1,
      dragMode: "move",
      responsive: true,
      checkOrientation: true, // helps with EXIF-rotated photos from phones
    });
  }

  function destroyCropper() {
    if (cropper && typeof cropper.destroy === "function") cropper.destroy();
    cropper = null;
  }

  async function confirmCrop() {
    if (!cropper || !currentOriginalFile) return;
    const canvas = cropper.getCroppedCanvas({
      maxWidth: 1600,
      maxHeight: 1600,
    });
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.92),
    );
    if (!blob) return;

    const croppedFile = new File(
      [blob],
      currentOriginalFile.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "") +
        ".jpg",
      { type: "image/jpeg" },
    );

    const compressed = await imageCompression(croppedFile, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });

    files = [...files, compressed];
    message = `✅ Added 1 cropped image.`;
    await closeCropModal();
    await startNextCrop();
  }

  async function useOriginalNoCrop() {
    if (!currentOriginalFile) return;
    const compressed = await imageCompression(currentOriginalFile, {
      maxSizeMB: 2,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });
    files = [...files, compressed];
    message = `✅ Added 1 image (no crop).`;
    await closeCropModal();
    await startNextCrop();
  }

  async function cancelCropFlow() {
    pendingQueue = [];
    await closeCropModal();
  }

  async function closeCropModal() {
    destroyCropper();
    showCropModal = false;
    cropImageSrc = "";
    currentOriginalFile = null;
  }

  function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  function setAspect(ratio: number) {
    cropAspect = ratio;
    if (cropper && typeof cropper.setAspectRatio === "function") {
      cropper.setAspectRatio(ratio);
    }
  }

  // ---------------------------------------------------------
  // 6. Save surfboard + upload the images
  // ---------------------------------------------------------
  async function saveBoard() {
    loading = true;
    message = "";

    const cleanedSurfboard = {
      ...surfboard,
      length: surfboard.length === "" ? null : Number(surfboard.length),
      width: surfboard.width === "" ? null : Number(surfboard.width),
      thickness: surfboard.thickness === "" ? null : Number(surfboard.thickness),
      volume: surfboard.volume === "" ? null : Number(surfboard.volume),
      price: surfboard.price === "" ? null : Number(surfboard.price),
      fin_system: surfboard.fin_system === "" ? null : surfboard.fin_system,
      fin_setup: surfboard.fin_setup === "" ? null : surfboard.fin_setup,
      style: surfboard.style === "" ? null : surfboard.style,
      city: surfboard.city === "" ? null : surfboard.city,
      region: surfboard.region === "" ? null : surfboard.region,
      lat: surfboard.lat === "" ? null : Number(surfboard.lat),
      lon: surfboard.lon === "" ? null : Number(surfboard.lon),
      // Remove id from update payload (it's used in the .eq() clause)
      id: undefined,
    };
    delete cleanedSurfboard.id;

    const { error } = await supabase
      .from("surfboards")
      .update(cleanedSurfboard)
      .eq("id", surfboard.id);

    if (error) {
      console.error("Surfboard update error:", error);
      message = `❌ ${error.message}`;
      loading = false;
      return;
    }

    // Upload any new images (track which one becomes the thumbnail)
    let uploadedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const imageUrls: string[] = [];
    let thumbnailUrl: string | null = null;

    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const filePath = `${surfboard.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        failedCount++;
        errors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      // Store URL for batch insert via server action
      imageUrls.push(imageUrl);
      uploadedCount++;

      if (pendingThumbIndex !== null && idx === pendingThumbIndex) {
        thumbnailUrl = imageUrl;
      }
    }

    // Insert images via server action
    if (imageUrls.length > 0) {
      const formData = new FormData();
      imageUrls.forEach(url => {
        formData.append('image_urls', url);
      });

      const response = await fetch(`/edit-surfboard/${surfboard.id}?/uploadImages`, {
        method: 'POST',
        body: formData,
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const result = await response.json();
        failedCount += imageUrls.length;
        errors.push(`Failed to save images: ${result.message || 'Unknown error'}`);
        uploadedCount = 0;
        imageUrls.length = 0; // Clear since insert failed
      }
    }

    // Update thumbnail if needed
    if (thumbnailUrl) {
      const formData = new FormData();
      formData.append('thumbnail_url', thumbnailUrl);

      const response = await fetch(`/edit-surfboard/${surfboard.id}?/updateThumbnail`, {
        method: 'POST',
        body: formData,
        headers: {
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        surfboard.thumbnail_url = thumbnailUrl;
      } else {
        const result = await response.json();
        errors.push(`Thumbnail update failed: ${result.message || 'Unknown error'}`);
      }
    }

    // Show user-friendly success/error messages
    if (failedCount > 0 && uploadedCount === 0) {
      message = `❌ Failed to upload all images. ${errors[0]}`;
      loading = false;
      return;
    } else if (failedCount > 0) {
      message = `⚠️ Surfboard updated, but ${failedCount} image(s) failed to upload. ${uploadedCount} image(s) uploaded successfully.`;
    } else if (uploadedCount > 0) {
      message = `✅ Surfboard updated successfully! ${uploadedCount} image(s) uploaded.`;
    } else {
      message = "✅ Surfboard updated successfully!";
    }
    
    loading = false;
    
    // Only redirect if everything succeeded or if there were no images to upload
    if (failedCount === 0) {
      await goto("/my-boards");
    }
  }

  // ---------------------------------------------------------
  // 7. Remove existing image (with in-app modal)
  // ---------------------------------------------------------
  let deleting: Record<string, boolean> = {};
  let showConfirm = false;
  let imageToDelete: ExistingImage | null = null;

  function promptDelete(img: ExistingImage) {
    imageToDelete = img;
    showConfirm = true;
  }

  function storagePathFromPublicUrl(publicUrl: string): string | null {
    try {
      const u = new URL(publicUrl);
      const parts = u.pathname.split("/").filter(Boolean);
      const bucketIdx = parts.findIndex((p) => p === BUCKET);
      if (bucketIdx === -1) return null;
      return parts.slice(bucketIdx + 1).join("/");
    } catch {
      return null;
    }
  }

  async function removeImage(img: ExistingImage) {
    if (deleting[img.id]) return;

    deleting = { ...deleting, [img.id]: true };
    message = "";

    // Call server action to delete image
    const formData = new FormData();
    formData.append('image_id', img.id);
    formData.append('image_url', img.image_url);

    const response = await fetch(`/edit-surfboard/${surfboard.id}?/deleteImage`, {
      method: 'POST',
      body: formData,
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      const result = await response.json();
      console.error("Delete error:", result);
      message = `❌ ${result.message || 'Failed to delete image'}`;
      deleting = { ...deleting, [img.id]: false };
      return;
    }

    // Remove from local state
    existingImages = existingImages.filter((i) => i.id !== img.id);
    deleting = { ...deleting, [img.id]: false };
    message = "✅ Image removed.";

    if (surfboard.thumbnail_url && img.image_url === surfboard.thumbnail_url) {
      surfboard.thumbnail_url = "";
    }
  }

  async function confirmDelete() {
    if (!imageToDelete) return;
    const img = imageToDelete;
    showConfirm = false;
    imageToDelete = null;
    await removeImage(img);
  }

  // ---------------------------------------------------------
  // 8. Thumbnail (Main image) for EXISTING images
  // ---------------------------------------------------------
  let settingThumb: Record<string, boolean> = {};

  async function setAsThumbnail(img: ExistingImage) {
    if (settingThumb[img.id]) return;
    settingThumb = { ...settingThumb, [img.id]: true };

    const { error } = await supabase
      .from("surfboards")
      .update({ thumbnail_url: img.image_url })
      .eq("id", surfboard.id);

    if (error) {
      console.error("Thumbnail update error:", error);
      message = `❌ ${error.message}`;
      settingThumb = { ...settingThumb, [img.id]: false };
      return;
    }

    surfboard.thumbnail_url = img.image_url;
    settingThumb = { ...settingThumb, [img.id]: false };
    message = "✅ Thumbnail updated.";
  }

  // ---------------------------------------------------------
  // 9. Lightbox (enlarge images) + keyboard controls
  // ---------------------------------------------------------
  let lightboxOpen = false;
  let lightboxIndex = 0;

  function openLightbox(index: number) {
    lightboxIndex = index;
    lightboxOpen = true;
  }
  function closeLightbox() {
    lightboxOpen = false;
  }
  function prevImage() {
    if (!existingImages.length) return;
    lightboxIndex =
      (lightboxIndex - 1 + existingImages.length) % existingImages.length;
  }
  function nextImage() {
    if (!existingImages.length) return;
    lightboxIndex = (lightboxIndex + 1) % existingImages.length;
  }

  // Keyboard: ← → navigate, Esc to close (only while lightbox open)
  function handleKeydown(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === "ArrowLeft") prevImage();
    else if (e.key === "ArrowRight") nextImage();
    else if (e.key === "Escape") closeLightbox();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Edit Surfboard
      </h1>
      <!-- State Toggle -->
      <form method="POST" action="?/updateState" use:enhance>
        <input type="hidden" name="state" value={boardState === 'active' ? 'inactive' : 'active'} />
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <span class="text-xs uppercase tracking-wide text-muted-foreground">State:</span>
          <input
            type="checkbox"
            class="sr-only peer"
            checked={boardState === 'active'}
            disabled={updatingState}
            on:change={(e) => {
              const targetState = e.currentTarget.checked ? 'active' : 'inactive';
              updatingState = true;
              boardState = targetState;
              e.currentTarget.form?.requestSubmit();
            }}
          />
          <div class="w-9 h-5 rounded-full border border-border bg-surface flex items-center px-0.5 transition-colors peer-checked:bg-primary peer-disabled:opacity-60">
            <div class="h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span class="text-xs font-medium text-muted-foreground">
            {boardState === 'active' ? 'Active' : 'Inactive'}
          </span>
        </label>
      </form>
    </div>

    <form class="space-y-4" on:submit|preventDefault={saveBoard}>
      <!-- Board Name -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">
          Board Name
        </label>
        <input
          id="name"
          type="text"
          bind:value={surfboard.name}
          placeholder="e.g. Star Cruiser"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Make -->
      <div class="space-y-1">
        <label for="make" class="block text-sm font-medium text-muted-foreground">
          Make / Brand
        </label>
        <input
          id="make"
          type="text"
          bind:value={surfboard.make}
          placeholder="e.g. Album, Firewire, JS"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Length -->
      <div class="space-y-1">
        <label for="length" class="block text-sm font-medium text-muted-foreground">
          Length
        </label>
        <select
          id="length"
          bind:value={surfboard.length}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option disabled selected>Select length</option>
          {#each Array(79) as _, i}
            {@const inches = i + 54}
            <option value={inches}
              >{Math.floor(inches / 12)}'{inches % 12}"</option
            >
          {/each}
        </select>
      </div>

      <!-- Width -->
      <div class="space-y-1">
        <label for="width" class="block text-sm font-medium text-muted-foreground">
          Width (in)
        </label>
        <input
          id="width"
          type="number"
          step="0.25"
          min="18"
          max="24"
          bind:value={surfboard.width}
          placeholder="e.g. 21"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Thickness -->
      <div class="space-y-1">
        <label for="thickness" class="block text-sm font-medium text-muted-foreground">
          Thickness (in)
        </label>
        <input
          id="thickness"
          type="number"
          step="0.01"
          min="2"
          max="4.5"
          bind:value={surfboard.thickness}
          placeholder="e.g. 2.75"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Volume -->
      <div class="space-y-1">
        <label for="volume" class="block text-sm font-medium text-muted-foreground">
          Volume (L)
        </label>
        <input
          id="volume"
          type="number"
          step="0.5"
          min="20"
          max="100"
          bind:value={surfboard.volume}
          placeholder="e.g. 40"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Fin System -->
      <div class="space-y-1">
        <label for="fin_system" class="block text-sm font-medium text-muted-foreground">
          Fin System
        </label>
        <select
          id="fin_system"
          bind:value={surfboard.fin_system}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin system (optional)</option>
          <option>FCS II</option>
          <option>Futures</option>
          <option>Glass On</option>
          <option>FCS</option>
        </select>
      </div>

      <!-- Fin Setup -->
      <div class="space-y-1">
        <label for="fin_setup" class="block text-sm font-medium text-muted-foreground">
          Fin Setup
        </label>
        <select
          id="fin_setup"
          bind:value={surfboard.fin_setup}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin setup (optional)</option>
          <option>2+1</option>
          <option>4+1</option>
          <option>Quad</option>
          <option>Single</option>
          <option>Tri</option>
          <option>Tri/Quad</option>
        </select>
      </div>


      <!-- Style -->
      <div class="space-y-1">
        <label for="style" class="block text-sm font-medium text-muted-foreground">
          Board Style
        </label>
        <select
          id="style"
          bind:value={surfboard.style}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select style (optional)</option>
          <option>Shortboard</option>
          <option>Longboard</option>
          <option>Groveler</option>
          <option>Gun</option>
        </select>
      </div>

      <!-- Price -->
      <div class="space-y-1">
        <label for="price" class="block text-sm font-medium text-muted-foreground">
          Price ($)
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          min="0"
          bind:value={surfboard.price}
          placeholder="e.g. 850.00"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Condition -->
      <div class="space-y-1">
        <label for="condition" class="block text-sm font-medium text-muted-foreground">
          Condition
        </label>
        <select
          id="condition"
          bind:value={surfboard.condition}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option disabled selected>Select condition</option>
          <option>New</option>
          <option>Lightly Used</option>
          <option>Used</option>
          <option>Well-loved</option>
          <option>Needs Repair</option>
        </select>
      </div>

      <!-- Location -->
      <div class="space-y-1">
        <label for="location" class="block text-sm font-medium text-muted-foreground">
          Location (optional)
        </label>
        <div class="relative">
          <input
            id="location"
            type="text"
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            placeholder="Start typing... e.g. San Diego, CA"
            value={locationQuery}
            on:input={onLocationInput}
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="location-suggestions-list"
          />
          {#if locationSuggestions.length > 0}
            <ul id="location-suggestions-list" class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-surface-elevated border border-border rounded-lg shadow-lg text-sm">
              {#each locationSuggestions as s}
                <li>
                  <button type="button" class="w-full text-left px-3 py-2 hover:bg-surface transition-colors text-foreground" on:click={() => chooseLocationSuggestion(s)}>
                    {s.label}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        {#if selectedLocation}
          <div class="flex items-center justify-between mt-1">
            <p class="text-xs text-muted-foreground">
              Selected: {selectedLocation.label}
            </p>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              on:click={clearLocation}
            >
              Clear
            </button>
          </div>
        {/if}
      </div>

      <!-- Notes -->
      <div class="space-y-1">
        <label for="notes" class="block text-sm font-medium text-muted-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          bind:value={surfboard.notes}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Existing Images -->
      {#if existingImages.length > 0}
        <p class="text-sm font-semibold text-foreground mb-2">
          Existing Images
        </p>

        <div class="mt-2 grid grid-cols-3 gap-2">
          {#each existingImages as img, i}
            <div class="relative group aspect-square w-full">
              <!-- Clickable image via button (a11y) -->
              <button
                type="button"
                class="absolute inset-0 rounded-lg border border-border bg-surface-elevated overflow-hidden cursor-zoom-in"
                on:click={() => openLightbox(i)}
                aria-label="Open image"
              >
                <img
                  src={img.image_url}
                  alt="Surfboard"
                  class="h-full w-full object-cover"
                />
              </button>

              <!-- Thumbnail badge -->
              {#if surfboard.thumbnail_url && img.image_url === surfboard.thumbnail_url}
                <div
                  class="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium"
                >
                  Main
                </div>
              {/if}

              <!-- Set-as-thumbnail star -->
              <button
                type="button"
                class="absolute bottom-1 left-1 bg-black/60 text-[10px] text-foreground
                       rounded-full px-2 h-5 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       hover:bg-black/80"
                on:click={() => setAsThumbnail(img)}
                disabled={!!settingThumb[img.id]}
                title="Set as main image"
                aria-label="Set as main image"
              >
                {settingThumb[img.id] ? "…" : "★"}
              </button>

              <!-- Remove "×" -->
              <button
                type="button"
                class="absolute top-1 right-1 bg-black/60 text-[10px] text-foreground
                       rounded-full w-5 h-5 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       hover:bg-black/80"
                on:click={() => promptDelete(img)}
                disabled={!!deleting[img.id]}
                aria-label="Remove image"
                title="Remove image"
              >
                {deleting[img.id] ? "…" : "×"}
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Image Upload Zone -->
      <div
        class="border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer px-4 py-6 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        role="button"
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
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="hidden"
        />

        <p class="text-sm text-muted-foreground">
          📷 Drag & drop images here, or click to select
        </p>

        {#if files.length > 0}
          <div class="mt-4 grid grid-cols-3 gap-2">
            {#each files as file, i}
              <div class="relative group aspect-square w-full">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  class="absolute inset-0 h-full w-full object-cover rounded-lg border border-border"
                />

                <!-- Pick this NEW file as the thumbnail -->
                <button
                  type="button"
                  class="absolute bottom-1 left-1 bg-black/60 text-[10px] text-foreground
                         rounded-full px-2 h-5 flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150
                         hover:bg-black/80"
                  on:click={() => (pendingThumbIndex = i)}
                  title="Set this new image as main after upload"
                  aria-label="Set new image as main"
                >
                  {pendingThumbIndex === i ? "Main" : "★"}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if files.length > 0}
        <p class="text-xs text-muted-foreground mt-2">
          {files.length}/{MAX_IMAGES} images selected
          {#if pendingThumbIndex !== null}
            • main will be image #{pendingThumbIndex + 1}{/if}
        </p>
      {/if}

      <!-- Save Button -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Surfboard"}
      </button>

      {#if message}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class={message.startsWith('❌') ? 'text-red-400' : ''}>{message}</span>
        </div>
      {/if}
    </form>
  </div>

  <!-- In-app confirmation modal -->
  {#if showConfirm}
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-surface-elevated border border-border rounded-xl shadow-lg w-full max-w-sm p-5 text-foreground">
        <p class="text-sm">
          Remove this image? This action cannot be undone.
        </p>
        <div class="flex gap-2 justify-end mt-4">
          <button class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition" on:click={() => (showConfirm = false)}
            >Cancel</button
          >
          <button class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" on:click={confirmDelete}
            >Delete</button
          >
        </div>
      </div>
    </div>
  {/if}

  <!-- Lightbox -->
  {#if lightboxOpen}
    <div
      class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
    >
      <button
        class="absolute top-4 right-4 bg-surface-elevated/90 text-foreground rounded-full p-2 sm:p-3 shadow-sm border border-border hover:bg-surface-elevated transition"
        on:click={closeLightbox}
        aria-label="Close"
      >
        ×
      </button>
      <button
        class="absolute left-4 bg-surface-elevated/90 text-foreground rounded-full p-2 sm:p-3 shadow-sm border border-border hover:bg-surface-elevated transition"
        on:click={prevImage}
        aria-label="Previous">‹</button
      >
      <img
        src={existingImages[lightboxIndex]?.image_url}
        alt="Surfboard Image Large"
        class="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
      />
      <button
        class="absolute right-4 bg-surface-elevated/90 text-foreground rounded-full p-2 sm:p-3 shadow-sm border border-border hover:bg-surface-elevated transition"
        on:click={nextImage}
        aria-label="Next">›</button
      >
    </div>
  {/if}

  <!-- Cropper Modal -->
  {#if showCropModal}
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
    >
      <div
        class="bg-surface-elevated border border-border rounded-xl shadow-xl w-full max-w-2xl overflow-hidden text-foreground"
      >
        <div
          class="p-3 border-b border-border flex items-center justify-between"
        >
          <span class="font-semibold text-sm">Crop image</span>
        </div>
        <div class="p-3">
          <div
            class="relative w-full h-[50vh] bg-surface rounded-lg overflow-hidden"
          >
            <img
              bind:this={cropImgEl}
              src={cropImageSrc}
              alt="Crop source"
              class="max-h-full max-w-full block m-auto select-none"
              on:load={onCropImgLoad}
              draggable="false"
            />
          </div>
        </div>
        <div class="p-3 border-t border-border flex justify-end gap-2">
          <button class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition" on:click={useOriginalNoCrop}
            >Use Original</button
          >
          <button class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition" on:click={cancelCropFlow}>Cancel</button>
          <button class="inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" on:click={confirmCrop}
            >Done</button
          >
        </div>
      </div>
    </div>
  {/if}
</main>
