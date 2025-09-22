<script lang="ts" module>
  export type Node = {
    id: string;
    image?: string;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
  };

  export type Link = {
    source: string | Node;
    target: string | Node;
  };
</script>

<script lang="ts">
  import * as d3 from 'd3';
  import { onMount } from 'svelte';

  let { initNodes, initLinks }: { initNodes: Node[]; initLinks: Link[] } = $props();
  let nodes = $state<Node[]>([]);
  let links = $state<Link[]>([]);
  let showStats = $state<boolean>(false);
  let sortBy = $state<'total' | 'in' | 'out'>('total');

  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let g: d3.Selection<SVGGElement, unknown, null, undefined>;
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  let simulation: d3.Simulation<Node, Link>;

  export function addData(newNodes: Node[], newLinks: Link[]) {
    links = [...links, ...newLinks];
    nodes = [...nodes, ...newNodes];
    updateGraph();
  }

  export function clearLinks() {
    links = [];
    updateGraph();
  }

  onMount(() => {
    if (!container) {
      throw new Error('"container" is somehow not bound');
    }

    links = [...initLinks];
    nodes = [...initNodes];
    container.innerHTML = '';

    svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    g = svg.append('g');

    zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 26)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .classed('graph-arrowhead', true);

    const { width, height } = getContainerSize();
    svg
      .transition()
      .duration(0)
      .call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
    simulation = d3
      .forceSimulation<Node, Link>()
      .force(
        'link',
        d3
          .forceLink<Node, Link>()
          .id((d) => d.id)
          .distance(300),
      )
      .force('charge', d3.forceManyBody().strength(-150).distanceMax(250))
      .force('center', d3.forceCenter(0, 0))
      .force('collide', d3.forceCollide().radius(50));

    updateGraph();
  });

  function getContainerSize() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    return { width, height };
  }

  function updateGraph() {
    const link = g
      .selectAll<SVGLineElement, Link>('line')
      .data(links, (d: any) => `${d.source}-${d.target}`);

    link.join(
      (enter) =>
        enter
          .insert('line', ':first-child')
          .attr('stroke-opacity', 0.15)
          .classed('graph-link', true),
      (update) => update,
      (exit) => exit.remove(),
    );

    const size = 40;

    const image = g.selectAll<SVGImageElement, Node>('image').data(nodes, (d) => d.id);

    image.join(
      (enter) =>
        enter
          .append('image')
          .attr('xlink:href', (d) => d.image ?? '')
          .attr('height', size)
          .attr('width', size)
          .attr('opacity', 1)
          .classed('graph-node', true)
          .call(
            d3
              .drag<SVGImageElement, Node>()
              .on('start', (event, d) => {
                if (!simulation) return;
                if (!event.active) simulation.alphaTarget(0.3).restart();
                (d as any).fx = (d as any).x;
                (d as any).fy = (d as any).y;
              })
              .on('drag', (event, d) => {
                (d as any).fx = event.x;
                (d as any).fy = event.y;
              })
              .on('end', (event, d) => {
                if (!simulation) return;
                if (!event.active) simulation.alphaTarget(0);
                (d as any).fx = null;
                (d as any).fy = null;
              }),
          )
          .on('mouseenter', (evt, d) => {
            g.selectAll<SVGLineElement, Link>('line')
              .attr('display', 'none')
              .filter(
                (l) =>
                  (typeof l.source === 'string'
                    ? l.source === d.id
                    : (l.source as Node).id === d.id) ||
                  (typeof l.target === 'string'
                    ? l.target === d.id
                    : (l.target as Node).id === d.id),
              )
              .attr('display', 'block')
              .attr('stroke-opacity', 0.5);
            g.selectAll<SVGImageElement, Node>('image')
              .attr('opacity', 0.25)
              .filter(
                (dt) =>
                  dt.id === d.id ||
                  links.some(
                    (l) =>
                      ((typeof l.source === 'string'
                        ? l.source === d.id
                        : (l.source as Node).id === d.id) &&
                        (typeof l.target === 'string'
                          ? l.target === dt.id
                          : (l.target as Node).id === dt.id)) ||
                      ((typeof l.source === 'string'
                        ? l.source === dt.id
                        : (l.source as Node).id === dt.id) &&
                        (typeof l.target === 'string'
                          ? l.target === d.id
                          : (l.target as Node).id === d.id)),
                  ),
              )
              .attr('opacity', 1);
          })
          .on('mouseleave', (evt) => {
            g.selectAll<SVGLineElement, Link>('line')
              .attr('display', 'block')
              .attr('stroke-opacity', 0.15);
            g.selectAll<SVGImageElement, Node>('image').attr('opacity', 1);
          }),
      (update) => update,
      (exit) => exit.remove(),
    );

    const label = g.selectAll<SVGTextElement, Node>('text').data(nodes, (d) => d.id);

    label.join(
      (enter) =>
        enter
          .append('text')
          .raise()
          .text((d) => d.id)
          .attr('dy', size / 2 + 14)
          .classed('graph-label', true),
      (update) => update.text((d) => d.id),
      (exit) => exit.remove(),
    );

    simulation.nodes(nodes).on('tick', () => {
      g.selectAll<SVGLineElement, Link>('line')
        .attr('x1', (d) => (typeof d.source === 'string' ? 0 : (d.source.x ?? 0)))
        .attr('y1', (d) => (typeof d.source === 'string' ? 0 : (d.source.y ?? 0)))
        .attr('x2', (d) => (typeof d.target === 'string' ? 0 : (d.target.x ?? 0)))
        .attr('y2', (d) => (typeof d.target === 'string' ? 0 : (d.target.y ?? 0)));

      g.selectAll<SVGImageElement, Node>('image')
        .attr('x', (d) => (d.x ?? 0) - size / 2)
        .attr('y', (d) => (d.y ?? 0) - size / 2);

      g.selectAll<SVGTextElement, Node>('text')
        .attr('x', (d) => d.x ?? 0)
        .attr('y', (d) => d.y ?? 0);
    });
    (simulation.force('link') as d3.ForceLink<Node, Link>).links(links);

    simulation.alpha(1).restart();
  }

  function fitGraph() {
    const padding = 40;
    const gNode = svg.select('g').node() as SVGGElement;
    const bbox = gNode.getBBox();

    const { width, height } = getContainerSize();
    const scale = Math.min((width - padding) / bbox.width, (height - padding) / bbox.height);

    const translateX = width / 2 - scale * (bbox.x + bbox.width / 2);
    const translateY = height / 2 - scale * (bbox.y + bbox.height / 2);

    svg
      .transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }
