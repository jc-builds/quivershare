<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { validateAndFilterImageFiles, MAX_IMAGES_PER_LISTING } from "$lib/imageValidation";
  import ImageManager from "$lib/components/ImageManager.svelte";
  import LocationAutocomplete from "$lib/components/LocationAutocomplete.svelte";
  import type { ManagedImage } from "$lib/types/image";
  import type { StructuredLocation } from "$lib/types/location";

  export let data: { shop: { id: string; name: string; slug: string } };

  let surfboard = {
    name: "", make: "", length: "", width: "", thickness: "", volume: "",
    fin_system: "", fin_setup: "", style: "", price: "", condition: "", notes: "",
  };

  let selectedLocation: StructuredLocation | null = null;

  let fileInput: HTMLInputElement;
  let dragActive = false;
  let managedImages: ManagedImage[] = [];
  let message = "";
  let rejectionReasons: { file: string; reason: string }[] = [];
  const MAX_IMAGES = MAX_IMAGES_PER_LISTING;

  function handleDragOver(event: DragEvent) { event.preventDefault(); dragActive = true; }

  async function handleDrop(event: DragEvent) {
    event.preventDefault(); dragActive = false;
    if (event.dataTransfer?.files?.length) await addSelectedImages(Array.from(event.dataTransfer.files));
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;
    await addSelectedImages(Array.from(target.files));
    target.value = "";
  }

  async function addSelectedImages(selected: File[]) {
    const { accepted, rejections } = validateAndFilterImageFiles(selected, managedImages.length);
    rejectionReasons = rejections;
    if (accepted.length > 0) {
      managedImages = [...managedImages, ...accepted.map((file) => ({ kind: 'new' as const, file }))];
      message = `Added ${accepted.length} image${accepted.length > 1 ? "s" : ""}.`;
    }
    if (rejections.length > 0) {
      message = accepted.length > 0
        ? `Added ${accepted.length}. ${rejections.length} file(s) rejected.`
        : `${rejections.length} file(s) could not be added.`;
    }
  }

  let submitting = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (submitting) return;

    if (!surfboard.name?.trim()) { message = 'Board name is required'; return; }
    if (!surfboard.make?.trim()) { message = 'Make / Brand is required'; return; }
    if (!surfboard.length) { message = 'Length is required'; return; }
    if (!surfboard.style) { message = 'Board style is required'; return; }
    if (!surfboard.price) { message = 'Price is required'; return; }
    if (!surfboard.condition) { message = 'Condition is required'; return; }
    if (!selectedLocation) { message = 'Location is required — please select from suggestions'; return; }

    submitting = true;
    message = "";

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const newFiles = managedImages.filter((m): m is { kind: 'new'; file: File } => m.kind === 'new').map((m) => m.file);
    const imageUrls: string[] = [];
    if (newFiles.length > 0) {
      const tempId = `shop_${data.shop.id}_${Date.now()}`;
      for (const file of newFiles) {
        const filePath = `${tempId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("surfboard-images").upload(filePath, file);
        if (uploadError) { message = `Failed to upload: ${uploadError.message}`; continue; }
        const { data: publicUrlData } = supabase.storage.from("surfboard-images").getPublicUrl(filePath);
        imageUrls.push(publicUrlData.publicUrl);
      }
    }
    imageUrls.forEach(url => formData.append('image_urls', url));

    try {
      const response = await fetch(form.action, { method: 'POST', body: formData, headers: { accept: 'application/json' } });
      if (response.redirected) { window.location.href = response.url; return; }
      let result: any = null;
      try { result = await response.json(); } catch { /* not JSON */ }
      if (result?.type === 'redirect') { window.location.href = result.location ?? `/shops/${data.shop.slug}/dashboard`; return; }
      if (result?.type === 'failure' || result?.type === 'error') {
        message = result.data?.message || 'Failed to save board';
        submitting = false;
        return;
      }
      if (response.ok) { window.location.href = `/shops/${data.shop.slug}/dashboard`; }
      else { message = result?.data?.message || 'Failed to save board'; submitting = false; }
    } catch (e) {
      console.error('Submit error:', e);
      message = 'Something went wrong. Please try again.';
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Add Board — {data.shop.name} — QuiverShare</title>
</svelte:head>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <div class="mb-6">
      <a href="/shops/{data.shop.slug}/dashboard" class="text-sm text-muted-foreground hover:text-foreground">&larr; Back to dashboard</a>
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-2">Add Board to {data.shop.name}</h1>
    </div>

    <form method="POST" class="space-y-4" on:submit|preventDefault={handleSubmit}>
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">Board Name <span class="text-red-400">*</span></label>
        <input id="name" name="name" type="text" bind:value={surfboard.name} placeholder="e.g. Star Cruiser" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required />
      </div>
      <div class="space-y-1">
        <label for="make" class="block text-sm font-medium text-muted-foreground">Make / Brand <span class="text-red-400">*</span></label>
        <input id="make" name="make" type="text" bind:value={surfboard.make} placeholder="e.g. Album, Firewire, JS" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required />
      </div>
      <div class="space-y-1">
        <label for="length" class="block text-sm font-medium text-muted-foreground">Length <span class="text-red-400">*</span></label>
        <select id="length" name="length" bind:value={surfboard.length} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required>
          <option disabled selected>Select length</option>
          {#each Array(79) as _, i}
            {@const inches = i + 54}
            <option value={inches}>{Math.floor(inches / 12)}'{inches % 12}"</option>
          {/each}
        </select>
      </div>
      <div class="space-y-1">
        <label for="width" class="block text-sm font-medium text-muted-foreground">Width (in)</label>
        <input id="width" name="width" type="number" step="0.25" min="18" max="24" bind:value={surfboard.width} placeholder="e.g. 21" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" />
      </div>
      <div class="space-y-1">
        <label for="thickness" class="block text-sm font-medium text-muted-foreground">Thickness (in)</label>
        <input id="thickness" name="thickness" type="number" step="0.01" min="2" max="4.5" bind:value={surfboard.thickness} placeholder="e.g. 2.75" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" />
      </div>
      <div class="space-y-1">
        <label for="volume" class="block text-sm font-medium text-muted-foreground">Volume (L)</label>
        <input id="volume" name="volume" type="number" step="0.5" min="20" max="100" bind:value={surfboard.volume} placeholder="e.g. 40" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" />
      </div>
      <div class="space-y-1">
        <label for="fin_system" class="block text-sm font-medium text-muted-foreground">Fin System</label>
        <select id="fin_system" name="fin_system" bind:value={surfboard.fin_system} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition">
          <option value="">Select fin system (optional)</option>
          <option>FCS</option><option>FCS II</option><option>Futures</option><option>Glass On</option><option>Single Fin Box</option>
        </select>
      </div>
      <div class="space-y-1">
        <label for="fin_setup" class="block text-sm font-medium text-muted-foreground">Fin Setup</label>
        <select id="fin_setup" name="fin_setup" bind:value={surfboard.fin_setup} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition">
          <option value="">Select fin setup (optional)</option>
          <option>Single</option><option>2+1</option><option>Twin</option><option>Twin + Trailer</option><option>Twinzer</option><option>Tri</option><option>Quad</option><option>Tri/Quad</option><option>Bonzer</option><option>4+1</option>
        </select>
      </div>
      <div class="space-y-1">
        <label for="style" class="block text-sm font-medium text-muted-foreground">Board Style <span class="text-red-400">*</span></label>
        <select id="style" name="style" bind:value={surfboard.style} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required>
          <option value="">Select style</option>
          <option>Shortboard</option><option>Mid-length</option><option>Longboard</option><option value="Groveler / Fish">Groveler / Fish</option><option>Gun</option>
        </select>
      </div>
      <div class="space-y-1">
        <label for="price" class="block text-sm font-medium text-muted-foreground">Price ($) <span class="text-red-400">*</span></label>
        <input id="price" name="price" type="number" step="0.01" min="0" bind:value={surfboard.price} placeholder="e.g. 850.00" class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required />
      </div>
      <div class="space-y-1">
        <label for="condition" class="block text-sm font-medium text-muted-foreground">Condition <span class="text-red-400">*</span></label>
        <select id="condition" name="condition" bind:value={surfboard.condition} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" required>
          <option disabled selected value="">Select condition</option>
          <option>New</option><option>Lightly Used</option><option>Used</option><option>Well-loved</option><option>Needs Repair</option>
        </select>
      </div>
      <LocationAutocomplete bind:value={selectedLocation} required={true} label="Location" id="location" placeholder="Start typing... e.g. San Diego, CA" clearable={false} />
      <div class="space-y-1">
        <label for="notes" class="block text-sm font-medium text-muted-foreground">Notes</label>
        <textarea id="notes" name="notes" bind:value={surfboard.notes} class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition" placeholder="Anything special about this board?"></textarea>
      </div>

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
        <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" bind:this={fileInput} on:change={handleFileSelect} class="hidden" />
        <p class="text-sm text-muted-foreground">Add images here, recommend 3-6 for best results.</p>
      </div>

      {#if managedImages.length > 0}
        <div class="mt-4"><ImageManager bind:images={managedImages} /></div>
        <p class="text-xs text-muted-foreground mt-2">{managedImages.length}/{MAX_IMAGES} images selected</p>
      {/if}

      {#if rejectionReasons.length > 0}
        <div class="mt-2 rounded-lg border border-border bg-surface p-3 text-sm">
          <p class="font-medium text-foreground mb-2">Rejected files:</p>
          <ul class="list-disc list-inside space-y-1 text-muted-foreground">
            {#each rejectionReasons as { file, reason }}
              <li><span class="font-mono text-foreground">{file}</span>: {reason}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <button type="submit" class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed" disabled={submitting}>
        {submitting ? 'Saving...' : 'Add Board'}
      </button>

      {#if message}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class="text-red-400">{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>
