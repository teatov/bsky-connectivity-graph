<script lang="ts">
  import Graph, { type Link, type Node } from './lib/components/graph.svelte';

  const nodes: Node[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }];

  const links: Link[] = [
    { source: 'A', target: 'B' },
    { source: 'A', target: 'C' },
    { source: 'B', target: 'D' },
  ];
</script>

<Graph {nodes} {links} />
