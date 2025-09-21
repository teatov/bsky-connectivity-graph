<script lang="ts">
  import Graph, { type Link, type Node } from './lib/components/graph.svelte';

  type Stage = 'start' | 'fetching' | 'graph';

  let stage = $state<Stage>('start');
  let handle = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  const nodes: Node[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];

  const links: Link[] = [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
  ];

  function startFetching() {
    if (!handle) {
      errorMessage = 'Enter something!';
      return;
    }
    console.log(handle);
  }
</script>

{#if stage === 'start'}
  <main class="flex h-full items-center justify-center">
    <div class="p-4">
      <div>
        <input
          type="text"
          class="border border-secondary p-2 placeholder-secondary"
          bind:value={handle}
          placeholder="Enter the handle here..."
          onkeypress={(event) => {
            if (event.key === 'Enter') {
              startFetching();
            }
          }}
        />
        <button class="bg-foreground p-2 text-background" onclick={startFetching}
          >Build the graph!</button
        >
      </div>
      <p class="min-h-6 text-danger">
        {#if errorMessage}{errorMessage}{/if}
      </p>
    </div>
  </main>
{/if}

{#if stage === 'graph'}
  <Graph {nodes} {links} />
{/if}
