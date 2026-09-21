import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import {
  Radar,
  Radio,
  Crosshair,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Zap,
  Filter,
  Layers,
  Maximize2,
  ExternalLink,
  ChevronRight,
  Activity,
  RotateCw,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  Target,
  Compass,
  Database,
  Lock,
  Globe,
  Award
} from 'lucide-react';
import { VulnerabilityReport, Severity, PlatformName } from '../types';
import { formatCurrency, getSeverityBadgeColor, getStatusBadgeColor } from '../utils/formatters';

interface GlobalThreatIntelligenceRadarProps {
  reports: VulnerabilityReport[];
  onSelectReport: (report: VulnerabilityReport) => void;
  onNavigateToReports?: () => void;
  onNewReport?: () => void;
}

export type RadarTheme = 'emerald' | 'cyan' | 'crimson' | 'amber';

interface PlatformSectorConfig {
  platform: PlatformName;
  name: string;
  startDeg: number;
  endDeg: number;
  midDeg: number;
  color: string;
  glowColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const PLATFORM_SECTORS: PlatformSectorConfig[] = [
  {
    platform: 'HackerOne',
    name: 'HackerOne',
    startDeg: 0,
    endDeg: 60,
    midDeg: 30,
    color: '#ef4444', // Red / Crimson
    glowColor: 'rgba(239, 68, 68, 0.4)',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/30',
    badgeText: 'text-red-400'
  },
  {
    platform: 'Bugcrowd',
    name: 'Bugcrowd',
    startDeg: 60,
    endDeg: 120,
    midDeg: 90,
    color: '#f97316', // Orange
    glowColor: 'rgba(249, 115, 22, 0.4)',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400'
  },
  {
    platform: 'Intigriti',
    name: 'Intigriti',
    startDeg: 120,
    endDeg: 180,
    midDeg: 150,
    color: '#3b82f6', // Blue
    glowColor: 'rgba(59, 130, 246, 0.4)',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/30',
    badgeText: 'text-blue-400'
  },
  {
    platform: 'YesWeHack',
    name: 'YesWeHack',
    startDeg: 180,
    endDeg: 240,
    midDeg: 210,
    color: '#10b981', // Emerald
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400'
  },
  {
    platform: 'Synack',
    name: 'Synack',
    startDeg: 240,
    endDeg: 300,
    midDeg: 270,
    color: '#a855f7', // Purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400'
  },
  {
    platform: 'Direct / VDP',
    name: 'Direct / VDP',
    startDeg: 300,
    endDeg: 360,
    midDeg: 330,
    color: '#06b6d4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/30',
    badgeText: 'text-cyan-400'
  }
];

export interface RadarBlip {
  report: VulnerabilityReport;
  sector: PlatformSectorConfig;
  angleDeg: number;
  angleRad: number;
  radiusFraction: number; // 0 (center) to 1 (outer ring)
  x: number;
  y: number;
  severityColor: string;
  isPinging: boolean;
  lastPingTime: number;
}

// Simple hash code for deterministic distribution
function getDeterministicHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const GlobalThreatIntelligenceRadar: React.FC<GlobalThreatIntelligenceRadarProps> = ({
  reports,
  onSelectReport,
  onNavigateToReports,
  onNewReport
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Responsive dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 540
  });

