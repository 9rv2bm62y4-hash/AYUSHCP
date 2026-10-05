import React, { useState, useRef, useEffect } from 'react';
import { SimulatedDevice, TopologyLink, DeviceType, DeviceInterface, NetworkLab } from '../types/network';
import { CiscoTerminal } from './CiscoTerminal';
import {
  Router,
  Cpu,
  Monitor,
  Server,
  Shield,
  Cloud,
  Plus,
  Link2,
  Trash2,
  Download,
  Upload,
  Play,
  Settings,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Radio,
  FileCode,
  HardDrive,
  Activity,
  Check,
  X,
  Maximize2,
  Minimize2,
  Terminal,
  Info,
} from 'lucide-react';

interface DeviceTemplate {
  name: string;
  model: string;
  type: DeviceType;
  category: 'Routers' | 'Switches' | 'Data Centre' | 'Security' | 'End Devices';
  role?: 'spine' | 'leaf' | 'core' | 'distribution' | 'access' | 'edge' | 'firewall' | 'server' | 'host';
  icon: any;
  defaultInterfaces: string[];
  desc: string;
}

const HARDWARE_TEMPLATES: DeviceTemplate[] = [
  // Routers
  {
    name: 'Cisco 2901 ISR',
    model: 'Cisco 2901 Integrated Services Router',
    type: 'router',
    category: 'Routers',
    role: 'edge',
    icon: Router,
    defaultInterfaces: ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'Serial0/1/0', 'Serial0/1/1'],
    desc: 'Dual-Gigabit branch router with modular serial WAN slots and IPv6 routing engine.',
  },
  {
    name: 'Cisco 7200 VXR',
    model: 'Cisco 7206VXR NPE-G2',
    type: 'router',
    category: 'Routers',
    role: 'core',
    icon: Router,
    defaultInterfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2', 'GigabitEthernet0/3', 'GigabitEthernet0/4'],
    desc: 'High-performance core router for OSPF, BGP, and dual-stack IPv4/IPv6 enterprises.',
  },
  {
    name: 'Cisco ASR 1001-X',
    model: 'Cisco ASR 1001-X Router',
    type: 'router',
    category: 'Routers',
    role: 'core',
    icon: Router,
    defaultInterfaces: ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'TenGigabitEthernet0/1/0'],
    desc: 'Aggregation services router with 10Gbps optical fiber interfaces for DC edge.',
  },

  // Switches
  {
    name: 'Catalyst 2960-X',
    model: 'Cisco Catalyst 2960-X 24PS-L',
    type: 'switch',
    category: 'Switches',
    role: 'access',
    icon: Cpu,
    defaultInterfaces: ['FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3', 'GigabitEthernet0/1'],
    desc: 'Layer 2 enterprise access switch with 802.1Q VLANs and trunking.',
  },
  {
    name: 'Catalyst 3850 L3',
    model: 'Cisco Catalyst 3850 48T-S Layer 3',
    type: 'switch',
    category: 'Switches',
    role: 'distribution',
    icon: Cpu,
    defaultInterfaces: ['GigabitEthernet1/0/1', 'GigabitEthernet1/0/2', 'GigabitEthernet1/0/3', 'GigabitEthernet1/0/4'],
    desc: 'Multilayer Layer 3 switch supporting SVI, Inter-VLAN routing, and IPv6 routing.',
  },

  // Data Centre
  {
    name: 'Nexus 9500 Spine',
    model: 'Cisco Nexus 9504 Modular Spine Switch',
    type: 'switch',
    category: 'Data Centre',
    role: 'spine',
    icon: Layers,
    defaultInterfaces: ['Ethernet1/1', 'Ethernet1/2', 'Ethernet1/3', 'Ethernet1/4'],
    desc: 'Ultra-low latency NX-OS spine switch for Cloud & Data Centre leaf-spine fabrics.',
  },
  {
    name: 'Nexus 9300 Leaf',
    model: 'Cisco Nexus 93180YC-EX Leaf Switch',
    type: 'switch',
    category: 'Data Centre',
    role: 'leaf',
    icon: Cpu,
    defaultInterfaces: ['Ethernet1/1', 'Ethernet1/2', 'Ethernet1/49', 'Ethernet1/50'],
    desc: '48-port 25G ToR leaf switch with 100G uplinks, VXLAN EVPN, and BGP EVPN fabric.',
  },

  // Security
  {
    name: 'Cisco ASA 5506-X',
    model: 'Cisco ASA 5506-X with FirePOWER',
    type: 'firewall',
    category: 'Security',
    role: 'firewall',
    icon: Shield,
    defaultInterfaces: ['GigabitEthernet1/1', 'GigabitEthernet1/2', 'GigabitEthernet1/3'],
    desc: 'Adaptive Security Appliance with stateful packet inspection, NAT, and DMZ zones.',
  },

  // End Devices
  {
    name: 'VPCS Host / PC',
    model: 'Virtual PC Simulator (VPCS)',
    type: 'pc',
    category: 'End Devices',
    role: 'host',
    icon: Monitor,
    defaultInterfaces: ['Ethernet0'],
    desc: 'Simulated client workstation supporting IPv4, IPv6, ICMP ping, and traceroute.',
  },
  {
    name: 'Ubuntu Linux Server',
    model: 'Ubuntu 22.04 LTS Server',
    type: 'server',
    category: 'End Devices',
    role: 'server',
    icon: Server,
    defaultInterfaces: ['eth0', 'eth1'],
    desc: 'Dedicated enterprise server hosting Web, DNS, Syslog, and IPv6 DHCP services.',
  },
];

type CableType = 'straight' | 'crossover' | 'fiber' | 'serial' | 'auto';

const CABLE_OPTIONS: Array<{ id: CableType; label: string; color: string; desc: string }> = [
  { id: 'auto', label: '⚡ Auto-Connect', color: '#06b6d4', desc: 'Automatically selects matching ports' },
  { id: 'straight', label: '🔌 Copper Straight-Through', color: '#10b981', desc: 'Host/Server to Switch, Switch to Router' },
  { id: 'crossover', label: '🔀 Copper Crossover', color: '#f59e0b', desc: 'Switch to Switch, Router to Router' },
  { id: 'fiber', label: '⚡ Optical Fiber (10G/100G)', color: '#ec4899', desc: 'Data Centre Spine-Leaf & Core links' },
  { id: 'serial', label: '〰 Serial WAN Cable', color: '#ef4444', desc: 'Point-to-point leased line WAN links' },
];

interface NetworkBuilderStudioProps {
  currentLab?: NetworkLab;
}

