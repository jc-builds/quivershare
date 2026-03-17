<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  import { enhance } from "$app/forms";
  import {
    validateAndFilterImageFiles,
    MAX_IMAGES_PER_LISTING,
  } from "$lib/imageValidation";
  import ImageManager from "$lib/components/ImageManager.svelte";
  import LocationAutocomplete from "$lib/components/LocationAutocomplete.svelte";
  import type { ManagedImage } from "$lib/types/image";
  import type { StructuredLocation } from "$lib/types/location";
  export let data: {
    surfboard: any;
    existingImages: { id: string; image_url: string }[] | null;
  };
  export let form;
  const BUCKET = "surfboard-images";
  type ExistingImage = { id: string; image_url: string };

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
    state: sb.state ?? "active",
  };
  $: boardState = surfboard.state === "active" ? "active" : "inactive";
  function toggleState() {
    surfboard.state = surfboard.state === "active" ? "inactive" : "active";
  }

  let selectedLocation: StructuredLocation | null =
    sb.lat && sb.lon
      ? {
          id: '',
          label: sb.location_label || (sb.city && sb.region ? `${sb.city}, ${sb.region}` : 'Selected location'),
          lat: sb.lat,
          lon: sb.lon,
          city: sb.city || '',
          region: sb.region || '',
          country: sb.country || '',
        }
      : null;

  let existingImages: ExistingImage[] = (data?.existingImages ?? []) as ExistingImage[];
  let managedImages: ManagedImage[] = existingImages.map((img) => ({
    kind: "existing" as const,
    id: img.id,
    image_url: img.image_url,
  }));

  let loading = false;
  let message = "";
  let showDeleteBoardConfirm = false;
  let deleteBoardConfirmText = "";
  const requiredDeleteConfirmText = "DELETE";

  let fileInput: HTMLInputElement;
  let dragActive = false;
  let rejectionReasons: { file: string; reason: string }[] = [];
  const MAX_IMAGES = MAX_IMAGES_PER_LISTING;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragActive = true;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragActive = false;
    if (!event.dataTransfer?.files?.length) return;
    await addSelectedImages(Array.from(event.dataTransfer.files));
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    await addSelectedImages(Array.from(target.files));
    target.value = "";
  }

  async function addSelectedImages(selected: File[]) {
    const existingCount = managedImages.length;
    const { accepted, rejections } = validateAndFilterImageFiles(selected, existingCount);
    rejectionReasons = rejections;

    if (accepted.length > 0) {
      managedImages = [
        ...managedImages,
        ...accepted.map((file) => ({ kind: "new" as const, file })),
      ];
      message = `✅ Added ${accepted.length} image${accepted.length > 1 ? "s" : ""}.`;
    }
    if (rejections.length > 0) {
      message =
        accepted.length > 0
          ? `✅ Added ${accepted.length}. ${rejections.length} file(s) rejected.`
          : `⚠️ ${rejections.length} file(s) could not be added. See details below.`;
    }
  }

  async function saveBoard() {
    loading = true;
    message = "";

    const formData = new FormData();
    formData.append("name", surfboard.name);
    formData.append("make", surfboard.make || "");
    formData.append("length", surfboard.length || "");
    formData.append("width", surfboard.width || "");
    formData.append("thickness", surfboard.thickness || "");
    formData.append("volume", surfboard.volume || "");
    formData.append("fin_system", surfboard.fin_system || "");
    formData.append("fin_setup", surfboard.fin_setup || "");
    formData.append("style", surfboard.style || "");
    formData.append("price", surfboard.price || "");
    formData.append("condition", surfboard.condition || "");
    formData.append("notes", surfboard.notes || "");
    formData.append("location_label", selectedLocation?.label || "");
    formData.append("location_city", selectedLocation?.city || "");
    formData.append("location_region", selectedLocation?.region || "");
    formData.append("location_country", selectedLocation?.country || "");
    formData.append("location_lat", selectedLocation?.lat?.toString() || "");
    formData.append("location_lon", selectedLocation?.lon?.toString() || "");
    formData.append("state", surfboard.state || "active");

    const updateResponse = await fetch(`/edit-surfboard/${surfboard.id}?/updateBoard`, {
      method: "POST",
      body: formData,
      headers: { accept: "application/json" },
    });

    if (!updateResponse.ok) {
      const result = await updateResponse.json();
      console.error("Surfboard update error:", result);
      message = `❌ ${result.message || "Failed to update surfboard"}`;
      loading = false;
      return;
    }

    const newItems = managedImages.filter(
      (m): m is { kind: "new"; file: File } => m.kind === "new"
    );
    let uploadedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const imageUrls: string[] = [];

    for (const item of newItems) {
      const file = item.file;
      const filePath = `${surfboard.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file);
      if (uploadError) {
        console.error("Upload failed:", uploadError);
        failedCount++;
        errors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      imageUrls.push(publicUrlData.publicUrl);
      uploadedCount++;
    }

    if (imageUrls.length > 0) {
      const imagesFormData = new FormData();
      imageUrls.forEach((url) => imagesFormData.append("image_urls", url));
      const response = await fetch(`/api/surfboards/${surfboard.id}/images`, {
        method: "POST",
        body: imagesFormData,
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        const result = await response.json();
        failedCount += imageUrls.length;
        errors.push(`Failed to save images: ${result.message || "Unknown error"}`);
        uploadedCount = 0;
      } else {
        const result = await response.json();
        const insertedImages = result?.images ?? [];

        if (insertedImages.length !== newItems.length) {
          console.warn("uploadImages count mismatch", { inserted: insertedImages.length, newItems: newItems.length });
        }

        // Replace each uploaded new item at its current position in managedImages
        for (let i = 0; i < Math.min(insertedImages.length, newItems.length); i++) {
          const inserted = insertedImages[i];
          const targetNewItem = newItems[i];
          const idx = managedImages.indexOf(targetNewItem);
          if (idx === -1) {
            console.warn("Could not find new item in managedImages by reference", { i });
            continue;
          }
          managedImages[idx] = {
            kind: "existing" as const,
            id: inserted.id,
            image_url: inserted.image_url
          };
        }

        // Force Svelte reactivity since we mutated the array
        managedImages = [...managedImages];
      }
    }

    const allIds = managedImages
      .filter((m): m is { kind: "existing"; id: string; image_url: string } => m.kind === "existing")
      .map((m) => m.id);

    if (allIds.length > 0) {
      const reorderForm = new FormData();
      allIds.forEach((id) => reorderForm.append("image_ids", id));
      const reorderRes = await fetch(`/edit-surfboard/${surfboard.id}?/reorderImages`, {
        method: "POST",
        body: reorderForm,
        headers: { accept: "application/json" },
      });

      if (!reorderRes.ok) {
        let errorMessage = "Failed to save image order";
        try {
          const result = await reorderRes.json();
          errorMessage = result?.message || errorMessage;
        } catch {
          // Fallback to generic message when response is not JSON
        }
        message = `❌ ${errorMessage}`;
        loading = false;
        return;
      }
    }

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
    if (failedCount === 0) {
      await goto("/my-boards");
    }
  }

  let deleting: Record<string, boolean> = {};
  let showConfirm = false;
  let imageToDelete: { id: string; image_url: string } | null = null;

  function handleDeleteExisting(img: { id: string; image_url: string }) {
    imageToDelete = img;
    showConfirm = true;
  }

  async function removeImage(img: ExistingImage) {
    if (deleting[img.id]) return;
    deleting = { ...deleting, [img.id]: true };
    message = "";

    const formData = new FormData();
    formData.append("image_id", img.id);
    formData.append("image_url", img.image_url);
    const response = await fetch(`/edit-surfboard/${surfboard.id}?/deleteImage`, {
      method: "POST",
      body: formData,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      const result = await response.json();
      console.error("Delete error:", result);
      message = `❌ ${result.message || "Failed to delete image"}`;
      deleting = { ...deleting, [img.id]: false };
      return;
    }

    existingImages = existingImages.filter((i) => i.id !== img.id);
    deleting = { ...deleting, [img.id]: false };
    message = "✅ Image removed.";
  }

  async function confirmDelete() {
    if (!imageToDelete) return;
    const img = imageToDelete;
    showConfirm = false;
    imageToDelete = null;
    await removeImage(img as ExistingImage);
    managedImages = managedImages.filter((m) => !(m.kind === "existing" && m.id === img.id));
  }

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
    if (!managedImages.length) return;
    lightboxIndex = (lightboxIndex - 1 + managedImages.length) % managedImages.length;
  }

  function nextImage() {
    if (!managedImages.length) return;
    lightboxIndex = (lightboxIndex + 1) % managedImages.length;
  }

  function getLightboxSrc(img: ManagedImage): string {
    return img.kind === "existing" ? img.image_url : URL.createObjectURL(img.file);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!lightboxOpen) return;
    if (e.key === "ArrowLeft") prevImage();
    else if (e.key === "ArrowRight") nextImage();
    else if (e.key === "Escape") closeLightbox();
  }
</script>

<svelte:window on:keydown={handleKeydown} />
<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div
    class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground"
  >
    <div class="flex items-center justify-between mb-6">
      <h1
        class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
      >
        Edit Surfboard
      </h1>
      <!-- State Toggle -->
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <span class="text-xs uppercase tracking-wide text-muted-foreground"
          >State:</span
        >
        <input
          type="checkbox"
          class="sr-only peer"
          checked={boardState === "active"}
          on:change={toggleState}
        />
        <div
          class="w-9 h-5 rounded-full border flex items-center px-0.5 transition-colors peer-checked:bg-primary peer-checked:border-primary bg-gray-200 border-gray-300"
        >
          <div
            class="h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4"
          ></div>
        </div>
        <span
          class="text-xs font-medium {boardState === 'active'
            ? 'text-foreground'
            : 'text-gray-700'}"
        >
          {boardState === "active" ? "Active" : "Inactive"}
        </span>
      </label>
    </div>
    <form class="space-y-4" on:submit|preventDefault={saveBoard}>
      <!-- Board Name -->
      <div class="space-y-1">
        <label
          for="name"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="make"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="length"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="width"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="thickness"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="volume"
          class="block text-sm font-medium text-muted-foreground"
        >
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
        <label
          for="fin_system"
          class="block text-sm font-medium text-muted-foreground"
        >
          Fin System
        </label>
        <select
          id="fin_system"
          bind:value={surfboard.fin_system}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin system (optional)</option>
          <option>FCS</option> <option>FCS II</option>
          <option>Futures</option> <option>Glass On</option>
          <option>Single Fin Box</option>
        </select>
      </div>
      <!-- Fin Setup -->
      <div class="space-y-1">
        <label
          for="fin_setup"
          class="block text-sm font-medium text-muted-foreground"
        >
          Fin Setup
        </label>
        <select
          id="fin_setup"
          bind:value={surfboard.fin_setup}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin setup (optional)</option>
          <option>Single</option> <option>2+1</option> <option>Twin</option>
          <option>Twin + Trailer</option> <option>Twinzer</option>
          <option>Tri</option> <option>Quad</option>
          <option>Tri/Quad</option>
          <option>Bonzer</option> <option>4+1</option>
        </select>
      </div>
      <!-- Style -->
      <div class="space-y-1">
        <label
          for="style"
          class="block text-sm font-medium text-muted-foreground"
        >
          Board Style
        </label>
        <select
          id="style"
          bind:value={surfboard.style}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select style (optional)</option>
          <option>Shortboard</option> <option>Mid-length</option>
          <option>Longboard</option> <option value="Groveler / Fish">Groveler / Fish</option>
          {#if surfboard.style === 'Groveler'}
            <option value="Groveler">Groveler (legacy)</option>
          {/if}
          <option>Gun</option>
        </select>
      </div>
      <!-- Price -->
      <div class="space-y-1">
        <label
          for="price"
          class="block text-sm font-medium text-muted-foreground"
        >
          Price ($)
        </label>
        <input
          id="price"
          type="number"
          step="1"
          min="0"
          bind:value={surfboard.price}
          placeholder="e.g. 850"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>
      <!-- Condition -->
      <div class="space-y-1">
        <label
          for="condition"
          class="block text-sm font-medium text-muted-foreground"
        >
          Condition
        </label>
        <select
          id="condition"
          bind:value={surfboard.condition}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option disabled selected>Select condition</option>
          <option>New</option> <option>Lightly Used</option>
          <option>Used</option> <option>Well-loved</option>
          <option>Needs Repair</option>
        </select>
      </div>
      <!-- Location -->
      <LocationAutocomplete
        bind:value={selectedLocation}
        required={true}
        label="Location"
        id="location"
        placeholder="Start typing... e.g. San Diego, CA"
        clearable={false}
      />
      <!-- Notes -->
      <div class="space-y-1">
        <label
          for="notes"
          class="block text-sm font-medium text-muted-foreground"
        >
          Notes
        </label>
        <textarea
          id="notes"
          bind:value={surfboard.notes}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>
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
      </div>
      {#if managedImages.length > 0}
        <div class="mt-4">
          <ImageManager
            bind:images={managedImages}
            onDeleteExisting={handleDeleteExisting}
            onImageClick={openLightbox}
          />
        </div>
        <p class="text-xs text-muted-foreground mt-2">
          {managedImages.length}/{MAX_IMAGES} images selected
        </p>
      {/if}
      {#if rejectionReasons.length > 0}
        <div
          class="mt-2 rounded-lg border border-border bg-surface p-3 text-sm"
        >
          <p class="font-medium text-foreground mb-2">Rejected files:</p>
          <ul class="list-disc list-inside space-y-1 text-muted-foreground">
            {#each rejectionReasons as { file, reason }}
              <li>
                <span class="font-mono text-foreground">{file}</span>: {reason}
              </li>
            {/each}
          </ul>
        </div>
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
        <div
          class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground"
        >
          <span class={message.startsWith("❌") ? "text-red-400" : ""}
            >{message}</span
          >
        </div>
      {/if}
    </form>
    <!-- Danger Zone Section -->
    <div class="mt-12 pt-8 border-t border-border">
      <h2 class="text-lg font-semibold text-foreground mb-2">Danger Zone</h2>
      <p class="text-sm text-muted-foreground mb-4">
        Once you delete this listing, there is no going back. This will remove
        the surfboard from search and your My Boards page.
      </p>
      <button
        type="button"
        class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        on:click={() => {
          showDeleteBoardConfirm = true;
          deleteBoardConfirmText = "";
        }}
      >
        Delete listing
      </button>
    </div>
  </div>
  <!-- Delete Board Confirmation Modal -->
  {#if showDeleteBoardConfirm}
    <div
      class="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-board-title"
      on:click={() => (showDeleteBoardConfirm = false)}
      on:keydown={(e) => e.key === "Escape" && (showDeleteBoardConfirm = false)}
      tabindex="-1"
    >
      <div
        class="bg-surface-elevated border border-border rounded-xl p-6 max-w-md w-full shadow-xl text-foreground"
        role="presentation"
        on:click|stopPropagation={(e) => e.stopPropagation()}
        on:keydown={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-board-title"
          class="text-xl font-semibold mb-4 text-foreground"
        >
          Delete Listing
        </h2>
        <div class="space-y-4 mb-6">
          <p class="text-sm text-foreground">
            Are you sure you want to delete this listing? This action cannot be
            undone.
          </p>
          <div
            class="bg-surface/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground"
          >
            <p class="font-medium text-foreground mb-2">What will happen:</p>
            <ul class="list-disc list-inside space-y-1">
              <li>This listing will be permanently deleted</li>
              <li>The surfboard will be removed from search</li>
              <li>The surfboard will be removed from your My Boards page</li>
              <li>All associated images will be removed</li>
            </ul>
          </div>
          <div class="space-y-2">
            <label
              for="delete-board-confirm"
              class="block text-sm font-medium text-foreground"
            >
              Type <span class="font-mono font-semibold text-red-400"
                >{requiredDeleteConfirmText}</span
              > to confirm:
            </label>
            <input
              id="delete-board-confirm"
              type="text"
              bind:value={deleteBoardConfirmText}
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              placeholder={requiredDeleteConfirmText}
              autocomplete="off"
            />
          </div>
        </div>
        <!-- Note: use:enhance removed for account deletion (auth-affecting), but kept here for board deletion. Consider removing if stale state issues occur after board deletion. -->
        <form method="POST" action="?/deleteBoard" use:enhance>
          <div class="flex gap-2 justify-end">
            <button
              type="button"
              class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              on:click={() => {
                showDeleteBoardConfirm = false;
                deleteBoardConfirmText = "";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={deleteBoardConfirmText !== requiredDeleteConfirmText}
            >
              Confirm Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
  <!-- In-app confirmation modal -->
  {#if showConfirm}
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div
        class="bg-surface-elevated border border-border rounded-xl shadow-lg w-full max-w-sm p-5 text-foreground"
      >
        <p class="text-sm">Remove this image? This action cannot be undone.</p>
        <div class="flex gap-2 justify-end mt-4">
          <button
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition"
            on:click={() => (showConfirm = false)}>Cancel</button
          >
          <button
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            on:click={confirmDelete}>Delete</button
          >
        </div>
      </div>
    </div>
  {/if}
  <!-- Lightbox -->
  {#if lightboxOpen && managedImages[lightboxIndex]}
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
        src={getLightboxSrc(managedImages[lightboxIndex])}
        alt="Enlarged view of the selected surfboard"
        class="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
      />
      <button
        class="absolute right-4 bg-surface-elevated/90 text-foreground rounded-full p-2 sm:p-3 shadow-sm border border-border hover:bg-surface-elevated transition"
        on:click={nextImage}
        aria-label="Next">›</button
      >
    </div>
  {/if}
</main>
