<script lang="ts">
  /**
   * Shared image management component.
   * - Renders a grid of images with drag-and-drop reordering
   * - First image is always the thumbnail (badge shown)
   * - Delete button on each image
   * - Does not upload or talk to server
   */
  import { onDestroy } from 'svelte';
  import type { ManagedImage } from '$lib/types/image';

  export let images: ManagedImage[] = [];
  export let onDeleteExisting: ((img: { id: string; image_url: string }) => void | Promise<void>) | null =
    null;
  export let onImageClick: ((index: number) => void) | null = null;

  let draggedIndex: number | null = null;
  let dragOverIndex: number | null = null;

  $: if (typeof document !== 'undefined') {
    document.body.style.cursor = draggedIndex !== null ? 'grabbing' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  });

  function getImageSrc(img: ManagedImage): string {
    if (img.kind === 'existing') return img.image_url;
    return URL.createObjectURL(img.file);
  }

  function handleDragStart(e: DragEvent, index: number) {
    draggedIndex = index;
    const dt = e.dataTransfer;
    if (dt) {
      dt.setData('text/plain', String(index));
      dt.effectAllowed = 'move';
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(e: DragEvent, dropIndex: number) {
    e.preventDefault();
    dragOverIndex = null;
    if (draggedIndex === null || draggedIndex === dropIndex) {
      draggedIndex = null;
      return;
    }
    const from = draggedIndex;
    const to = dropIndex;
    draggedIndex = null;
    const next = [...images];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    images = next;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  function deleteNew(index: number) {
    images = images.filter((_, i) => i !== index);
  }

  async function deleteExisting(img: { id: string; image_url: string }) {
    if (onDeleteExisting) await onDeleteExisting(img);
  }
</script>

<div class="grid grid-cols-3 gap-2">
  {#each images as img, i (img.kind === 'existing' ? img.id : `new-${img.file.name}-${img.file.size}-${img.file.lastModified}`)}
    <div
      class="relative group aspect-square w-full rounded-lg overflow-hidden border border-border bg-surface-elevated cursor-grab"
      draggable="true"
      role="listitem"
      aria-label="Image {i + 1}"
      class:opacity-50={draggedIndex === i}
      class:ring-2={dragOverIndex === i}
      class:ring-primary={dragOverIndex === i}
      class:ring-inset={dragOverIndex === i}
      on:dragstart={(e) => handleDragStart(e, i)}
      on:dragover={(e) => handleDragOver(e, i)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, i)}
      on:dragend={handleDragEnd}
    >
      {#if onImageClick}
      <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-grab focus:outline-none focus:ring-0 border-0 p-0 bg-transparent"
        on:click|stopPropagation={() => onImageClick(i)}
        aria-label="View image"
      >
        <img
          src={getImageSrc(img)}
          alt={img.kind === 'existing' ? 'Surfboard' : img.file.name}
          class="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
          draggable="false"
        />
      </button>
    {:else}
      <img
        src={getImageSrc(img)}
        alt={img.kind === 'existing' ? 'Surfboard' : img.file.name}
        class="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
        draggable="false"
      />
    {/if}

      <!-- Subtle drag affordance (hover only, non-interactive) -->
      <div
        class="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-foreground opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none select-none z-10"
        aria-hidden="true"
      >
        ⋮⋮
      </div>

      <!-- Thumbnail badge on first image -->
      {#if i === 0}
        <div
          class="absolute top-1 left-1 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-medium z-10"
        >
          Thumbnail
        </div>
      {/if}

      <!-- Delete button -->
      <button
        type="button"
        class="absolute top-1 right-1 bg-black/60 text-[10px] text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-black/80 z-10"
        on:click|stopPropagation={() =>
          img.kind === 'existing' ? deleteExisting(img) : deleteNew(i)}
        aria-label="Remove image"
        title="Remove image"
      >
        ×
      </button>
    </div>
  {/each}
</div>
