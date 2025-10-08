<script lang="ts">
  import { supabase } from '$lib/supabaseClient';

  let surfboard = {
    name: '',
    length: '',
    volume: '',
    fins: '',
    notes: ''
  };

  let loading = false;
  let message = '';

  async function saveBoard() {
    loading = true;
    message = '';

    const { data, error } = await supabase
      .from('surfboards')
      .insert([surfboard]);

    loading = false;

    if (error) {
      console.error('Supabase error:', error);
      message = `❌ ${error.message}`;
    } else {
      message = '✅ Surfboard saved successfully!';
      surfboard = { name: '', length: '', volume: '', fins: '', notes: '' }; // reset form
    }
  }
</script>

<main class="min-h-screen bg-base-200 p-8 flex flex-col items-center">
  <div class="w-full max-w-lg bg-base-100 p-8 rounded-2xl shadow-lg">
    <h1 class="text-3xl font-bold text-center text-primary mb-6">
      Edit Surfboard
    </h1>

    <form class="space-y-4" on:submit|preventDefault={saveBoard}>
      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Board Name</span>
        </label>
        <input
          type="text"
          bind:value={surfboard.name}
          placeholder="e.g. Star Cruiser"
          class="input input-bordered w-full"
          required
        />
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Length (ft)</span>
        </label>
        <input
          type="text"
          bind:value={surfboard.length}
          placeholder="e.g. 7'2"
          class="input input-bordered w-full"
        />
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Volume (L)</span>
        </label>
        <input
          type="number"
          bind:value={surfboard.volume}
          placeholder="e.g. 42"
          class="input input-bordered w-full"
        />
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Fins Setup</span>
        </label>
        <select bind:value={surfboard.fins} class="select select-bordered w-full">
          <option disabled selected>Select fins</option>
          <option>Single</option>
          <option>Twin</option>
          <option>Quad</option>
          <option>Thruster</option>
          <option>Bonzer</option>
        </select>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Notes</span>
        </label>
        <textarea
          bind:value={surfboard.notes}
          class="textarea textarea-bordered w-full"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <button
        type="submit"
        class="btn btn-primary w-full mt-4"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Surfboard'}
      </button>

      {#if message}
        <div
          class="alert mt-4"
          class:bg-success={message.startsWith('✅')}
          class:bg-error={message.startsWith('❌')}
        >
          <span>{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>
