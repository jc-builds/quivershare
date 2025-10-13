<script lang="ts">
  import imageCompression from "browser-image-compression";
  import { supabase } from "$lib/supabaseClient";

  // ---------------------------------------------------------
  // 1. Surfboard data
  // ---------------------------------------------------------
  let surfboard = {
    name: "",
    make: "",
    length: "",
    width: "",
    thickness: "",
    volume: "",
    fins: "",
    condition: "",
    notes: "",
  };

  // ---------------------------------------------------------
  // 2. Upload & UI state
  // ---------------------------------------------------------
  let fileInput: HTMLInputElement;
  let dragActive = false;
  let files: File[] = [];
  let loading = false;
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

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    console.log(
      "Dropped files:",
      droppedFiles.map((f) => f.name),
    );
    await compressAndAddFiles(droppedFiles);
  }

  // ---------------------------------------------------------
  // 4. File input handler
  // ---------------------------------------------------------
  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    console.log(
      "Selected files:",
      Array.from(target.files).map((f) => f.name),
    );
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

    for (const file of selected) {
      // Skip non-images just in case
      if (!file.type.startsWith("image/")) continue;

      const compressed = await imageCompression(file, {
        maxSizeMB: 2, // target size ~2 MB
        maxWidthOrHeight: 1600, // resize large photos
        useWebWorker: true,
      });

      compressedFiles.push(compressed);
    }

    files = [...files, ...compressedFiles];
    message = `✅ Added ${compressedFiles.length} image${
      compressedFiles.length > 1 ? "s" : ""
    } ready to upload.`;
  }

  // ---------------------------------------------------------
  // 6. Save surfboard + upload the images
  // ---------------------------------------------------------
  async function saveBoard() {
    loading = true;
    message = "";

    // Convert empty strings → null for numeric fields
    const cleanedSurfboard = {
      ...surfboard,
      length: surfboard.length === "" ? null : surfboard.length,
      width: surfboard.width === "" ? null : surfboard.width,
      thickness: surfboard.thickness === "" ? null : surfboard.thickness,
      volume: surfboard.volume === "" ? null : surfboard.volume,
    };

    // 1️⃣ Insert surfboard
    const { data, error } = await supabase
      .from("surfboards")
      .insert([cleanedSurfboard])
      .select("id");

    if (error || !data) {
      console.error("Surfboard insert error:", error);
      message = `❌ ${error?.message}`;
      loading = false;
      return;
    }

    const surfboardId = data[0].id;

    // 2️⃣ Upload each image
    for (const file of files) {
      const filePath = `${surfboardId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("surfboard-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        continue; // move on to next file
      }

      const { data: publicUrlData } = supabase.storage
        .from("surfboard-images")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("surfboard_images")
        .insert([
          { surfboard_id: surfboardId, image_url: publicUrlData.publicUrl },
        ]);

      if (insertError) {
        console.error("Image insert failed:", insertError);
      }
    }

    // 3️⃣ Reset form state
    message = "✅ Surfboard and images saved successfully!";
    surfboard = {
      name: "",
      make: "",
      length: "",
      width: "",
      thickness: "",
      volume: "",
      fins: "",
      condition: "",
      notes: "",
    };
    files = [];
    loading = false;
  }
</script>

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

      <!-- Images -->
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
</main>
