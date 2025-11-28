<script>
  // Static page; no load needed.
  const faqs = [
    {
      id: 'what-is-quivershare',
      q: 'What is QuiverShare?',
      a: `QuiverShare is a marketplace built specifically for surfers to buy, sell, and discover used surfboards. We launched in December 2025 to make it easier (and safer) to find the right board, fast.`
    },
    {
      id: 'is-it-free',
      q: 'Is QuiverShare free to use?',
      a: `Yes. QuiverShare is currently free for buyers and sellers. If hosting costs grow, I may introduce a small listing fee for sellers in the future. I’ll do my best to keep the marketplace free of ads and clutter.`
    },
    {
      id: 'how-to-list',
      q: 'How do I list a board for sale?',
      a: `Create an account → click “List a Board” → add photos and key details (dimensions, volume if known, fin setup, condition, location, price) → publish. You can edit or unpublish anytime from My Boards.`
    },
    {
      id: 'contact-flow',
      q: 'How do I contact a seller or buyer?',
      a: `When you click Contact Seller, you’ll send a short message that shares your email with the seller (Craigslist-style). If they want to move forward, you’ll connect directly over email to coordinate.`
    },
    {
      id: 'what-to-include',
      q: 'What should I include in my listing?',
      a: `
- 4–8 clear photos (deck, bottom, rails, nose/tail, any dings)
- Dimensions and volume (if known)
- Fin setup (twin/quad/thruster; fins included?)
- Condition notes (repairs, pressure dents, yellowing)
- Location and pickup details
- Asking price (and if firm or OBO)
      `.trim()
    },
    {
      id: 'edit-remove',
      q: 'How do I edit or remove my listing?',
      a: `Go to My Boards, open the listing, then choose Edit or Unpublish/Delete. Changes go live immediately.`
    },
    {
      id: 'outside-us',
      q: 'Can I use QuiverShare outside the U.S.?',
      a: `Yes, you can create and browse listings anywhere, though early growth and marketing are focused on the U.S. East Coast.`
    },
    {
      id: 'safety',
      q: 'How do I stay safe when meeting to buy/sell a board?',
      a: `
- Meet in a public, well-lit place (or a busy surf break/parking lot).
- Bring a friend if possible; share your meetup plan.
- Inspect the board in daylight; look for soft spots and repairs.
- Use trusted payment methods (cash, Zelle, Venmo, Cash App).
- Avoid sharing unnecessary personal info.
- Trust your gut—if something feels off, bail.
      `.trim()
    },
    {
      id: 'long-term-goal',
      q: 'What’s QuiverShare’s long-term goal?',
      a: `Build a clean, surfer-first marketplace that keeps great boards in the water—making it easy to resell, reuse, and travel light. Long term, I want you to land in any surf town, open QuiverShare, and grab the perfect board nearby.`
    },
    {
      id: 'report-bugs',
      q: 'I found a bug or have feedback — how can I help?',
      a: `I’d love to hear it. Email me at cooneyjack@microsoft.com or DM me—screenshots and steps to reproduce are gold. Thanks for helping improve the platform.`
    }
  ];
</script>

<svelte:head>
  <title>Help & FAQ — QuiverShare</title>
  <meta
    name="description"
    content="Answers to common questions about using QuiverShare to buy and sell used surfboards safely and easily."
  />
</svelte:head>

<section class="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8 py-10 sm:py-12 max-w-3xl mx-auto">
  <header class="mb-8 sm:mb-10">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Help & FAQ</h1>
    <p class="mt-3 text-sm sm:text-base text-muted-foreground">Quick answers for getting the most out of QuiverShare.</p>
  </header>

  <div class="space-y-3 sm:space-y-4">
    {#each faqs as item (item.id)}
      <details
        id={item.id}
        class="group rounded-xl border border-border bg-surface-elevated/80 shadow-sm overflow-hidden"
      >
        <summary
          class="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer select-none"
        >
          <span class="text-sm sm:text-base font-medium text-foreground">
            {item.q}
          </span>
          <span
            class="ml-3 text-xs sm:text-sm text-muted-foreground transition-transform duration-200 group-open:rotate-90"
            aria-hidden="true"
          >
            ▸
          </span>
        </summary>
        <div class="px-4 sm:px-5 pb-4 pt-2 border-t border-border/70">
          {#if item.a.trim().startsWith('-')}
            <ul class="list-disc pl-6 space-y-1 text-[15px] leading-7 text-foreground">
              {#each item.a.split('\n').filter(Boolean) as line}
                {#if line.trim().startsWith('-')}
                  <li>{line.replace(/^-\s*/, '')}</li>
                {:else}
                  <li>{line}</li>
                {/if}
              {/each}
            </ul>
          {:else}
            <p class="text-[15px] leading-7 whitespace-pre-line text-foreground">{item.a}</p>
          {/if}
        </div>
      </details>
    {/each}
  </div>

  <footer class="mt-10 sm:mt-12">
    <div class="flex flex-col sm:flex-row gap-3">
      <a href="/create-surfboard" class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        List a Board
      </a>
      <a href="/s" class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-surface text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        Browse Boards
      </a>
    </div>
    <p class="mt-4 text-sm text-muted-foreground">
      Still stuck? Email <a class="text-primary hover:text-primary-alt underline underline-offset-2" href="mailto:info@quivershare.com">info@quivershare.com</a>.
    </p>
  </footer>
</section>

