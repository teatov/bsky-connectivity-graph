<script lang="ts">
  import { max } from 'd3';
  import { getFollows, getProfile } from './lib';
  import Graph, { type Link, type Node } from './lib/components/graph.svelte';

  type Stage = 'start' | 'graph';

  let stage = $state<Stage>('start');
  let isFetching = $state<boolean>(false);
  let initHandle = $state<string>('teatov.xyz');
  let errorMessage = $state<string | null>(null);
  let infoMessage = $state<string | null>(null);

  let initNodes = $state<Node[]>([]);
  let initLinks = $state<Link[]>([]);

  // svelte-ignore non_reactive_update
  let graph: Graph;

  type QueueItem = { handle: string; depth: number };
  const queue: QueueItem[] = [];
  const allHandles = new Set<string>();
  const visitedHandles = new Set<string>();
  const visitedLinks = new Set<string>();

  const maxDepth = 1;
  const limit = 100;

  function resetState() {
    errorMessage = '';
    infoMessage = null;
    isFetching = false;
  }

  async function startFetching() {
    if (!initHandle) {
      resetState();
      errorMessage = 'Enter something!';
      return;
    }

    resetState();
    isFetching = true;
    infoMessage = `Checking ${initHandle}...`;
    const profile = await getProfile(initHandle);

    if (!profile) {
      resetState();
      errorMessage = `Error fetching profile for ${initHandle}`;
      return;
    }

    initNodes.push({ id: initHandle, image: profile.avatar });
    // stage = 'graph';

    queue.push({ handle: initHandle, depth: 0 });

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visitedHandles.has(item.handle) || item.depth > maxDepth) {
        continue;
      }
      await fetchFollows(item);
    }
    stage = 'graph';

    resetState();
  }

  async function fetchFollows(item: QueueItem) {
    visitedHandles.add(item.handle);
    allHandles.add(item.handle);
    let cursor: string | undefined = undefined;
    let finished = false;

    while (!finished) {
      console.log(item.handle, cursor);
      const follows = await getFollows(item.handle, limit, cursor);
      if (!follows) {
        resetState();
        errorMessage = `Error fetching follows for ${item.handle}`;
        return;
      }

      cursor = follows.cursor;

      follows.follows.forEach((profile) =>
        queue.push({ handle: profile.handle, depth: item.depth + 1 }),
      );

      const newNodes: Node[] = [];
      const newLinks: Link[] = [];
      follows.follows.forEach((profile) => {
        if (item.depth >= maxDepth && !allHandles.has(profile.handle)) {
          return;
        }
        if (!allHandles.has(profile.handle)) {
          newNodes.push({
            id: profile.handle,
            image: profile.avatar,
          });
          allHandles.add(profile.handle);
        }
        const link = `${item.handle}-${profile.handle}`;
        if (!visitedLinks.has(link) && item.handle !== initHandle) {
          newLinks.push({
            source: item.handle,
            target: profile.handle,
          });
          visitedLinks.add(link);
        }
      });

      // graph.addData(newNodes, newLinks);
      initNodes = [...initNodes, ...newNodes];
      initLinks = [...initLinks, ...newLinks];
      // console.log(initNodes);
      if (follows.follows.length < limit) {
        finished = true;
      }
    }
  }
</script>

{#if stage === 'start'}
  <main class="flex h-full items-center justify-center">
    <div class="p-4">
      <div>
        <input
          type="text"
          class="border border-secondary p-2 placeholder-secondary"
          bind:value={initHandle}
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
      Fetching follows for {initHandle}...
    </div>
  {/if}
  {#if errorMessage}
    <div class="absolute top-0 right-0 left-0 p-4 text-center text-danger">
      {errorMessage}
    </div>
  {/if}
{/if}