export const NetworkBuilderStudio: React.FC<NetworkBuilderStudioProps> = ({ currentLab }) => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Device nodes in the canvas
  const [devices, setDevices] = useState<SimulatedDevice[]>([
    {
      id: 'Spine-1',
      hostname: 'Spine-1',
      model: 'Cisco Nexus 9504 Spine',
      deviceType: 'switch',
      role: 'spine',
      mode: 'priv_exec',
      currentContext: {},
      ipv6Routing: true,
      interfaces: {
        'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '10.0.1.1', cidr: 30, ipv6: '2001:db8:10::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        'Ethernet1/2': { name: 'Ethernet1/2', shortName: 'Eth1/2', ip: '10.0.2.1', cidr: 30, ipv6: '2001:db8:20::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
      },
      vlans: {},
      routingTable: [
        { type: 'C', prefix: '10.0.1.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/1' },
        { type: 'C', prefix: '10.0.2.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/2' },
      ],
      ospf: { networks: [], neighbors: [] },
      bgp: { asNumber: 65000, routerId: '10.0.0.1', neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: ['hostname Spine-1', 'feature bgp', 'feature ospfv3', 'ipv6 unicast-routing'],
      commandHistory: [],
      x: 380,
      y: 110,
    },
    {
      id: 'Leaf-1',
      hostname: 'Leaf-1',
      model: 'Cisco Nexus 9300 Leaf',
      deviceType: 'switch',
      role: 'leaf',
      mode: 'priv_exec',
      currentContext: {},
      ipv6Routing: true,
      interfaces: {
        'Ethernet1/49': { name: 'Ethernet1/49', shortName: 'Eth1/49', ip: '10.0.1.2', cidr: 30, ipv6: '2001:db8:10::2', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '192.168.10.1', cidr: 24, ipv6: '2001:db8:acad:10::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
      },
      vlans: { 10: { id: 10, name: 'DC-Compute', status: 'active', ports: ['Eth1/1'] } },
      routingTable: [
        { type: 'C', prefix: '10.0.1.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/49' },
        { type: 'C', prefix: '192.168.10.0/24', mask: '255.255.255.0', cidr: 24, interface: 'Ethernet1/1' },
      ],
      ospf: { networks: [], neighbors: [] },
      bgp: { asNumber: 65001, routerId: '10.0.1.2', neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: ['hostname Leaf-1', 'feature bgp', 'ipv6 unicast-routing'],
      commandHistory: [],
      x: 240,
      y: 250,
    },
    {
      id: 'Leaf-2',
      hostname: 'Leaf-2',
      model: 'Cisco Nexus 9300 Leaf',
      deviceType: 'switch',
      role: 'leaf',
      mode: 'priv_exec',
      currentContext: {},
      ipv6Routing: true,
      interfaces: {
        'Ethernet1/49': { name: 'Ethernet1/49', shortName: 'Eth1/49', ip: '10.0.2.2', cidr: 30, ipv6: '2001:db8:20::2', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '192.168.20.1', cidr: 24, ipv6: '2001:db8:acad:20::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
      },
      vlans: { 20: { id: 20, name: 'DC-Storage', status: 'active', ports: ['Eth1/1'] } },
      routingTable: [
        { type: 'C', prefix: '10.0.2.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/49' },
        { type: 'C', prefix: '192.168.20.0/24', mask: '255.255.255.0', cidr: 24, interface: 'Ethernet1/1' },
      ],
      ospf: { networks: [], neighbors: [] },
      bgp: { asNumber: 65002, routerId: '10.0.2.2', neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: ['hostname Leaf-2', 'feature bgp', 'ipv6 unicast-routing'],
      commandHistory: [],
      x: 520,
      y: 250,
    },
    {
      id: 'SRV-App',
      hostname: 'SRV-App',
      model: 'Ubuntu Linux DC Node',
      deviceType: 'server',
      role: 'server',
      mode: 'user_exec',
      currentContext: {},
      interfaces: {
        eth0: { name: 'eth0', shortName: 'eth0', ip: '192.168.10.100', cidr: 24, ipv6: '2001:db8:acad:10::100', ipv6Cidr: 64, status: 'up', protocol: 'up' },
      },
      vlans: {},
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: [],
      commandHistory: [],
      pcConfig: { ip: '192.168.10.100', gateway: '192.168.10.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:10::100', ipv6Gateway: '2001:db8:acad:10::1' },
      x: 240,
      y: 390,
    },
    {
      id: 'PC-Admin',
      hostname: 'PC-Admin',
      model: 'VPCS Host',
      deviceType: 'pc',
      role: 'host',
      mode: 'user_exec',
      currentContext: {},
      interfaces: {
        Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', ip: '192.168.20.50', cidr: 24, ipv6: '2001:db8:acad:20::50', ipv6Cidr: 64, status: 'up', protocol: 'up' },
      },
      vlans: {},
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: [],
      commandHistory: [],
      pcConfig: { ip: '192.168.20.50', gateway: '192.168.20.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:20::50', ipv6Gateway: '2001:db8:acad:20::1' },
      x: 520,
      y: 390,
    },
  ]);

  // Topology links
  const [links, setLinks] = useState<TopologyLink[]>([
    {
      id: 'link-1',
      sourceDeviceId: 'Spine-1',
      sourceInterface: 'Ethernet1/1',
      targetDeviceId: 'Leaf-1',
      targetInterface: 'Ethernet1/49',
      status: 'up',
      type: 'fiber',
      cableCategory: 'fiber',
      bandwidth: '100 Gbps',
    },
    {
      id: 'link-2',
      sourceDeviceId: 'Spine-1',
      sourceInterface: 'Ethernet1/2',
      targetDeviceId: 'Leaf-2',
      targetInterface: 'Ethernet1/49',
      status: 'up',
      type: 'fiber',
      cableCategory: 'fiber',
      bandwidth: '100 Gbps',
    },
    {
      id: 'link-3',
      sourceDeviceId: 'Leaf-1',
      sourceInterface: 'Ethernet1/1',
      targetDeviceId: 'SRV-App',
      targetInterface: 'eth0',
      status: 'up',
      type: 'ethernet',
      cableCategory: 'copper-straight',
      bandwidth: '25 Gbps',
    },
    {
      id: 'link-4',
      sourceDeviceId: 'Leaf-2',
      sourceInterface: 'Ethernet1/1',
      targetDeviceId: 'PC-Admin',
      targetInterface: 'Ethernet0',
      status: 'up',
      type: 'ethernet',
      cableCategory: 'copper-straight',
      bandwidth: '1 Gbps',
    },
  ]);

  // Active states
  const [activeDeviceId, setActiveDeviceId] = useState<string>('Spine-1');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCable, setSelectedCable] = useState<CableType>('auto');
  const [isCableMode, setIsCableMode] = useState<boolean>(false);
  const [cableSource, setCableSource] = useState<{ deviceId: string; interfaceName?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'interfaces' | 'specs'>('console');
  const [showIpv6Details, setShowIpv6Details] = useState<boolean>(true);
  const [isFullscreenCanvas, setIsFullscreenCanvas] = useState<boolean>(false);

  // Device Node & Terminal Panel Resizing states
  const [globalNodeSize, setGlobalNodeSize] = useState<number>(56);
  const [resizingDeviceId, setResizingDeviceId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ startX: number; startY: number; initialSize: number }>({ startX: 0, startY: 0, initialSize: 56 });
  const [panelWidth, setPanelWidth] = useState<number>(520);
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState<boolean>(false);

  // Dragging nodes state
  const [draggingDeviceId, setDraggingDeviceId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected device
  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];

  // Window mouse move listener for panel resizing
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isResizingPanel) {
        const newWidth = Math.max(340, Math.min(window.innerWidth - 280, window.innerWidth - e.clientX));
        setPanelWidth(newWidth);
      }
    };
    const handleWindowMouseUp = () => {
      if (isResizingPanel) setIsResizingPanel(false);
    };
    if (isResizingPanel) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isResizingPanel]);

  // Update specific device size
  const updateDeviceSize = (deviceId: string, size: number) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, nodeSize: size } : d))
    );
  };

  // Node corner resize start
  const handleResizeHandleMouseDown = (e: React.MouseEvent, dev: SimulatedDevice) => {
    e.stopPropagation();
    setResizingDeviceId(dev.id);
    const initialSize = dev.nodeSize || globalNodeSize;
    setResizeStart({ startX: e.clientX, startY: e.clientY, initialSize });
  };

  // Panel resize splitter start
  const handlePanelResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanel(true);
  };

  // Mouse drag handlers for nodes
  const handleNodeMouseDown = (e: React.MouseEvent, dev: SimulatedDevice) => {
    if (isCableMode) {
      handleCableNodeClick(dev.id);
      return;
    }
    e.stopPropagation();
    setActiveDeviceId(dev.id);
    setActiveTab('console');
    setDraggingDeviceId(dev.id);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setDragOffset({ x: mouseX - dev.x, y: mouseY - dev.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (resizingDeviceId) {
      const delta = (e.clientX - resizeStart.startX + (e.clientY - resizeStart.startY)) / 2;
      const newSize = Math.max(40, Math.min(130, Math.round(resizeStart.initialSize + delta)));
      setDevices((prev) =>
        prev.map((d) => (d.id === resizingDeviceId ? { ...d, nodeSize: newSize } : d))
      );
      return;
    }

    if (!draggingDeviceId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = Math.max(40, Math.min(rect.width - 40, mouseX - dragOffset.x));
    const newY = Math.max(40, Math.min(rect.height - 40, mouseY - dragOffset.y));

    setDevices((prev) =>
      prev.map((d) => (d.id === draggingDeviceId ? { ...d, x: Math.round(newX), y: Math.round(newY) } : d))
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggingDeviceId(null);
    setResizingDeviceId(null);
  };

  // Add Device from Catalog
  const handleAddDevice = (template: DeviceTemplate) => {
    const existingSame = devices.filter((d) => d.model.includes(template.name.split(' ')[0]));
    const count = existingSame.length + 1;
    const prefix = template.role === 'spine' ? 'Spine' : template.role === 'leaf' ? 'Leaf' : template.name.split(' ')[0].replace(/[^a-zA-Z]/g, '');
    const id = `${prefix}-${count}`;

    // Generate initial interfaces
    const ifMap: Record<string, DeviceInterface> = {};
    template.defaultInterfaces.forEach((name, i) => {
      ifMap[name] = {
        name,
        shortName: name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth'),
        status: i === 0 ? 'up' : 'down',
        protocol: i === 0 ? 'up' : 'down',
      };
    });

    const newDev: SimulatedDevice = {
      id,
      hostname: id,
      model: template.model,
      deviceType: template.type,
      role: template.role,
      mode: template.type === 'pc' ? 'user_exec' : 'priv_exec',
      currentContext: {},
      ipv6Routing: template.type === 'router' || template.role === 'spine' || template.role === 'leaf',
      interfaces: ifMap,
      vlans: template.type === 'switch' ? { 1: { id: 1, name: 'default', status: 'active', ports: Object.values(ifMap).map((m) => m.shortName) } } : {},
      routingTable: [],
      ospf: { networks: [], neighbors: [] },
      bgp: { neighbors: [], networks: [] },
      acls: {},
      nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
      runningConfig: [`hostname ${id}`],
      commandHistory: [],
      x: 180 + (devices.length % 5) * 110,
      y: 160 + Math.floor(devices.length / 5) * 120,
    };

    setDevices((prev) => [...prev, newDev]);
    setActiveDeviceId(id);
  };

  // Connect cable between devices
  const handleCableNodeClick = (deviceId: string) => {
    if (!cableSource) {
      setCableSource({ deviceId });
    } else {
      if (cableSource.deviceId === deviceId) {
        setCableSource(null);
        return;
      }

      // Create link
      const srcDev = devices.find((d) => d.id === cableSource.deviceId);
      const dstDev = devices.find((d) => d.id === deviceId);
      if (!srcDev || !dstDev) return;

      // Find unused interfaces
      const usedSrcIfs = links
        .filter((l) => l.sourceDeviceId === srcDev.id || l.targetDeviceId === srcDev.id)
        .map((l) => (l.sourceDeviceId === srcDev.id ? l.sourceInterface : l.targetInterface));
      const availSrcIf = Object.keys(srcDev.interfaces).find((name) => !usedSrcIfs.includes(name)) || Object.keys(srcDev.interfaces)[0] || 'GigabitEthernet0/0';

      const usedDstIfs = links
        .filter((l) => l.sourceDeviceId === dstDev.id || l.targetDeviceId === dstDev.id)
        .map((l) => (l.sourceDeviceId === dstDev.id ? l.sourceInterface : l.targetInterface));
      const availDstIf = Object.keys(dstDev.interfaces).find((name) => !usedDstIfs.includes(name)) || Object.keys(dstDev.interfaces)[0] || 'GigabitEthernet0/0';

      // Link type from cable selection
      const linkType: TopologyLink['type'] = selectedCable === 'fiber' ? 'fiber' : selectedCable === 'serial' ? 'serial' : selectedCable === 'crossover' ? 'crossover' : 'ethernet';

      const newLink: TopologyLink = {
        id: `link-${Date.now()}`,
        sourceDeviceId: srcDev.id,
        sourceInterface: availSrcIf,
        targetDeviceId: dstDev.id,
        targetInterface: availDstIf,
        status: 'up',
        type: linkType,
        cableCategory: selectedCable === 'auto' ? 'copper-straight' : (selectedCable as any),
        bandwidth: linkType === 'fiber' ? '100 Gbps' : '1 Gbps',
      };

      setLinks((prev) => [...prev, newLink]);
      setCableSource(null);
      setIsCableMode(false);
    }
  };

  // Remove Device
  const handleDeleteDevice = (deviceId: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setLinks((prev) => prev.filter((l) => l.sourceDeviceId !== deviceId && l.targetDeviceId !== deviceId));
    if (activeDeviceId === deviceId && devices.length > 1) {
      const remaining = devices.filter((d) => d.id !== deviceId);
      setActiveDeviceId(remaining[0].id);
    }
  };

  // Remove Link
  const handleDeleteLink = (linkId: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  // Device state change from terminal
  const handleDeviceStateChange = (updated: Record<string, SimulatedDevice>) => {
    setDevices((prev) => prev.map((d) => updated[d.id] || d));
  };

  // Preset Topologies
  const loadPreset = (preset: 'ccna' | 'ccnp' | 'datacenter' | 'ipv6') => {
    if (preset === 'datacenter') {
      // Leaf-Spine DC Architecture
      const spine1: SimulatedDevice = {
        id: 'Spine-1',
        hostname: 'Spine-1',
        model: 'Cisco Nexus 9504 Spine',
        deviceType: 'switch',
        role: 'spine',
        mode: 'priv_exec',
        currentContext: {},
        ipv6Routing: true,
        interfaces: {
          'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '10.0.1.1', cidr: 30, ipv6: '2001:db8:10::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
          'Ethernet1/2': { name: 'Ethernet1/2', shortName: 'Eth1/2', ip: '10.0.2.1', cidr: 30, ipv6: '2001:db8:20::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        },
        vlans: {},
        routingTable: [
          { type: 'C', prefix: '10.0.1.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/1' },
          { type: 'C', prefix: '10.0.2.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/2' },
        ],
        ospf: { networks: [], neighbors: [] },
        bgp: { asNumber: 65000, routerId: '10.0.0.1', neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname Spine-1', 'feature bgp', 'ipv6 unicast-routing'],
        commandHistory: [],
        x: 380,
        y: 110,
      };

      const leaf1: SimulatedDevice = {
        id: 'Leaf-1',
        hostname: 'Leaf-1',
        model: 'Cisco Nexus 9300 Leaf',
        deviceType: 'switch',
        role: 'leaf',
        mode: 'priv_exec',
        currentContext: {},
        ipv6Routing: true,
        interfaces: {
          'Ethernet1/49': { name: 'Ethernet1/49', shortName: 'Eth1/49', ip: '10.0.1.2', cidr: 30, ipv6: '2001:db8:10::2', ipv6Cidr: 64, status: 'up', protocol: 'up' },
          'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '192.168.10.1', cidr: 24, ipv6: '2001:db8:acad:10::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        },
        vlans: { 10: { id: 10, name: 'Compute', status: 'active', ports: ['Eth1/1'] } },
        routingTable: [{ type: 'C', prefix: '10.0.1.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/49' }],
        ospf: { networks: [], neighbors: [] },
        bgp: { asNumber: 65001, routerId: '10.0.1.2', neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname Leaf-1', 'feature bgp', 'ipv6 unicast-routing'],
        commandHistory: [],
        x: 240,
        y: 250,
      };

      const leaf2: SimulatedDevice = {
        id: 'Leaf-2',
        hostname: 'Leaf-2',
        model: 'Cisco Nexus 9300 Leaf',
        deviceType: 'switch',
        role: 'leaf',
        mode: 'priv_exec',
        currentContext: {},
        ipv6Routing: true,
        interfaces: {
          'Ethernet1/49': { name: 'Ethernet1/49', shortName: 'Eth1/49', ip: '10.0.2.2', cidr: 30, ipv6: '2001:db8:20::2', ipv6Cidr: 64, status: 'up', protocol: 'up' },
          'Ethernet1/1': { name: 'Ethernet1/1', shortName: 'Eth1/1', ip: '192.168.20.1', cidr: 24, ipv6: '2001:db8:acad:20::1', ipv6Cidr: 64, status: 'up', protocol: 'up' },
        },
        vlans: { 20: { id: 20, name: 'Storage', status: 'active', ports: ['Eth1/1'] } },
        routingTable: [{ type: 'C', prefix: '10.0.2.0/30', mask: '255.255.255.252', cidr: 30, interface: 'Ethernet1/49' }],
        ospf: { networks: [], neighbors: [] },
        bgp: { asNumber: 65002, routerId: '10.0.2.2', neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname Leaf-2', 'feature bgp', 'ipv6 unicast-routing'],
        commandHistory: [],
        x: 520,
        y: 250,
      };

      const srv1: SimulatedDevice = {
        id: 'SRV-App',
        hostname: 'SRV-App',
        model: 'Ubuntu Linux Server',
        deviceType: 'server',
        role: 'server',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { eth0: { name: 'eth0', shortName: 'eth0', ip: '192.168.10.100', cidr: 24, ipv6: '2001:db8:acad:10::100', ipv6Cidr: 64, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.10.100', gateway: '192.168.10.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:10::100', ipv6Gateway: '2001:db8:acad:10::1' },
        x: 240,
        y: 390,
      };

      const srv2: SimulatedDevice = {
        id: 'SRV-DB',
        hostname: 'SRV-DB',
        model: 'Ubuntu Database Node',
        deviceType: 'server',
        role: 'server',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { eth0: { name: 'eth0', shortName: 'eth0', ip: '192.168.20.100', cidr: 24, ipv6: '2001:db8:acad:20::100', ipv6Cidr: 64, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.20.100', gateway: '192.168.20.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:20::100', ipv6Gateway: '2001:db8:acad:20::1' },
        x: 520,
        y: 390,
      };

      setDevices([spine1, leaf1, leaf2, srv1, srv2]);
      setLinks([
        { id: 'dc-1', sourceDeviceId: 'Spine-1', sourceInterface: 'Ethernet1/1', targetDeviceId: 'Leaf-1', targetInterface: 'Ethernet1/49', status: 'up', type: 'fiber', bandwidth: '100 Gbps' },
        { id: 'dc-2', sourceDeviceId: 'Spine-1', sourceInterface: 'Ethernet1/2', targetDeviceId: 'Leaf-2', targetInterface: 'Ethernet1/49', status: 'up', type: 'fiber', bandwidth: '100 Gbps' },
        { id: 'dc-3', sourceDeviceId: 'Leaf-1', sourceInterface: 'Ethernet1/1', targetDeviceId: 'SRV-App', targetInterface: 'eth0', status: 'up', type: 'ethernet', bandwidth: '25 Gbps' },
        { id: 'dc-4', sourceDeviceId: 'Leaf-2', sourceInterface: 'Ethernet1/1', targetDeviceId: 'SRV-DB', targetInterface: 'eth0', status: 'up', type: 'ethernet', bandwidth: '25 Gbps' },
      ]);
      setActiveDeviceId('Spine-1');
    } else if (preset === 'ipv6') {
      // Dual-Stack IPv4/IPv6 Enterprise
      const r1: SimulatedDevice = {
        id: 'R1-HQ',
        hostname: 'R1-HQ',
        model: 'Cisco 2901 ISR',
        deviceType: 'router',
        role: 'core',
        mode: 'priv_exec',
        currentContext: {},
        ipv6Routing: true,
        interfaces: {
          'GigabitEthernet0/0': { name: 'GigabitEthernet0/0', shortName: 'Gi0/0', ip: '10.0.0.1', cidr: 30, ipv6: '2001:db8:acad:1::1', ipv6Cidr: 64, ipv6LinkLocal: 'fe80::1:1', status: 'up', protocol: 'up' },
          'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', ip: '192.168.1.1', cidr: 24, ipv6: '2001:db8:acad:10::1', ipv6Cidr: 64, ipv6LinkLocal: 'fe80::1:2', status: 'up', protocol: 'up' },
        },
        vlans: {},
        routingTable: [{ type: 'C', prefix: '10.0.0.0/30', mask: '255.255.255.252', cidr: 30, interface: 'GigabitEthernet0/0' }],
        ipv6Routes: [{ type: 'C', prefix: '2001:db8:acad:1::', cidr: 64, interface: 'GigabitEthernet0/0' }],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname R1-HQ', 'ipv6 unicast-routing', 'interface Gi0/0\n ipv6 address 2001:db8:acad:1::1/64'],
        commandHistory: [],
        x: 240,
        y: 180,
      };

      const r2: SimulatedDevice = {
        id: 'R2-Branch',
        hostname: 'R2-Branch',
        model: 'Cisco 2901 ISR',
        deviceType: 'router',
        role: 'edge',
        mode: 'priv_exec',
        currentContext: {},
        ipv6Routing: true,
        interfaces: {
          'GigabitEthernet0/0': { name: 'GigabitEthernet0/0', shortName: 'Gi0/0', ip: '10.0.0.2', cidr: 30, ipv6: '2001:db8:acad:1::2', ipv6Cidr: 64, ipv6LinkLocal: 'fe80::2:1', status: 'up', protocol: 'up' },
          'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', ip: '192.168.2.1', cidr: 24, ipv6: '2001:db8:acad:20::1', ipv6Cidr: 64, ipv6LinkLocal: 'fe80::2:2', status: 'up', protocol: 'up' },
        },
        vlans: {},
        routingTable: [{ type: 'C', prefix: '10.0.0.0/30', mask: '255.255.255.252', cidr: 30, interface: 'GigabitEthernet0/0' }],
        ipv6Routes: [{ type: 'C', prefix: '2001:db8:acad:1::', cidr: 64, interface: 'GigabitEthernet0/0' }],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname R2-Branch', 'ipv6 unicast-routing', 'interface Gi0/0\n ipv6 address 2001:db8:acad:1::2/64'],
        commandHistory: [],
        x: 520,
        y: 180,
      };

      const pc1: SimulatedDevice = {
        id: 'PC1-DualStack',
        hostname: 'PC1-DualStack',
        model: 'VPCS Dual-Stack',
        deviceType: 'pc',
        role: 'host',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', ip: '192.168.1.50', cidr: 24, ipv6: '2001:db8:acad:10::50', ipv6Cidr: 64, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.1.50', gateway: '192.168.1.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:10::50', ipv6Gateway: '2001:db8:acad:10::1' },
        x: 240,
        y: 340,
      };

      const pc2: SimulatedDevice = {
        id: 'PC2-DualStack',
        hostname: 'PC2-DualStack',
        model: 'VPCS Dual-Stack',
        deviceType: 'pc',
        role: 'host',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', ip: '192.168.2.50', cidr: 24, ipv6: '2001:db8:acad:20::50', ipv6Cidr: 64, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.2.50', gateway: '192.168.2.1', mask: '255.255.255.0', ipv6: '2001:db8:acad:20::50', ipv6Gateway: '2001:db8:acad:20::1' },
        x: 520,
        y: 340,
      };

      setDevices([r1, r2, pc1, pc2]);
      setLinks([
        { id: 'v6-1', sourceDeviceId: 'R1-HQ', sourceInterface: 'GigabitEthernet0/0', targetDeviceId: 'R2-Branch', targetInterface: 'GigabitEthernet0/0', status: 'up', type: 'ethernet', bandwidth: '1 Gbps' },
        { id: 'v6-2', sourceDeviceId: 'R1-HQ', sourceInterface: 'GigabitEthernet0/1', targetDeviceId: 'PC1-DualStack', targetInterface: 'Ethernet0', status: 'up', type: 'ethernet', bandwidth: '1 Gbps' },
        { id: 'v6-3', sourceDeviceId: 'R2-Branch', sourceInterface: 'GigabitEthernet0/1', targetDeviceId: 'PC2-DualStack', targetInterface: 'Ethernet0', status: 'up', type: 'ethernet', bandwidth: '1 Gbps' },
      ]);
      setActiveDeviceId('R1-HQ');
    } else {
      // CCNA / CCNP Enterprise
      const r1: SimulatedDevice = {
        id: 'R1',
        hostname: 'R1',
        model: 'Cisco 2901 ISR',
        deviceType: 'router',
        role: 'edge',
        mode: 'priv_exec',
        currentContext: {},
        interfaces: {
          'GigabitEthernet0/0': { name: 'GigabitEthernet0/0', shortName: 'Gi0/0', ip: '10.0.0.1', cidr: 30, status: 'up', protocol: 'up' },
          'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', ip: '192.168.1.1', cidr: 24, status: 'up', protocol: 'up' },
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
        x: 240,
        y: 180,
      };

      const sw1: SimulatedDevice = {
        id: 'SW1',
        hostname: 'SW1',
        model: 'Catalyst 2960-X',
        deviceType: 'switch',
        role: 'access',
        mode: 'priv_exec',
        currentContext: {},
        interfaces: {
          'GigabitEthernet0/1': { name: 'GigabitEthernet0/1', shortName: 'Gi0/1', status: 'up', protocol: 'up', mode: 'trunk' },
          'FastEthernet0/1': { name: 'FastEthernet0/1', shortName: 'Fa0/1', status: 'up', protocol: 'up', mode: 'access', accessVlan: 10 },
          'FastEthernet0/2': { name: 'FastEthernet0/2', shortName: 'Fa0/2', status: 'up', protocol: 'up', mode: 'access', accessVlan: 20 },
        },
        vlans: {
          10: { id: 10, name: 'Sales', status: 'active', ports: ['Fa0/1'] },
          20: { id: 20, name: 'Engineering', status: 'active', ports: ['Fa0/2'] },
        },
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: ['hostname SW1', 'vlan 10\n name Sales', 'vlan 20\n name Engineering'],
        commandHistory: [],
        x: 480,
        y: 180,
      };

      const pc1: SimulatedDevice = {
        id: 'PC-Sales',
        hostname: 'PC-Sales',
        model: 'VPCS Host',
        deviceType: 'pc',
        role: 'host',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', ip: '192.168.10.10', cidr: 24, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.10.10', gateway: '192.168.10.1', mask: '255.255.255.0' },
        x: 420,
        y: 330,
      };

      const pc2: SimulatedDevice = {
        id: 'PC-Eng',
        hostname: 'PC-Eng',
        model: 'VPCS Host',
        deviceType: 'pc',
        role: 'host',
        mode: 'user_exec',
        currentContext: {},
        interfaces: { Ethernet0: { name: 'Ethernet0', shortName: 'Eth0', ip: '192.168.20.10', cidr: 24, status: 'up', protocol: 'up' } },
        vlans: {},
        routingTable: [],
        ospf: { networks: [], neighbors: [] },
        bgp: { neighbors: [], networks: [] },
        acls: {},
        nat: { insideInterfaces: [], outsideInterfaces: [], pools: {}, translations: [] },
        runningConfig: [],
        commandHistory: [],
        pcConfig: { ip: '192.168.20.10', gateway: '192.168.20.1', mask: '255.255.255.0' },
        x: 560,
        y: 330,
      };

      setDevices([r1, sw1, pc1, pc2]);
      setLinks([
        { id: 'e-1', sourceDeviceId: 'R1', sourceInterface: 'GigabitEthernet0/1', targetDeviceId: 'SW1', targetInterface: 'GigabitEthernet0/1', status: 'up', type: 'ethernet', bandwidth: '1 Gbps' },
        { id: 'e-2', sourceDeviceId: 'SW1', sourceInterface: 'FastEthernet0/1', targetDeviceId: 'PC-Sales', targetInterface: 'Ethernet0', status: 'up', type: 'ethernet', bandwidth: '100 Mbps' },
        { id: 'e-3', sourceDeviceId: 'SW1', sourceInterface: 'FastEthernet0/2', targetDeviceId: 'PC-Eng', targetInterface: 'Ethernet0', status: 'up', type: 'ethernet', bandwidth: '100 Mbps' },
      ]);
      setActiveDeviceId('R1');
    }
  };

  // Export Topology as JSON
  const handleExportTopology = () => {
    const payload = {
      projectType: 'cisco_network_project',
      appName: 'CONFIG by Ayush Raj',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      projectName: `Sandbox_Topology_${Date.now()}`,
      devices,
      links,
    };
    const data = JSON.stringify(payload, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_project_sandbox_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      text: `Exported project JSON (${devices.length} devices, ${links.length} links).`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Import Topology from JSON (handles both Sandbox projects and Lab exports)
  const handleImportTopology = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        let importedDevs: SimulatedDevice[] = [];
        let importedLinks: TopologyLink[] = [];

        if (Array.isArray(parsed.devices) && Array.isArray(parsed.links)) {
          importedDevs = parsed.devices;
          importedLinks = parsed.links;
        } else if (parsed.topology && Array.isArray(parsed.topology.devices) && Array.isArray(parsed.topology.links)) {
          importedDevs = parsed.topology.devices;
          importedLinks = parsed.topology.links;
        } else if (parsed.data && Array.isArray(parsed.data.devices)) {
          importedDevs = parsed.data.devices;
          importedLinks = parsed.data.links || [];
        }

        if (importedDevs.length > 0) {
          // Normalize coordinates if missing
          const normalizedDevs = importedDevs.map((d, idx) => ({
            ...d,
            x: d.x ?? (180 + (idx % 4) * 140),
            y: d.y ?? (140 + Math.floor(idx / 4) * 140),
          }));

          setDevices(normalizedDevs);
          setLinks(importedLinks);
          setActiveDeviceId(normalizedDevs[0].id);

          setNotification({
            type: 'success',
            text: `Successfully loaded "${parsed.labTitle || parsed.projectName || file.name}": ${normalizedDevs.length} devices, ${importedLinks.length} links restored to Sandbox.`,
          });
          setTimeout(() => setNotification(null), 4000);
        } else {
          setNotification({
            type: 'error',
            text: 'Invalid file format: No devices or topology found in the selected JSON file.',
          });
          setTimeout(() => setNotification(null), 4000);
        }
      } catch (err) {
        console.error('Failed to import topology', err);
        setNotification({
          type: 'error',
          text: 'Error parsing JSON file. Please ensure it is a valid network project file.',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Clone from Active Lab
  const handleCloneCurrentLab = () => {
    if (!currentLab) return;
    const clonedDevs = JSON.parse(JSON.stringify(currentLab.topology.devices));
    const clonedLinks = JSON.parse(JSON.stringify(currentLab.topology.links));
    setDevices(clonedDevs);
    setLinks(clonedLinks);
    if (clonedDevs.length > 0) setActiveDeviceId(clonedDevs[0].id);
    setNotification({
      type: 'success',
      text: `Cloned "${currentLab.title}" (${clonedDevs.length} devices) to Sandbox studio!`,
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Export All Running Configs
  const handleExportConfigs = () => {
    let combined = `! ========================================================\n! CONFIG by Ayush Raj - GNS3 / Packet Tracer Lab Bundle\n! Generated: ${new Date().toLocaleString()}\n! Devices: ${devices.length} | Links: ${links.length}\n! ========================================================\n\n`;

    devices.forEach((d) => {
      combined += `! ========================================================\n! Device: ${d.hostname} (${d.model})\n! ========================================================\n`;
      combined += `hostname ${d.hostname}\n`;
      if (d.ipv6Routing) combined += 'ipv6 unicast-routing\n';
      Object.entries(d.interfaces).forEach(([ifName, iface]) => {
        combined += `!\ninterface ${ifName}\n`;
        if (iface.description) combined += ` description ${iface.description}\n`;
        if (iface.ip) combined += ` ip address ${iface.ip} ${iface.subnetMask || '255.255.255.0'}\n`;
        if (iface.ipv6) combined += ` ipv6 address ${iface.ipv6}/${iface.ipv6Cidr || 64}\n`;
        if (iface.ipv6LinkLocal) combined += ` ipv6 address ${iface.ipv6LinkLocal} link-local\n`;
        if (iface.status === 'up') combined += ' no shutdown\n';
        else combined += ' shutdown\n';
      });
      combined += '!\nend\n\n';
    });

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_devices_running_config_${Date.now()}.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: DeviceType, role?: string) => {
    if (role === 'spine') return <Layers className="w-5 h-5 text-indigo-400" />;
    if (role === 'leaf') return <Cpu className="w-5 h-5 text-cyan-400" />;
    if (type === 'router') return <Router className="w-5 h-5 text-cyan-400" />;
    if (type === 'switch') return <Cpu className="w-5 h-5 text-blue-400" />;
    if (type === 'pc') return <Monitor className="w-5 h-5 text-emerald-400" />;
    if (type === 'server') return <Server className="w-5 h-5 text-purple-400" />;
    if (type === 'firewall') return <Shield className="w-5 h-5 text-rose-400" />;
    return <Router className="w-5 h-5 text-cyan-400" />;
  };

  const filteredHardware = HARDWARE_TEMPLATES.filter((h) => {
    if (selectedCategory === 'All') return true;
    return h.category === selectedCategory;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top GNS3/PT Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>GNS3 & Packet Tracer Studio</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
              by Ayush Raj
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />

          {/* Preset Topologies Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">Presets:</span>
            <button
              onClick={() => loadPreset('datacenter')}
              className="px-2 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              Nexus Spine-Leaf DC
            </button>
            <button
              onClick={() => loadPreset('ipv6')}
              className="px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              Dual-Stack IPv6 Lab
            </button>
            <button
              onClick={() => loadPreset('ccna')}
              className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-mono text-[11px] whitespace-nowrap transition-colors"
            >
              CCNA Enterprise
            </button>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Cable Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => {
                setIsCableMode(!isCableMode);
                setCableSource(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                isCableMode
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md ring-2 ring-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isCableMode ? 'Click Device to Cable...' : 'Cable Tool'}</span>
            </button>

            {isCableMode && (
              <select
                value={selectedCable}
                onChange={(e) => setSelectedCable(e.target.value as CableType)}
                className="bg-slate-900 border-none text-[11px] font-mono text-cyan-300 rounded px-1.5 py-0.5 focus:outline-none"
              >
                {CABLE_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Toggle IPv6 Badges */}
          <button
            onClick={() => setShowIpv6Details(!showIpv6Details)}
            className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
              showIpv6Details ? 'bg-cyan-950/70 border-cyan-700/70 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            IPv6 Overlay {showIpv6Details ? 'ON' : 'OFF'}
          </button>

          {/* Import / Export JSON */}
          <label
            title="Load saved network project or lab topology JSON"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 hover:border-indigo-500 text-indigo-300 hover:text-indigo-200 text-xs font-mono font-medium cursor-pointer shadow-sm transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import Project</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportTopology}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportTopology}
            title="Save full network project as JSON"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-mono font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Project</span>
          </button>

          {currentLab && (
            <button
              onClick={handleCloneCurrentLab}
              title={`Load active lab topology "${currentLab.title}" directly into Sandbox`}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 text-xs font-mono transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Clone Active Lab</span>
            </button>
          )}

          {/* Export Configs */}
          <button
            onClick={handleExportConfigs}
            title="Download all running-configs"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 text-xs transition-colors"
          >
            <FileCode className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">Configs</span>
          </button>

          {/* Clear Canvas */}
          <button
            onClick={() => {
              if (confirm('Clear the entire topology canvas?')) {
                setDevices([]);
                setLinks([]);
              }
            }}
            title="Clear canvas"
            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PALETTE: Hardware Catalog (Packet Tracer & GNS3 device library) */}
        <aside className="w-full lg:w-72 bg-slate-900/95 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* Palette Header & Category Filter */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Device Catalog</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Drag or Click</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[10.5px]">
              {['All', 'Routers', 'Switches', 'Data Centre', 'Security', 'End Devices'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded font-mono transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Device List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredHardware.map((hw, idx) => {
              const Icon = hw.icon;
              return (
                <div
                  key={idx}
                  onClick={() => handleAddDevice(hw)}
                  className="group p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm flex items-start gap-3 select-none"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700/70 group-hover:border-cyan-500/60 flex items-center justify-center shrink-0 text-cyan-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs group-hover:text-cyan-300 transition-colors truncate">
                        {hw.name}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1 rounded border border-cyan-900/60">
                        {hw.category}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {hw.desc}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[9.5px] font-mono text-slate-500">
                      <span>{hw.defaultInterfaces.length} Ports:</span>
                      <span className="text-slate-400 truncate">{hw.defaultInterfaces.slice(0, 2).join(', ')}...</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Palette Footer Tip */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/90 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>{devices.length} Placed Nodes</span>
            <span>{links.length} Active Cables</span>
          </div>
        </aside>

        {/* CENTER: Interactive Topology Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030712] relative overflow-hidden">
          {/* Project Import / Action Notification Banner */}
          {notification && (
            <div
              className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg border shadow-2xl flex items-center gap-2.5 text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
                notification.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200'
                  : notification.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/80 text-rose-200'
                  : 'bg-cyan-950/95 border-cyan-500/80 text-cyan-200'
              }`}
            >
              {notification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{notification.text}</span>
              <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cable Connecting Banner */}
          {isCableMode && (
            <div className="bg-amber-500/20 border-b border-amber-500/40 p-2 text-xs font-mono text-amber-200 flex items-center justify-between px-4 z-20 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>
                  {cableSource
                    ? `Click target device to connect ${cableSource.deviceId} with ${selectedCable} cable...`
                    : `Click any device node to start cabling (${selectedCable} cable)...`}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsCableMode(false);
                  setCableSource(null);
                }}
                className="text-[10px] bg-amber-500/30 hover:bg-amber-500/50 px-2 py-0.5 rounded text-amber-100"
              >
                Cancel
              </button>
            </div>
          )}

          {/* SVG & Node Grid Stage */}
          <div
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className="flex-1 relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
          >
            {/* SVG Cables Layer */}
            <svg className="w-full h-full absolute inset-0 pointer-events-none">
              <defs>
                <filter id="glow-link" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {links.map((link) => {
                const src = devices.find((d) => d.id === link.sourceDeviceId);
                const dst = devices.find((d) => d.id === link.targetDeviceId);
                if (!src || !dst) return null;

                const midX = (src.x + dst.x) / 2;
                const midY = (src.y + dst.y) / 2;

                const isFiber = link.type === 'fiber';
                const isSerial = link.type === 'serial';
                const isCross = link.type === 'crossover';

                const strokeColor = isFiber ? '#ec4899' : isSerial ? '#ef4444' : isCross ? '#f59e0b' : '#06b6d4';

                return (
                  <g key={link.id}>
                    {/* Cable Line */}
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={dst.x}
                      y2={dst.y}
                      stroke={strokeColor}
                      strokeWidth={isFiber ? 3 : 2}
                      strokeDasharray={isSerial ? '8,4' : isCross ? '4,4' : undefined}
                      className="transition-all"
                    />

                    {/* Source Port Label */}
                    <text
                      x={src.x + (dst.x - src.x) * 0.22}
                      y={src.y + (dst.y - src.y) * 0.22 - 6}
                      fill="#94a3b8"
                      fontSize="9.5"
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
                      fontSize="9.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {link.targetInterface.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth')}
                    </text>

                    {/* Midpoint LED / Bandwidth Tag */}
                    <circle cx={midX} cy={midY} r="3" fill="#10b981" />
                  </g>
                );
              })}
            </svg>

            {/* Placed Device Nodes */}
            {devices.map((dev) => {
              const isActive = dev.id === activeDeviceId;
              const isSourceInCable = cableSource?.deviceId === dev.id;

              // Primary IPv4 and IPv6 addresses
              const primaryIpv4 = dev.pcConfig?.ip || Object.values(dev.interfaces).find((i) => i.ip)?.ip;
              const primaryIpv6 = dev.pcConfig?.ipv6 || Object.values(dev.interfaces).find((i) => i.ipv6)?.ipv6;

              return (
                <div
                  key={dev.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, dev)}
                  style={{
                    left: `${dev.x}px`,
                    top: `${dev.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute cursor-move select-none transition-shadow z-10 flex flex-col items-center group`}
                >
                  {/* Device Chassis Box */}
                  <div
                    className={`w-13 h-13 rounded-xl flex items-center justify-center transition-all ${
                      isSourceInCable
                        ? 'bg-amber-950 border-2 border-amber-400 ring-4 ring-amber-400/40 shadow-xl'
                        : isActive
                        ? 'bg-slate-900 border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] ring-2 ring-cyan-500/30'
                        : 'bg-slate-900/95 border border-slate-700/80 hover:border-cyan-500/60 shadow-lg'
                    }`}
                  >
                    {getDeviceIcon(dev.deviceType, dev.role)}
                  </div>

                  {/* Device Labels */}
                  <div className="mt-1 flex flex-col items-center pointer-events-none">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono whitespace-nowrap shadow-sm ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                          : 'bg-slate-900/90 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {dev.hostname}
                    </span>

                    {/* IPv4 Badge */}
                    {primaryIpv4 && (
                      <span className="text-[9.5px] text-slate-400 font-mono mt-0.5 bg-slate-950/90 border border-slate-800 px-1 rounded whitespace-nowrap">
                        {primaryIpv4}
                      </span>
                    )}

                    {/* IPv6 Badge Overlay */}
                    {showIpv6Details && primaryIpv6 && (
                      <span className="text-[9px] text-emerald-300 font-mono mt-0.5 bg-emerald-950/80 border border-emerald-800/80 px-1 rounded whitespace-nowrap">
                        {primaryIpv6.length > 18 ? `${primaryIpv6.substring(0, 18)}...` : primaryIpv6}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Canvas Footer Status */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-3 py-1.5 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Active Node: <strong className="text-cyan-300">{activeDevice?.hostname}</strong> ({activeDevice?.model})</span>
              {activeDevice?.ipv6Routing && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>IPv6 Unicast Routing Active</span>
                </span>
              )}
            </div>
            <span className="text-slate-500 hidden sm:inline">Drag nodes to position · Click node to open console</span>
          </div>
        </div>

        {/* RIGHT PANEL: Live Cisco Console & Device Configuration Inspector */}
        <section className="w-full lg:w-[480px] xl:w-[540px] bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 min-h-[360px] lg:min-h-0">
          {/* Inspector Header / Tab Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                {activeDevice ? getDeviceIcon(activeDevice.deviceType, activeDevice.role) : <Terminal className="w-3.5 h-3.5" />}
              </div>
              <div>
                <span className="font-semibold text-slate-200 text-xs font-mono">
                  {activeDevice?.hostname || 'Console'}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {activeDevice?.model || 'No device selected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === 'console' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CLI Console
              </button>
              <button
                onClick={() => setActiveTab('interfaces')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === 'interfaces' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                IPv4/IPv6 Ports
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  activeTab === 'specs' ? 'bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Specs & Hardware
              </button>
            </div>
          </div>

          {/* Tab 1: Live Interactive Cisco Terminal */}
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col min-h-0">
              {devices.length > 0 && activeDevice ? (
                <CiscoTerminal
                  devices={devices}
                  activeDeviceId={activeDeviceId}
                  onSelectDevice={setActiveDeviceId}
                  onDeviceStateChange={handleDeviceStateChange}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
                  Place a device on the canvas to open its console.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: IPv4 & IPv6 Port Manager */}
          {activeTab === 'interfaces' && activeDevice && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-200">Interface Configurations</span>
                <span className="text-[11px] text-cyan-400">{Object.keys(activeDevice.interfaces).length} Ports</span>
              </div>

              {Object.entries(activeDevice.interfaces).map(([name, iface]) => (
                <div
                  key={name}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-[12px] text-cyan-300">{name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        iface.status === 'up'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                      }`}
                    >
                      {iface.status.toUpperCase()}
                    </span>
                  </div>

                  {/* IPv4 Field */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">IPv4 Address:</span>
                    <span className="text-slate-200">{iface.ip ? `${iface.ip}/${iface.cidr || 24}` : 'Unassigned'}</span>
                  </div>

                  {/* IPv6 Field */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400">IPv6 Global:</span>
                    <span className="text-emerald-300">{iface.ipv6 ? `${iface.ipv6}/${iface.ipv6Cidr || 64}` : 'Unassigned'}</span>
                  </div>

                  {/* IPv6 Link-Local */}
                  {iface.ipv6LinkLocal && (
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Link-Local:</span>
                      <span className="text-slate-400">{iface.ipv6LinkLocal}</span>
                    </div>
                  )}

                  {/* VLAN context */}
                  {iface.accessVlan && (
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Access VLAN:</span>
                      <span className="text-indigo-300">VLAN {iface.accessVlan}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* PC Host IPv4/IPv6 Config */}
              {activeDevice.pcConfig && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                  <span className="font-bold text-slate-200 text-[12px] text-emerald-300">Host IP Settings</span>
                  <div className="text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IPv4 Address:</span>
                      <span>{activeDevice.pcConfig.ip || 'DHCP'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Default Gateway:</span>
                      <span>{activeDevice.pcConfig.gateway || 'None'}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>IPv6 Address:</span>
                      <span>{activeDevice.pcConfig.ipv6 || 'SLAAC'}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>IPv6 Gateway:</span>
                      <span>{activeDevice.pcConfig.ipv6Gateway || 'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Hardware Specs & System Information */}
          {activeTab === 'specs' && activeDevice && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
                <span className="font-bold text-slate-200 text-[12px] text-cyan-300">System Specifications</span>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hardware Model:</span>
                    <span className="text-slate-200">{activeDevice.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chassis Role:</span>
                    <span className="text-cyan-300 uppercase">{activeDevice.role || 'Enterprise'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Network OS:</span>
                    <span className="text-slate-200">{activeDevice.role === 'spine' || activeDevice.role === 'leaf' ? 'Cisco NX-OS 9.3(8)' : 'Cisco IOS-XE 17.6.3a'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">IPv6 Unicast Routing:</span>
                    <span className={activeDevice.ipv6Routing ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {activeDevice.ipv6Routing ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">MAC Address Base:</span>
                    <span className="text-slate-300">0050.7966.68{activeDevice.id.substring(0, 2).toLowerCase()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteDevice(activeDevice.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Device from Canvas</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