</script>

<div bind:this={container} class="h-full w-full"></div>
{#if showStats}
  {@const stats = nodes
    .map((d) => ({
      id: d.id,
      total: links.filter(
        (l) =>
          (typeof l.source === 'string' ? l.source === d.id : (l.source as Node).id === d.id) ||
          (typeof l.target === 'string' ? l.target === d.id : (l.target as Node).id === d.id),
      ).length,
      in: links.filter((l) =>
        typeof l.target === 'string' ? l.target === d.id : (l.target as Node).id === d.id,
      ).length,
      out: links.filter((l) =>
        typeof l.source === 'string' ? l.source === d.id : (l.source as Node).id === d.id,
      ).length,
    }))
    .sort((a, b) =>
      sortBy === 'total' ? b.total - a.total : sortBy === 'in' ? b.in - a.in : b.out - a.out,
    )}
  <div class="absolute top-0 bottom-0 left-0 max-w-screen overflow-auto border-r bg-background p-4">
    <table class="mt-16">
      <thead>
        <tr class="even:bg-muted m-0 border-t p-0">
          <th
            scope="col"
            class="border px-2 py-1 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
            >Handle</th
          >
          <th
            scope="col"
            class="border px-2 py-1 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
            ><button class="underline" onclick={() => (sortBy = 'in')}
              >In{#if sortBy === 'in'}
                ▼
              {/if}</button
            ></th
          >
          <th
            scope="col"
            class="border px-2 py-1 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
            ><button class="underline" onclick={() => (sortBy = 'out')}
              >Out{#if sortBy === 'out'}
                ▼
              {/if}</button
            ></th
          >
          <th
            scope="col"
            class="border px-2 py-1 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
            ><button class="underline" onclick={() => (sortBy = 'total')}
              >Total{#if sortBy === 'total'}
                ▼
              {/if}</button
            ></th
          >
        </tr>
      </thead>
      <tbody>
        {#each stats as stat}
          <tr class="m-0 border-t p-0 even:bg-secondary/10">
            <th
              class="border px-2 py-1 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
              >{stat.id}</th
            >
            <td
              class="border px-2 py-1 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
              >{stat.in}</td
            >
            <td
              class="border px-2 py-1 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
              >{stat.out}</td
            >
            <td
              class="border px-2 py-1 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
              >{stat.total}</td
            >
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
<div class="absolute top-0 left-0 z-50 p-4">
  <button
    onclick={() => (showStats = !showStats)}
    title="Show stats"
    aria-label="Show stats"
    class="bg-foreground p-2 text-background"
    ><svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
        d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
      /><path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z" /><path
        d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
      /><path d="M4 20h14" /></svg
    ></button
  >
</div>
<div class="absolute top-0 right-0 z-50 p-4">
  <button
    onclick={fitGraph}
    title="Fit to screen"
    aria-label="Fit to screen"
    class="bg-foreground p-2 text-background"
    ><svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
        d="M4 8v-2a2 2 0 0 1 2 -2h2"
      /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path
        d="M16 20h2a2 2 0 0 0 2 -2v-2"
      /><path d="M8 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /><path d="M16 16l-2.5 -2.5" /></svg
    ></button
  >
</div>
