<script lang="ts">
  import imageCompression from "browser-image-compression";
  import { supabase } from "$lib/supabaseClient";

  // ---------------------------------------------------------
  // 1. Surfboard data (for form binding)
  // ---------------------------------------------------------
  let surfboard = {
    name: "",
    make: "",
    length: "",
    width: "",
    thickness: "",
    volume: "",
    fin_system: "",
    fin_setup: "",
    style: "",
    price: "",
    condition: "",
    notes: "",
  };

  // Location fields
  let locationQuery = "";
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let locationDebounceHandle: any;

  // ---------------------------------------------------------
  // 2. Upload & UI state
  // ---------------------------------------------------------
  let fileInput: HTMLInputElement;
  let dragActive = false;
  let files: File[] = [];
  let message = "";
  const MAX_IMAGES = 6;

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

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) => {
      const type = file.type.toLowerCase();
      return type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp";
    });

    if (droppedFiles.length === 0) {
      message = "⚠️ Only JPEG, PNG, and WebP images are supported.";
      return;
    }

    await compressAndAddFiles(droppedFiles);
  }

  // ---------------------------------------------------------
  // 4. File input handler
  // ---------------------------------------------------------
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    await compressAndAddFiles(Array.from(target.files));
  }

  // ---------------------------------------------------------
  // 5. Compression logic
  // ---------------------------------------------------------
  async function compressAndAddFiles(selected: File[]) {
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

    const compressedFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of selected) {
      const type = file.type.toLowerCase();
      if (type !== "image/jpeg" && type !== "image/jpg" && type !== "image/png" && type !== "image/webp") {
        invalidFiles.push(file.name);
        continue;
      }

      const compressed = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });

      compressedFiles.push(compressed);
    }

    if (invalidFiles.length > 0) {
      message = `⚠️ Skipped ${invalidFiles.length} file(s): Only JPEG, PNG, and WebP are supported.`;
    }

    files = [...files, ...compressedFiles];
    if (compressedFiles.length > 0) {
      message = `✅ Added ${compressedFiles.length} image${
        compressedFiles.length > 1 ? "s" : ""
      } ready to upload.`;
    }
  }

  // ---------------------------------------------------------
  // 6. Location search functions
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
  }

  // ---------------------------------------------------------
  // 7. Form submission handler
  // ---------------------------------------------------------
  let submitting = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (submitting) return;

    submitting = true;
    message = "";

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Upload images to storage first and collect URLs
    const imageUrls: string[] = [];
    if (files.length > 0) {
      // We'll upload after the surfboard is created, so we need a temporary ID
      // For now, upload with a temp path and we'll move them after
      const tempId = `temp_${Date.now()}`;
      
      for (const file of files) {
        const filePath = `${tempId}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("surfboard-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload failed:", uploadError);
          message = `⚠️ Failed to upload some images: ${uploadError.message}`;
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("surfboard-images")
          .getPublicUrl(filePath);

        imageUrls.push(publicUrlData.publicUrl);
      }
    }

    // Add image URLs to form data
    imageUrls.forEach(url => {
      formData.append('image_urls', url);
    });

    // Submit the form
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      // Redirect handled by server
      window.location.href = '/my-boards';
    } else {
      const result = await response.json();
      message = result.message || 'Failed to save surfboard';
      submitting = false;
    }
  }
</script>

<main class="min-h-screen bg-base-200 p-8 flex flex-col items-center">
  <div class="w-full max-w-lg bg-base-100 p-8 rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold text-center text-primary mb-6">
      Add a New Surfboard
    </h1>

    <!-- ✅ Form now posts to the server action -->
    <form method="POST" class="space-y-4" on:submit|preventDefault={handleSubmit}>
      <!-- Board Name -->
      <div class="form-control">
        <label for="name" class="label">
          <span class="label-text font-semibold">Board Name</span>
        </label>
        <input
          id="name"
          name="name"
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
          name="make"
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
          name="length"
          bind:value={surfboard.length}
          class="select select-bordered w-full"
        >
          <option disabled selected>Select length</option>
          {#each Array(79) as _, i}
            {@const inches = i + 54}
            <option value={inches}>
              {Math.floor(inches / 12)}'{inches % 12}"
            </option>
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
          name="width"
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
          name="thickness"
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
          name="volume"
          type="number"
          step="0.5"
          min="20"
          max="100"
          bind:value={surfboard.volume}
          placeholder="e.g. 40"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Fin System -->
      <div class="form-control">
        <label for="fin_system" class="label">
          <span class="label-text font-semibold">Fin System</span>
        </label>
        <select
          id="fin_system"
          name="fin_system"
          bind:value={surfboard.fin_system}
          class="select select-bordered w-full"
        >
          <option value="">Select fin system (optional)</option>
          <option>FCS II</option>
          <option>Futures</option>
          <option>Glass On</option>
          <option>FCS</option>
        </select>
      </div>

      <!-- Fin Setup -->
      <div class="form-control">
        <label for="fin_setup" class="label">
          <span class="label-text font-semibold">Fin Setup</span>
        </label>
        <select
          id="fin_setup"
          name="fin_setup"
          bind:value={surfboard.fin_setup}
          class="select select-bordered w-full"
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
      <div class="form-control">
        <label for="style" class="label">
          <span class="label-text font-semibold">Board Style</span>
        </label>
        <select
          id="style"
          name="style"
          bind:value={surfboard.style}
          class="select select-bordered w-full"
        >
          <option value="">Select style (optional)</option>
          <option>Shortboard</option>
          <option>Longboard</option>
          <option>Groveler</option>
          <option>Gun</option>
        </select>
      </div>

      <!-- Price -->
      <div class="form-control">
        <label for="price" class="label">
          <span class="label-text font-semibold">Price ($)</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          bind:value={surfboard.price}
          placeholder="e.g. 850.00"
          class="input input-bordered w-full"
        />
      </div>

      <!-- Condition -->
      <div class="form-control">
        <label for="condition" class="label">
          <span class="label-text font-semibold">Condition</span>
        </label>
        <select
          id="condition"
          name="condition"
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

      <!-- Location -->
      <div class="form-control">
        <label for="location" class="label">
          <span class="label-text font-semibold">Location (optional)</span>
        </label>
        <div class="relative">
          <input
            id="location"
            type="text"
            class="input input-bordered w-full"
            placeholder="Start typing... e.g. San Diego, CA"
            value={locationQuery}
            on:input={onLocationInput}
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="location-suggestions-list"
          />
          {#if locationSuggestions.length > 0}
            <ul id="location-suggestions-list" class="menu bg-base-100 rounded-box shadow-lg mt-1 w-full absolute z-10 max-h-60 overflow-y-auto">
              {#each locationSuggestions as s}
                <li>
                  <button type="button" class="justify-start" on:click={() => chooseLocationSuggestion(s)}>
                    {s.label}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        {#if selectedLocation}
          <p class="text-xs text-base-content/60 mt-1">
            Selected: {selectedLocation.label}
          </p>
        {/if}
        <!-- Hidden fields for location data -->
        <input type="hidden" name="city" value={selectedLocation?.city || ''} />
        <input type="hidden" name="region" value={selectedLocation?.region || ''} />
        <input type="hidden" name="lat" value={selectedLocation?.lat || ''} />
        <input type="hidden" name="lon" value={selectedLocation?.lon || ''} />
      </div>

      <!-- Notes -->
      <div class="form-control">
        <label for="notes" class="label">
          <span class="label-text font-semibold">Notes</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          bind:value={surfboard.notes}
          class="textarea textarea-bordered w-full"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Images (optional, not submitted yet) -->
      <div
        class="form-control border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition"
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
          accept="image/jpeg,image/jpg,image/png,image/webp"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="hidden"
        />

        <p class="text-sm text-base-content/80">
          📷 Drag & drop images here, or click to select
        </p>

        {#if files.length > 0}
          <div class="mt-4 grid grid-cols-3 gap-2">
            {#each files as file}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                class="rounded-lg object-cover h-24 w-full"
              />
            {/each}
          </div>
        {/if}
      </div>

      {#if files.length > 0}
        <p class="text-xs text-gray-500 mt-2">
          {files.length}/{MAX_IMAGES} images selected
        </p>
      {/if}

      <button type="submit" class="btn btn-primary w-full mt-4" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Surfboard'}
      </button>

      {#if message}
        <div class="alert mt-4">
          <span>{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>
