<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/stores";

  export let isActiveUser: boolean;
  export let shopSlug: string | null;
  export let username: string | null;
  export let profileImageUrl: string | null;
  export let displayName: string;

  type NavLink = { label: string; href: string };

  const hasShop = !!shopSlug;

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  // --- Nav link definitions (single source of truth per user state) ---

  const topNavLinks: NavLink[] = !isActiveUser
    ? [
        { label: "Browse Boards", href: "/s" },
        { label: "Help", href: "/help" },
        { label: "About", href: "/about" },
      ]
    : hasShop
      ? [
          { label: "Browse Boards", href: "/s" },
          { label: "Shop Dashboard", href: `/shops/${shopSlug}/dashboard` },
        ]
      : [
          { label: "Browse Boards", href: "/s" },
          { label: "My Boards", href: "/my-boards" },
        ];

  const accountLinks: NavLink[] = isActiveUser
    ? [
        ...(username
          ? [{ label: "View Profile", href: `/profile/${username}` }]
          : []),
        { label: "Settings", href: "/profile/edit" },
        ...(hasShop
          ? [{ label: "My Shop", href: `/shops/${shopSlug}` }]
          : [{ label: "Start a Shop", href: "/shops/new" }]),
      ]
    : [];

  const boardsLabel = hasShop ? "Personal Boards" : "My Boards";

  const dropdownNavLinks: NavLink[] = isActiveUser
    ? [
        ...topNavLinks.filter((l) => l.href !== "/s"),
        ...(hasShop ? [{ label: boardsLabel, href: "/my-boards" }] : []),
        { label: "Help", href: "/help" },
        { label: "About", href: "/about" },
      ]
    : [];

  const mobileMenuLinks: NavLink[] = isActiveUser
    ? [
        ...topNavLinks,
        ...(hasShop ? [{ label: boardsLabel, href: "/my-boards" }] : []),
        { label: "Help", href: "/help" },
        { label: "About", href: "/about" },
      ]
    : [];

  // --- Dropdown / mobile menu state ---

  let mobileMenuOpen = false;
  let profileMenuOpen = false;
  let profileMenuElement: HTMLElement;
  let mobileMenuElement: HTMLElement;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function toggleProfileMenu() {
    profileMenuOpen = !profileMenuOpen;
  }

  function closeMenus() {
    mobileMenuOpen = false;
    profileMenuOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (!browser) return;
    const target = event.target as Node;
    if (
      profileMenuOpen &&
      profileMenuElement &&
      !profileMenuElement.contains(target)
    ) {
      profileMenuOpen = false;
    }
    if (
      mobileMenuOpen &&
      mobileMenuElement &&
      !mobileMenuElement.contains(target)
    ) {
      mobileMenuOpen = false;
    }
  }

  onMount(() => {
    if (!browser) return;
    const setupListener = () => {
      document.addEventListener("click", handleClickOutside, true);
    };
    const timeoutId = setTimeout(setupListener, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside, true);
    };
  });

  onDestroy(() => {
    if (!browser) return;
    document.removeEventListener("click", handleClickOutside, true);
  });
</script>

<nav
  class="w-full border-b border-border bg-surface sticky top-0 z-50"
