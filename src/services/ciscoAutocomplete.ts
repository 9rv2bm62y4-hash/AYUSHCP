import { SimulatedDevice } from '../types/network';

export interface CompletionSuggestion {
  text: string;
  fullCommand: string;
  description?: string;
  mode?: string;
}

// Master CCNA/CCNP Syntax Tree per Mode
export interface SyntaxNode {
  [keyword: string]: {
    desc?: string;
    next?: SyntaxNode;
    dynamic?: 'interfaces' | 'vlans' | 'ip_targets' | 'processes';
  };
}

const EXEC_COMMANDS: Record<string, string> = {
  'enable': 'Turn on privileged commands (Privileged EXEC)',
  'disable': 'Turn off privileged commands (return to User EXEC)',
  'configure terminal': 'Enter Global Configuration mode',
  'show ip interface brief': 'Display interface IP addresses and line status',
  'show ip route': 'Display current IPv4 routing table',
  'show ip route ospf': 'Filter routing table by OSPF routes',
  'show ip route bgp': 'Filter routing table by BGP routes',
  'show ip route connected': 'Display directly connected subnets',
  'show ip route static': 'Display statically configured routes',
  'show ipv6 interface brief': 'Display IPv6 addresses and link-local status',
  'show ipv6 route': 'Display IPv6 routing table',
  'show running-config': 'Display current active device configuration',
  'show startup-config': 'Display contents of NVRAM configuration',
  'show vlan brief': 'Display VLAN port membership and status',
  'show ip ospf neighbor': 'Display OSPF neighbor adjacencies and states',
  'show ip ospf database': 'Display OSPF Link State Database (LSDB)',
  'show ip ospf interface': 'Display OSPF timer and area parameters per interface',
  'show ip bgp summary': 'Display BGP neighbor states and prefix counts',
  'show ip bgp neighbors': 'Display detailed BGP session parameters',
  'show access-lists': 'Display configured ACL rules and packet match counters',
  'show ip nat translations': 'Display active NAT translation table',
  'show ip nat statistics': 'Display NAT translation counters and pool sizes',
  'show interfaces': 'Display full interface counters, errors, and bandwidth',
  'show version': 'Display IOS software image, uptime, and system hardware',
  'show clock': 'Display current system date and time',
  'show history': 'Display history of recently executed commands',
  'show mac address-table': 'Display Layer 2 MAC forwarding table',
  'show cdp neighbors': 'Display directly connected Cisco devices via CDP',
  'show cdp neighbors detail': 'Display remote device IP, platform, and interface',
  'show lldp neighbors': 'Display Link Layer Discovery Protocol neighbors',
  'write memory': 'Save running configuration to NVRAM',
  'copy running-config startup-config': 'Save running configuration to startup-config',
  'reload': 'Halt and perform a cold restart of the device',
  'ping': 'Send ICMP Echo Request packets to test reachability',
  'traceroute': 'Trace packet route hops to destination address',
  'exit': 'Exit current session or EXEC mode',
};

const GLOBAL_CONFIG_COMMANDS: Record<string, string> = {
  'hostname': 'Set system network name',
  'interface': 'Select an interface to configure',
  'ip routing': 'Enable IPv4 routing on Layer 3 switch',
  'ipv6 unicast-routing': 'Enable IPv6 routing globally across interfaces',
  'ip route': 'Establish static IPv4 route',
  'ipv6 route': 'Establish static IPv6 route',
  'ip default-gateway': 'Specify default gateway for Layer 2 management',
  'router ospf 1': 'Enable OSPF routing process 1',
  'router bgp 65000': 'Enable BGP routing process with AS number',
  'router eigrp 100': 'Enable EIGRP routing process',
  'vlan': 'Enter VLAN configuration mode',
  'access-list 10 permit any': 'Configure standard IP access control list',
  'ip access-list standard': 'Define named standard access list',
  'ip access-list extended': 'Define named extended access list',
  'ip nat inside source list 1 interface GigabitEthernet0/0 overload': 'Enable Port Address Translation (PAT)',
  'ip nat pool NAT-POOL': 'Define IP NAT address pool',
  'line console 0': 'Configure primary console terminal line',
  'line vty 0 4': 'Configure virtual terminal lines for SSH/Telnet',
  'banner motd #': 'Define Message of the Day login banner',
  'enable secret cisco': 'Set encrypted privileged EXEC password',
  'service password-encryption': 'Encrypt plaintext passwords in configuration',
  'no ip domain-lookup': 'Disable DNS name resolution on CLI mistypes',
  'exit': 'Exit configuration mode to Privileged EXEC',
  'end': 'Exit immediately to Privileged EXEC mode',
  'do show ip interface brief': 'Execute show command from config mode',
  'do show ip route': 'Execute show ip route from config mode',
  'do show running-config': 'Execute show run from config mode',
  'do show vlan brief': 'Execute show vlan from config mode',
  'do show ipv6 interface brief': 'Execute show ipv6 int br from config mode',
  'do show ipv6 route': 'Execute show ipv6 route from config mode',
  'do write memory': 'Save configuration from config mode',
};

