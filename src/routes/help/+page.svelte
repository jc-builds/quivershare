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

<section class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
  <header class="mb-10">
    <h1 class="text-3xl font-bold tracking-tight">Help & FAQ</h1>
    <p class="mt-3 text-base opacity-80">Quick answers for getting the most out of QuiverShare.</p>
  </header>

  <div class="space-y-4">
    {#each faqs as item (item.id)}
      <div id={item.id} class="collapse collapse-arrow bg-base-200/50 rounded-xl border border-base-300">
        <input type="checkbox" aria-label={`Toggle answer for ${item.q}`} />
        <div class="collapse-title text-base font-medium">
          {item.q}
        </div>
        <div class="collapse-content">
          {#if item.a.trim().startsWith('-')}
            <ul class="list-disc pl-6 space-y-1 text-[15px] leading-7">
              {#each item.a.split('\n').filter(Boolean) as line}
                {#if line.trim().startsWith('-')}
                  <li>{line.replace(/^-\\s*/, '')}</li>
                {:else}
                  <li>{line}</li>
                {/if}
              {/each}
            </ul>
          {:else}
            <p class="text-[15px] leading-7 whitespace-pre-line">{item.a}</p>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <footer class="mt-10">
    <div class="join join-vertical sm:join-horizontal gap-3 sm:gap-0">
      <a href="/create-surfboard" class="btn btn-primary join-item">List a Board</a>
      <a href="/s" class="btn btn-outline join-item">Browse Boards</a>
    </div>
    <p class="mt-4 text-sm opacity-70">
      Still stuck? Email <a class="link" href="mailto:cooneyjack@microsoft.com">cooneyjack@microsoft.com</a>.
    </p>
  </footer>
</section>

<style>
  .collapse .collapse-title {
    cursor: pointer;
  }

  .collapse input {
    display: none;
  }
</style>

