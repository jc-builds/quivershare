<script lang="ts">
  import { onMount } from "svelte";
  import imageCompression from "browser-image-compression";
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import "cropperjs/dist/cropper.css";

  export let data: {
    surfboard: any;
    existingImages: { id: string; image_url: string }[] | null;
  };

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
    fins: sb.fins ?? "",
    condition: sb.condition ?? "",
    notes: sb.notes ?? "",
    thumbnail_url: sb.thumbnail_url ?? "",
  };

  let existingImages: ExistingImage[] = (data?.existingImages ??
    []) as ExistingImage[];

  let loading = false;
  let message = "";

  // ---------------------------------------------------------
  // 2. Upload & UI state
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

    const dropped = Array.from(event.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
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
    const total = files.length + selected.length;
    if (total > MAX_IMAGES) {
      const allowed = MAX_IMAGES - files.length;
      message = `⚠️ You can only upload ${MAX_IMAGES} images total. ${
        allowed > 0
          ? `You can add ${allowed} more.`
          : "You've reached the limit."
      }`;
      return;
    }
    pendingQueue.push(...selected);
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
      length: surfboard.length === "" ? null : surfboard.length,
      width: surfboard.width === "" ? null : surfboard.width,
      thickness: surfboard.thickness === "" ? null : surfboard.thickness,
      volume: surfboard.volume === "" ? null : surfboard.volume,
    };

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
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const filePath = `${surfboard.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);
      const imageUrl = publicUrlData.publicUrl;

      const { error: insertError } = await supabase
        .from("surfboard_images")
        .insert([{ surfboard_id: surfboard.id, image_url: imageUrl }]);

      if (insertError) {
        console.error("Image insert failed:", insertError);
      }

      if (pendingThumbIndex !== null && idx === pendingThumbIndex) {
        const { error: thumbErr } = await supabase
          .from("surfboards")
          .update({ thumbnail_url: imageUrl })
          .eq("id", surfboard.id);

        if (thumbErr) {
          console.error("Thumbnail update error:", thumbErr);
          message = `❌ ${thumbErr.message}`;
        } else {
          surfboard.thumbnail_url = imageUrl;
        }
      }
    }

    message = "✅ Surfboard updated successfully!";
    loading = false;
    await goto("/my-boards");
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

    const path = storagePathFromPublicUrl(img.image_url);
    if (!path) {
      message = "❌ Couldn't resolve storage path for this image.";
      return;
    }

    deleting = { ...deleting, [img.id]: true };
    message = "";

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (storageErr) {
      console.error("Storage remove error:", storageErr);
      message = `❌ ${storageErr.message}`;
      deleting = { ...deleting, [img.id]: false };
      return;
    }

    const { error: dbErr } = await supabase
      .from("surfboard_images")
      .delete()
      .eq("id", img.id);
    if (dbErr) {
      console.error("DB delete error:", dbErr);
      message = `❌ ${dbErr.message}`;
      deleting = { ...deleting, [img.id]: false };
      return;
    }

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

<main class="min-h-screen bg-base-200 p-8 flex flex-col items-center">
  <div class="w-full max-w-lg bg-base-100 p-8 rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold text-center text-primary mb-6">
      Edit Surfboard
    </h1>

    <form class="space-y-4" on:submit|preventDefault={saveBoard}>
      <!-- Board Name -->
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text font-semibold">Board Name</span>
        </label>
        <input
          id="name"
          type="text"
          bind:value={surfboard.name}
          placeholder="e.g. Star Cruiser"
          class="input input-bordered w-full"
          required
        />
      </div>

      <!-- Make -->
      <div class="form-control">
        <label for="make" class="label">
          <span class="label-text font-semibold">Make / Brand</span>
        </label>
        <input
          id="make"
          type="text"
          bind:value={surfboard.make}
          placeholder="e.g. Album, Firewire, JS"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Length -->
      <div class="form-control">
        <label for="length" class="label">
          <span class="label-text font-semibold">Length</span>
        </label>
        <select
          id="length"
          bind:value={surfboard.length}
          class="select select-bordered w-full"
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
      <div class="form-control">
        <label for="width" class="label">
          <span class="label-text font-semibold">Width (in)</span>
        </label>
        <input
          id="width"
          type="number"
          step="0.25"
          min="18"
          max="24"
          bind:value={surfboard.width}
          placeholder="e.g. 21"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Thickness -->
      <div class="form-control">
        <label for="thickness" class="label">
          <span class="label-text font-semibold">Thickness (in)</span>
        </label>
        <input
          id="thickness"
          type="number"
          step="0.01"
          min="2"
          max="4.5"
          bind:value={surfboard.thickness}
          placeholder="e.g. 2.75"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Volume -->
      <div class="form-control">
        <label for="volume" class="label">
          <span class="label-text font-semibold">Volume (L)</span>
        </label>
        <input
          id="volume"
          type="number"
          step="0.5"
          min="20"
          max="100"
          bind:value={surfboard.volume}
          placeholder="e.g. 40"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Fins -->
      <div class="form-control">
        <label for="fins" class="label">
          <span class="label-text font-semibold">Fin Setup</span>
        </label>
        <select
          id="fins"
          bind:value={surfboard.fins}
          class="select select-bordered w-full"
        >
          <option disabled selected>Select fins</option>
          <option>Single</option>
          <option>Twin</option>
          <option>Quad</option>
          <option>Thruster</option>
          <option>Bonzer</option>
        </select>
      </div>

      <!-- Condition -->
      <div class="form-control">
        <label for="condition" class="label">
          <span class="label-text font-semibold">Condition</span>
        </label>
        <select
          id="condition"
          bind:value={surfboard.condition}
          class="select select-bordered w-full"
        >
          <option disabled selected>Select condition</option>
          <option>New</option>
          <option>Lightly Used</option>
          <option>Used</option>
          <option>Well-loved</option>
          <option>Needs Repair</option>
        </select>
      </div>

      <!-- Notes -->
      <div class="form-control">
        <label for="notes" class="label">
          <span class="label-text font-semibold">Notes</span>
        </label>
        <textarea
          id="notes"
          bind:value={surfboard.notes}
          class="textarea textarea-bordered w-full"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Existing Images -->
      {#if existingImages.length > 0}
        <p class="text-sm font-semibold text-base-content/70 mb-2">
          Existing Images
        </p>

        <div class="mt-2 grid grid-cols-3 gap-2">
          {#each existingImages as img, i}
            <div class="relative group aspect-square w-full">
              <!-- Clickable image via button (a11y) -->
              <button
                type="button"
                class="absolute inset-0 rounded-lg border border-base-300 cursor-zoom-in"
                on:click={() => openLightbox(i)}
                aria-label="Open image"
              >
                <img
                  src={img.image_url}
                  alt="Surfboard"
                  class="h-full w-full object-cover rounded-lg"
                />
              </button>

              <!-- Thumbnail badge -->
              {#if surfboard.thumbnail_url && img.image_url === surfboard.thumbnail_url}
                <div
                  class="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-primary text-white/95"
                >
                  Main
                </div>
              {/if}

              <!-- Set-as-thumbnail star -->
              <button
                type="button"
                class="absolute bottom-1 left-1 bg-black/50 text-white text-[10px]
                       rounded-full px-2 h-5 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/70"
                on:click={() => setAsThumbnail(img)}
                disabled={!!settingThumb[img.id]}
                title="Set as main image"
                aria-label="Set as main image"
              >
                {settingThumb[img.id] ? "…" : "★"}
              </button>

              <!-- Remove “×” -->
              <button
                type="button"
                class="absolute top-1 right-1 bg-black/50 text-white text-xs
                       rounded-full w-5 h-5 flex items-center justify-center
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       hover:bg-black/70"
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
        class="form-control border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
        role="button"
        class:border-primary={dragActive}
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
          accept="image/*"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="hidden"
        />

        <p class="text-sm text-base-content/80">
          📷 Drag & drop images here, or click to select
        </p>

        {#if files.length > 0}
          <div class="mt-4 grid grid-cols-3 gap-2">
            {#each files as file, i}
              <div class="relative group aspect-square w-full">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  class="absolute inset-0 h-full w-full object-cover rounded-lg border border-base-300"
                />

                <!-- Pick this NEW file as the thumbnail -->
                <button
                  type="button"
                  class="absolute bottom-1 left-1 bg-black/50 text-white text-[10px]
                         rounded-full px-2 h-5 flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/70"
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
        <p class="text-xs text-gray-500 mt-2">
          {files.length}/{MAX_IMAGES} images selected
          {#if pendingThumbIndex !== null}
            • main will be image #{pendingThumbIndex + 1}{/if}
        </p>
      {/if}

      <!-- Save Button -->
      <button
        type="submit"
        class="btn btn-primary w-full mt-4"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Surfboard"}
      </button>

      {#if message}
        <div class="alert mt-4">
          <span>{message}</span>
        </div>
      {/if}
    </form>
  </div>

  <!-- In-app confirmation modal -->
  {#if showConfirm}
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div class="bg-base-100 p-6 rounded-xl shadow-lg w-72">
        <p class="mb-5 text-sm">
          Remove this image? This action cannot be undone.
        </p>
        <div class="flex gap-2 justify-end">
          <button class="btn btn-sm" on:click={() => (showConfirm = false)}
            >Cancel</button
          >
          <button class="btn btn-sm btn-error" on:click={confirmDelete}
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
        class="absolute top-4 right-4 text-white text-2xl"
        on:click={closeLightbox}
        aria-label="Close"
      >
        ×
      </button>
      <button
        class="absolute left-4 text-white text-2xl"
        on:click={prevImage}
        aria-label="Previous">‹</button
      >
      <img
        src={existingImages[lightboxIndex]?.image_url}
        alt="Surfboard Image Large"
        class="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
      />
      <button
        class="absolute right-4 text-white text-2xl"
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
        class="bg-base-100 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden"
      >
        <div
          class="p-3 border-b border-base-300 flex items-center justify-between"
        >
          <span class="font-semibold text-sm">Crop image</span>
        </div>
        <div class="p-3">
          <div
            class="relative w-full h-[50vh] bg-base-200 rounded-lg overflow-hidden"
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
        <div class="p-3 border-t border-base-300 flex justify-end gap-2">
          <button class="btn btn-sm" on:click={useOriginalNoCrop}
            >Use Original</button
          >
          <button class="btn btn-sm" on:click={cancelCropFlow}>Cancel</button>
          <button class="btn btn-sm btn-primary" on:click={confirmCrop}
            >Done</button
          >
        </div>
      </div>
    </div>
  {/if}
</main>