const INTERFACE_CONFIG_COMMANDS: Record<string, string> = {
  'ip address': 'Set IPv4 address and subnet mask on interface',
  'ipv6 address': 'Set IPv6 global or link-local address on interface',
  'ipv6 address fe80::1 link-local': 'Assign static link-local IPv6 address',
  'ipv6 enable': 'Enable IPv6 processing without global unicast address',
  'no shutdown': 'Enable interface and bring line protocol up',
  'shutdown': 'Administratively disable interface',
  'description': 'Configure interface description label',
  'encapsulation dot1Q': 'Set IEEE 802.1Q trunk encapsulation for subinterface',
  'switchport mode access': 'Configure port as untagged access link',
  'switchport mode trunk': 'Configure port as 802.1Q trunk link',
  'switchport access vlan': 'Assign access port to VLAN',
  'switchport trunk allowed vlan': 'Specify allowed VLANs on trunk link',
  'switchport trunk native vlan': 'Set untagged native VLAN for 802.1Q trunk',
  'switchport nonegotiate': 'Disable DTP (Dynamic Trunking Protocol) negotiation',
  'ip ospf 1 area 0': 'Enable OSPF directly on interface',
  'ip nat inside': 'Designate interface as connected to inside network',
  'ip nat outside': 'Designate interface as connected to outside network',
  'ip helper-address': 'Configure DHCP relay agent helper IP',
  'speed 1000': 'Configure interface speed in Mbps',
  'duplex full': 'Configure full-duplex operation',
  'channel-group 1 mode active': 'Add interface to LACP EtherChannel group',
  'spanning-tree portfast': 'Enable STP PortFast for immediate forwarding',
  'spanning-tree bpduguard enable': 'Enable BPDU Guard on access port',
  'exit': 'Exit interface configuration to global config',
  'end': 'Exit configuration to Privileged EXEC mode',
  'do show ip interface brief': 'Verify interface status from interface context',
  'do show running-config': 'View running-config from interface context',
};

const ROUTER_OSPF_COMMANDS: Record<string, string> = {
  'network': 'Define a network and wildcard mask for OSPF routing',
  'network 192.168.1.0 0.0.0.255 area 0': 'Advertise subnet in OSPF Area 0',
  'router-id': 'Manually configure OSPF 32-bit router ID',
  'passive-interface default': 'Suppress OSPF hello broadcasts on all interfaces',
  'no passive-interface': 'Allow OSPF hellos on specified interface',
  'auto-cost reference-bandwidth 1000': 'Adjust OSPF reference bandwidth in Mbps',
  'exit': 'Exit router configuration mode',
  'end': 'Exit to Privileged EXEC mode',
  'do show ip ospf neighbor': 'Verify OSPF neighbors from router context',
};

const ROUTER_BGP_COMMANDS: Record<string, string> = {
  'neighbor': 'Specify a BGP neighbor IP and parameters',
  'neighbor 10.0.0.2 remote-as 65001': 'Configure eBGP/iBGP peer address and AS',
  'neighbor 10.0.0.2 update-source Loopback0': 'Use Loopback as source IP for BGP session',
  'network': 'Advertise network prefix into BGP table',
  'network 192.168.1.0 mask 255.255.255.0': 'Inject network into BGP RIB',
  'bgp router-id': 'Configure BGP router identifier',
  'exit': 'Exit router BGP configuration mode',
  'end': 'Exit to Privileged EXEC mode',
  'do show ip bgp summary': 'Verify BGP peering status from router context',
};

