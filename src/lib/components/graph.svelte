<script lang="ts" module>
  export type Node = {
    id: string;
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

  let { nodes, links }: { nodes: Node[]; links: Link[] } = $props();

  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let simulation: d3.Simulation<Node, undefined>;
  let node: d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>;
  let link: d3.Selection<SVGLineElement, Link, SVGGElement, unknown>;
  let label: d3.Selection<SVGTextElement, Node, SVGGElement, unknown>;
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;

  onMount(() => {
    if (!container) {
      throw new Error('"container" is somehow not bound');
    }

    createGraph();

    return () => {
      if (simulation) simulation.stop();
    };
  });

  function getContainerSize() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    return { width, height };
  }

  function createGraph() {
    const { width, height } = getContainerSize();
    container.innerHTML = '';

    svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g');

    zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const startNodes = [...nodes];
    const startLinks = [...links];

    simulation = d3
      .forceSimulation<Node>(startNodes)
      .force(
        'link',
        d3
          .forceLink<Node, Link>(startLinks)
          .id((d) => d.id)
          .distance(100),
      )
      .force('charge', d3.forceManyBody<Node>().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    link = g
      .append('g')
      .selectAll<SVGLineElement, Link>('line')
      .data(startLinks)
      .join('line')
      .classed('graph-link', true);

    node = g
      .append('g')
      .selectAll<SVGCircleElement, Node>('circle')
      .data(startNodes)
      .join('circle')
      .attr('r', 8)
      .classed('graph-node', true)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    label = g
      .append('g')
      .selectAll<SVGTextElement, Node>('text')
      .data(startNodes)
      .join('text')
      .text((d) => d.id)
      .attr('dy', -12)
      .classed('graph-label', true);

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (typeof d.source === 'string' ? 0 : (d.source.x ?? 0)))
        .attr('y1', (d) => (typeof d.source === 'string' ? 0 : (d.source.y ?? 0)))
        .attr('x2', (d) => (typeof d.target === 'string' ? 0 : (d.target.x ?? 0)))
        .attr('y2', (d) => (typeof d.target === 'string' ? 0 : (d.target.y ?? 0)));

      node.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);
      label.attr('x', (d) => d.x ?? 0).attr('y', (d) => d.y ?? 0);
    });
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
<div class="absolute top-0 left-0 p-4">
  <button onclick={fitGraph}>Fit Graph</button>
</div>
