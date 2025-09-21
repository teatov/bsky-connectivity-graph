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
  const addedHandles = new Set<string>();
  const visitedHandles = new Set<string>();
  const addedLinks = new Set<string>();

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
    addedHandles.add(initHandle);
    // stage = 'graph';

    queue.push({ handle: initHandle, depth: 0 });

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visitedHandles.has(item.handle) || item.depth > maxDepth) {
        continue;
      }
      visitedHandles.add(item.handle);
      await fetchFollows(item);
    }
    stage = 'graph';

    resetState();
  }

  async function fetchFollows(source: QueueItem) {
    let cursor: string | undefined = undefined;
    let finished = false;

    while (!finished) {
      console.log(queue.length, source.handle, cursor);
      const follows = await getFollows(source.handle, limit, cursor);
      if (!follows) {
        resetState();
        errorMessage = `Error fetching follows for ${source.handle}`;
        return;
      }

      cursor = follows.cursor;

      follows.follows.forEach((target) => {
        if (source.depth + 1 <= maxDepth) {
          queue.push({ handle: target.handle, depth: source.depth + 1 });
        }
      });

      const newNodes: Node[] = [];
      const newLinks: Link[] = [];
      follows.follows.forEach((target) => {
        if (source.depth >= maxDepth && !addedHandles.has(target.handle)) {
          return;
        }

        const link = `${source.handle}-${target.handle}`;
        if (!addedLinks.has(link) && source.handle !== initHandle) {
          newLinks.push({
            source: source.handle,
            target: target.handle,
          });
          addedLinks.add(link);
        }

        if (!addedHandles.has(target.handle)) {
          newNodes.push({
            id: target.handle,
            image: target.avatar,
          });
          addedHandles.add(target.handle);
        }
      });

      // graph.addData(newNodes, newLinks);
      initNodes = [...initNodes, ...newNodes];
      initLinks = [...initLinks, ...newLinks];
      if (!follows.cursor) {
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
