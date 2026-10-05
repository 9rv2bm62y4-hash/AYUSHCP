export type DeviceType = 'router' | 'switch' | 'pc' | 'server' | 'firewall';

export type IOSMode =
  | 'user_exec'
  | 'priv_exec'
  | 'global_config'
  | 'interface_config'
  | 'subinterface_config'
  | 'router_ospf'
  | 'router_bgp'
  | 'router_eigrp'
  | 'vlan_config'
  | 'line_config';

export interface DeviceInterface {
  name: string;
  shortName: string;
  ip?: string;
  subnetMask?: string;
  cidr?: number;
  ipv6?: string;
  ipv6Cidr?: number;
  ipv6LinkLocal?: string;
  ipv6Enabled?: boolean;
  status: 'up' | 'down' | 'administratively down';
  protocol: 'up' | 'down';
  description?: string;
  mode?: 'access' | 'trunk' | 'routed';
  accessVlan?: number;
  allowedVlans?: number[];
  nativeVlan?: number;
  encapsulation?: { type: 'dot1q'; vlan: number };
  nat?: 'inside' | 'outside';
  ospfArea?: number;
  connectedTo?: {
    deviceId: string;
    interfaceName: string;
  };
}

export interface IPv6RouteEntry {
  type: 'C' | 'S' | 'O' | 'B' | 'L';
  prefix: string;
  cidr: number;
  nextHop?: string;
  interface?: string;
}

export interface RouteEntry {
  type: 'C' | 'S' | 'O' | 'B' | 'D' | 'L'; // Connected, Static, OSPF, BGP, EIGRP, Local
  prefix: string;
  mask: string;
  cidr: number;
  nextHop?: string;
  interface?: string;
  metric?: number;
  adminDistance?: number;
  age?: string;
}

export interface OSPFNeighbor {
  neighborId: string;
  address: string;
  interface: string;
  state: 'FULL' | '2WAY' | 'INIT' | 'EXSTART' | 'DOWN';
  role?: 'DR' | 'BDR' | 'DROTHER';
}

export interface BGPNeighbor {
  ip: string;
  remoteAs: number;
  state: 'Established' | 'Active' | 'Idle' | 'Connect';
  prefixesReceived?: number;
}

export interface VlanEntry {
  id: number;
  name: string;
  status: 'active' | 'suspended';
  ports: string[];
}

export interface ACLEntry {
  ruleNumber: number;
  action: 'permit' | 'deny';
  protocol?: string;
  source: string;
  sourceWildcard?: string;
  destination?: string;
  destinationWildcard?: string;
  port?: string;
}

export interface SimulatedDevice {
  id: string;
  hostname: string;
  model: string;
  deviceType: DeviceType;
  mode: IOSMode;
  currentContext: {
    interface?: string;
    subinterface?: string;
    processId?: string;
    asNumber?: number;
    vlanId?: number;
    line?: string;
  };
  interfaces: Record<string, DeviceInterface>;
  vlans: Record<number, VlanEntry>;
  routingTable: RouteEntry[];
  ospf: {
    processId?: string;
    routerId?: string;
    networks: Array<{ network: string; wildcard: string; area: number }>;
    neighbors: OSPFNeighbor[];
  };
  bgp: {
    asNumber?: number;
    routerId?: string;
    neighbors: BGPNeighbor[];
    networks: Array<{ network: string; mask: string }>;
  };
  acls: Record<string, ACLEntry[]>;
  nat: {
    insideInterfaces: string[];
    outsideInterfaces: string[];
    pools: Record<string, { start: string; end: string; netmask: string }>;
    sourceList?: { aclNumber: number; poolName?: string; overload: boolean; interfaceName?: string };
    translations: Array<{ protocol: string; insideGlobal: string; insideLocal: string; outsideLocal: string; outsideGlobal: string }>;
  };
  runningConfig: string[];
  commandHistory: string[];
  bannerMotd?: string;
  enableSecret?: string;
  ipv6Routing?: boolean;
  ipv6Routes?: IPv6RouteEntry[];
  role?: 'spine' | 'leaf' | 'core' | 'distribution' | 'access' | 'edge' | 'firewall' | 'server' | 'host';
  // PC / Host specific
  pcConfig?: {
    ip?: string;
    gateway?: string;
    mask?: string;
    ipv6?: string;
    ipv6Gateway?: string;
  };
  x: number;
  y: number;
  nodeSize?: number;
}

export interface TopologyLink {
  id: string;
  sourceDeviceId: string;
  sourceInterface: string;
  targetDeviceId: string;
  targetInterface: string;
  status: 'up' | 'down' | 'negotiating';
  type: 'ethernet' | 'serial' | 'fiber' | 'crossover' | 'console';
  cableCategory?: 'copper-straight' | 'copper-cross' | 'fiber' | 'serial' | 'auto';
  bandwidth?: string;
}

export interface LabObjective {
  id: string;
  description: string;
  hint: string;
  solutionCommand: string;
  isCompleted: (devices: Record<string, SimulatedDevice>, links: TopologyLink[]) => boolean;
}

export interface NetworkLab {
  id: string;
  title: string;
  track: 'CCNA' | 'CCNP ENCOR' | 'CCNP ENARSI' | 'Security' | 'Python Automation';
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  summary: string;
  scenario: string;
  topology: {
    devices: SimulatedDevice[];
    links: TopologyLink[];
  };
  objectives: LabObjective[];
  verificationTips: string[];
  relatedPythonScript?: string;
}

export interface PythonChallenge {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  initialCode: string;
  solutionCode: string;
  expectedOutputSubstring: string;
  hint: string;
}
