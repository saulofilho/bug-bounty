import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Filter, 
  Layers, 
  ExternalLink, 
  Download, 
  FileCode, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Sparkles,
  X,
  Target,
  Globe,
  Shield,
  ArrowRight,
  Server
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { 
  AttackGraphNode, 
  AttackGraphLink, 
  AttackPathScenario, 
  STAGE_CONFIG, 
  AttackStage,
  NodeType,
  buildAttackGraphFromReports 
} from '../utils/attackGraphEngine';
import { getSeverityBadgeColor } from '../utils/formatters';

interface AttackGraphStudioProps {
  reports: VulnerabilityReport[];
  selectedReportId?: string;
  onSelectReport?: (report: VulnerabilityReport) => void;
}

export const AttackGraphStudio: React.FC<AttackGraphStudioProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout & View State
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 960, height: 600 });
  const [viewMode, setViewMode] = useState<'infrastructure-force' | 'staged'>('infrastructure-force');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedNodeType, setSelectedNodeType] = useState<string>('ALL');
  const [onlyLateralPaths, setOnlyLateralPaths] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<AttackGraphNode | null>(null);

  // Scenario Walkthrough State
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlayingScenario, setIsPlayingScenario] = useState<boolean>(false);

  // Zoom transform reference
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // 1. Build Graph Data from Reports (Connecting Reports, CVEs, Target Domains & Lateral Movement Pivots)
  const rawGraphData = useMemo(() => {
    return buildAttackGraphFromReports(reports);
  }, [reports]);

  // Unique target domains for filter
  const targetOptions = useMemo(() => {
    return Array.from(new Set(
      rawGraphData.nodes
        .filter(n => n.type === 'target_domain' && !n.isInternalInfrastructure)
        .map(n => n.targetDomain || n.target)
        .filter(Boolean)
    )) as string[];
  }, [rawGraphData]);

  // Filtered Graph Data
  const graphData = useMemo(() => {
    let filteredNodes = rawGraphData.nodes.map(n => ({ ...n }));

    // Target Domain filter
    if (selectedTarget !== 'ALL') {
      const associatedNodeIds = new Set<string>();
      associatedNodeIds.add('actor-external');

      // Find reports/domains matching selectedTarget
      rawGraphData.links.forEach(l => {
        const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        const sNode = rawGraphData.nodes.find(n => n.id === sId);
        const tNode = rawGraphData.nodes.find(n => n.id === tId);

        if ((sNode?.targetDomain === selectedTarget || sNode?.target === selectedTarget) ||
            (tNode?.targetDomain === selectedTarget || tNode?.target === selectedTarget)) {
          associatedNodeIds.add(sId);
          associatedNodeIds.add(tId);
        }
      });

      filteredNodes = filteredNodes.filter(n => associatedNodeIds.has(n.id) || n.type === 'threat_actor');
    }

    // Severity filter
    if (selectedSeverity !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'report' || n.type === 'vulnerability') {
          return n.severity === selectedSeverity;
        }
        return true;
      });
    }

    // Node Type filter
    if (selectedNodeType !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'threat_actor') return true;
        if (selectedNodeType === 'target_domain') return n.type === 'target_domain' || n.type === 'entry_point';
        if (selectedNodeType === 'report') return n.type === 'report' || n.type === 'vulnerability';
        if (selectedNodeType === 'cve') return n.type === 'cve';
        if (selectedNodeType === 'pivot') return n.type === 'pivot';
        if (selectedNodeType === 'crown_jewel') return n.type === 'crown_jewel';
        return true;
      });
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    let filteredLinks = rawGraphData.links
      .filter(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      })
      .map(l => ({ ...l }));

    // Lateral paths only filter
    if (onlyLateralPaths) {
      const lateralNodeIds = new Set<string>();
      filteredLinks.forEach(l => {
        if (l.isLateralMovement || l.linkType === 'lateral_movement' || l.linkType === 'exploits_cve' || l.linkType === 'privilege_escalation') {
          const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
          const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
          lateralNodeIds.add(sId);
          lateralNodeIds.add(tId);
        }
      });
      filteredNodes = filteredNodes.filter(n => lateralNodeIds.has(n.id));
      filteredLinks = filteredLinks.filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        return lateralNodeIds.has(sId) && lateralNodeIds.has(tId);
      });
    }

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      scenarios: rawGraphData.scenarios,
    };
  }, [rawGraphData, selectedTarget, selectedSeverity, selectedNodeType, onlyLateralPaths]);

  // Active scenario object
  const currentScenario = useMemo(() => {
    if (!activeScenarioId) return null;
    return graphData.scenarios.find(s => s.id === activeScenarioId) || null;
  }, [activeScenarioId, graphData.scenarios]);

  // Counts by entity type
  const entityCounts = useMemo(() => {
    return {
      domains: rawGraphData.nodes.filter(n => n.type === 'target_domain' || n.type === 'entry_point').length,
      reports: rawGraphData.nodes.filter(n => n.type === 'report' || n.type === 'vulnerability').length,
      cves: rawGraphData.nodes.filter(n => n.type === 'cve').length,
      pivots: rawGraphData.nodes.filter(n => n.type === 'pivot').length,
      objectives: rawGraphData.nodes.filter(n => n.type === 'crown_jewel').length,
      lateralLinks: rawGraphData.links.filter(l => l.isLateralMovement || l.linkType === 'lateral_movement').length,
    };
  }, [rawGraphData]);

  // 2. Responsive Container Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width: Math.max(width, 740),
            height: 600,
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 3. Scenario Autoplay Timer
  useEffect(() => {
    if (!isPlayingScenario || !currentScenario) return;

    const timer = setInterval(() => {
      setActiveStepIndex(prev => {
        if (prev >= currentScenario.nodeIds.length - 1) {
          setIsPlayingScenario(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, [isPlayingScenario, currentScenario]);

  // Keep selected node synced when stepping through scenario
  useEffect(() => {
    if (currentScenario && activeStepIndex >= 0 && activeStepIndex < currentScenario.nodeIds.length) {
      const activeNodeId = currentScenario.nodeIds[activeStepIndex];
      const targetNode = graphData.nodes.find(n => n.id === activeNodeId);
      if (targetNode) {
        setSelectedNode(targetNode);
      }
    }
  }, [currentScenario, activeStepIndex, graphData.nodes]);

  // Select initial scenario if none selected
  useEffect(() => {
    if (!activeScenarioId && graphData.scenarios.length > 0) {
      setActiveScenarioId(graphData.scenarios[0].id);
      setActiveStepIndex(0);
    }
  }, [graphData.scenarios, activeScenarioId]);

  // Select initial node if selectedReportId provided
  useEffect(() => {
    if (selectedReportId) {
      const matching = graphData.nodes.find(n => n.reportId === selectedReportId);
      if (matching) {
        setSelectedNode(matching);
      }
    }
  }, [selectedReportId, graphData.nodes]);

  // 4. Render D3 Force Simulation & Graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const { width, height } = dimensions;

    // Define defs (markers, glow filters, gradients)
    const defs = svg.append('defs');

    // Arrow markers for links
    defs.append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#475569');

    defs.append('marker')
      .attr('id', 'arrow-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#06b6d4');

    defs.append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#ef4444');

    defs.append('marker')
      .attr('id', 'arrow-lateral')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#818cf8');

    defs.append('marker')
      .attr('id', 'arrow-cve')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 30)
      .attr('refY', 0)
      .attr('markerWidth', 6.5)
      .attr('markerHeight', 6.5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#c084fc');

    // Radial Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Root Group for Zoom/Pan
    const g = svg.append('g').attr('class', 'main-stage');
    gRef.current = g.node();

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Stage Column Backgrounds (if in 'staged' mode)
    if (viewMode === 'staged') {
      const stageKeys: AttackStage[] = ['initial_entry', 'privilege_escalation', 'lateral_movement', 'final_objective'];
      const columnWidth = width / 4;

      stageKeys.forEach((stg, i) => {
        const conf = STAGE_CONFIG[stg];
        const colX = i * columnWidth;

        // Lane Rect
        g.append('rect')
          .attr('x', colX + 4)
          .attr('y', 10)
          .attr('width', columnWidth - 8)
          .attr('height', height - 20)
          .attr('rx', 12)
          .attr('fill', conf.bgColor)
          .attr('stroke', conf.borderColor)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4')
          .attr('opacity', 0.7);

        // Header Pill
        const headerG = g.append('g')
          .attr('transform', `translate(${colX + columnWidth / 2}, 28)`);

        headerG.append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', conf.color)
          .attr('font-size', '10px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .text(conf.label.toUpperCase());
      });
    }

    // Prepare Node and Link Copies for D3 mutation
    const nodes: AttackGraphNode[] = graphData.nodes.map(d => ({ ...d }));
    const links: AttackGraphLink[] = graphData.links.map(d => ({ ...d }));

    // Staged View: Initial placement in columns
    if (viewMode === 'staged') {
      const columnWidth = width / 4;
      const stageXMap: Record<AttackStage, number> = {
        initial_entry: columnWidth * 0.5,
        privilege_escalation: columnWidth * 1.5,
        lateral_movement: columnWidth * 2.5,
        final_objective: columnWidth * 3.5,
      };

      const stageCounts: Record<AttackStage, number> = {
        initial_entry: 0,
        privilege_escalation: 0,
        lateral_movement: 0,
        final_objective: 0,
      };

      nodes.forEach(node => {
        stageCounts[node.stage] += 1;
      });

      const stageCurrentIndex: Record<AttackStage, number> = {
        initial_entry: 0,
        privilege_escalation: 0,
        lateral_movement: 0,
        final_objective: 0,
      };

      nodes.forEach(node => {
        const count = stageCounts[node.stage];
        const idx = stageCurrentIndex[node.stage]++;
        const targetX = stageXMap[node.stage];
        const stepY = (height - 120) / (count + 1);
        const targetY = 70 + (idx + 1) * stepY;

        node.x = targetX;
        node.y = targetY;
        node.fx = targetX; // Lock X coordinate in staged mode
      });
    }

    // Force Simulation Setup
    const simulation = d3.forceSimulation<AttackGraphNode>(nodes)
      .force('link', d3.forceLink<AttackGraphNode, AttackGraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          if (viewMode === 'staged') return (width / 4) * 0.85;
          if (d.isLateralMovement || d.linkType === 'lateral_movement') return 160;
          if (d.linkType === 'exploits_cve') return 85;
          if (d.linkType === 'targets') return 120;
          return 105;
        })
      )
      .force('charge', d3.forceManyBody<AttackGraphNode>().strength(d => {
        if (viewMode === 'staged') return -220;
        if (d.type === 'target_domain') return -420;
        if (d.type === 'crown_jewel') return -480;
        if (d.type === 'cve') return -280;
        return -350;
      }))
      .force('collide', d3.forceCollide<AttackGraphNode>().radius(d => {
        if (d.type === 'target_domain') return 46;
        if (d.type === 'crown_jewel') return 44;
        if (d.type === 'cve') return 34;
        return 38;
      }))
      .force('y', d3.forceY(height / 2).strength(viewMode === 'staged' ? 0.08 : 0.05));

    if (viewMode === 'infrastructure-force') {
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.force('x', d3.forceX<AttackGraphNode>(d => {
        // Soft horizontal clustering by attack stage
        if (d.stage === 'initial_entry') return width * 0.22;
        if (d.stage === 'privilege_escalation') return width * 0.44;
        if (d.stage === 'lateral_movement') return width * 0.68;
        return width * 0.86;
      }).strength(0.08));
    }

    // Active path nodes & links determination
    const activePathNodeIds = new Set<string>();
    const activePathLinkIds = new Set<string>();

    if (currentScenario) {
      currentScenario.nodeIds.forEach(id => activePathNodeIds.add(id));
      for (let i = 0; i < currentScenario.nodeIds.length - 1; i++) {
        const s = currentScenario.nodeIds[i];
        const t = currentScenario.nodeIds[i + 1];
        links.forEach(l => {
          const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
          const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
          if ((sId === s && tId === t) || (sId === t && tId === s)) {
            activePathLinkIds.add(l.id);
          }
        });
      }
    }

    // Links Rendering
    const linkGroup = g.append('g').attr('class', 'links');
    const linkElements = linkGroup.selectAll<SVGLineElement, AttackGraphLink>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (activePathLinkIds.has(d.id)) {
          if (d.isLateralMovement || d.linkType === 'lateral_movement') return '#818cf8';
          if (d.riskLevel === 'CRITICAL') return '#ef4444';
          return '#06b6d4';
        }
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return '#6366f1';
        if (d.linkType === 'exploits_cve') return '#a855f7';
        if (d.riskLevel === 'CRITICAL') return '#991b1b';
        return '#334155';
      })
      .attr('stroke-width', d => {
        if (activePathLinkIds.has(d.id)) return 2.8;
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return 2.2;
        return 1.4;
      })
      .attr('stroke-dasharray', d => {
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return '6,4';
        if (activePathLinkIds.has(d.id)) return '4,4';
        return 'none';
      })
      .attr('marker-end', d => {
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return 'url(#arrow-lateral)';
        if (d.linkType === 'exploits_cve') return 'url(#arrow-cve)';
        if (activePathLinkIds.has(d.id)) {
          return d.riskLevel === 'CRITICAL' ? 'url(#arrow-critical)' : 'url(#arrow-active)';
        }
        return 'url(#arrow-default)';
      })
      .attr('opacity', d => {
        if (currentScenario && !activePathLinkIds.has(d.id)) {
          return 0.2;
        }
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return 0.95;
        return 0.75;
      });

    // Link Labels (Hover / Active)
    const linkLabels = linkGroup.selectAll<SVGTextElement, AttackGraphLink>('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', d => {
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return '#c7d2fe';
        if (activePathLinkIds.has(d.id)) return '#94a3b8';
        return '#64748b';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .text(d => {
        if (activePathLinkIds.has(d.id)) return d.label;
        if (d.isLateralMovement || d.linkType === 'lateral_movement') return '➔ Salto Lateral';
        return '';
      })
      .attr('opacity', d => (activePathLinkIds.has(d.id) || d.isLateralMovement) ? 0.9 : 0);

    // Nodes Rendering
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup.selectAll<SVGGElement, AttackGraphNode>('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, AttackGraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          if (viewMode === 'staged') {
            d.fy = event.y;
          } else {
            d.fx = event.x;
            d.fy = event.y;
          }
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          if (viewMode === 'infrastructure-force') {
            d.fx = null;
            d.fy = null;
          }
        })
      );

    // Node outer pulsing halo for choke points or active step
    nodeElements.append('circle')
      .attr('r', d => {
        if (d.type === 'crown_jewel') return 29;
        if (d.type === 'target_domain') return 27;
        if (d.type === 'cve') return 22;
        return 24;
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (currentScenario && activeStepIndex >= 0 && currentScenario.nodeIds[activeStepIndex] === d.id) {
          return '#38bdf8';
        }
        if (d.type === 'target_domain' && d.isInternalInfrastructure) return '#818cf8';
        if (d.type === 'cve') return '#c084fc';
        if (d.chokePoint) return '#ef4444';
        return 'transparent';
      })
      .attr('stroke-width', d => (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) ? 3 : 1.5)
      .attr('stroke-dasharray', d => d.chokePoint ? '3,3' : 'none')
      .attr('opacity', 0.85)
      .attr('filter', d => (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) ? 'url(#glow)' : null);

    // Main Node Shapes: Rounded Rect for Target Domains and CVEs, Circle for others
    nodeElements.each(function(d) {
      const el = d3.select(this);

      if (d.type === 'target_domain' || d.type === 'entry_point') {
        // Hexagon/Pill for Target Domains
        const isInternal = d.isInternalInfrastructure;
        el.append('rect')
          .attr('x', -24)
          .attr('y', -24)
          .attr('width', 48)
          .attr('height', 48)
          .attr('rx', 12)
          .attr('fill', isInternal ? '#1e1b4b' : '#0c2340')
          .attr('stroke', isInternal ? '#818cf8' : '#38bdf8')
          .attr('stroke-width', d.id === selectedNode?.id ? 2.5 : 1.8)
          .attr('opacity', (currentScenario && !activePathNodeIds.has(d.id)) ? 0.35 : 1);
      } else if (d.type === 'cve') {
        // Diamond / Rounded Box for CVEs
        el.append('rect')
          .attr('x', -18)
          .attr('y', -18)
          .attr('width', 36)
          .attr('height', 36)
          .attr('rx', 8)
          .attr('fill', '#2e1065')
          .attr('stroke', '#a855f7')
          .attr('stroke-width', d.id === selectedNode?.id ? 2.5 : 1.6)
          .attr('opacity', (currentScenario && !activePathNodeIds.has(d.id)) ? 0.35 : 1);
      } else {
        // Circle for Reports, Pivots, Threat Actors, Crown Jewels
        el.append('circle')
          .attr('r', () => {
            if (d.type === 'threat_actor') return 20;
            if (d.type === 'crown_jewel') return 25;
            if (d.type === 'report' || d.type === 'vulnerability') return 22;
            if (d.type === 'pivot') return 21;
            return 19;
          })
          .attr('fill', () => {
            if (d.type === 'threat_actor') return '#1e293b';
            if (d.type === 'crown_jewel') return '#450a0a';
            if (d.type === 'report' || d.type === 'vulnerability') {
              if (d.severity === 'CRITICAL') return '#450a0a';
              if (d.severity === 'HIGH') return '#3b2111';
              return '#172554';
            }
            if (d.type === 'pivot') return '#1e1b4b';
            return '#0f172a';
          })
          .attr('stroke', () => {
            if (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) return '#38bdf8';
            if (d.id === selectedNode?.id) return '#ffffff';
            if (d.type === 'crown_jewel') return '#ef4444';
            if (d.severity === 'CRITICAL') return '#f87171';
            if (d.severity === 'HIGH') return '#fb923c';
            if (d.type === 'pivot') return '#818cf8';
            if (d.type === 'threat_actor') return '#94a3b8';
            return '#38bdf8';
          })
          .attr('stroke-width', (d.id === selectedNode?.id || (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id)) ? 2.5 : 1.6)
          .attr('opacity', (currentScenario && !activePathNodeIds.has(d.id)) ? 0.35 : 1);
      }
    });

    // Node Icon / Glyph Text
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => d.type === 'cve' ? '9px' : '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('fill', d => {
        if (d.type === 'crown_jewel') return '#fca5a5';
        if (d.type === 'cve') return '#e9d5ff';
        if (d.type === 'target_domain') return d.isInternalInfrastructure ? '#c7d2fe' : '#7dd3fc';
        if (d.severity === 'CRITICAL') return '#fca5a5';
        if (d.severity === 'HIGH') return '#fdba74';
        if (d.type === 'pivot') return '#c7d2fe';
        if (d.type === 'threat_actor') return '#e2e8f0';
        return '#7dd3fc';
      })
      .text(d => {
        if (d.type === 'threat_actor') return '👤';
        if (d.type === 'crown_jewel') return '👑';
        if (d.type === 'pivot') return '⚡';
        if (d.type === 'target_domain' || d.type === 'entry_point') {
          return d.isInternalInfrastructure ? '🏢' : '🌐';
        }
        if (d.type === 'cve') return 'CVE';
        if (d.cvssScore) return d.cvssScore.toFixed(1);
        return '⚠️';
      });

    // Node Primary Label (Below node)
    nodeElements.append('text')
      .attr('dy', d => {
        if (d.type === 'target_domain') return 34;
        if (d.type === 'crown_jewel') return 36;
        if (d.type === 'cve') return 28;
        return 30;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', d => d.id === selectedNode?.id ? '#ffffff' : '#cbd5e1')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .text(d => {
        if (d.type === 'cve') return d.cveId || d.label;
        if (d.label.length > 22) return d.label.substring(0, 20) + '…';
        return d.label;
      })
      .attr('opacity', d => (currentScenario && !activePathNodeIds.has(d.id)) ? 0.4 : 1);

    // Node Subtitle / Classification (Type / Zone)
    nodeElements.append('text')
      .attr('dy', d => {
        if (d.type === 'target_domain') return 46;
        if (d.type === 'crown_jewel') return 48;
        if (d.type === 'cve') return 40;
        return 42;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', d => {
        if (d.type === 'cve') return '#c084fc';
        if (d.type === 'target_domain') return d.isInternalInfrastructure ? '#818cf8' : '#38bdf8';
        if (d.type === 'pivot') return '#a5b4fc';
        return '#94a3b8';
      })
      .attr('font-family', 'monospace')
      .text(d => {
        if (d.type === 'cve') return `EPSS ${( (d.epssScore || 0.7) * 100).toFixed(0)}%`;
        if (d.type === 'target_domain') return d.isInternalInfrastructure ? 'VPC Interna' : 'Perímetro Web';
        if (d.reportId) return d.reportId;
        if (d.type === 'crown_jewel') return 'Crown Jewel';
        if (d.type === 'pivot') return 'Salto Lateral';
        if (d.type === 'threat_actor') return 'Atacante';
        return '';
      })
      .attr('opacity', d => (currentScenario && !activePathNodeIds.has(d.id)) ? 0.3 : 0.9);

    // Click handler on nodes
    nodeElements.on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    // Simulation Tick Update
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as AttackGraphNode).x || 0)
        .attr('y1', d => (d.source as AttackGraphNode).y || 0)
        .attr('x2', d => (d.target as AttackGraphNode).x || 0)
        .attr('y2', d => (d.target as AttackGraphNode).y || 0);

      linkLabels
        .attr('x', d => (((d.source as AttackGraphNode).x || 0) + ((d.target as AttackGraphNode).x || 0)) / 2)
        .attr('y', d => (((d.source as AttackGraphNode).y || 0) + ((d.target as AttackGraphNode).y || 0)) / 2);

      nodeElements
        .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [dimensions, graphData, viewMode, selectedNode, currentScenario, activeStepIndex]);

  // Zoom control helpers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.25);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Export graph as SVG
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack-graph-infrastructure-${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Topology as JSON
  const handleExportJson = () => {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      reportCount: reports.length,
      infrastructureTopology: {
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          label: n.label,
          stage: n.stage,
          type: n.type,
          severity: n.severity,
          cvssScore: n.cvssScore,
          cveId: n.cveId,
          targetDomain: n.targetDomain,
          isInternalInfrastructure: n.isInternalInfrastructure,
          networkZone: n.networkZone,
          mitreTactic: n.mitreTactic,
          mitreTechnique: n.mitreTechnique
        })),
        links: graphData.links.map(l => ({
          id: l.id,
          source: typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source,
          target: typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target,
          label: l.label,
          linkType: l.linkType,
          isLateralMovement: l.isLateralMovement,
          riskLevel: l.riskLevel
        })),
        scenarios: graphData.scenarios
      }
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack-graph-infrastructure-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Direct neighboring connections for selected node
  const nodeConnections = useMemo(() => {
    if (!selectedNode) return { inbound: [], outbound: [] };

    const inbound = graphData.links
      .filter(l => {
        const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        return tId === selectedNode.id;
      })
      .map(l => {
        const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        return {
          node: graphData.nodes.find(n => n.id === sId),
          link: l
        };
      })
      .filter(item => Boolean(item.node));

    const outbound = graphData.links
      .filter(l => {
        const sId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        return sId === selectedNode.id;
      })
      .map(l => {
        const tId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        return {
          node: graphData.nodes.find(n => n.id === tId),
          link: l
        };
      })
      .filter(item => Boolean(item.node));

    return { inbound, outbound };
  }, [selectedNode, graphData]);

  return (
    <div className="space-y-5" ref={containerRef}>
      {/* Top Header Card */}
      <div className="bg-[#14141c] border border-[#232330] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" />
                <span>D3.js Force-Directed Lateral Movement Graph</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Reports, CVEs & Target Domains</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Topologia de Infraestrutura & Movimentação Lateral</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Mapeamento de relações entre <strong>Domínios Alvo</strong> (perímetro e VPC interna), <strong>Relatórios de Vulnerabilidade</strong>, <strong>CVEs</strong> e <strong>Pontos de Salto Lateral</strong> para simular o comprometimento de infraestrutura até os <strong>Crown Jewels</strong>.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[85px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Domínios</span>
              <span className="text-base font-bold font-mono text-sky-400">{entityCounts.domains}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[85px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Relatórios</span>
              <span className="text-base font-bold font-mono text-amber-400">{entityCounts.reports}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[85px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">CVEs</span>
              <span className="text-base font-bold font-mono text-purple-400">{entityCounts.cves}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[85px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Saltos Laterais</span>
              <span className="text-base font-bold font-mono text-indigo-400">{entityCounts.lateralLinks}</span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Controls */}
        <div className="mt-4 pt-4 border-t border-[#232330] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-[#1a1a24] p-1 border border-[#2c2c3e]">
              <button
                onClick={() => setViewMode('infrastructure-force')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'infrastructure-force' 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Grafo de Força D3.js</span>
              </button>
              <button
                onClick={() => setViewMode('staged')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'staged' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Colunas Kill Chain</span>
              </button>
            </div>

            {/* Entity Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#1a1a24] border border-[#2c2c3e] rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Entidade:</span>
              <select
                value={selectedNodeType}
                onChange={e => setSelectedNodeType(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181822]">Todas as Entidades ({rawGraphData.nodes.length})</option>
                <option value="target_domain" className="bg-[#181822]">Domínios Alvo ({entityCounts.domains})</option>
                <option value="report" className="bg-[#181822]">Relatórios ({entityCounts.reports})</option>
                <option value="cve" className="bg-[#181822]">CVEs ({entityCounts.cves})</option>
                <option value="pivot" className="bg-[#181822]">Saltos Laterais ({entityCounts.pivots})</option>
                <option value="crown_jewel" className="bg-[#181822]">Crown Jewels ({entityCounts.objectives})</option>
              </select>
            </div>

            {/* Target Domain Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#1a1a24] border border-[#2c2c3e] rounded-xl px-2.5 py-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Domínio:</span>
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181822]">Todos os Domínios ({targetOptions.length})</option>
                {targetOptions.map(t => (
                  <option key={t} value={t} className="bg-[#181822]">{t}</option>
                ))}
              </select>
            </div>

            {/* Only Lateral Paths Button */}
            <button
              onClick={() => setOnlyLateralPaths(!onlyLateralPaths)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                onlyLateralPaths
                  ? 'bg-indigo-500/25 border border-indigo-500/50 text-indigo-300 font-bold'
                  : 'bg-[#1a1a24] border border-[#2c2c3e] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Apenas Movimentação Lateral</span>
            </button>
          </div>

          {/* Action Tools: Zoom & Export */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomIn}
              title="Aumentar Zoom"
              className="p-1.5 rounded-lg bg-[#1a1a24] border border-[#2c2c3e] text-zinc-300 hover:text-white hover:bg-[#252536] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Diminuir Zoom"
              className="p-1.5 rounded-lg bg-[#1a1a24] border border-[#2c2c3e] text-zinc-300 hover:text-white hover:bg-[#252536] transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Centralizar e Redefinir Vista"
              className="p-1.5 rounded-lg bg-[#1a1a24] border border-[#2c2c3e] text-zinc-300 hover:text-white hover:bg-[#252536] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-zinc-700 mx-1" />
            <button
              onClick={handleExportSvg}
              title="Exportar Imagem Vetorial SVG"
              className="px-2.5 py-1.5 rounded-lg bg-[#1a1a24] border border-[#2c2c3e] text-zinc-300 hover:text-white hover:bg-[#252536] text-xs font-mono font-medium transition-colors flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>SVG</span>
            </button>
            <button
              onClick={handleExportJson}
              title="Exportar Topologia em JSON"
              className="px-2.5 py-1.5 rounded-lg bg-[#1a1a24] border border-[#2c2c3e] text-zinc-300 hover:text-white hover:bg-[#252536] text-xs font-mono font-medium transition-colors flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Walkthrough Player Bar */}
      {graphData.scenarios.length > 0 && (
        <div className="bg-[#121218] border border-[#232332] rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400">Simulador de Movimentação Lateral:</span>
                <select
                  value={activeScenarioId || ''}
                  onChange={e => {
                    setActiveScenarioId(e.target.value);
                    setActiveStepIndex(0);
                    setIsPlayingScenario(false);
                  }}
                  className="bg-[#1b1b26] border border-[#2c2c3e] text-white font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                >
                  {graphData.scenarios.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentScenario?.lateralSummary || currentScenario?.description || 'Selecione um cenário para inspecionar os saltos passo a passo.'}
              </p>
            </div>
          </div>

          {/* Stepper Controls */}
          {currentScenario && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsPlayingScenario(!isPlayingScenario)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                  isPlayingScenario
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30'
                }`}
              >
                {isPlayingScenario ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlayingScenario ? 'Pausar' : 'Reproduzir'}</span>
              </button>

              <button
                onClick={() => {
                  setIsPlayingScenario(false);
                  setActiveStepIndex(prev => Math.max(0, prev - 1));
                }}
                disabled={activeStepIndex === 0}
                className="px-2.5 py-1.5 rounded-xl bg-[#1b1b26] border border-[#2c2c3e] text-zinc-300 hover:text-white disabled:opacity-30 text-xs font-mono transition-colors"
              >
                Anterior
              </button>

              <span className="text-xs font-mono text-zinc-400 px-1">
                <strong className="text-indigo-400">{activeStepIndex + 1}</strong> / {currentScenario.nodeIds.length}
              </span>

              <button
                onClick={() => {
                  setIsPlayingScenario(false);
                  setActiveStepIndex(prev => Math.min(currentScenario.nodeIds.length - 1, prev + 1));
                }}
                disabled={activeStepIndex >= currentScenario.nodeIds.length - 1}
                className="px-2.5 py-1.5 rounded-xl bg-[#1b1b26] border border-[#2c2c3e] text-zinc-300 hover:text-white disabled:opacity-30 text-xs font-mono transition-colors"
              >
                Próximo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Stage & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* D3 Graph Canvas */}
        <div className="lg:col-span-8 bg-[#0e0e14] border border-[#20202c] rounded-2xl overflow-hidden shadow-2xl relative min-h-[580px] flex flex-col">
          {/* Stage watermark & instruction badge */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-400 backdrop-blur-md">
              🌐 Domínio ➔ 📄 Relatório ➔ 🛡️ CVE ➔ ⚡ Pivot ➔ 🏢 Infra Interna ➔ 👑 Crown Jewels
            </span>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-[580px] cursor-grab active:cursor-grabbing block"
            style={{ background: 'radial-gradient(ellipse at center, #131320 0%, #08080c 100%)' }}
          />

          {/* Bottom Stage Legend */}
          <div className="border-t border-[#1c1c28] bg-[#111118]/85 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-zinc-500 font-mono text-[10px] uppercase">Entidades:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
                <span className="text-zinc-300">Domínio Alvo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-zinc-300">Relatório</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                <span className="text-zinc-300">CVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                <span className="text-zinc-300">Salto Lateral (Pivot)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span className="text-zinc-300">Crown Jewel</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-indigo-400 font-mono text-[10px]">
                <span className="w-3 h-0.5 border-b border-indigo-400 border-dashed inline-block" />
                Salto Lateral (Pivoting)
              </span>
              <span className="flex items-center gap-1 text-red-400 font-mono text-[10px]">
                <span className="w-2 h-2 rounded-full border border-red-500 border-dashed inline-block" />
                Choke Point
              </span>
            </div>
          </div>
        </div>

        {/* Node Inspector & Threat Intelligence Panel */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="bg-[#14141d] border border-[#272738] rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[#252538] pb-3.5">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${STAGE_CONFIG[selectedNode.stage].badgeBg}`}>
                      {STAGE_CONFIG[selectedNode.stage].label}
                    </span>
                    {selectedNode.type === 'target_domain' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                        {selectedNode.isInternalInfrastructure ? 'Infra Interna (VPC)' : 'Perímetro Externo'}
                      </span>
                    )}
                    {selectedNode.type === 'cve' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        NVD / NIST CVE
                      </span>
                    )}
                    {selectedNode.chokePoint && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                        Choke Point
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedNode.label}
                  </h3>
                  {selectedNode.sublabel && (
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      {selectedNode.sublabel}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg hover:bg-[#20202e]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Network / Infrastructure Coordinates */}
              {(selectedNode.ipAddress || selectedNode.networkZone || selectedNode.targetDomain) && (
                <div className="bg-[#181824] border border-[#29293b] rounded-xl p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Zona de Rede:</span>
                    <span className="text-sky-300 font-bold">{selectedNode.networkZone || 'Perímetro Web'}</span>
                  </div>
                  {selectedNode.ipAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Endereço IP:</span>
                      <span className="text-zinc-200">{selectedNode.ipAddress}</span>
                    </div>
                  )}
                  {selectedNode.targetDomain && (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Host / Domínio:</span>
                      <span className="text-cyan-400 truncate max-w-[190px]">{selectedNode.targetDomain}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CVE Specific Intelligence if applicable */}
              {selectedNode.type === 'cve' && (
                <div className="bg-[#1e1430] border border-[#3d2460] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-purple-300 font-bold">Identificador CVE:</span>
                    <span className="font-mono text-white font-black bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
                      {selectedNode.cveId || selectedNode.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center pt-1">
                    <div className="p-2 bg-[#261740] rounded-lg border border-[#3e2764]">
                      <span className="text-[10px] font-mono text-zinc-400 block">CVSS Score</span>
                      <span className="text-sm font-bold font-mono text-rose-400">{selectedNode.cvssScore?.toFixed(1) || '8.5'}</span>
                    </div>
                    <div className="p-2 bg-[#261740] rounded-lg border border-[#3e2764]">
                      <span className="text-[10px] font-mono text-zinc-400 block">Probabilidade EPSS</span>
                      <span className="text-sm font-bold font-mono text-purple-300">
                        {((selectedNode.epssScore || 0.72) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Vulnerability Report Metadata if applicable */}
              {selectedNode.report && (
                <div className="bg-[#1a1a26] border border-[#2b2b3d] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-400">Severidade & Score:</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${getSeverityBadgeColor(selectedNode.report.severity)}`}>
                        {selectedNode.report.severity}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        CVSS {selectedNode.report.cvssScore}
                      </span>
                    </div>
                  </div>

                  {selectedNode.report.cwe && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-400">CWE Taxonomia:</span>
                      <span className="font-mono text-indigo-400 text-[11px] truncate max-w-[200px]" title={selectedNode.report.cwe}>
                        {selectedNode.report.cwe}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* MITRE ATT&CK Mapping */}
              {(selectedNode.mitreTactic || selectedNode.mitreTechnique) && (
                <div className="bg-[#171722] border border-[#262638] rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                    Mapeamento MITRE ATT&CK
                  </span>
                  {selectedNode.mitreTactic && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Tática:</span>
                      <span className="font-mono text-zinc-200 font-semibold">{selectedNode.mitreTactic}</span>
                    </div>
                  )}
                  {selectedNode.mitreTechnique && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Técnica:</span>
                      <span className="font-mono text-amber-300 font-semibold">{selectedNode.mitreTechnique}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description & Impact */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Mecânica de Ameaça & Descrição
                </span>
                <p className="text-zinc-300 leading-relaxed bg-[#111118] p-3 rounded-xl border border-[#20202c]">
                  {selectedNode.description}
                </p>
              </div>

              {/* Connected Lateral Hops & Blast Radius */}
              {(nodeConnections.inbound.length > 0 || nodeConnections.outbound.length > 0) && (
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                    Caminhos & Vizinhos Conectados ({nodeConnections.inbound.length + nodeConnections.outbound.length})
                  </span>
                  
                  {nodeConnections.inbound.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500">Origem / Entrada:</span>
                      {nodeConnections.inbound.map(({ node, link }) => (
                        <div
                          key={`in-${node?.id}`}
                          onClick={() => node && setSelectedNode(node)}
                          className="p-2 rounded-lg bg-[#181826] border border-[#2a2a3e] hover:border-indigo-500/50 cursor-pointer flex items-center justify-between gap-1 text-[11px]"
                        >
                          <span className="text-zinc-300 truncate max-w-[180px]">{node?.label}</span>
                          <span className="text-[9px] font-mono text-cyan-400">{link.label.slice(0, 16)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {nodeConnections.outbound.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500">Próximo Salto Lateral / Alvo:</span>
                      {nodeConnections.outbound.map(({ node, link }) => (
                        <div
                          key={`out-${node?.id}`}
                          onClick={() => node && setSelectedNode(node)}
                          className="p-2 rounded-lg bg-[#181826] border border-[#2a2a3e] hover:border-indigo-500/50 cursor-pointer flex items-center justify-between gap-1 text-[11px]"
                        >
                          <span className="text-zinc-300 truncate max-w-[180px]">{node?.label}</span>
                          <span className="text-[9px] font-mono text-indigo-300">{link.label.slice(0, 16)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Link to Full Report if available */}
              {selectedNode.report && onSelectReport && (
                <button
                  onClick={() => onSelectReport(selectedNode.report!)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Abrir Relatório Completo ({selectedNode.report.id})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#14141d] border border-[#272738] rounded-2xl p-6 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Inspetor de Infraestrutura & Pivoting</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Clique em qualquer <strong>Domínio Alvo</strong>, <strong>Relatório</strong>, <strong>CVE</strong> ou <strong>Ponto de Salto</strong> no grafo para inspecionar conexões adjacentes, zonas de rede e técnicas MITRE ATT&CK.
                </p>
              </div>

              {/* Quick Summary of Choke Points */}
              <div className="border-t border-[#232332] pt-4 text-left space-y-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                  Pontos de Estrangulamento (Choke Points):
                </span>
                <div className="space-y-1.5">
                  {graphData.nodes.filter(n => n.chokePoint).slice(0, 4).map(cp => (
                    <div
                      key={cp.id}
                      onClick={() => setSelectedNode(cp)}
                      className="p-2.5 rounded-xl bg-[#1a1a26] border border-[#2a2a3c] hover:border-red-500/50 cursor-pointer transition-all flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{cp.label}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{cp.sublabel || STAGE_CONFIG[cp.stage].label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Kill Chain Stage Guide Card */}
          <div className="bg-[#121218] border border-[#20202c] rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Conexão: Domínios ➔ Relatórios ➔ CVEs ➔ Movimentação Lateral</span>
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O grafo de força demonstra como o adversário não para no perímetro: a exploração de um relatório mapeado para uma CVE permite obter credenciais e efetuar <strong>saltos laterais na VPC interna</strong> (como acesso ao IMDSv1 na AWS ou tokens de microsserviço), alcançando ativos corporativos isolados da Internet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