const VLAN_CONFIG_COMMANDS: Record<string, string> = {
  'name': 'Assign an ASCII descriptive name to the VLAN',
  'state active': 'Set operational state of VLAN to active',
  'shutdown': 'Suspend VLAN traffic',
  'no shutdown': 'Resume VLAN traffic',
  'exit': 'Apply VLAN configuration and exit',
  'end': 'Exit to Privileged EXEC mode',
};

const PC_COMMANDS: Record<string, string> = {
  'ip 192.168.1.10/24 192.168.1.1': 'Configure static IPv4 address, mask, and gateway',
  'ipv6 2001:db8:acad:1::10/64 2001:db8:acad:1::1': 'Configure static IPv6 address, prefix, and gateway',
  'show ip': 'Display host IP, mask, gateway, and MAC configuration',
  'show ipv6': 'Display host IPv6 addresses and default router',
  'ping 192.168.1.1': 'Send ICMP echo request packets to target IPv4',
  'ping 2001:db8:acad:1::1': 'Send ICMP echo request packets to target IPv6',
  'trace 192.168.1.1': 'Trace hops to destination host',
  'help': 'Display VPCS host help commands',
};

/**
 * Intelligent Autocompletion Engine for Cisco IOS CLI
 */
export function getAutocompletions(
  input: string,
  device: SimulatedDevice,
  allDevices: SimulatedDevice[] = []
): {
  completedText: string;
  hasChanged: boolean;
  suggestions: CompletionSuggestion[];
  isExactOrUnique: boolean;
} {
  const trimmed = input.trimStart();
  const lower = trimmed.toLowerCase();

  // Determine current command dictionary based on device mode
  let commandMap: Record<string, string> = {};

  if (device.deviceType === 'pc') {
    commandMap = PC_COMMANDS;
  } else {
    switch (device.mode) {
      case 'user_exec':
        commandMap = {
          'enable': 'Enter privileged EXEC mode',
          'show ip interface brief': 'Display interface summary',
          'show ip route': 'Display routing table',
          'show vlan brief': 'Display VLAN summary',
          'ping': 'Send ICMP echos',
          'traceroute': 'Trace packet route',
          'exit': 'Exit console session',
        };
        break;
      case 'priv_exec':
        commandMap = EXEC_COMMANDS;
        break;
      case 'global_config':
        commandMap = GLOBAL_CONFIG_COMMANDS;
        break;
      case 'interface_config':
      case 'subinterface_config':
        commandMap = INTERFACE_CONFIG_COMMANDS;
        break;
      case 'router_ospf':
        commandMap = ROUTER_OSPF_COMMANDS;
        break;
      case 'router_bgp':
        commandMap = ROUTER_BGP_COMMANDS;
        break;
      case 'vlan_config':
        commandMap = VLAN_CONFIG_COMMANDS;
        break;
      default:
        commandMap = EXEC_COMMANDS;
    }
  }

  // Dynamic device interfaces
  const ifNames = Object.keys(device.interfaces);

  // If user typed 'interface ' or 'int ' in global config, suggest actual interfaces
  if ((device.mode === 'global_config' || device.mode === 'priv_exec') && lower.match(/^(?:interface|int)\s*(.*)$/)) {
    const match = lower.match(/^(?:interface|int)\s*(.*)$/);
    const ifPrefix = (match && match[1]) ? match[1].toLowerCase() : '';
    const matchingIfs = ifNames.filter((name) => name.toLowerCase().startsWith(ifPrefix));

    if (matchingIfs.length > 0) {
      const suggestions: CompletionSuggestion[] = matchingIfs.map((name) => ({
        text: name,
        fullCommand: `interface ${name}`,
        description: `Select ${name} (${device.interfaces[name]?.status || 'down'})`,
      }));

      const isSingle = matchingIfs.length === 1;
      const completedText = isSingle ? `interface ${matchingIfs[0]}` : input;

      return {
        completedText,
        hasChanged: completedText !== input,
        suggestions,
        isExactOrUnique: isSingle,
      };
    }
  }

  // If user typed 'ping ' suggest known IP addresses in the topology
  if (lower.startsWith('ping ')) {
    const ipPrefix = lower.replace(/^ping\s+/, '');
    const knownIps: Array<{ ip: string; devName: string }> = [];
    allDevices.forEach((d) => {
      if (d.pcConfig?.ip) knownIps.push({ ip: d.pcConfig.ip, devName: d.hostname });
      if (d.pcConfig?.ipv6) knownIps.push({ ip: d.pcConfig.ipv6, devName: `${d.hostname} (IPv6)` });
      Object.values(d.interfaces).forEach((iface) => {
        if (iface.ip) knownIps.push({ ip: iface.ip, devName: `${d.hostname} ${iface.shortName}` });
        if (iface.ipv6) knownIps.push({ ip: iface.ipv6, devName: `${d.hostname} ${iface.shortName} (IPv6)` });
      });
    });

    const matching = knownIps.filter((item) => item.ip.toLowerCase().startsWith(ipPrefix));
    if (matching.length > 0) {
      const suggestions: CompletionSuggestion[] = matching.map((item) => ({
        text: item.ip,
        fullCommand: `ping ${item.ip}`,
        description: `ICMP echo to ${item.devName}`,
      }));

      const isSingle = matching.length === 1;
      const completedText = isSingle ? `ping ${matching[0].ip}` : input;

      return {
        completedText,
        hasChanged: completedText !== input,
        suggestions,
        isExactOrUnique: isSingle,
      };
    }
  }

  // Token-based matching against the command map
  // 1. Direct prefix match
  const matches: Array<{ cmd: string; desc: string }> = [];

  for (const [cmd, desc] of Object.entries(commandMap)) {
    if (cmd.toLowerCase().startsWith(lower)) {
      matches.push({ cmd, desc });
    }
  }

  // 2. Abbreviated multi-token match (e.g. "sh ip int br" -> "show ip interface brief")
  if (matches.length === 0 && lower.includes(' ')) {
    const tokens = lower.split(/\s+/).filter(Boolean);
    for (const [cmd, desc] of Object.entries(commandMap)) {
      const cmdTokens = cmd.toLowerCase().split(/\s+/);
      if (tokens.length <= cmdTokens.length) {
        const allMatch = tokens.every((token, idx) => cmdTokens[idx]?.startsWith(token));
        if (allMatch) {
          matches.push({ cmd, desc });
        }
      }
    }
  }

  // 3. Fallback: single word abbreviation (e.g. "sh" -> "show ...", "conf" -> "configure terminal")
  if (matches.length === 0) {
    for (const [cmd, desc] of Object.entries(commandMap)) {
      const firstWord = cmd.split(' ')[0].toLowerCase();
      if (firstWord.startsWith(lower)) {
        matches.push({ cmd, desc });
      }
    }
  }

  if (matches.length === 0) {
    return {
      completedText: input,
      hasChanged: false,
      suggestions: [],
      isExactOrUnique: false,
    };
  }

  // Unique or exact match
  if (matches.length === 1) {
    return {
      completedText: matches[0].cmd,
      hasChanged: matches[0].cmd !== input,
      suggestions: [{
        text: matches[0].cmd,
        fullCommand: matches[0].cmd,
        description: matches[0].desc,
      }],
      isExactOrUnique: true,
    };
  }

  // Multiple matches: Find longest common prefix among all matches
  const commonPrefix = findLongestCommonPrefix(matches.map((m) => m.cmd));
  const completedText = commonPrefix.length > input.length ? commonPrefix : input;

  const suggestions: CompletionSuggestion[] = matches.slice(0, 10).map((m) => ({
    text: m.cmd,
    fullCommand: m.cmd,
    description: m.desc,
  }));

  return {
    completedText,
    hasChanged: completedText !== input,
    suggestions,
    isExactOrUnique: false,
  };
}

function findLongestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}