  // Filters & Controls
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [theme, setTheme] = useState<RadarTheme>('emerald');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 0 = pause, 0.5 = slow, 1 = normal, 2 = fast
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showSectors, setShowSectors] = useState<boolean>(true);
  const [lockedReportId, setLockedReportId] = useState<string | null>(null);
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);
  const [recentPings, setRecentPings] = useState<Record<string, number>>({});

  // Sweep rotation state in radians [0, 2*PI]
  const [sweepAngle, setSweepAngle] = useState<number>(0);
  const sweepAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Theme styling tokens
  const themeColors = useMemo(() => {
    switch (theme) {
      case 'cyan':
        return {
          primary: '#06b6d4',
          primaryGlow: 'rgba(6, 182, 212, 0.5)',
          gridLine: 'rgba(6, 182, 212, 0.22)',
          gridLineBright: 'rgba(6, 182, 212, 0.45)',
          sweepGradientStart: 'rgba(6, 182, 212, 0.35)',
          sweepGradientMid: 'rgba(6, 182, 212, 0.12)',
          sweepLine: '#22d3ee',
          centerBeacon: '#67e8f9',
          bgGradient: 'from-[#07131b] via-[#050d14] to-[#04080e]',
          accentText: 'text-cyan-400',
          accentBorder: 'border-cyan-500/40',
          accentBg: 'bg-cyan-500/10'
        };
      case 'crimson':
        return {
          primary: '#ef4444',
          primaryGlow: 'rgba(239, 68, 68, 0.5)',
          gridLine: 'rgba(239, 68, 68, 0.22)',
          gridLineBright: 'rgba(239, 68, 68, 0.45)',
          sweepGradientStart: 'rgba(239, 68, 68, 0.35)',
          sweepGradientMid: 'rgba(239, 68, 68, 0.12)',
          sweepLine: '#f87171',
          centerBeacon: '#fca5a5',
          bgGradient: 'from-[#19090b] via-[#100607] to-[#080304]',
          accentText: 'text-red-400',
          accentBorder: 'border-red-500/40',
          accentBg: 'bg-red-500/10'
        };
      case 'amber':
        return {
          primary: '#f59e0b',
          primaryGlow: 'rgba(245, 158, 11, 0.5)',
          gridLine: 'rgba(245, 158, 11, 0.22)',
          gridLineBright: 'rgba(245, 158, 11, 0.45)',
          sweepGradientStart: 'rgba(245, 158, 11, 0.35)',
          sweepGradientMid: 'rgba(245, 158, 11, 0.12)',
          sweepLine: '#fbbf24',
          centerBeacon: '#fde68a',
          bgGradient: 'from-[#171206] via-[#0e0a03] to-[#080602]',
          accentText: 'text-amber-400',
          accentBorder: 'border-amber-500/40',
          accentBg: 'bg-amber-500/10'
        };
      case 'emerald':
      default:
        return {
          primary: '#10b981',
          primaryGlow: 'rgba(16, 185, 129, 0.5)',
          gridLine: 'rgba(16, 185, 129, 0.22)',
          gridLineBright: 'rgba(16, 185, 129, 0.45)',
          sweepGradientStart: 'rgba(16, 185, 129, 0.35)',
          sweepGradientMid: 'rgba(16, 185, 129, 0.12)',
          sweepLine: '#34d399',
          centerBeacon: '#6ee7b7',
          bgGradient: 'from-[#061610] via-[#040e0a] to-[#020805]',
          accentText: 'text-emerald-400',
          accentBorder: 'border-emerald-500/40',
          accentBg: 'bg-emerald-500/10'
        };
    }
  }, [theme]);

  // Handle auto-resizing via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      const newWidth = Math.max(300, Math.floor(entry.contentRect.width));
      // Adaptive height: balanced for radar circular viewing
      const newHeight = Math.max(380, Math.min(560, Math.floor(newWidth * 0.78)));
      setDimensions({ width: newWidth, height: newHeight });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filtered reports according to controls
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (selectedPlatform !== 'ALL' && r.platform !== selectedPlatform) {
        return false;
      }
      if (selectedSeverity !== 'ALL' && r.severity !== selectedSeverity) {
        return false;
      }
      return true;
    });
  }, [reports, selectedPlatform, selectedSeverity]);

  // Center and radius
  const radarGeometry = useMemo(() => {
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.max(120, Math.min(cx, cy) - 34);
    return { cx, cy, maxRadius };
  }, [dimensions]);

  // Map each report to a radar blip on polar grid
  const radarBlips = useMemo<RadarBlip[]>(() => {
    const { cx, cy, maxRadius } = radarGeometry;
    if (maxRadius <= 0) return [];

    // Group reports by platform to distribute evenly inside the sector
    const platformGroups: Record<string, VulnerabilityReport[]> = {};
    filteredReports.forEach(r => {
      const p = r.platform || 'Direct / VDP';
      if (!platformGroups[p]) platformGroups[p] = [];
      platformGroups[p].push(r);
    });

    const blips: RadarBlip[] = [];

    Object.entries(platformGroups).forEach(([platform, groupReports]) => {
      const sector =
        PLATFORM_SECTORS.find(s => s.platform === platform) || PLATFORM_SECTORS[PLATFORM_SECTORS.length - 1];
      const sectorSpan = sector.endDeg - sector.startDeg; // 60 degrees
      const paddingDeg = 6; // Stay away from divider lines
      const usableSpan = sectorSpan - paddingDeg * 2;

      groupReports.forEach((report, idx) => {
        // Deterministic angle inside the platform's 60-degree pie slice
        const hash = getDeterministicHash(report.id || report.title);
        const subIndexFraction = groupReports.length > 1 ? idx / (groupReports.length - 1) : 0.5;
        const jitterDeg = (hash % 100) / 100 - 0.5; // -0.5 to +0.5
        const angleDeg =
          sector.startDeg +
          paddingDeg +
          subIndexFraction * usableSpan +
          jitterDeg * (usableSpan / Math.max(2, groupReports.length) * 0.4);

        // Normalize angle to [0, 360)
        const normalizedDeg = ((angleDeg % 360) + 360) % 360;
        // Convert to standard math radians (-90deg offset so 0deg is at top / 12 o'clock)
        const angleRad = ((normalizedDeg - 90) * Math.PI) / 180;

        // Radius based on CVSS / Severity:
        // Critical (CVSS >= 9.0) -> Core Threat Zone (0.22 - 0.40)
        // High (CVSS 7.0 - 8.9) -> Inner Ring (0.42 - 0.62)
        // Medium (CVSS 4.0 - 6.9) -> Mid Ring (0.64 - 0.82)
        // Low / Info (CVSS < 4.0) -> Outer Perimeter (0.84 - 0.96)
        let baseRadiusFraction = 0.5;
        const cvss = report.cvssScore || 5.0;

        if (report.severity === 'CRITICAL' || cvss >= 9.0) {
          baseRadiusFraction = 0.22 + ((10 - cvss) / 1.0) * 0.16; // closer to center
        } else if (report.severity === 'HIGH' || cvss >= 7.0) {
          baseRadiusFraction = 0.42 + ((8.9 - cvss) / 1.9) * 0.18;
        } else if (report.severity === 'MEDIUM' || cvss >= 4.0) {
          baseRadiusFraction = 0.64 + ((6.9 - cvss) / 2.9) * 0.16;
        } else {
          baseRadiusFraction = 0.84 + ((3.9 - Math.max(0.1, cvss)) / 3.8) * 0.12;
        }

        // Slight micro-jitter to prevent exact overlap
        const radiusJitter = ((hash % 17) / 17 - 0.5) * 0.05;
        const radiusFraction = Math.max(0.15, Math.min(0.97, baseRadiusFraction + radiusJitter));
        const r = radiusFraction * maxRadius;

        const x = cx + r * Math.cos(angleRad);
        const y = cy + r * Math.sin(angleRad);

        let severityColor = '#10b981'; // green
        if (report.severity === 'CRITICAL') severityColor = '#ef4444';
        else if (report.severity === 'HIGH') severityColor = '#f97316';
        else if (report.severity === 'MEDIUM') severityColor = '#eab308';

        const lastPing = recentPings[report.id] || 0;
        const isPinging = performance.now() - lastPing < 1600;

        blips.push({
          report,
          sector,
          angleDeg: normalizedDeg,
          angleRad,
          radiusFraction,
          x,
          y,
          severityColor,
          isPinging,
          lastPingTime: lastPing
        });
      });
    });

    return blips;
  }, [filteredReports, radarGeometry, recentPings]);

  // Continuous radar sweep animation loop
  useEffect(() => {
    let active = true;

    const animateSweep = (currentTime: number) => {
      if (!active) return;

      const deltaMs = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (speedMultiplier > 0) {
        // Standard full revolution takes ~4.5 seconds at 1x speed
        const radiansPerSecond = (2 * Math.PI) / 4.5 * speedMultiplier;
        const angleIncrement = radiansPerSecond * (deltaMs / 1000);

        const newAngle = (sweepAngleRef.current + angleIncrement) % (2 * Math.PI);
        sweepAngleRef.current = newAngle;
        setSweepAngle(newAngle);

        // Check if the radar sweep has just swept past any blips
        // Current angle in degrees [0, 360), where 0 is 12 o'clock
        const currentDeg = (newAngle * 180) / Math.PI;

        const pingsToUpdate: Record<string, number> = {};
        radarBlips.forEach(blip => {
          // Angle difference
          let diff = (currentDeg - blip.angleDeg + 360) % 360;
          if (diff < 18) {
            // Within sweep cone
            const lastPing = recentPings[blip.report.id] || 0;
            if (currentTime - lastPing > 3000 / speedMultiplier) {
              pingsToUpdate[blip.report.id] = currentTime;
            }
          }
        });

        if (Object.keys(pingsToUpdate).length > 0) {
          setRecentPings(prev => ({ ...prev, ...pingsToUpdate }));
        }
      }

      animationFrameRef.current = requestAnimationFrame(animateSweep);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animateSweep);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speedMultiplier, radarBlips, recentPings]);

  // Selected or locked report object
  const lockedReport = useMemo(() => {
    if (!lockedReportId) return null;
    return reports.find(r => r.id === lockedReportId) || null;
  }, [lockedReportId, reports]);

  // Hovered report object
  const hoveredReport = useMemo(() => {
    if (!hoveredReportId) return null;
    return reports.find(r => r.id === hoveredReportId) || null;
  }, [hoveredReportId, reports]);

  // High-level threat metrics
  const stats = useMemo(() => {
    const total = filteredReports.length;
    const criticals = filteredReports.filter(r => r.severity === 'CRITICAL').length;
    const highs = filteredReports.filter(r => r.severity === 'HIGH').length;
    const totalBounties = filteredReports.reduce((sum, r) => sum + (r.bountyAmount || 0), 0);

    // Platform breakdown counts
    const platformCounts: Record<string, number> = {};
    filteredReports.forEach(r => {
      const p = r.platform || 'Direct / VDP';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });

    let topPlatform = 'None';
    let topPlatformCount = 0;
    Object.entries(platformCounts).forEach(([p, count]) => {
      if (count > topPlatformCount) {
        topPlatformCount = count;
        topPlatform = p;
      }
    });

    return {
      total,
      criticals,
      highs,
      totalBounties,
      topPlatform,
      topPlatformCount
    };
  }, [filteredReports]);

  // Render D3 decorative arcs and range circles
  const { cx, cy, maxRadius } = radarGeometry;

  // Concentric range zones:
  // 1: Core / Critical (25%)
  // 2: Inner / High (50%)
  // 3: Mid / Medium (75%)
  // 4: Perimeter / Low (100%)
  const rangeRings = [
    { fraction: 0.25, label: 'CORE IMPACT (CVSS 9+)', sub: 'Tier 1 Critical' },
    { fraction: 0.50, label: 'HIGH RISK ORBIT (CVSS 7-8.9)', sub: 'Tier 2 High' },
    { fraction: 0.75, label: 'MEDIUM EXPOSURE (CVSS 4-6.9)', sub: 'Tier 3 Medium' },
    { fraction: 1.00, label: 'PERIMETER BOUNDARY', sub: 'Tier 4 Low/Info' }
  ];

  // Radar sweep line endpoint
  const sweepRad = sweepAngle - Math.PI / 2;
  const sweepX = cx + maxRadius * Math.cos(sweepRad);
  const sweepY = cy + maxRadius * Math.sin(sweepRad);

  // Generate Conical Arc for Radar Sweep Trail (Trailing 45 degrees)
  const sweepTrailPath = useMemo(() => {
    if (maxRadius <= 0) return '';
    const trailAngleSpan = (45 * Math.PI) / 180; // 45 degrees trail
    const startAngle = sweepRad - trailAngleSpan;
    const endAngle = sweepRad;

    // Create SVG arc pie wedge
    const arcGenerator = d3
      .arc()
      .innerRadius(0)
      .outerRadius(maxRadius)
      .startAngle(startAngle + Math.PI / 2)
      .endAngle(endAngle + Math.PI / 2);

    return arcGenerator({} as any) || '';
  }, [sweepRad, maxRadius]);

  // Azimuth bearing lines (every 30 degrees, matching platform sectors + midpoints)
  const bearingAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <div
      id="global-threat-radar-container"
      className="bg-[#090b10] border border-[#1f2438] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden"
    >
      {/* Background Ambience / Glow */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{ backgroundColor: themeColors.primary }}
      />

      {/* ========================================================================= */}
      {/* TOP HEADER: TITLE, BADGES, AND TELEMETRY CONTROLS */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-[#1c2237] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>RADAR INTEL SWEEP</span>
            </span>

            <span className="text-zinc-600 text-xs">•</span>

            <span className="text-zinc-400 font-mono text-xs flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-zinc-500" />
              <span>360° Platform Origin Azimuth</span>
            </span>

            <span className="text-zinc-600 text-xs">•</span>

            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${themeColors.accentBg} ${themeColors.accentText} border ${themeColors.accentBorder}`}>
              {speedMultiplier === 0 ? 'STATUS: PAUSED' : `SWEEP: ${speedMultiplier}X ACTIVE`}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Radar className={`w-6 h-6 ${themeColors.accentText}`} />
            <span>Global Threat Intelligence Radar</span>
          </h3>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
            Monitoramento vetorial rotativo em tempo real via <strong>D3.js</strong> projetando relatórios ativos de vulnerabilidades de acordo com sua plataforma de origem, gravidade e distância do perímetro.
          </p>
        </div>

        {/* Quick Top Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Speed Selector */}
          <div className="flex items-center bg-[#101420] border border-[#232a45] rounded-xl p-1 text-xs font-mono">
            <button
              type="button"
              id="btn-radar-pause"
              onClick={() => setSpeedMultiplier(prev => (prev === 0 ? 1 : 0))}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                speedMultiplier === 0
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={speedMultiplier === 0 ? 'Retomar Varredura' : 'Pausar Varredura'}
            >
              {speedMultiplier === 0 ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
              <span>{speedMultiplier === 0 ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              id="btn-radar-speed-05"
              onClick={() => setSpeedMultiplier(0.5)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                speedMultiplier === 0.5 ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              0.5x
            </button>
            <button
              type="button"
              id="btn-radar-speed-1"
              onClick={() => setSpeedMultiplier(1)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                speedMultiplier === 1 ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              1x
            </button>
            <button
              type="button"
              id="btn-radar-speed-2"
              onClick={() => setSpeedMultiplier(2)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                speedMultiplier === 2 ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              2x
            </button>
          </div>

          {/* Theme Switcher */}
          <div className="flex items-center bg-[#101420] border border-[#232a45] rounded-xl p-1">
            <button
              type="button"
              id="btn-theme-emerald"
              onClick={() => setTheme('emerald')}
              className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                theme === 'emerald' ? 'ring-2 ring-emerald-400 scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              title="Phosphor Emerald Theme"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </button>
            <button
              type="button"
              id="btn-theme-cyan"
              onClick={() => setTheme('cyan')}
              className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                theme === 'cyan' ? 'ring-2 ring-cyan-400 scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              title="Quantum Cyan Theme"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            </button>
            <button
              type="button"
              id="btn-theme-crimson"
              onClick={() => setTheme('crimson')}
              className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                theme === 'crimson' ? 'ring-2 ring-red-400 scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              title="Crimson Threat Alert Theme"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            </button>
            <button
              type="button"
              id="btn-theme-amber"
              onClick={() => setTheme('amber')}
              className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                theme === 'amber' ? 'ring-2 ring-amber-400 scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              title="Tactical Amber Theme"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TELEMETRY CARDS ROW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0e121d] border border-[#1b2138] rounded-xl p-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Alvos Rastreados</span>
            <Target className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            {stats.total}
            <span className="text-xs text-zinc-500 font-normal ml-1">em alcance</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {filteredReports.length === reports.length ? 'Visão global completa' : 'Com filtros ativos'}
          </div>
        </div>

        <div className="bg-[#0e121d] border border-[#1b2138] rounded-xl p-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Ameaças Críticas (P1)</span>
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-red-400 mt-1 flex items-center gap-1.5">
            {stats.criticals}
            {stats.criticals > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">No núcleo de impacto (CVSS 9.0+)</div>
        </div>

        <div className="bg-[#0e121d] border border-[#1b2138] rounded-xl p-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Vetor Principal</span>
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-indigo-300 mt-1 truncate">
            {stats.topPlatform}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {stats.topPlatformCount} relatórios associados
          </div>
        </div>

        <div className="bg-[#0e121d] border border-[#1b2138] rounded-xl p-3">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Bounties em Radar</span>
            <Award className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(stats.totalBounties, 'USD')}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Recompensas consolidadas</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER BAR: PLATFORM SECTOR & SEVERITY */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d101a] border border-[#1b223a] p-3 rounded-xl">
        {/* Platform Origin Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-500" />
            <span>Setor de Plataforma:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedPlatform('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
              selectedPlatform === 'ALL'
                ? 'bg-zinc-700 text-white font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Todos (360°)
          </button>

          {PLATFORM_SECTORS.map(sec => {
            const count = reports.filter(r => r.platform === sec.platform).length;
            const isSelected = selectedPlatform === sec.platform;

            return (
              <button
                key={sec.platform}
                type="button"
                onClick={() => setSelectedPlatform(isSelected ? 'ALL' : sec.platform)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? `${sec.badgeBg} ${sec.badgeText} ${sec.badgeBorder} font-bold ring-1 ring-white/20`
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sec.color }}
                />
                <span>{sec.name}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Severity Selector & Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#131726] border border-[#252e4d] rounded-lg p-0.5 text-xs font-mono">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-zinc-700 text-white font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sev === 'ALL' ? 'Severidade' : sev.slice(0, 4)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowLabels(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1 ${
              showLabels
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-transparent text-zinc-500 border-zinc-800'
            }`}
            title="Alternar nomes de alvos no radar"
          >
            {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Rótulos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSectors(prev => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer flex items-center gap-1 ${
              showSectors
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                : 'bg-transparent text-zinc-500 border-zinc-800'
            }`}
            title="Alternar coloração dos setores polares"
          >
            <Layers className="w-3 h-3" />
            <span>Setores</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN RADAR DISPLAY & SIDE HUD INSPECTION GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: D3 Rotating Interactive Radar Screen */}
        <div
          ref={containerRef}
          className="lg:col-span-8 bg-gradient-to-b from-[#080a12] via-[#05070d] to-[#030408] border border-[#1b223a] rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[460px]"
        >
          {/* Compass Degrees & Bearing Header Indicators */}
          <div className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-mono text-zinc-500 uppercase tracking-wider select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>RADAR BEARING: {Math.round((sweepAngle * 180) / Math.PI)}° AZ</span>
            </span>
            <span>RANGE: 100 KM (FULL SPECTRUM)</span>
            <span className="hidden sm:inline">COORDINATE GRID: POLAR-CVSS</span>
          </div>

          {/* D3 SVG RADAR CANVAS */}
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="select-none overflow-visible"
            style={{ touchAction: 'none' }}
          >
            <defs>
              {/* Radial Center Glow Gradient */}
              <radialGradient id="radar-center-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={themeColors.primary} stopOpacity="0.35" />
                <stop offset="60%" stopColor={themeColors.primary} stopOpacity="0.08" />
                <stop offset="100%" stopColor={themeColors.primary} stopOpacity="0" />
              </radialGradient>

              {/* Conical/Linear Sweep Gradient */}
              <linearGradient id="radar-sweep-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={themeColors.sweepLine} stopOpacity="0.8" />
                <stop offset="30%" stopColor={themeColors.primary} stopOpacity="0.4" />
                <stop offset="100%" stopColor={themeColors.primary} stopOpacity="0" />
              </linearGradient>

              {/* Blip Glow Filters */}
              <filter id="blip-glow-critical" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="blip-glow-high" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Central Glow Disc */}
            <circle
              cx={cx}
              cy={cy}
              r={maxRadius}
              fill="url(#radar-center-glow)"
            />

            {/* ========================================== */}
            {/* PLATFORM SECTOR SHADING & WEDGES */}
            {/* ========================================== */}
            {showSectors &&
              PLATFORM_SECTORS.map(sector => {
                // If platform filter is active and not matching, dim it down
                const isMatch = selectedPlatform === 'ALL' || selectedPlatform === sector.platform;
                const opacity = isMatch ? 0.05 : 0.015;

                // Sector Arc Generator
                const startRad = ((sector.startDeg - 90) * Math.PI) / 180;
                const endRad = ((sector.endDeg - 90) * Math.PI) / 180;

                const arcPath = d3
                  .arc()
                  .innerRadius(0)
                  .outerRadius(maxRadius)
                  .startAngle(startRad + Math.PI / 2)
                  .endAngle(endRad + Math.PI / 2)({} as any) || '';

                return (
                  <g key={sector.platform} className="transition-opacity duration-300">
                    <path
                      d={arcPath}
                      fill={sector.color}
                      fillOpacity={opacity}
                      stroke={sector.color}
                      strokeOpacity={isMatch ? 0.25 : 0.08}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                    />

                    {/* Sector Header Label along outer rim */}
                    {(() => {
                      const midRad = ((sector.midDeg - 90) * Math.PI) / 180;
                      const labelDist = maxRadius - 16;
                      const lx = cx + labelDist * Math.cos(midRad);
                      const ly = cy + labelDist * Math.sin(midRad);

                      return (
                        <text
                          x={lx}
                          y={ly}
                          fill={sector.color}
                          fillOpacity={isMatch ? 0.85 : 0.25}
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="pointer-events-none select-none uppercase"
                        >
                          {sector.name}
                        </text>
                      );
                    })()}
                  </g>
                );
              })}

            {/* ========================================== */}
            {/* CONCENTRIC RADAR RANGE RINGS */}
            {/* ========================================== */}
            {rangeRings.map((ring, idx) => {
              const r = ring.fraction * maxRadius;
              const isOuter = idx === rangeRings.length - 1;

              return (
                <g key={ring.label}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={isOuter ? themeColors.gridLineBright : themeColors.gridLine}
                    strokeWidth={isOuter ? 1.5 : 1}
                    strokeDasharray={isOuter ? 'none' : '4,4'}
                  />

                  {/* Range Distance Label */}
                  <text
                    x={cx + 6}
                    y={cy - r + 11}
                    fill={themeColors.primary}
                    fillOpacity={0.65}
                    fontSize="8"
                    fontFamily="monospace"
                    className="pointer-events-none select-none"
                  >
                    {ring.label}
                  </text>
                </g>
              );
            })}

            {/* ========================================== */}
            {/* RADIAL AZIMUTH BEARING LINES (0° to 330°) */}
            {/* ========================================== */}
            {bearingAngles.map(deg => {
              const rad = ((deg - 90) * Math.PI) / 180;
              const x2 = cx + maxRadius * Math.cos(rad);
              const y2 = cy + maxRadius * Math.sin(rad);
              const isCardinal = deg % 90 === 0;

              return (
                <g key={`bearing-${deg}`}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke={isCardinal ? themeColors.gridLineBright : themeColors.gridLine}
                    strokeWidth={isCardinal ? 1.2 : 0.75}
                    strokeDasharray={isCardinal ? 'none' : '2,4'}
                  />

                  {/* Degree text at the outer perimeter */}
                  <text
                    x={cx + (maxRadius + 14) * Math.cos(rad)}
                    y={cy + (maxRadius + 14) * Math.sin(rad)}
                    fill={isCardinal ? themeColors.sweepLine : 'rgba(156, 163, 175, 0.6)'}
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none"
                  >
                    {deg.toString().padStart(3, '0')}°
                  </text>
                </g>
              );
            })}

            {/* Crosshair Center Reticle */}
            <line
              x1={cx - 15}
              y1={cy}
              x2={cx + 15}
              y2={cy}
              stroke={themeColors.sweepLine}
              strokeWidth={1.5}
            />
            <line
              x1={cx}
              y1={cy - 15}
              x2={cx}
              y2={cy + 15}
              stroke={themeColors.sweepLine}
              strokeWidth={1.5}
            />
            <circle
              cx={cx}
              cy={cy}
              r={3.5}
              fill={themeColors.centerBeacon}
              className="animate-ping"
            />
            <circle
              cx={cx}
              cy={cy}
              r={2}
              fill="#ffffff"
            />

            {/* ========================================== */}
            {/* ROTATING RADAR SWEEP TRAIL & BEAM LINE */}
            {/* ========================================== */}
            {speedMultiplier > 0 && (
              <g className="pointer-events-none">
                {/* Conical Trail Arc */}
                {sweepTrailPath && (
                  <path
                    d={sweepTrailPath}
                    fill="url(#radar-sweep-gradient)"
                    opacity={0.35}
                  />
                )}

                {/* Leading Sharp Sweep Line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={sweepX}
                  y2={sweepY}
                  stroke={themeColors.sweepLine}
                  strokeWidth={2}
                  filter="drop-shadow(0 0 4px rgba(255,255,255,0.8))"
                />

                {/* Glowing Sweep Head Dot */}
                <circle
                  cx={sweepX}
                  cy={sweepY}
                  r={3.5}
                  fill="#ffffff"
                  filter="drop-shadow(0 0 6px rgba(255,255,255,1))"
                />
              </g>
            )}

            {/* ========================================== */}
            {/* RADAR TARGET BLIPS (VULNERABILITIES) */}
            {/* ========================================== */}
            {radarBlips.map(blip => {
              const isLocked = lockedReportId === blip.report.id;
              const isHovered = hoveredReportId === blip.report.id;
              const isCritical = blip.report.severity === 'CRITICAL';
              const isHigh = blip.report.severity === 'HIGH';

              return (
                <g
                  key={blip.report.id}
                  id={`radar-blip-${blip.report.id}`}
                  className="cursor-pointer transition-transform duration-200"
                  onClick={() => {
                    setLockedReportId(prev => (prev === blip.report.id ? null : blip.report.id));
                  }}
                  onMouseEnter={() => setHoveredReportId(blip.report.id)}
                  onMouseLeave={() => setHoveredReportId(null)}
                >
                  {/* Expanding Ping Ripple when swept */}
                  {blip.isPinging && (
                    <circle
                      cx={blip.x}
                      cy={blip.y}
                      r={14}
                      fill="none"
                      stroke={blip.severityColor}
                      strokeWidth={1.5}
                      className="animate-ping opacity-75"
                    />
                  )}

                  {/* Target Lock-On Reticle (when clicked) */}
                  {isLocked && (
                    <g className="animate-pulse">
                      <circle
                        cx={blip.x}
                        cy={blip.y}
                        r={16}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        strokeDasharray="4,3"
                      />
                      <line
                        x1={blip.x - 20}
                        y1={blip.y}
                        x2={blip.x - 10}
                        y2={blip.y}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <line
                        x1={blip.x + 10}
                        y1={blip.y}
                        x2={blip.x + 20}
                        y2={blip.y}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <line
                        x1={blip.x}
                        y1={blip.y - 20}
                        x2={blip.x}
                        y2={blip.y - 10}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                      <line
                        x1={blip.x}
                        y1={blip.y + 10}
                        x2={blip.x}
                        y2={blip.y + 20}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </g>
                  )}

                  {/* Outer Glow Halo */}
                  <circle
                    cx={blip.x}
                    cy={blip.y}
                    r={isLocked || isHovered ? 9 : isCritical ? 7 : 5.5}
                    fill={blip.severityColor}
                    fillOpacity={isLocked || isHovered ? 0.45 : 0.25}
                    filter={isCritical ? 'url(#blip-glow-critical)' : isHigh ? 'url(#blip-glow-high)' : undefined}
                  />

                  {/* Core Blip Dot */}
                  <circle
                    cx={blip.x}
                    cy={blip.y}
                    r={isLocked || isHovered ? 5 : isCritical ? 4.2 : 3.2}
                    fill={isLocked || isHovered ? '#ffffff' : blip.severityColor}
                    stroke="#0b0e14"
                    strokeWidth={1}
                  />

                  {/* Optional Target Domain Tag */}
                  {showLabels && (isHovered || isLocked || isCritical) && (
                    <g transform={`translate(${blip.x + 8}, ${blip.y - 8})`} className="pointer-events-none">
                      <rect
                        x={0}
                        y={-12}
                        width={Math.max(60, blip.report.target.length * 6.5 + 14)}
                        height={16}
                        rx={4}
                        fill="#0b0e17"
                        fillOpacity={0.92}
                        stroke={blip.severityColor}
                        strokeWidth={0.8}
                      />
                      <text
                        x={7}
                        y={-1}
                        fill="#ffffff"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {blip.report.target}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Bottom Coordinates & Time Bar */}
          <div className="w-full flex items-center justify-between px-3 py-1.5 border-t border-[#1a2136] bg-[#070910]/80 rounded-b-xl text-[10px] font-mono text-zinc-500 mt-2">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-zinc-400" />
              <span>RADAR AZIMUTH SECTORS: H1 (0-60°) • BC (60-120°) • INT (120-180°) • YWH (180-240°) • SYN (240-300°) • VDP (300-360°)</span>
            </span>
            <span className="hidden sm:inline text-zinc-400">
              {radarBlips.length} alvos projetados
            </span>
          </div>
        </div>

        {/* Right Column: Tactical HUD Inspector & Target Feed */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Target HUD Details Panel */}
          <div
            id="radar-hud-target-inspector"
            className="bg-[#0b0e18] border border-[#202740] rounded-xl p-4 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#1c2238] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  {lockedReport ? 'Target Lock-On (HUD)' : hoveredReport ? 'Target Hover Preview' : 'Radar Target Acquisition'}
                </h4>
              </div>
              {lockedReport && (
                <button
                  type="button"
                  onClick={() => setLockedReportId(null)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 cursor-pointer"
                >
                  Desbloquear [ESC]
                </button>
              )}
            </div>

            {(() => {
              const activeTarget = lockedReport || hoveredReport;
              if (!activeTarget) {
                return (
                  <div className="py-8 text-center space-y-2">
                    <Crosshair className="w-8 h-8 text-zinc-600 mx-auto animate-pulse" />
                    <p className="text-xs text-zinc-400 font-mono">Nenhum alvo selecionado no radar</p>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                      Clique em qualquer ponto luminoso (blip) do radar para travar as coordenadas e inspecionar a telemetria do relatório.
                    </p>
                  </div>
                );
              }

              const badge = getSeverityBadgeColor(activeTarget.severity);
              const statusBadge = getStatusBadgeColor(activeTarget.status);

              return (
                <div className="space-y-3.5">
                  {/* Header Row: Target domain + Severity Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Alvo Identificado:</span>
                      <h5 className="text-sm font-bold text-white font-mono break-all">{activeTarget.target}</h5>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${badge.bg} ${badge.text} border border-current/20 shrink-0`}>
                      {activeTarget.severity}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Título da Falha:</span>
                    <p className="text-xs text-zinc-200 font-medium line-clamp-2 mt-0.5">
                      {activeTarget.title}
                    </p>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#111624] border border-[#1d253d] p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Plataforma Origem:</span>
                      <span className="font-semibold text-indigo-300">{activeTarget.platform}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Pontuação CVSS:</span>
                      <span className={`font-bold ${activeTarget.cvssScore >= 9.0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {activeTarget.cvssScore.toFixed(1)} / 10.0
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Status Triagem:</span>
                      <span className={`font-semibold ${statusBadge.text}`}>{activeTarget.status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Bounty Pago / Est.:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {formatCurrency(activeTarget.bountyAmount || 0, 'USD')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectReport(activeTarget)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir Relatório Completo</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Quick Target Feed: Active Targets Locked in Radar */}
          <div className="bg-[#0b0e18] border border-[#202740] rounded-xl flex flex-col overflow-hidden shadow-xl">
            <div className="p-3 border-b border-[#1c2238] bg-[#0e121e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Radar Target Feed
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {filteredReports.length} no setor
              </span>
            </div>

            <div className="p-2 space-y-1.5 max-h-[260px] overflow-y-auto">
              {filteredReports.slice(0, 7).map(r => {
                const isLocked = lockedReportId === r.id;
                const badge = getSeverityBadgeColor(r.severity);

                return (
                  <div
                    key={r.id}
                    onClick={() => setLockedReportId(r.id)}
                    className={`p-2 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isLocked
                        ? 'bg-[#151c2e] border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-[#0e121e] border-[#1c2238] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        r.severity === 'CRITICAL'
                          ? 'bg-red-500 animate-ping'
                          : r.severity === 'HIGH'
                          ? 'bg-orange-500'
                          : 'bg-emerald-500'
                      }`} />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{r.target}</span>
                        <span className="text-[10px] text-zinc-500 truncate block">{r.title}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                        {r.severity.slice(0, 4)}
                      </span>
                      <ChevronRight className="w-3 h-3 text-zinc-500" />
                    </div>
                  </div>
                );
              })}
            </div>

            {onNavigateToReports && (
              <div className="p-2 border-t border-[#1c2238] bg-[#090b12] text-center">
                <button
                  type="button"
                  onClick={onNavigateToReports}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
                >
                  Explorar Todos os {reports.length} Relatórios no Ledger →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