>
  <div
    class="mx-auto flex h-14 items-center justify-between px-4 md:px-8 lg:max-w-6xl"
  >
    <!-- Logo -->
    <a
      href="/"
      class="text-xl font-bold text-foreground"
      data-sveltekit-prefetch
    >
      <img
        src="/FullLogo_Transparent_NoBuffer.png"
        alt="QuiverShare"
        class="h-11 w-auto"
      />
    </a>

    <div class="ml-auto flex items-center gap-4 md:gap-6">
      <!-- Desktop top nav -->
      <div
        class="hidden md:flex items-center gap-6 text-sm text-muted-foreground nav-li-font"
      >
        {#each topNavLinks as link}
          <a
            href={link.href}
            class="hover:text-foreground"
            data-sveltekit-prefetch>{link.label}</a
          >
        {/each}
      </div>

      {#if isActiveUser}
        <!-- Desktop profile dropdown -->
        <div class="relative hidden md:block" bind:this={profileMenuElement}>
          <button
            type="button"
            class="inline-flex items-center rounded-full p-1 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface {profileMenuOpen
              ? 'bg-muted border-border'
              : 'border-transparent hover:bg-muted'}"
            aria-label="Open profile menu"
            on:click={toggleProfileMenu}
          >
            {#if profileImageUrl}
              <img
                src={profileImageUrl}
                alt={`Profile picture of ${displayName}`}
                class="w-8 h-8 rounded-full object-cover"
              />
            {:else}
              <span
                class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-foreground nav-li-font"
                aria-hidden="true"
              >
                {initials}
              </span>
              <span class="sr-only">Profile menu</span>
            {/if}
          </button>
          {#if profileMenuOpen}
            <div
              class="absolute right-0 mt-2 w-52 rounded-md border border-border bg-surface-elevated shadow-lg z-[100]"
            >
              <div class="px-4 py-3 border-b border-border">
                <p class="text-sm font-medium text-foreground">
                  {displayName}
                </p>
              </div>
              <div class="py-1 nav-li-font">
                <div
                  class="px-4 pt-2 pb-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
                >
                  Account
                </div>
                {#each accountLinks as link}
                  <a
                    href={link.href}
                    class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-sveltekit-prefetch
                    on:click={closeMenus}
                  >
                    {link.label}
                  </a>
                {/each}
                <div class="border-t border-border my-1"></div>
                {#each dropdownNavLinks as link}
                  <a
                    href={link.href}
                    class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-sveltekit-prefetch
                    on:click={closeMenus}
                  >
                    {link.label}
                  </a>
                {/each}
                <div class="border-t border-border my-1"></div>
                <a
                  href="/logout"
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  on:click={closeMenus}
                >
                  Logout
                </a>
              </div>
            </div>
          {/if}
        </div>

        <!-- Mobile hamburger (logged-in) -->
        <button
          type="button"
          class="inline-flex items-center rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open menu"
          on:click={toggleMobileMenu}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {#if mobileMenuOpen}
          <div
            class="absolute top-14 left-0 right-0 border-b border-border bg-surface shadow-lg z-[100] md:hidden"
            bind:this={mobileMenuElement}
          >
            <div class="px-4 py-3 border-b border-border">
              <p class="text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div class="py-1 nav-li-font">
              <div
                class="px-4 pt-2 pb-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider"
              >
                Account
              </div>
              {#each accountLinks as link}
                <a
                  href={link.href}
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  {link.label}
                </a>
              {/each}
              <div class="border-t border-border my-1"></div>
              {#each mobileMenuLinks as link}
                <a
                  href={link.href}
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  {link.label}
                </a>
              {/each}
              <div class="border-t border-border my-1"></div>
              <a
                href="/logout"
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                on:click={closeMenus}
              >
                Logout
              </a>
            </div>
          </div>
        {/if}
      {:else}
        <!-- Mobile hamburger (logged-out) -->
        <button
          type="button"
          class="inline-flex items-center rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Open menu"
          on:click={toggleMobileMenu}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {#if mobileMenuOpen}
          <div
            class="absolute top-14 left-0 right-0 border-b border-border bg-surface shadow-lg z-[100] md:hidden"
            bind:this={mobileMenuElement}
          >
            <div class="py-1 nav-li-font">
              {#each topNavLinks as link}
                <a
                  href={link.href}
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  {link.label}
                </a>
              {/each}
              {#if $page.url.pathname !== "/login"}
                <a
                  href="/login"
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  Login / Sign Up
                </a>
              {/if}
            </div>
          </div>
        {/if}
        {#if $page.url.pathname !== "/login"}
          <a
            href="/login"
            class="hidden md:inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-alt transition-colors"
            data-sveltekit-prefetch
          >
            Login / Sign Up
          </a>
        {/if}
      {/if}
    </div>
  </div>
</nav>
