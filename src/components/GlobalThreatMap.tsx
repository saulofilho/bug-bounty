import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  Globe, 
  MapPin, 
  ShieldAlert, 
  Server, 
  Wifi, 
  Crosshair, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  ArrowUpRight,
  Maximize2,
  Activity,
  Zap,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { VulnerabilityReport, Severity, ReportStatus } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { 
  WORLD_CONTINENTS_GEOJSON, 
  resolveTargetGeoLocation, 
  TargetGeoLocation 
} from '../data/worldGeoData';

interface GlobalThreatMapProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
}

export interface MappedThreatReport {
  report: VulnerabilityReport;
  geo: TargetGeoLocation;
  x: number;
  y: number;
}

interface RegionStats {
  count: number;
  bounties: number;
  criticals: number;
  countries: Set<string>;
}

// Researcher / Sentinel Operations Station Coordinates (São Paulo, Brazil)
const SENTINEL_HUB_COORDS: [number, number] = [-46.6333, -23.5505];

export const GlobalThreatMap: React.FC<GlobalThreatMapProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 900, height: 460 });
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [showArcs, setShowArcs] = useState<boolean>(true);
  const [hoveredThreat, setHoveredThreat] = useState<MappedThreatReport | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle responsive resizing via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newWidth = Math.max(320, Math.floor(entry.contentRect.width));
      // Keep an elegant aspect ratio (roughly 16:9 on desktop, taller on mobile)
      const newHeight = Math.max(340, Math.min(520, Math.floor(newWidth * 0.52)));
      setDimensions({ width: newWidth, height: newHeight });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter reports by severity and region
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (selectedSeverity !== 'ALL' && report.severity !== selectedSeverity) {
        return false;
      }
      const geo = resolveTargetGeoLocation(report.target);
      if (selectedRegion !== 'ALL' && geo.region !== selectedRegion) {
        return false;
      }
      return true;
    });
  }, [reports, selectedSeverity, selectedRegion]);

  // Construct D3 projection calibrated to container dimensions
  const projection = useMemo(() => {
    const { width, height } = dimensions;
    const proj = d3.geoNaturalEarth1()
      .fitExtent([[24, 24], [width - 24, height - 24]], WORLD_CONTINENTS_GEOJSON as any);
    return proj;
  }, [dimensions]);

  // Construct D3 geoPath generator
  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Generate D3 graticule lines
  const graticulePath = useMemo(() => {
    const graticule = d3.geoGraticule().step([30, 30]);
    return pathGenerator(graticule() as any);
  }, [pathGenerator]);

  // Map each report to its geographic coordinates & projected screen coordinates
  const mappedThreats: MappedThreatReport[] = useMemo(() => {
    return filteredReports.map(report => {
      const geo = resolveTargetGeoLocation(report.target);
      const projected = projection(geo.coordinates);
      const x = projected ? projected[0] : dimensions.width / 2;
      const y = projected ? projected[1] : dimensions.height / 2;
      return { report, geo, x, y };
    });
  }, [filteredReports, projection, dimensions]);

  // Sentinel Station projected coordinates
  const sentinelHubScreen = useMemo(() => {
    const projected = projection(SENTINEL_HUB_COORDS);
    return projected ? { x: projected[0], y: projected[1] } : { x: dimensions.width * 0.32, y: dimensions.height * 0.72 };
  }, [projection, dimensions]);

  // Great-circle attack/telemetry arcs from Sentinel Hub to target IPs
  const attackArcs = useMemo(() => {
    if (!showArcs) return [];
    return mappedThreats.map(({ report, geo, x, y }) => {
      // Interpolate along the sphere using d3.geoInterpolate
      const interpolator = d3.geoInterpolate(SENTINEL_HUB_COORDS, geo.coordinates);
      const samples = 30;
      const points: [number, number][] = [];
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const coords = interpolator(t);
        const projected = projection(coords);
        if (projected) {
          points.push(projected);
        }
      }

      // Generate curved SVG line path
      const lineGen = d3.line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);

      const pathData = lineGen(points);
      return {
        id: report.id,
        pathData,
        severity: report.severity,
        target: report.target
      };
    });
  }, [mappedThreats, showArcs, projection]);

  // Regional metrics aggregation for the sidebar/summary cards
  const regionalMetrics = useMemo(() => {
    const regions: Record<string, { count: number; bounties: number; criticals: number; countries: Set<string> }> = {
      'North America': { count: 0, bounties: 0, criticals: 0, countries: new Set() },
      'Europe': { count: 0, bounties: 0, criticals: 0, countries: new Set() },
      'Asia-Pacific': { count: 0, bounties: 0, criticals: 0, countries: new Set() },
      'Latin America': { count: 0, bounties: 0, criticals: 0, countries: new Set() }
    };

    reports.forEach(r => {
      const geo = resolveTargetGeoLocation(r.target);
      const reg = regions[geo.region] || { count: 0, bounties: 0, criticals: 0, countries: new Set() };
      reg.count += 1;
      reg.bounties += (r.bountyAmount || 0);
      if (r.severity === 'CRITICAL') reg.criticals += 1;
      reg.countries.add(geo.countryCode);
      regions[geo.region] = reg;
    });

    return regions;
  }, [reports]);

  // Interactive pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom preset handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.35));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(1, prev - 0.35);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedRegion('ALL');
    setSelectedSeverity('ALL');
  };

  // Preset region viewpoints
  const handleFocusRegion = (regionName: string) => {
    setSelectedRegion(regionName);
    if (regionName === 'ALL') {
      handleResetZoom();
      return;
    }
    setZoomLevel(1.7);
    const { width, height } = dimensions;
    switch (regionName) {
      case 'North America':
        setPanOffset({ x: width * 0.22, y: height * 0.08 });
        break;
      case 'Europe':
        setPanOffset({ x: -width * 0.15, y: height * 0.05 });
        break;
      case 'Asia-Pacific':
        setPanOffset({ x: -width * 0.45, y: -height * 0.05 });
        break;
      case 'Latin America':
        setPanOffset({ x: width * 0.25, y: -height * 0.25 });
        break;
      default:
        setPanOffset({ x: 0, y: 0 });
    }
  };

  const getSeverityPinColor = (sev: Severity) => {
    switch (sev) {
      case 'CRITICAL': return '#ef4444'; // red-500
      case 'HIGH': return '#f97316';     // orange-500
      case 'MEDIUM': return '#06b6d4';   // cyan-500
      case 'LOW': return '#3b82f6';      // blue-500
      case 'INFO': return '#94a3b8';     // slate-400
      default: return '#10b981';
    }
  };

  return (
    <div id="global-threat-map-widget" className="bg-[#11131a] border border-[#232738] rounded-xl overflow-hidden shadow-2xl transition-all">
      {/* Widget Header & Security NOC Control Bar */}
      <div className="p-4 sm:p-5 border-b border-[#232738] bg-[#0c0d14]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Globe className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-white tracking-wide">
                  Global Threat Map & Target IP Geography
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  D3.js Vector Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Distribuição geográfica dos alvos de Bug Bounty e servidores vulneráveis por endereço IP e datacenter
              </p>
            </div>
          </div>
        </div>

        {/* Global NOC Quick Metrics */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-500">Alvos Mapeados</span>
            <span className="text-white font-medium text-sm flex items-center gap-1">
              <Server className="w-3 h-3 text-cyan-400" />
              {filteredReports.length} endpoints
            </span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-500">Exposição Global</span>
            <span className="text-emerald-400 font-medium text-sm">
              {formatCurrency(filteredReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0), 'USD')}
            </span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-zinc-500">IPs Críticos</span>
            <span className="text-red-400 font-medium text-sm flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-red-500" />
              {filteredReports.filter(r => r.severity === 'CRITICAL').length}
            </span>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="px-4 py-2.5 bg-[#0e1017] border-b border-[#1c2030] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-zinc-400" /> Severidade:
          </span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
            const isSelected = selectedSeverity === sev;
            const count = sev === 'ALL' ? reports.length : reports.filter(r => r.severity === sev).length;
            return (
              <button
                key={sev}
                id={`filter-sev-${sev.toLowerCase()}`}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-zinc-800 text-white border border-zinc-600 font-semibold shadow-inner'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                {sev === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                {sev === 'HIGH' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                {sev === 'MEDIUM' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
                {sev === 'LOW' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                <span>{sev}</span>
                <span className="text-[10px] text-zinc-500">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Region Presets & Map View Controls */}
        <div className="flex items-center gap-2">
          {/* Region Quick Select */}
          <div className="hidden lg:flex items-center gap-1 border-r border-zinc-800 pr-2 mr-1">
            <span className="text-[10px] text-zinc-500 uppercase font-mono mr-1">Região:</span>
            {['ALL', 'North America', 'Europe', 'Asia-Pacific', 'Latin America'].map(reg => (
              <button
                key={reg}
                onClick={() => handleFocusRegion(reg)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedRegion === reg
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {reg === 'ALL' ? 'Global' : reg.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Toggle Threat Arcs */}
          <button
            id="toggle-threat-arcs-btn"
            onClick={() => setShowArcs(prev => !prev)}
            className={`px-2.5 py-1 rounded border text-[11px] font-mono flex items-center gap-1.5 transition-colors ${
              showArcs 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Alternar trajetórias balísticas de recon e telemetria"
          >
            <Activity className="w-3 h-3" />
            <span>Trajetórias {showArcs ? 'ON' : 'OFF'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center rounded border border-zinc-800 bg-[#0a0b10] overflow-hidden">
            <button
              id="threat-map-zoom-in"
              onClick={handleZoomIn}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-r border-zinc-800"
              title="Aproximar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              id="threat-map-zoom-out"
              onClick={handleZoomOut}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors border-r border-zinc-800"
              title="Afastar Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              id="threat-map-reset"
              onClick={handleResetZoom}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Resetar Visão Global"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive D3 SVG Map Stage */}
      <div 
        ref={containerRef} 
        className="relative w-full overflow-hidden select-none bg-[#090a10]"
        style={{ height: dimensions.height }}
      >
        <svg
          id="d3-threat-world-map-svg"
          width="100%"
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className={`w-full h-full block ${zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SVG Definitions for Cybersecurity Aesthetic */}
          <defs>
            {/* Graticule pattern and glow filters */}
            <filter id="threat-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient for attack trajectories */}
            <linearGradient id="arc-gradient-critical" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="arc-gradient-high" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
            </linearGradient>

            <linearGradient id="arc-gradient-medium" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
            </linearGradient>

            <radialGradient id="ocean-vignette" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f111a" />
              <stop offset="100%" stopColor="#07080d" />
            </radialGradient>
          </defs>

          {/* Deep Ocean Background */}
          <rect width="100%" height="100%" fill="url(#ocean-vignette)" />

          {/* Transform container for smooth pan and zoom */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
            {/* Latitude / Longitude Graticule Grid Lines */}
            {graticulePath && (
              <path
                d={graticulePath}
                fill="none"
                stroke="#181c2b"
                strokeWidth={0.7}
                strokeDasharray="2 3"
                opacity={0.7}
              />
            )}

            {/* Continental Landmass Polygons */}
            <g id="world-continents-group">
              {WORLD_CONTINENTS_GEOJSON.features.map((feature, idx) => {
                const d = pathGenerator(feature as any);
                if (!d) return null;
                return (
                  <path
                    key={`land-${idx}`}
                    d={d}
                    fill="#131724"
                    stroke="#22283d"
                    strokeWidth={0.9}
                    className="transition-colors hover:fill-[#181d2e]"
                  />
                );
              })}
            </g>

            {/* Dynamic Telemetry / Attack Arcs from Sentinel Hub to Target Endpoints */}
            {showArcs && (
              <g id="attack-arcs-group">
                {attackArcs.map((arc, i) => {
                  if (!arc.pathData) return null;
                  const gradId = arc.severity === 'CRITICAL' 
                    ? 'url(#arc-gradient-critical)' 
                    : arc.severity === 'HIGH' 
                      ? 'url(#arc-gradient-high)' 
                      : 'url(#arc-gradient-medium)';

                  return (
                    <path
                      key={`arc-${arc.id}-${i}`}
                      d={arc.pathData}
                      fill="none"
                      stroke={gradId}
                      strokeWidth={1.4}
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      opacity={0.75}
                      className="transition-opacity hover:opacity-100"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </path>
                  );
                })}
              </g>
            )}

            {/* Researcher / Sentinel Station Hub (Origin of Scans & Reports) */}
            <g 
              id="sentinel-station-marker"
              transform={`translate(${sentinelHubScreen.x}, ${sentinelHubScreen.y})`}
            >
              {/* Outer Radar Pulse */}
              <circle
                r={16}
                fill="none"
                stroke="#10b981"
                strokeWidth={1}
                opacity={0.4}
                className="animate-ping"
                style={{ animationDuration: '3s' }}
              />
              <circle
                r={6}
                fill="#10b981"
                fillOpacity={0.2}
                stroke="#10b981"
                strokeWidth={1.5}
              />
              <circle
                r={2.5}
                fill="#34d399"
              />
              <text
                x={8}
                y={3}
                fill="#34d399"
                fontSize={8}
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="0.05em"
              >
                SENTINEL HUB [SP]
              </text>
            </g>

            {/* Vulnerability Threat Pins & Target IP Datacenters */}
            <g id="threat-pins-group">
              {mappedThreats.map((threat, idx) => {
                const { report, geo, x, y } = threat;
                const pinColor = getSeverityPinColor(report.severity);
                const isCritical = report.severity === 'CRITICAL';
                const isHigh = report.severity === 'HIGH';
                const isHovered = hoveredThreat?.report.id === report.id;
                const isSelected = activeReportId === report.id;

                // Marker size scaled slightly by CVSS or severity
                const baseRadius = isCritical ? 6 : isHigh ? 5 : 4;
                const activeRadius = isHovered || isSelected ? baseRadius * 1.5 : baseRadius;

                return (
                  <g
                    key={`threat-${report.id}-${idx}`}
                    transform={`translate(${x}, ${y})`}
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveReportId(report.id);
                      onSelectReport(report);
                    }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                      setHoveredThreat(threat);
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setTooltipPos({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredThreat(null)}
                  >
                    {/* Animated Ripple for Critical and High findings */}
                    {(isCritical || isHigh) && (
                      <circle
                        r={activeRadius * 2.8}
                        fill="none"
                        stroke={pinColor}
                        strokeWidth={1.5}
                        opacity={0.6}
                        className="animate-ping"
                        style={{ animationDuration: isCritical ? '1.8s' : '2.4s' }}
                      />
                    )}

                    {/* Outer Glow Shield */}
                    <circle
                      r={activeRadius + 3}
                      fill={pinColor}
                      fillOpacity={0.25}
                      stroke={pinColor}
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      filter="url(#threat-glow)"
                    />

                    {/* Central Solid Pin */}
                    <circle
                      r={activeRadius}
                      fill={pinColor}
                      stroke="#0e1017"
                      strokeWidth={1.5}
                    />

                    {/* Small Target Crosshair Indicator on hover */}
                    {isHovered && (
                      <circle
                        r={activeRadius + 8}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        opacity={0.8}
                      />
                    )}

                    {/* Target Domain Label (Subtle Monospace) */}
                    <text
                      x={activeRadius + 4}
                      y={3}
                      fill="#e2e8f0"
                      fontSize={8}
                      fontFamily="monospace"
                      opacity={isHovered || isSelected ? 1 : 0.75}
                      className="pointer-events-none drop-shadow-md font-semibold select-none"
                    >
                      {report.target.replace(/^api\.|^app\.|^hub\./, '')}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Interactive Floating Intelligence Tooltip */}
        {hoveredThreat && (
          <div
            className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${Math.min(dimensions.width - 290, Math.max(16, tooltipPos.x + 14))}px`,
              top: `${Math.min(dimensions.height - 230, Math.max(16, tooltipPos.y - 120))}px`,
              width: '270px'
            }}
          >
            <div className="bg-[#0e1017]/95 border border-[#2b3147] rounded-lg p-3 shadow-2xl backdrop-blur-md text-white text-xs font-sans">
              {/* Tooltip Header: Target & Severity */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
                <span className="font-mono text-[11px] font-semibold text-cyan-300 truncate max-w-[170px]" title={hoveredThreat.report.target}>
                  {hoveredThreat.report.target}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${getSeverityBadgeColor(hoveredThreat.report.severity)}`}>
                  {hoveredThreat.report.severity}
                </span>
              </div>

              {/* IP & Telemetry Details */}
              <div className="py-2 space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                    <Server className="w-3 h-3 text-cyan-400" /> Resolved IP:
                  </span>
                  <span className="text-zinc-200 font-medium">{hoveredThreat.geo.ip}</span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-500 text-[10px]">
                    <MapPin className="w-3 h-3 text-emerald-400" /> Datacenter:
                  </span>
                  <span className="text-zinc-300 truncate max-w-[130px] text-right" title={`${hoveredThreat.geo.city}, ${hoveredThreat.geo.country}`}>
                    {hoveredThreat.geo.city}, {hoveredThreat.geo.countryCode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 text-[10px]">Provider / PoP:</span>
                  <span className="text-zinc-300 truncate max-w-[140px] text-right" title={hoveredThreat.geo.provider}>
                    {hoveredThreat.geo.provider}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 text-[10px]">Vulnerability:</span>
                  <span className="text-amber-400 truncate max-w-[130px] text-right" title={hoveredThreat.report.vulnerabilityType}>
                    {hoveredThreat.report.vulnerabilityType}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500 text-[10px]">CVSS / Bounty:</span>
                  <span className="text-emerald-400 font-bold">
                    {hoveredThreat.report.cvssScore.toFixed(1)} | {formatCurrency(hoveredThreat.report.bountyAmount || 0, 'USD')}
                  </span>
                </div>
              </div>

              {/* Tooltip Footer CTA */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-cyan-400 font-mono">
                <span>Status: {hoveredThreat.report.status}</span>
                <span className="flex items-center gap-0.5 text-zinc-400">
                  Clique para abrir <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Legend Overlay at Bottom-Left of Map */}
        <div className="absolute bottom-3 left-3 bg-[#0a0c14]/90 border border-zinc-800/80 rounded-md px-2.5 py-1.5 backdrop-blur-sm text-[10px] font-mono flex items-center gap-3 text-zinc-400 shadow-md pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1 pl-1 border-l border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Sentinel Station</span>
          </div>
        </div>

        {/* Coordinate Display at Bottom-Right of Map */}
        <div className="hidden sm:flex absolute bottom-3 right-3 bg-[#0a0c14]/90 border border-zinc-800/80 rounded-md px-2.5 py-1.5 backdrop-blur-sm text-[10px] font-mono text-zinc-500 pointer-events-none items-center gap-2">
          <span>PROJ: Natural Earth I</span>
          <span>•</span>
          <span>{filteredReports.length} NODES RENDERED</span>
        </div>
      </div>

      {/* Regional Intelligence Breakdown Grid */}
      <div className="p-4 bg-[#0a0b12] border-t border-[#1c2030]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Distribuição por Região Geográfica & Infraestrutura de Nuvem
          </h4>
          {onNavigateToReports && (
            <button
              onClick={onNavigateToReports}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
            >
              Ver todos os relatórios <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.entries(regionalMetrics) as [string, RegionStats][]).map(([regName, data]) => {
            const isSelected = selectedRegion === regName;
            return (
              <div
                key={regName}
                onClick={() => handleFocusRegion(isSelected ? 'ALL' : regName)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/20 border-cyan-500/50 shadow-md'
                    : 'bg-[#121520] border-[#222738] hover:border-zinc-700 hover:bg-[#151928]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white">{regName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {data.count} {data.count === 1 ? 'relatório' : 'relatórios'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-2 font-mono">
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(data.bounties, 'USD')}
                  </span>
                  {data.criticals > 0 ? (
                    <span className="text-[10px] text-red-400 font-semibold flex items-center gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> {data.criticals} Crítico{data.criticals > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">0 Críticos</span>
                  )}
                </div>

                <div className="mt-2 text-[10px] text-zinc-400 font-mono truncate">
                  Países: {Array.from(data.countries).join(', ') || 'Nenhum'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Target IP Endpoints Table / Ticker */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3 h-3 text-red-400" />
              Telemetria Recente de Endpoints e Endereços IP
            </span>
            <span className="text-zinc-500">Clique em qualquer endpoint para inspecionar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredReports.slice(0, 6).map(report => {
              const geo = resolveTargetGeoLocation(report.target);
              return (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report)}
                  className="flex items-center justify-between p-2 rounded bg-[#0d0f18] border border-zinc-800/60 hover:border-cyan-500/40 hover:bg-[#121524] transition-colors cursor-pointer text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        report.severity === 'CRITICAL' ? 'bg-red-500' :
                        report.severity === 'HIGH' ? 'bg-orange-500' :
                        report.severity === 'MEDIUM' ? 'bg-cyan-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-mono text-white font-medium truncate max-w-[140px]" title={report.target}>
                        {report.target}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1">
                      <span>{geo.ip}</span>
                      <span>•</span>
                      <span>{geo.city}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono flex-shrink-0">
                    <span className="text-emerald-400 font-medium text-[11px]">
                      {formatCurrency(report.bountyAmount || 0, 'USD')}
                    </span>
                    <div className="text-[9px] text-zinc-500">
                      {report.platform}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
