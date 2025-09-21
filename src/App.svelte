<script lang="ts">
  import { getFollows, getProfile } from './lib';
  import Graph, { type Link, type Node } from './lib/components/graph.svelte';

  type Stage = 'start' | 'graph';

  let stage = $state<Stage>('start');
  let isFetching = $state<boolean>(false);
  let handle = $state<string>('teatov.xyz');
  let errorMessage = $state<string | null>(null);
  let infoMessage = $state<string | null>(null);

  let initNodes = $state<Node[]>([]);
  let initLinks = $state<Link[]>([]);

  // svelte-ignore non_reactive_update
  let graph: Graph;

  function resetState() {
    errorMessage = '';
    infoMessage = null;
    isFetching = false;
  }

  async function startFetching() {
    if (!handle) {
      resetState();
      errorMessage = 'Enter something!';
      return;
    }

    resetState();
    isFetching = true;
    infoMessage = `Checking ${handle}...`;
    const profile = await getProfile(handle);

    if (!profile) {
      resetState();
      errorMessage = `Error fetching profile for ${handle}`;
      return;
    }

    initNodes.push({ id: profile.handle });
    stage = 'graph';

    const follows = await getFollows(handle);
    if (!follows) {
      resetState();
      errorMessage = `Error fetching follows for ${handle}`;
      return;
    }

    const newNodes: Node[] = follows.follows.map((profile) => ({
      id: profile.handle,
    }));
    const newLinks: Link[] = follows.follows.map((profile) => ({
      source: handle,
      target: profile.handle,
    }));
    graph.addData(newNodes, newLinks);

    resetState();
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
          disabled={isFetching}
        />
        <button
          class="bg-foreground p-2 text-background"
          onclick={startFetching}
          disabled={isFetching}>Build the graph!</button
        >
      </div>
      <p class="min-h-6 {errorMessage ? 'text-danger' : ''}">
        {#if infoMessage}{infoMessage}{/if}
        {#if errorMessage}{errorMessage}{/if}
      </p>
    </div>
  </main>
{/if}

{#if stage === 'graph'}
  <Graph {initNodes} {initLinks} bind:this={graph} />

  {#if isFetching}
    <div class="absolute top-0 right-0 left-0 p-4 text-center">
      Fetching follows for {handle}...
    </div>
  {/if}
  {#if errorMessage}
    <div class="absolute top-0 right-0 left-0 p-4 text-center text-danger">
      {errorMessage}
    </div>
  {/if}
{/if}
