<script lang="ts">
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

    await addSelectedImages(droppedFiles);
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
  // 5. File validation and queueing
  // ---------------------------------------------------------
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

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (const file of selected) {
      const type = file.type.toLowerCase();
      if (type !== "image/jpeg" && type !== "image/jpg" && type !== "image/png" && type !== "image/webp") {
        invalidFiles.push(file.name);
        continue;
      }
      validFiles.push(file);
    }

    if (invalidFiles.length > 0) {
      message = `⚠️ Skipped ${invalidFiles.length} file(s): Only JPEG, PNG, and WebP are supported.`;
    }

    files = [...files, ...validFiles];
    if (validFiles.length > 0) {
      message = `✅ Added ${validFiles.length} image${
        validFiles.length > 1 ? "s" : ""
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

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-center text-foreground mb-6">
      Add a New Surfboard
    </h1>

    <!-- ✅ Form now posts to the server action -->
    <form method="POST" class="space-y-4" on:submit|preventDefault={handleSubmit}>
      <!-- Board Name -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">
          Board Name
        </label>
        <input
          id="name"
          name="name"
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
          name="make"
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
          name="length"
          bind:value={surfboard.length}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
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
      <div class="space-y-1">
        <label for="width" class="block text-sm font-medium text-muted-foreground">
          Width (in)
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
          name="thickness"
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
          name="volume"
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
          name="fin_system"
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
          name="fin_setup"
          bind:value={surfboard.fin_setup}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin setup (optional)</option>
          <option>2+1</option>
          <option>Twin</option>
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
          name="style"
          bind:value={surfboard.style}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select style (optional)</option>
          <option>Shortboard</option>
          <option>Mid-length</option>
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
          name="price"
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
          name="condition"
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
          <p class="text-xs text-muted-foreground mt-1">
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
      <div class="space-y-1">
        <label for="notes" class="block text-sm font-medium text-muted-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          bind:value={surfboard.notes}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Images (optional, not submitted yet) -->
      <div
        role="button"
        class="border-2 border-dashed border-border rounded-xl bg-surface text-center cursor-pointer px-4 py-6 transition hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          📷 Add images here, recommend 3-6 images for best results.
        </p>

        {#if files.length > 0}
          <div class="mt-4 grid grid-cols-3 gap-2">
            {#each files as file}
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                class="rounded-lg object-cover h-24 w-full border border-border"
              />
            {/each}
          </div>
        {/if}
      </div>

      {#if files.length > 0}
        <p class="text-xs text-muted-foreground mt-2">
          {files.length}/{MAX_IMAGES} images selected
        </p>
      {/if}

      <button type="submit" class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save Surfboard'}
      </button>

      {#if message}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class={message.startsWith('⚠️') ? 'text-yellow-400' : message.startsWith('❌') ? 'text-red-400' : ''}>{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>
