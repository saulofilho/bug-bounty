import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Layers, 
  ShieldAlert, 
  ArrowRight, 
  Key, 
  Server, 
  Database, 
  Flame, 
  ExternalLink, 
  Download, 
  FileCode, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight,
  Crosshair,
  Sparkles,
  Share2,
  X,
  Target
} from 'lucide-react';
import { VulnerabilityReport, Severity } from '../types';
import { 
  AttackGraphNode, 
  AttackGraphLink, 
  AttackPathScenario, 
  STAGE_CONFIG, 
  AttackStage,
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
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 960, height: 560 });
  const [viewMode, setViewMode] = useState<'staged' | 'force'>('staged');
  const [selectedTarget, setSelectedTarget] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedNode, setSelectedNode] = useState<AttackGraphNode | null>(null);

  // Scenario Walkthrough State
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlayingScenario, setIsPlayingScenario] = useState<boolean>(false);

  // Zoom transform reference
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  // 1. Build Graph Data from Reports
  const rawGraphData = useMemo(() => {
    return buildAttackGraphFromReports(reports);
  }, [reports]);

  // Available unique targets for filter
  const targetOptions = useMemo(() => {
    return Array.from(new Set(reports.map(r => r.target).filter(Boolean)));
  }, [reports]);

  // Filtered Graph Data
  const graphData = useMemo(() => {
    let filteredNodes = rawGraphData.nodes.map(n => ({ ...n }));

    if (selectedTarget !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'threat_actor') return true;
        if (n.target) return n.target === selectedTarget;
        return true;
      });
    }

    if (selectedSeverity !== 'ALL') {
      filteredNodes = filteredNodes.filter(n => {
        if (n.type === 'vulnerability') {
          return n.severity === selectedSeverity;
        }
        return true;
      });
    }

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = rawGraphData.links
      .filter(l => {
        const sourceId = typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source;
        const targetId = typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      })
      .map(l => ({ ...l }));

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      scenarios: rawGraphData.scenarios,
    };
  }, [rawGraphData, selectedTarget, selectedSeverity]);

  // Active scenario object
  const currentScenario = useMemo(() => {
    if (!activeScenarioId) return null;
    return graphData.scenarios.find(s => s.id === activeScenarioId) || null;
  }, [activeScenarioId, graphData.scenarios]);

  // 2. Responsive Container Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width: Math.max(width, 700),
            height: 580,
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
      .attr('refX', 28)
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
      .attr('refX', 28)
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
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#ef4444');

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
      .scaleExtent([0.4, 2.5])
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
          .attr('opacity', 0.8);

        // Header Pill
        const headerG = g.append('g')
          .attr('transform', `translate(${colX + columnWidth / 2}, 28)`);

        headerG.append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', conf.color)
          .attr('font-size', '11px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .text(conf.label.toUpperCase());
      });
    }

    // Prepare Node Positions
    const nodes: AttackGraphNode[] = graphData.nodes.map(d => ({ ...d }));
    const links: AttackGraphLink[] = graphData.links.map(d => ({ ...d }));

    // Compute stage column X positions
    const columnWidth = width / 4;
    const stageXMap: Record<AttackStage, number> = {
      initial_entry: columnWidth * 0.5,
      privilege_escalation: columnWidth * 1.5,
      lateral_movement: columnWidth * 2.5,
      final_objective: columnWidth * 3.5,
    };

    // Staged View: Initial placement in columns with jitter
    if (viewMode === 'staged') {
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
        node.fx = targetX; // Lock X coordinate to enforce Kill Chain lanes
      });
    }

    // Force Simulation Setup
    const simulation = d3.forceSimulation<AttackGraphNode>(nodes)
      .force('link', d3.forceLink<AttackGraphNode, AttackGraphLink>(links)
        .id(d => d.id)
        .distance(viewMode === 'staged' ? columnWidth * 0.9 : 110)
      )
      .force('charge', d3.forceManyBody().strength(viewMode === 'staged' ? -180 : -350))
      .force('collide', d3.forceCollide<AttackGraphNode>().radius(42))
      .force('y', d3.forceY(height / 2).strength(viewMode === 'staged' ? 0.08 : 0.05));

    if (viewMode === 'force') {
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.force('x', d3.forceX(width / 2).strength(0.04));
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
          return d.riskLevel === 'CRITICAL' ? '#ef4444' : '#06b6d4';
        }
        return '#334155';
      })
      .attr('stroke-width', d => activePathLinkIds.has(d.id) ? 2.5 : 1.2)
      .attr('stroke-dasharray', d => activePathLinkIds.has(d.id) ? '4,4' : 'none')
      .attr('marker-end', d => {
        if (activePathLinkIds.has(d.id)) {
          return d.riskLevel === 'CRITICAL' ? 'url(#arrow-critical)' : 'url(#arrow-active)';
        }
        return 'url(#arrow-default)';
      })
      .attr('opacity', d => {
        if (currentScenario && !activePathLinkIds.has(d.id)) {
          return 0.25;
        }
        return 0.8;
      });

    // Link Labels (Hover / Active)
    const linkLabels = linkGroup.selectAll<SVGTextElement, AttackGraphLink>('text')
      .data(links)
      .enter()
      .append('text')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', d => activePathLinkIds.has(d.id) ? '#94a3b8' : '#64748b')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .text(d => activePathLinkIds.has(d.id) ? d.label : '')
      .attr('opacity', d => activePathLinkIds.has(d.id) ? 0.9 : 0);

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
            // Keep constrained horizontally, allow vertical repositioning
            d.fy = event.y;
          } else {
            d.fx = event.x;
            d.fy = event.y;
          }
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          if (viewMode === 'force') {
            d.fx = null;
            d.fy = null;
          }
        })
      );

    // Node outer pulsing halo for choke points or active step
    nodeElements.append('circle')
      .attr('r', d => d.type === 'crown_jewel' ? 28 : 22)
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (currentScenario && activeStepIndex >= 0 && currentScenario.nodeIds[activeStepIndex] === d.id) {
          return '#06b6d4';
        }
        if (d.chokePoint) return '#ef4444';
        return 'transparent';
      })
      .attr('stroke-width', d => (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) ? 3 : 1.5)
      .attr('stroke-dasharray', d => d.chokePoint ? '3,3' : 'none')
      .attr('opacity', 0.8)
      .attr('filter', d => (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) ? 'url(#glow)' : null);

    // Main Node Circle
    nodeElements.append('circle')
      .attr('r', d => {
        if (d.type === 'threat_actor') return 20;
        if (d.type === 'crown_jewel') return 24;
        if (d.type === 'vulnerability') return 21;
        return 18;
      })
      .attr('fill', d => {
        if (d.type === 'threat_actor') return '#1e293b';
        if (d.type === 'crown_jewel') return '#450a0a';
        if (d.type === 'vulnerability') {
          if (d.severity === 'CRITICAL') return '#3f1515';
          if (d.severity === 'HIGH') return '#3b2111';
          return '#182736';
        }
        if (d.type === 'pivot') return '#1e1b4b';
        return '#0f172a';
      })
      .attr('stroke', d => {
        if (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id) {
          return '#38bdf8';
        }
        if (d.id === selectedNode?.id) {
          return '#ffffff';
        }
        if (d.type === 'crown_jewel') return '#ef4444';
        if (d.severity === 'CRITICAL') return '#f87171';
        if (d.severity === 'HIGH') return '#fb923c';
        if (d.type === 'pivot') return '#818cf8';
        if (d.type === 'threat_actor') return '#94a3b8';
        return '#38bdf8';
      })
      .attr('stroke-width', d => (d.id === selectedNode?.id || (currentScenario && currentScenario.nodeIds[activeStepIndex] === d.id)) ? 2.5 : 1.5)
      .attr('opacity', d => {
        if (currentScenario && !activePathNodeIds.has(d.id)) {
          return 0.35;
        }
        return 1;
      });

    // Node glyph / icon text
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .attr('fill', d => {
        if (d.type === 'crown_jewel') return '#fca5a5';
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
        if (d.type === 'entry_point') return '🌐';
        if (d.cvssScore) return d.cvssScore.toFixed(1);
        return '⚠️';
      });

    // Node Label Text Below
    nodeElements.append('text')
      .attr('dy', d => d.type === 'crown_jewel' ? 36 : 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', d => d.id === selectedNode?.id ? '#ffffff' : '#cbd5e1')
      .attr('font-family', 'system-ui, -apple-system, sans-serif')
      .text(d => {
        if (d.label.length > 24) return d.label.substring(0, 22) + '…';
        return d.label;
      })
      .attr('opacity', d => {
        if (currentScenario && !activePathNodeIds.has(d.id)) return 0.4;
        return 1;
      });

    // Node Subtitle (Type / ID)
    nodeElements.append('text')
      .attr('dy', d => d.type === 'crown_jewel' ? 48 : 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8.5px')
      .attr('fill', '#94a3b8')
      .attr('font-family', 'monospace')
      .text(d => {
        if (d.reportId) return d.reportId;
        if (d.type === 'crown_jewel') return 'Crown Jewel';
        if (d.type === 'pivot') return 'Lateral Pivot';
        if (d.type === 'entry_point') return 'Perímetro Externo';
        if (d.type === 'threat_actor') return 'Atacante';
        return '';
      })
      .attr('opacity', d => {
        if (currentScenario && !activePathNodeIds.has(d.id)) return 0.3;
        return 0.9;
      });

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
    a.download = `attack-graph-${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Topology as JSON
  const handleExportJson = () => {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      reportCount: reports.length,
      attackGraph: {
        nodes: graphData.nodes.map(n => ({
          id: n.id,
          label: n.label,
          stage: n.stage,
          type: n.type,
          severity: n.severity,
          cvssScore: n.cvssScore,
          cwe: n.cwe,
          target: n.target,
          mitreTactic: n.mitreTactic,
          mitreTechnique: n.mitreTechnique
        })),
        links: graphData.links.map(l => ({
          id: l.id,
          source: typeof l.source === 'object' ? (l.source as AttackGraphNode).id : l.source,
          target: typeof l.target === 'object' ? (l.target as AttackGraphNode).id : l.target,
          label: l.label,
          riskLevel: l.riskLevel
        })),
        scenarios: graphData.scenarios
      }
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attack-graph-topology-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Active step details for the scenario walkthrough
  const currentStepNode = useMemo(() => {
    if (!currentScenario) return null;
    const nodeId = currentScenario.nodeIds[activeStepIndex];
    return graphData.nodes.find(n => n.id === nodeId) || null;
  }, [currentScenario, activeStepIndex, graphData.nodes]);

  return (
    <div className="space-y-5" ref={containerRef}>
      {/* Top Header Card */}
      <div className="bg-[#14141c] border border-[#232330] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" />
                <span>Threat Modeling & Attack Graph (D3.js)</span>
              </span>
              <span className="text-zinc-500 text-xs">•</span>
              <span className="text-zinc-400 font-mono text-xs">Kill Chain & MITRE ATT&CK Mapping</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Grafo de Ataque & Caminhos de Exploração Interativos</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              Mapeamento topológico das vulnerabilidades do programa em estágios da cadeia de ataque: desde a entrada externa inicial no perímetro, escalação de privilégios e pivoting lateral em nuvem até os ativos de impacto crítico (Crown Jewels).
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[90px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Nós Ativos</span>
              <span className="text-base font-bold font-mono text-cyan-400">{graphData.nodes.length}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[90px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Vetores</span>
              <span className="text-base font-bold font-mono text-indigo-400">{graphData.links.length}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[90px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Cenários</span>
              <span className="text-base font-bold font-mono text-amber-400">{graphData.scenarios.length}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#191924] border border-[#2b2b3d] text-center min-w-[90px]">
              <span className="block text-[10px] font-mono text-zinc-400 uppercase">Ponto Crítico</span>
              <span className="text-base font-bold font-mono text-red-400">
                {graphData.nodes.filter(n => n.chokePoint).length} Choke
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Controls */}
        <div className="mt-4 pt-4 border-t border-[#232330] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl bg-[#1a1a24] p-1 border border-[#2c2c3e]">
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
              <button
                onClick={() => setViewMode('force')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'force' 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Grafo de Força Livre</span>
              </button>
            </div>

            {/* Target Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#1a1a24] border border-[#2c2c3e] rounded-xl px-2.5 py-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span>Alvo:</span>
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181822]">Todos os Alvos ({reports.length})</option>
                {targetOptions.map(t => (
                  <option key={t} value={t} className="bg-[#181822]">{t}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-[#1a1a24] border border-[#2c2c3e] rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Severidade:</span>
              <select
                value={selectedSeverity}
                onChange={e => setSelectedSeverity(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#181822]">Todas as Severidades</option>
                <option value="CRITICAL" className="bg-[#181822]">Apenas CRITICAL</option>
                <option value="HIGH" className="bg-[#181822]">Apenas HIGH</option>
                <option value="MEDIUM" className="bg-[#181822]">Apenas MEDIUM</option>
              </select>
            </div>
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400">Simulador de Caminho de Ataque:</span>
                <select
                  value={activeScenarioId || ''}
                  onChange={e => {
                    setActiveScenarioId(e.target.value);
                    setActiveStepIndex(0);
                    setIsPlayingScenario(false);
                  }}
                  className="bg-[#1b1b26] border border-[#2c2c3e] text-white font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                >
                  {graphData.scenarios.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentScenario?.description || 'Selecione um cenário para inspecionar os saltos passo a passo.'}
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
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
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
                <strong className="text-amber-400">{activeStepIndex + 1}</strong> / {currentScenario.nodeIds.length}
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
        <div className="lg:col-span-8 bg-[#0e0e14] border border-[#20202c] rounded-2xl overflow-hidden shadow-2xl relative min-h-[560px] flex flex-col">
          {/* Stage watermark & instruction badge */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-zinc-800 text-[11px] font-mono text-zinc-400 backdrop-blur-md">
              Arraste para mover • Scroll para zoom • Clique no nó para inspecionar
            </span>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-[560px] cursor-grab active:cursor-grabbing block"
            style={{ background: 'radial-gradient(ellipse at center, #12121c 0%, #09090d 100%)' }}
          />

          {/* Bottom Stage Legend */}
          <div className="border-t border-[#1c1c28] bg-[#111118]/80 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-zinc-500 font-mono text-[10px] uppercase">Legenda:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                <span className="text-zinc-300">1. Acesso Inicial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-zinc-300">2. Escalação & Exploração</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                <span className="text-zinc-300">3. Movimentação Lateral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                <span className="text-zinc-300">4. Crown Jewels</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-red-400 font-mono text-[10px]">
                <span className="w-2 h-2 rounded-full border border-red-500 border-dashed inline-block" />
                Choke Point
              </span>
            </div>
          </div>
        </div>

        {/* Node Inspector & Kill Chain Intelligence Panel */}
        <div className="lg:col-span-4 space-y-4">
          {selectedNode ? (
            <div className="bg-[#14141d] border border-[#272738] rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[#252538] pb-3.5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${STAGE_CONFIG[selectedNode.stage].badgeBg}`}>
                      {STAGE_CONFIG[selectedNode.stage].label}
                    </span>
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

                  {selectedNode.report.target && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-zinc-400">Domínio Alvo:</span>
                      <span className="font-mono text-cyan-400 text-[11px]">
                        {selectedNode.report.target}
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
                  Mecânica do Ataque / Descrição
                </span>
                <p className="text-zinc-300 leading-relaxed bg-[#111118] p-3 rounded-xl border border-[#20202c]">
                  {selectedNode.description}
                </p>
              </div>

              {selectedNode.impact && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Impacto no Negócio (Blast Radius)</span>
                  </span>
                  <p className="text-zinc-300 leading-relaxed bg-red-500/5 p-3 rounded-xl border border-red-500/20">
                    {selectedNode.impact}
                  </p>
                </div>
              )}

              {/* Defensive Remediation */}
              {selectedNode.remediation && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mitigação & Quebra do Kill Chain</span>
                  </span>
                  <p className="text-zinc-300 leading-relaxed bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/20">
                    {selectedNode.remediation}
                  </p>
                </div>
              )}

              {/* Link to Full Report if available */}
              {selectedNode.report && onSelectReport && (
                <button
                  onClick={() => onSelectReport(selectedNode.report!)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span>Abrir Relatório Completo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#14141d] border border-[#272738] rounded-2xl p-6 shadow-xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Inspetor de Ameaças & Topologia</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Clique em qualquer nó do grafo para auditar suas propriedades, o relatório associado, táticas MITRE ATT&CK, raio de explosão (blast radius) e medidas de quebra de cadeia de ataque.
                </p>
              </div>

              {/* Quick Summary of Choke Points */}
              <div className="border-t border-[#232332] pt-4 text-left space-y-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase block">
                  Pontos de Estrangulamento (Choke Points):
                </span>
                <div className="space-y-1.5">
                  {graphData.nodes.filter(n => n.chokePoint).map(cp => (
                    <div
                      key={cp.id}
                      onClick={() => setSelectedNode(cp)}
                      className="p-2.5 rounded-xl bg-[#1a1a26] border border-[#2a2a3c] hover:border-red-500/50 cursor-pointer transition-all flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{cp.label}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{STAGE_CONFIG[cp.stage].label}</span>
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
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Como Funciona a Cadeia de Ataque</span>
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Vulnerabilidades isoladas (como um SSRF cego ou um IDOR) raramente representam o impacto total por si sós. O grafo demonstra como um invasor explora uma falha no <strong>Acesso Inicial</strong> para obter credenciais temporárias, executar <strong>Movimentação Lateral</strong> em serviços internos e atingir as <strong>Crown Jewels</strong> corporativas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
