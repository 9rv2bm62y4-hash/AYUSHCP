import React, { useState } from 'react';
import { SimulatedDevice, TopologyLink, DeviceType } from '../types/network';
import { TopologyView } from './TopologyView';
import { CiscoTerminal } from './CiscoTerminal';
import { Plus, Link2, Trash2, RotateCcw, Router, Cpu, Monitor, Server } from 'lucide-react';

interface CustomSandboxProps {
  onDeviceUpdate?: (devices: SimulatedDevice[]) => void;
}

export const CustomSandbox: React.FC<CustomSandboxProps> = () => {
  const [devices, setDevices] = useState<SimulatedDevice[]>([
    {
      id: 'R1',
      hostname: 'R1',
      model: 'Cisco 2901 ISR',
      deviceType: 'router',
      mode: 'priv_exec',
      currentContext: {},
      interfaces: {
        'GigabitEthernet0/0': { name: 'GigabitEthernet0/0', shortName: 'Gi0/0', ip: '10.0.0.1', subnetMask: '255.255.255.252', cidr: 30, status: 'up', protocol: 'up' },
        'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', ip: '192.168.1.1', subnetMask: '255.255.255.0', cidr: 24, status: 'up', protocol: 'up' },
      },
      vlans: {},
      routingTable: [
        { type: 'C', prefix: '10.0.0.0/30', mask: '255.255.255.252', cidr: 30, interface: 'GigabitEthernet0/0' },
        { type: 'C', prefix: '192.168.1.0/24', mask: '255.255.255.0', cidr: 24, interface: 'GigabitEthernet0/1' },
      ],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: ['hostname R1'],
      commandHistory: [],
      x: 220,
      y: 180,
    },
    {
      id: 'SW1',
      hostname: 'SW1',
      model: 'Catalyst 2960',
      deviceType: 'switch',
      mode: 'priv_exec',
      currentContext: {},
      interfaces: {
        'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', status: 'up', protocol: 'up', mode: 'trunk' },
        'FastEthernet0/1': { name: 'FastEthernet0/1', shortName: 'Fa0/1', status: 'up', protocol: 'up', mode: 'access', accessVlan: 1 },
      },
      vlans: { 1: { id: 1, name: 'default', status: 'active', ports: ['Fa0/1', 'Gi0/1'] } },
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: ['hostname SW1'],
      commandHistory: [],
      x: 440,
      y: 180,
    },
    {
      id: 'PC1',
      hostname: 'PC1',
      model: 'VPCS Host',
      deviceType: 'pc',
      mode: 'user_exec',
      currentContext: {},
      interfaces: { Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', status: 'up', protocol: 'up' } },
      vlans: {},
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: [],
      commandHistory: [],
      pcConfig: { ip: '192.168.1.100', mask: '255.255.255.0', gateway: '192.168.1.1' },
      x: 440,
      y: 330,
    },
  ]);

  const [links, setLinks] = useState<TopologyLink[]>([
    { id: 'link-1', sourceDeviceId: 'R1', sourceInterface: 'GigabitEthernet0/1', targetDeviceId: 'SW1', targetInterface: 'GigabitEthernet0/1', status: 'up', type: 'ethernet' },
    { id: 'link-2', sourceDeviceId: 'SW1', sourceInterface: 'FastEthernet0/1', targetDeviceId: 'PC1', targetInterface: 'Ethernet0', status: 'up', type: 'ethernet' },
  ]);

  const [activeDeviceId, setActiveDeviceId] = useState<string>('R1');
  const [linkSrc, setLinkSrc] = useState<string>('R1');
  const [linkDst, setLinkDst] = useState<string>('SW1');

  const handleAddDevice = (type: DeviceType) => {
    const count = devices.filter((d) => d.deviceType === type).length + 1;
    const prefix = type === 'router' ? 'R' : type === 'switch' ? 'SW' : type === 'pc' ? 'PC' : 'SRV';
    const id = `${prefix}${count}`;

    const newDev: SimulatedDevice = {
      id,
      hostname: id,
      model: type === 'router' ? 'Cisco ISR 2901' : type === 'switch' ? 'Catalyst 2960' : 'Virtual Host',
      deviceType: type,
      mode: 'priv_exec',
      currentContext: {},
      interfaces: {
        'GigabitEthernet0/0': { name: 'GigabitEthernet0/0', shortName: 'Gi0/0', status: 'administratively down', protocol: 'down' },
        'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', status: 'administratively down', protocol: 'down' },
      },
      vlans: type === 'switch' ? { 1: { id: 1, name: 'default', status: 'active', ports: ['Gi0/0', 'Gi0/1'] } } : {},
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: [`hostname ${id}`],
      commandHistory: [],
      x: 180 + (devices.length % 4) * 120,
      y: 120 + Math.floor(devices.length / 4) * 130,
    };

    setDevices((prev) => [...prev, newDev]);
    setActiveDeviceId(id);
  };

  const handleCreateLink = () => {
    if (linkSrc === linkDst) return;
    const exists = links.some(
      (l) => (l.sourceDeviceId === linkSrc && l.targetDeviceId === linkDst) || (l.sourceDeviceId === linkDst && l.targetDeviceId === linkSrc)
    );
    if (exists) return;

    const newLink: TopologyLink = {
      id: `custom-link-${Date.now()}`,
      sourceDeviceId: linkSrc,
      sourceInterface: 'GigabitEthernet0/0',
      targetDeviceId: linkDst,
      targetInterface: 'GigabitEthernet0/0',
      status: 'up',
      type: 'ethernet',
    };

    setLinks((prev) => [...prev, newLink]);
  };

  const handleClearSandbox = () => {
    setDevices([]);
    setLinks([]);
  };

  const handleDeviceStateChange = (updated: Record<string, SimulatedDevice>) => {
    setDevices((prev) => prev.map((d) => updated[d.id] || d));
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-950 h-full">
      {/* Sandbox Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Custom Topology Sandbox:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAddDevice('router')}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 rounded transition-colors"
            >
              <Router className="w-3.5 h-3.5" />
              <span>+ Router</span>
            </button>
            <button
              onClick={() => handleAddDevice('switch')}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-950/70 hover:bg-blue-900 border border-blue-800/60 text-blue-300 rounded transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>+ Switch</span>
            </button>
            <button
              onClick={() => handleAddDevice('pc')}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 rounded transition-colors"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>+ PC Host</span>
            </button>
          </div>
        </div>

        {/* Cable Connect Form */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">Connect:</span>
          <select
            value={linkSrc}
            onChange={(e) => setLinkSrc(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.hostname}
              </option>
            ))}
          </select>
          <span className="text-slate-500">↔</span>
          <select
            value={linkDst}
            onChange={(e) => setLinkDst(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.hostname}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateLink}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
          >
            <Link2 className="w-3 h-3" />
            <span>Cable</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Topology Stage */}
        <div className="h-full">
          <TopologyView
            devices={devices}
            links={links}
            activeDeviceId={activeDeviceId}
            onSelectDevice={setActiveDeviceId}
          />
        </div>

        {/* Terminal Console */}
        <div className="h-full">
          {devices.length > 0 ? (
            <CiscoTerminal
              devices={devices}
              activeDeviceId={activeDeviceId}
              onSelectDevice={setActiveDeviceId}
              onDeviceStateChange={handleDeviceStateChange}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-500 text-xs text-center">
              Add a Router or Switch above to start your custom sandbox session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
