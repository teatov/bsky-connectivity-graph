<script lang="ts">
  import { getFollows, getProfile } from './lib';
  import Graph, { type Link, type Node } from './lib/components/graph.svelte';

  type Stage = 'start' | 'graph';

  let stage = $state<Stage>('start');
  let initHandle = $state<string>('');

  let errorMessage = $state<string | null>(null);
  let infoMessage = $state<string | null>(null);

  let isFetching = $state<boolean>(false);
  let currentHandle = $state<string>('');
  let currentPage = $state<number>(0);
  let currentQueueLength = $state<number>(0);

  let initNodes = $state<Node[]>([]);
  let initLinks = $state<Link[]>([]);

  // svelte-ignore non_reactive_update
  let graph: Graph;

  type QueueItem = { handle: string; depth: number; image?: string };
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
    if (initHandle.startsWith('@')) {
      initHandle = initHandle.slice(1);
    }
    if (!initHandle) {
      resetState();
      errorMessage = 'Enter something!';
      return;
    }

    resetState();
    isFetching = true;
    infoMessage = `Checking ${initHandle}...`;
    const { profile, error } = await getProfile(initHandle);

    if (!profile) {
      resetState();
      errorMessage = `Error fetching profile for ${initHandle}: ${error}`;
      return;
    }

    initNodes.push({ id: initHandle, image: profile.avatar });
    addedHandles.add(initHandle);
    stage = 'graph';

    queue.push({ handle: initHandle, depth: 0, image: profile.avatar });

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visitedHandles.has(item.handle) || item.depth > maxDepth) {
        continue;
      }
      visitedHandles.add(item.handle);
      await fetchFollows(item);
    }

    resetState();
  }

  async function fetchFollows(source: QueueItem) {
    let cursor: string | undefined = undefined;
    let finished = false;
    currentPage = 0;
    currentQueueLength = queue.length;

    while (!finished) {
      currentHandle = source.handle;
      const { follows, error } = await getFollows(source.handle, limit, cursor);
      if (!follows) {
        resetState();
        errorMessage = `Error fetching follows for ${source.handle}: ${error}`;
        return;
      }

      cursor = follows.cursor;

      follows.follows.forEach((target) => {
        if (source.depth + 1 <= maxDepth) {
          queue.push({
            handle: target.handle,
            depth: source.depth + 1,
            image: target.avatar,
          });
        }
      });

      const newNodes: Node[] = [];
      const newLinks: Link[] = [];
      if (!addedHandles.has(source.handle)) {
        newNodes.push({
          id: source.handle,
          image: source.image,
        });
        addedHandles.add(source.handle);
      }

      follows.follows.forEach((target) => {
        if (source.handle === initHandle) {
          return;
        }
        if (source.depth >= maxDepth && !addedHandles.has(target.handle)) {
          return;
        }

        const link = `${source.handle}-${target.handle}`;
        if (!addedLinks.has(link)) {
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

      if (newNodes.length > 0 || newLinks.length > 0) {
        graph.addData(newNodes, newLinks);
      }
      // initNodes = [...initNodes, ...newNodes];
      // initLinks = [...initLinks, ...newLinks];

      currentPage++;
      if (!follows.cursor) {
        finished = true;
      }
    }
  }
</script>

{#if stage === 'start'}
  <main class="flex h-full items-center justify-center">
    <div class="max-w-md p-4">
      <p class="mb-4">
        This thing checks your Bluesky follows, analyzes which of them follow each other, and builds
        an interactive graph out of that.
      </p>
      <p class="mb-4">This is fully client-side, your data doesn't go anywhere.</p>
      <p class="mb-4">This may take a while, so be ready.</p>
      <div class="flex w-full flex-col gap-2 sm:flex-row">
        <input
          type="text"
          class="w-full border border-secondary p-2 placeholder-secondary disabled:cursor-not-allowed"
          bind:value={initHandle}
          placeholder="Enter the handle..."
          onkeypress={(event) => {
            if (event.key === 'Enter') {
              startFetching();
            }
          }}
          disabled={isFetching}
          autocomplete="on"
          name="bsky-handle"
          id="bsky-handle"
        />
        <button
          class="shrink-0 bg-foreground px-4 py-2 text-background disabled:cursor-not-allowed"
          onclick={startFetching}
          disabled={isFetching}>Analyze!</button
        >
      </div>
      <p class="min-h-16 {errorMessage ? 'text-danger' : ''}">
        {#if infoMessage}{infoMessage}{/if}
        {#if errorMessage}{errorMessage}{/if}
      </p>
      <p class="mt-4">
        Made by <a href="https://teatov.xyz" class="font-semibold underline">Teatov</a>.
      </p>
    </div>
  </main>
{/if}

{#if stage === 'graph'}
  <Graph {initNodes} {initLinks} bind:this={graph} />

  {#if isFetching}
    <div class="pointer-events-none absolute top-0 right-0 left-0 p-4 text-center">
      ({currentQueueLength} remaining) Fetching follows for:<br />{currentHandle}...{'.'.repeat(
        currentPage,
      )}
    </div>
  {/if}
  {#if errorMessage}
    <div class="absolute top-16 right-0 left-0 p-4 text-center text-danger">
      {errorMessage}
    </div>
  {/if}
{/if}
