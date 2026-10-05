import React, { useState, useEffect } from 'react';
import { SimulatedDevice, TopologyLink } from '../types/network';
import { Router, Cpu, Monitor, Server, Shield, Activity, Play, Zap, X, Gauge, Download, Check } from 'lucide-react';

interface TopologyViewProps {
  devices: SimulatedDevice[];
  links: TopologyLink[];
  activeDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  pingPulse?: { source: string; target: string; targetIp?: string } | null;
  onTestPingAll?: () => void;
  labTitle?: string;
}

interface LatencyTooltipData {
  sourceName: string;
  targetName: string;
  targetIp?: string;
  rttMs: number;
  minRtt: string;
  maxRtt: string;
  jitterMs: string;
  x: number;
  y: number;
  distancePx: number;
  linkType: string;
  hops: number;
}

export const TopologyView: React.FC<TopologyViewProps> = ({
  devices,
  links,
  activeDeviceId,
  onSelectDevice,
  pingPulse,
  onTestPingAll,
  labTitle,
}) => {
  const [showIps, setShowIps] = useState(true);
  const [animatingPulse, setAnimatingPulse] = useState(false);
  const [latencyTooltip, setLatencyTooltip] = useState<LatencyTooltipData | null>(null);
  const [exportedNotice, setExportedNotice] = useState(false);

  const handleExportLabJSON = () => {
    const payload = {
      projectType: 'cisco_network_project',
      appName: 'CONFIG by Ayush Raj',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      labTitle: labTitle || 'Cisco Lab Topology',
      devices,
      links,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (labTitle || 'lab_topology').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeTitle}_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportedNotice(true);
    setTimeout(() => setExportedNotice(false), 2500);
  };

  // Calculate latency based on simulated link distance, link medium, and network depth
  const calculateLatency = (
    src: SimulatedDevice,
    dst: SimulatedDevice,
    link?: TopologyLink
  ): LatencyTooltipData => {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);

    // Medium latency factor
    let baseMediumMs = 2.0;
    if (link?.type === 'serial') baseMediumMs = 18.2;
    else if (link?.type === 'fiber') baseMediumMs = 0.9;
    else baseMediumMs = 2.4;

    // Simulated network depth / routing hops
    const hops = src.deviceType === 'router' && dst.deviceType === 'router' ? 2 : 1;
    const distanceDelay = (distPx / 120) * 1.1;
    const processingJitter = (Math.sin(distPx) * 0.4);

    const calculatedRtt = Math.max(
      1.1,
      Number((baseMediumMs + distanceDelay + (hops > 1 ? 1.8 : 0.6) + processingJitter).toFixed(1))
    );

    const minRtt = (calculatedRtt * 0.82).toFixed(1);
    const maxRtt = (calculatedRtt * 1.28).toFixed(1);
    const jitterMs = (Math.random() * 0.6 + 0.2).toFixed(2);

    // Midpoint position for tooltip
    const midX = (src.x + dst.x) / 2;
    const midY = Math.min(src.y, dst.y) + Math.abs(src.y - dst.y) / 2;

    return {
      sourceName: src.hostname,
      targetName: dst.hostname,
      targetIp: dst.pcConfig?.ip || Object.values(dst.interfaces)[0]?.ip || '192.168.1.1',
      rttMs: calculatedRtt,
      minRtt,
      maxRtt,
      jitterMs,
      x: midX,
      y: midY,
      distancePx: Math.round(distPx),
      linkType: link?.type || 'ethernet',
      hops,
    };
  };

  useEffect(() => {
    if (pingPulse) {
      setAnimatingPulse(true);
      setLatencyTooltip(null);

      const src = devices.find((d) => d.id === pingPulse.source);
      const dst = devices.find((d) => d.id === pingPulse.target);
      const link = links.find(
        (l) =>
          (l.sourceDeviceId === pingPulse.source && l.targetDeviceId === pingPulse.target) ||
          (l.sourceDeviceId === pingPulse.target && l.targetDeviceId === pingPulse.source)
      );

      // Duration of pulse animation before packet arrival
      const pulseDuration = 1300;

      const completionTimer = setTimeout(() => {
        setAnimatingPulse(false);

        if (src && dst) {
          const result = calculateLatency(src, dst, link);
          setLatencyTooltip(result);
        }
      }, pulseDuration);

      // Auto-hide tooltip after 5 seconds
      const hideTimer = setTimeout(() => {
        setLatencyTooltip(null);
      }, pulseDuration + 5000);

      return () => {
        clearTimeout(completionTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [pingPulse, devices, links]);

  const getDeviceIcon = (dev: SimulatedDevice) => {
    switch (dev.deviceType) {
      case 'router':
        return <Router className="w-5 h-5 text-cyan-400" />;
      case 'switch':
        return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'pc':
        return <Monitor className="w-5 h-5 text-emerald-400" />;
      case 'server':
        return <Server className="w-5 h-5 text-purple-400" />;
      case 'firewall':
        return <Shield className="w-5 h-5 text-rose-400" />;
      default:
        return <Router className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getDevicePrimaryIp = (dev: SimulatedDevice) => {
    if (dev.pcConfig?.ip) return dev.pcConfig.ip;
    for (const iface of Object.values(dev.interfaces)) {
      if (iface.ip && iface.status === 'up') return `${iface.ip}/${iface.cidr || 24}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden relative shadow-inner">
      {/* Topology Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">Network Topology Canvas</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {devices.length} Nodes · {links.length} Links
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIps(!showIps)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              showIps ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {showIps ? 'Hide IPs' : 'Show IPs'}
          </button>

          {onTestPingAll && (
            <button
              onClick={onTestPingAll}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
            >
              <Play className="w-2.5 h-2.5" />
              <span>Test ICMP Mesh</span>
            </button>
          )}

          {/* Export Lab JSON Button */}
          <button
            onClick={handleExportLabJSON}
            title="Export Lab Topology & Configurations as JSON (Can be loaded in Sandbox Studio)"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 hover:bg-slate-700/80 transition-colors"
          >
            {exportedNotice ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Exported!</span>
              </>
            ) : (
              <>
                <Download className="w-2.5 h-2.5 text-cyan-400" />
                <span>Export Lab JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 w-full h-[320px] sm:h-[380px] lg:h-[420px] relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <svg className="w-full h-full absolute inset-0 pointer-events-none">
          <defs>
            <linearGradient id="linkGradientUp" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="linkGradientPulse" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links between devices */}
          {links.map((link) => {
            const src = devices.find((d) => d.id === link.sourceDeviceId);
            const dst = devices.find((d) => d.id === link.targetDeviceId);
            if (!src || !dst) return null;

            const isPulsing =
              animatingPulse &&
              ((pingPulse?.source === src.id && pingPulse?.target === dst.id) ||
                (pingPulse?.source === dst.id && pingPulse?.target === src.id));

            const midX = (src.x + dst.x) / 2;
            const midY = (src.y + dst.y) / 2;

            return (
              <g key={link.id}>
                {/* Main link cable */}
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={dst.x}
                  y2={dst.y}
                  stroke={isPulsing ? '#10b981' : '#334155'}
                  strokeWidth={isPulsing ? 3.5 : 2}
                  strokeDasharray={link.type === 'serial' ? '6,3' : undefined}
                  className="transition-all duration-300"
                />

                {/* Packet animation */}
                {isPulsing && (
                  <circle r="5" fill="#34d399" filter="url(#glow)">
                    <animateMotion
                      path={`M ${src.x} ${src.y} L ${dst.x} ${dst.y} L ${src.x} ${src.y}`}
                      dur="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Source Port Label */}
                <text
                  x={src.x + (dst.x - src.x) * 0.22}
                  y={src.y + (dst.y - src.y) * 0.22 - 6}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none bg-slate-950 px-1"
                >
                  {link.sourceInterface.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth')}
                </text>

                {/* Target Port Label */}
                <text
                  x={src.x + (dst.x - src.x) * 0.78}
                  y={src.y + (dst.y - src.y) * 0.78 - 6}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="select-none"
                >
                  {link.targetInterface.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth')}
                </text>

                {/* Link Status LED indicator at midpoint */}
                <circle
                  cx={midX}
                  cy={midY}
                  r="3.5"
                  fill={link.status === 'up' ? '#10b981' : '#f59e0b'}
                  className="shadow-sm"
                />
              </g>
            );
          })}
        </svg>

        {/* Latency Completion Tooltip */}
        {latencyTooltip && (
          <div
            style={{
              left: `${Math.min(Math.max(latencyTooltip.x, 140), 500)}px`,
              top: `${Math.max(latencyTooltip.y - 45, 50)}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-30 select-none animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="bg-slate-900/95 border border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.35)] rounded-lg p-2 px-3 text-xs flex flex-col gap-1 backdrop-blur-md min-w-[200px]">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400 font-bold">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>ICMP Echo Reply</span>
                </div>
                <button
                  onClick={() => setLatencyTooltip(null)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* RTT Display */}
              <div className="flex items-baseline justify-between gap-3 mt-0.5">
                <span className="text-[11px] text-slate-400 font-mono">Calculated RTT:</span>
                <span className="font-mono text-sm font-bold text-emerald-300">
                  {latencyTooltip.rttMs} ms
                </span>
              </div>

              {/* Min / Avg / Max breakdown */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono bg-slate-950/70 px-1.5 py-0.5 rounded border border-slate-800/80">
                <span>min: {latencyTooltip.minRtt}ms</span>
                <span>avg: {latencyTooltip.rttMs}ms</span>
                <span>max: {latencyTooltip.maxRtt}ms</span>
              </div>

              {/* Link Details */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                <span>{latencyTooltip.sourceName} → {latencyTooltip.targetName}</span>
                <span>{latencyTooltip.distancePx}px ({latencyTooltip.linkType})</span>
              </div>
            </div>
          </div>
        )}

        {/* Device Nodes */}
        {devices.map((dev) => {
          const isActive = dev.id === activeDeviceId;
          const primaryIp = getDevicePrimaryIp(dev);

          return (
            <div
              key={dev.id}
              onClick={() => onSelectDevice(dev.id)}
              style={{
                left: `${dev.x}px`,
                top: `${dev.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute cursor-pointer select-none transition-all duration-200 group z-10 flex flex-col items-center`}
            >
              {/* Device Icon Circle */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-slate-900 border-2 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] ring-2 ring-cyan-500/30'
                    : 'bg-slate-900/95 border border-slate-700/80 hover:border-cyan-500/60 shadow-lg'
                }`}
              >
                {getDeviceIcon(dev)}
              </div>

              {/* Hostname Label */}
              <div className="mt-1.5 flex flex-col items-center">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded font-mono transition-colors ${
                    isActive ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'text-slate-200 group-hover:text-cyan-300'
                  }`}
                >
                  {dev.hostname}
                </span>

                {/* IP Badge */}
                {showIps && primaryIp && (
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 bg-slate-900/80 border border-slate-800/80 px-1 rounded">
                    {primaryIp}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Status Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Link Up
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            Active Console: <strong className="text-slate-200 ml-0.5">{devices.find((d) => d.id === activeDeviceId)?.hostname}</strong>
          </span>
          {latencyTooltip && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Gauge className="w-3 h-3" />
              <span>Last Latency: <strong>{latencyTooltip.rttMs} ms</strong></span>
            </span>
          )}
        </div>
        <span className="hidden sm:inline text-slate-500">Click any device to open console</span>
      </div>
    </div>
  );
};
