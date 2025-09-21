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
  let nodes: Node[] = [];
  let links: Link[] = [];

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
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .classed('graph-arrowhead', true);

    const { width, height } = getContainerSize();
    simulation = d3
      .forceSimulation<Node, Link>()
      .force(
        'link',
        d3
          .forceLink<Node, Link>()
          .id((d) => d.id)
          .distance(150),
      )
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(500))
      .force('center', d3.forceCenter(width / 2, height / 2));

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
      (enter) => enter.insert('line', ':first-child').classed('graph-link', true),
      (update) => update,
      (exit) => exit.remove(),
    );

    const node = g.selectAll<SVGCircleElement, Node>('circle').data(nodes, (d) => d.id);

    const imageSize = 30;
    node.join(
      (enter) => {
        const enterNode = enter.append('g');

        enterNode
          .append('image')
          .attr('xlink:href', (d) => d.image ?? '')
          .attr('x', -imageSize / 2)
          .attr('y', -imageSize / 2)
          .attr('height', imageSize)
          .attr('width', imageSize);

        enterNode
          .append('text')
          .raise()
          .text((d) => d.id)
          .attr('dy', imageSize / 2 + 10)
          .classed('graph-label', true);

        return enterNode;
      },
      (update) => update,
      (exit) => exit.remove(),
    );

    simulation.nodes(nodes).on('tick', () => {
      g.selectAll<SVGLineElement, Link>('line')
        .attr('x1', (d) => (typeof d.source === 'string' ? 0 : (d.source.x ?? 0)))
        .attr('y1', (d) => (typeof d.source === 'string' ? 0 : (d.source.y ?? 0)))
        .attr('x2', (d) => (typeof d.target === 'string' ? 0 : (d.target.x ?? 0)))
        .attr('y2', (d) => (typeof d.target === 'string' ? 0 : (d.target.y ?? 0)));

      g.selectAll<SVGCircleElement, Node>('g').attr('transform', (d) => `translate(${d.x},${d.y})`);
      // .attr('cx', (d) => d.x ?? 0)
      // .attr('cy', (d) => d.y ?? 0);
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
<div class="absolute top-0 left-0 p-4">
  <button onclick={fitGraph}>Fit Graph</button>
</div>
