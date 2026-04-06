<script lang="ts">
  import { page } from '$app/stores';
  import { pageTitle } from '$lib/title';
  import LocationAutocomplete from '$lib/components/LocationAutocomplete.svelte';
  import type { StructuredLocation } from '$lib/types/location';
  import { USERNAME_MIN, USERNAME_MAX, USERNAME_PATTERN, USERNAME_HINT, USERNAME_PLACEHOLDER } from '$lib/validation/username';

  export let form:
    | {
        message?: string;
        fieldErrors?: Record<string, string>;
        values?: { 
          username?: string; 
          full_name?: string;
          home_break_label?: string;
          magic_board?: string;
          redirectTo?: string;
        };
      }
    | undefined;

  let username = form?.values?.username ?? '';
  let fullName = form?.values?.full_name ?? '';
  let homeBreakLabel = form?.values?.home_break_label ?? '';
  let magicBoard = form?.values?.magic_board ?? '';
  let redirectTo =
    form?.values?.redirectTo ??
    (new URLSearchParams($page.url.search).get('redirectTo') ?? '/');

  $: isShopIntent = redirectTo === '/shops/new';

  // Location — shared component
  let selectedLocation: StructuredLocation | null = null;

  // Profile picture upload
  let profilePictureFile: File | null = null;
  let profilePicturePreview: string | null = '/default_profile_picture.jpg';


  function handleProfilePictureSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const type = file.type.toLowerCase();
    if (type !== 'image/jpeg' && type !== 'image/jpg' && type !== 'image/png' && type !== 'image/webp') {
      alert('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    profilePictureFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      profilePicturePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function removeProfilePicture() {
    profilePictureFile = null;
    profilePicturePreview = '/default_profile_picture.jpg';
  }
</script>

<svelte:head>
  <title>{pageTitle('Create Username')}</title>
</svelte:head>

<section class="max-w-md mx-auto px-4 py-8 sm:px-6 bg-background text-foreground">
  <h1 class="text-2xl font-semibold tracking-tight mb-2 text-foreground">
    {isShopIntent ? 'Finish your profile to create your shop' : 'Finish setup'}
  </h1>
  <p class="text-sm text-muted-foreground mb-6">
    {isShopIntent
      ? 'Set up your QuiverShare profile, then you\u2019ll be taken to create your shop.'
      : 'Set up your QuiverShare profile so other surfers know who you are.'}
  </p>

  <form method="POST" enctype="multipart/form-data" class="space-y-5 bg-surface border border-border rounded-xl px-5 py-6 shadow-sm">
    <input type="hidden" name="redirectTo" value={redirectTo} />

    <!-- Username (required) -->
    <div class="space-y-1.5">
      <label for="username" class="block text-sm font-medium text-muted-foreground">
        Username <span class="text-destructive">*</span>
      </label>
      <input
        id="username"
        name="username"
        bind:value={username}
        placeholder={USERNAME_PLACEHOLDER}
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        minlength={USERNAME_MIN}
        maxlength={USERNAME_MAX}
        pattern={USERNAME_PATTERN}
        autocomplete="username"
        required
        aria-invalid={!!form?.fieldErrors?.username}
        aria-errormessage="username-error"
        aria-describedby="username-hint"
      />
      <p id="username-hint" class="mt-1 text-xs text-muted-foreground">{USERNAME_HINT}</p>
      {#if form?.fieldErrors?.username}
        <p id="username-error" class="mt-1 text-xs text-destructive">{form.fieldErrors.username}</p>
      {/if}
    </div>

    <!-- Full Name (optional) -->
    <div class="space-y-1.5">
      <label for="full_name" class="block text-sm font-medium text-muted-foreground">
        Full Name (optional)
      </label>
      <input
        id="full_name"
        name="full_name"
        bind:value={fullName}
        placeholder="Your full name"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        maxlength="100"
        autocomplete="name"
        aria-invalid={!!form?.fieldErrors?.full_name}
        aria-errormessage="full_name-error"
      />
      {#if form?.fieldErrors?.full_name}
        <p id="full_name-error" class="mt-1 text-xs text-destructive">{form.fieldErrors.full_name}</p>
      {/if}
    </div>

    <!-- Profile Picture (optional) -->
    <div class="space-y-2">
      <span class="block text-sm font-medium text-muted-foreground">
        Profile Picture (optional)
      </span>
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-surface border border-border overflow-hidden flex items-center justify-center">
          <img
            src={profilePicturePreview || '/default_profile_picture.jpg'}
            alt="Profile preview"
            class="w-full h-full object-cover"
            on:error={(e) => ((e.currentTarget as HTMLImageElement).src = '/default_profile_picture.jpg')}
          />
        </div>
        <div class="flex-1">
          <input
            type="file"
            name="profile_picture"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            on:change={handleProfilePictureSelect}
            class="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-foreground file:text-xs file:font-medium hover:file:bg-muted cursor-pointer"
          />
          {#if profilePicturePreview && profilePicturePreview !== '/default_profile_picture.jpg'}
            <button
              type="button"
              class="mt-2 inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
              on:click={removeProfilePicture}
            >
              Remove
            </button>
          {/if}
        </div>
      </div>
      {#if form?.fieldErrors?.profile_picture}
        <p class="mt-1 text-xs text-destructive">{form.fieldErrors.profile_picture}</p>
      {/if}
    </div>

    <!-- Location (optional) -->
    <LocationAutocomplete
      bind:value={selectedLocation}
      required={false}
      label="Location (optional)"
      id="location"
      placeholder="Start typing... e.g. Brooklyn"
    />

    <!-- Home Break (plain text) -->
    <div class="space-y-1.5">
      <label for="home_break" class="block text-sm font-medium text-muted-foreground">
        Home Break (optional)
      </label>
      <input
        id="home_break"
        name="home_break_label"
        type="text"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        placeholder="e.g. 2nd Jetty on the Left, Rockaway Beach"
        bind:value={homeBreakLabel}
        maxlength="200"
      />
      <p class="text-xs text-muted-foreground mt-1">
        Optional — can be specific or playful (e.g. "2nd Jetty on the Left")
      </p>
    </div>

    <!-- Magic Board (optional) -->
    <div class="space-y-1.5">
      <label for="magic_board" class="block text-sm font-medium text-muted-foreground">
        Magic Board (optional)
      </label>
      <input
        id="magic_board"
        name="magic_board"
        bind:value={magicBoard}
        placeholder="Your favorite board"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        maxlength="200"
        aria-invalid={!!form?.fieldErrors?.magic_board}
        aria-errormessage="magic_board-error"
      />
      {#if form?.fieldErrors?.magic_board}
        <p id="magic_board-error" class="mt-1 text-xs text-destructive">{form.fieldErrors.magic_board}</p>
      {/if}
    </div>

    {#if form?.message}
      <p class="text-sm text-destructive">{form.message}</p>
    {/if}

    <button class="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed" type="submit">
      Save
    </button>
  </form>
</section>
