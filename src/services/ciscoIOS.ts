import { SimulatedDevice, RouteEntry, OSPFNeighbor, VlanEntry } from '../types/network';

// Helper to normalize interface names
export function normalizeInterfaceName(input: string): string {
  const clean = input.trim().toLowerCase().replace(/\s+/g, '');
  
  // Subinterface check
  const subMatch = clean.match(/^([a-z]+)(\d+(?:\/\d+)*(?:\.\d+)?)\.(\d+)$/);
  if (subMatch) {
    const type = subMatch[1];
    const port = subMatch[2];
    const sub = subMatch[3];
    const base = normalizeInterfaceName(`${type}${port}`);
    return `${base}.${sub}`;
  }

  if (clean.startsWith('gi') || clean.startsWith('g')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `GigabitEthernet${num}`;
  }
  if (clean.startsWith('fa') || clean.startsWith('f')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `FastEthernet${num}`;
  }
  if (clean.startsWith('eth') || clean.startsWith('et') || clean.startsWith('e')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `Ethernet${num}`;
  }
  if (clean.startsWith('lo')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `Loopback${num}`;
  }
  if (clean.startsWith('se') || clean.startsWith('s')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `Serial${num}`;
  }
  if (clean.startsWith('vl')) {
    const num = clean.replace(/^[a-z]+/, '');
    return `Vlan${num}`;
  }
  if (clean.startsWith('po')) {
    const num = clean.replace(/^[a-z\-]+/, '');
    return `Port-channel${num}`;
  }
  return input.trim();
}

export function maskToCidr(mask: string): number {
  return mask.split('.').reduce((acc, octet) => {
    return acc + (Number(octet).toString(2).match(/1/g) || []).length;
  }, 0);
}

export function cidrToMask(cidr: number): string {
  const mask = [];
  for (let i = 0; i < 4; i++) {
    const n = Math.min(cidr, 8);
    mask.push(256 - Math.pow(2, 8 - n));
    cidr -= n;
  }
  return mask.join('.');
}

export function getPrompt(device: SimulatedDevice): string {
  if (device.deviceType === 'pc') {
    return `${device.hostname}> `;
  }

  const h = device.hostname;
  switch (device.mode) {
    case 'user_exec':
      return `${h}>`;
    case 'priv_exec':
      return `${h}#`;
    case 'global_config':
      return `${h}(config)#`;
    case 'interface_config':
      return `${h}(config-if)#`;
    case 'subinterface_config':
      return `${h}(config-subif)#`;
    case 'router_ospf':
    case 'router_bgp':
    case 'router_eigrp':
      return `${h}(config-router)#`;
    case 'vlan_config':
      return `${h}(config-vlan)#`;
    case 'line_config':
      return `${h}(config-line)#`;
    default:
      return `${h}#`;
  }
}

export interface CommandResult {
  output: string;
  device: SimulatedDevice;
  allDevices?: Record<string, SimulatedDevice>;
  pingSuccess?: { source: string; target: string; targetIp: string };
}

export function executeCommand(
  rawCmd: string,
  device: SimulatedDevice,
  allDevices: Record<string, SimulatedDevice> = {}
): CommandResult {
  const cmd = rawCmd.trim();
  const lower = cmd.toLowerCase();

  // Make deep copies to maintain immutability
  const dev: SimulatedDevice = JSON.parse(JSON.stringify(device));
  const devs: Record<string, SimulatedDevice> = JSON.parse(JSON.stringify(allDevices));
  devs[dev.id] = dev;

  // Empty command
  if (!cmd) {
    return { output: '', device: dev, allDevices: devs };
  }

  // Record command history
  if (!dev.commandHistory.includes(cmd)) {
    dev.commandHistory.push(cmd);
  }

  // Handle PC commands
  if (dev.deviceType === 'pc') {
    return handlePCCommand(cmd, lower, dev, devs);
  }

  // Handle help (?)
  if (cmd.endsWith('?') || cmd === 'help') {
    return { output: getHelpForMode(dev.mode), device: dev, allDevices: devs };
  }

  // ----------------------------------------------------
  // Mode Navigation & Universal Commands
  // ----------------------------------------------------
  if (lower === 'enable' || lower === 'en' || lower === 'ena') {
    dev.mode = 'priv_exec';
    return { output: '', device: dev, allDevices: devs };
  }

  if (lower === 'disable' || lower === 'dis') {
    dev.mode = 'user_exec';
    return { output: '', device: dev, allDevices: devs };
  }

  if (lower === 'exit' || lower === 'ex') {
    switch (dev.mode) {
      case 'user_exec':
        return { output: 'Connection closed.', device: dev, allDevices: devs };
      case 'priv_exec':
        dev.mode = 'user_exec';
        break;
      case 'global_config':
        dev.mode = 'priv_exec';
        break;
      case 'interface_config':
      case 'subinterface_config':
      case 'router_ospf':
      case 'router_bgp':
      case 'router_eigrp':
      case 'vlan_config':
      case 'line_config':
        dev.mode = 'global_config';
        dev.currentContext = {};
        break;
    }
    return { output: '', device: dev, allDevices: devs };
  }

  if (lower === 'end' || lower === 'ctrl-c') {
    dev.mode = 'priv_exec';
    dev.currentContext = {};
    return { output: '', device: dev, allDevices: devs };
  }

  // ----------------------------------------------------
  // Privileged EXEC Mode Commands
  // ----------------------------------------------------
  if (dev.mode === 'priv_exec') {
    if (
      lower === 'configure terminal' ||
      lower === 'conf t' ||
      lower === 'config t' ||
      lower === 'conf term' ||
      lower === 'configure term' ||
      lower === 'conf ter'
    ) {
      dev.mode = 'global_config';
      return {
        output: 'Enter configuration commands, one per line.  End with CNTL/Z.',
        device: dev,
        allDevices: devs,
      };
    }

    if (
      lower === 'write memory' ||
      lower === 'wr' ||
      lower === 'w' ||
      lower === 'wr mem' ||
      lower === 'write mem' ||
      lower === 'write' ||
      lower === 'copy running-config startup-config' ||
      lower === 'copy run start' ||
      lower === 'cop run start' ||
      lower === 'copy r s' ||
      lower === 'cop r st'
    ) {
      return {
        output: 'Building configuration...\n[OK]',
        device: dev,
        allDevices: devs,
      };
    }

    if (lower === 'reload') {
      return {
        output: 'Proceed with reload? [confirm]\n% System reloaded\nInitializing Cisco IOS Software...',
        device: dev,
        allDevices: devs,
      };
    }
  }

  // ----------------------------------------------------
  // SHOW & EXEC COMMANDS (Available in Privileged EXEC or with 'do' in config)
  // ----------------------------------------------------
  let isDoCommand = false;
  let showCmd = lower;
  if (dev.mode !== 'priv_exec' && dev.mode !== 'user_exec' && lower.startsWith('do ')) {
    isDoCommand = true;
    showCmd = lower.replace(/^do\s+/, '').trim();

    // Check if it's "do wr", "do write", "do copy run start"
    if (
      showCmd === 'write memory' ||
      showCmd === 'wr' ||
      showCmd === 'w' ||
      showCmd === 'wr mem' ||
      showCmd === 'write mem' ||
      showCmd === 'write' ||
      showCmd === 'copy running-config startup-config' ||
      showCmd === 'copy run start' ||
      showCmd === 'cop run start'
    ) {
      return {
        output: 'Building configuration...\n[OK]',
        device: dev,
        allDevices: devs,
      };
    }
  }

  if (dev.mode === 'priv_exec' || dev.mode === 'user_exec' || isDoCommand) {
    // 1. show ipv6 interface brief
    if (/^(?:show|sh)\s+ipv6\s+(?:interface|int)\s*(?:brief|br)?$/i.test(showCmd)) {
      return { output: formatShowIpv6InterfaceBrief(dev), device: dev, allDevices: devs };
    }

    // 2. show ipv6 route
    if (/^(?:show|sh)\s+ipv6\s+(?:route|ro)$/i.test(showCmd)) {
      return { output: formatShowIpv6Route(dev), device: dev, allDevices: devs };
    }

    // 3. show ip interface brief
    if (
      /^(?:show|sh)\s+ip\s+(?:interface|int)\s*(?:brief|br)?$/i.test(showCmd) ||
      /^(?:show|sh)\s+(?:interface|int)\s+(?:brief|br)$/i.test(showCmd)
    ) {
      return { output: formatShowIpInterfaceBrief(dev), device: dev, allDevices: devs };
    }

    // 4. show ip route [filter]
    if (/^(?:show|sh)\s+ip\s+(?:route|ro)(?:\s+(?:ospf|bgp|connected|static))?$/i.test(showCmd)) {
      return { output: formatShowIpRoute(dev), device: dev, allDevices: devs };
    }

    // 5. show vlan brief / show vlan
    if (/^(?:show|sh)\s+vlan(?:\s+(?:brief|br))?$/i.test(showCmd)) {
      return { output: formatShowVlanBrief(dev), device: dev, allDevices: devs };
    }

    // 6. show ip ospf neighbor
    if (/^(?:show|sh)\s+ip\s+ospf\s+(?:neighbor|nei|n)$/i.test(showCmd)) {
      return { output: formatShowIpOspfNeighbor(dev), device: dev, allDevices: devs };
    }

    // 7. show ip ospf database
    if (/^(?:show|sh)\s+ip\s+ospf\s+(?:database|db|data)$/i.test(showCmd)) {
      return { output: formatShowIpOspfDatabase(dev), device: dev, allDevices: devs };
    }

    // 8. show ip ospf interface
    if (/^(?:show|sh)\s+ip\s+ospf\s+(?:interface|int)(?:\s+.*)?$/i.test(showCmd)) {
      return { output: formatShowIpOspfInterface(dev), device: dev, allDevices: devs };
    }

    // 9. show ip bgp summary
    if (/^(?:show|sh)\s+ip\s+bgp\s+(?:summary|sum)$/i.test(showCmd)) {
      return { output: formatShowIpBgpSummary(dev), device: dev, allDevices: devs };
    }

    // 10. show ip bgp neighbors
    if (/^(?:show|sh)\s+ip\s+bgp\s+(?:neighbors|neighbor|nei)$/i.test(showCmd)) {
      return { output: formatShowIpBgpNeighbors(dev), device: dev, allDevices: devs };
    }

    // 11. show running-config
    if (/^(?:show|sh)\s+(?:running-config|run|running)(?:\s+.*)?$/i.test(showCmd)) {
      return { output: formatShowRunningConfig(dev), device: dev, allDevices: devs };
    }

    // 12. show startup-config
    if (/^(?:show|sh)\s+(?:startup-config|start|startup)$/i.test(showCmd)) {
      return { output: formatShowStartupConfig(dev), device: dev, allDevices: devs };
    }

    // 13. show version
    if (/^(?:show|sh)\s+(?:version|ver|v)$/i.test(showCmd)) {
      return { output: formatShowVersion(dev), device: dev, allDevices: devs };
    }

    // 14. show interfaces
    if (/^(?:show|sh)\s+(?:interfaces|int|interf)(?:\s+.*)?$/i.test(showCmd)) {
      return { output: formatShowInterfaces(dev), device: dev, allDevices: devs };
    }

    // 15. show access-lists
    if (/^(?:show|sh)\s+(?:ip\s+)?(?:access-lists|access-list|acl|acls)$/i.test(showCmd)) {
      return { output: formatShowAccessLists(dev), device: dev, allDevices: devs };
    }

    // 16. show ip nat translations
    if (/^(?:show|sh)\s+ip\s+nat\s+(?:translations|trans|tran)$/i.test(showCmd)) {
      return { output: formatShowIpNatTranslations(dev), device: dev, allDevices: devs };
    }

    // 17. show ip nat statistics
    if (/^(?:show|sh)\s+ip\s+nat\s+(?:statistics|stat|stats)$/i.test(showCmd)) {
      return { output: formatShowIpNatStatistics(dev), device: dev, allDevices: devs };
    }

    // 18. show mac address-table
    if (/^(?:show|sh)\s+mac(?:\s+(?:address-table|address|addr|add))?$/i.test(showCmd)) {
      return { output: formatShowMacAddressTable(dev), device: dev, allDevices: devs };
    }

    // 19. show cdp neighbors [detail]
    if (/^(?:show|sh)\s+cdp\s+(?:neighbors|neighbor|nei)(?:\s+(?:detail|det))?$/i.test(showCmd)) {
      return { output: formatShowCdpNeighbors(dev, devs), device: dev, allDevices: devs };
    }

    // 20. show lldp neighbors
    if (/^(?:show|sh)\s+lldp\s+(?:neighbors|neighbor|nei)$/i.test(showCmd)) {
      return { output: formatShowLldpNeighbors(dev, devs), device: dev, allDevices: devs };
    }

    // 21. show clock
    if (/^(?:show|sh)\s+(?:clock|clo)$/i.test(showCmd)) {
      return { output: `*${new Date().toTimeString().split(' ')[0]}.000 UTC ${new Date().toDateString()}`, device: dev, allDevices: devs };
    }

    // 22. show history
    if (/^(?:show|sh)\s+(?:history|his)$/i.test(showCmd)) {
      return { output: dev.commandHistory.slice(-20).join('\n'), device: dev, allDevices: devs };
    }

    // Ping
    if (showCmd.startsWith('ping ')) {
      return handlePingCommand(showCmd, dev, devs);
    }

    // Traceroute
    if (showCmd.startsWith('traceroute ') || showCmd.startsWith('trace ')) {
      const target = showCmd.split(/\s+/)[1];
      return {
        output: `Tracing the route to ${target}\n 1 ${target} 2 msec 1 msec 2 msec`,
        device: dev,
        allDevices: devs,
      };
    }
  }

  // ----------------------------------------------------
  // Global Configuration Mode Commands
  // ----------------------------------------------------
  if (dev.mode === 'global_config') {
    // ipv6 unicast-routing / ipv6 routing
    if (/^ipv6\s+(?:unicast-routing|routing|uni)$/i.test(lower)) {
      dev.ipv6Routing = true;
      dev.runningConfig.push('ipv6 unicast-routing');
      return { output: '', device: dev, allDevices: devs };
    }
    if (/^no\s+ipv6\s+(?:unicast-routing|routing|uni)$/i.test(lower)) {
      dev.ipv6Routing = false;
      return { output: '', device: dev, allDevices: devs };
    }

    // ip routing
    if (/^ip\s+routing$/i.test(lower)) {
      dev.runningConfig.push('ip routing');
      return { output: '', device: dev, allDevices: devs };
    }

    // no ip domain-lookup
    if (/^no\s+ip\s+domain[\s\-]lookup$/i.test(lower)) {
      return { output: '', device: dev, allDevices: devs };
    }

    // hostname <name> / host <name>
    const hostMatch = cmd.match(/^(?:hostname|host)\s+([A-Za-z0-9_\-]+)$/i);
    if (hostMatch) {
      dev.hostname = hostMatch[1];
      dev.runningConfig.push(`hostname ${dev.hostname}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // interface <name> / int <name> / i <name>
    const intMatch = cmd.match(/^(?:interface|int|i)\s+([A-Za-z0-9\/\.\s]+)$/i);
    if (intMatch) {
      const rawName = intMatch[1].trim();
      const normName = normalizeInterfaceName(rawName);

      // Match against device's existing interfaces by key or shortName
      const existingKey = Object.keys(dev.interfaces).find(
        (k) =>
          k.toLowerCase() === normName.toLowerCase() ||
          dev.interfaces[k].shortName.toLowerCase() === normName.toLowerCase() ||
          dev.interfaces[k].shortName.toLowerCase() === rawName.toLowerCase().replace(/\s+/g, '')
      );
      const targetName = existingKey || normName;

      if (targetName.includes('.')) {
        dev.mode = 'subinterface_config';
        dev.currentContext.subinterface = targetName;
      } else {
        dev.mode = 'interface_config';
        dev.currentContext.interface = targetName;
      }

      // Ensure interface exists in dev
      if (!dev.interfaces[targetName]) {
        dev.interfaces[targetName] = {
          name: targetName,
          shortName: targetName.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace('Ethernet', 'Eth'),
          status: 'administratively down',
          protocol: 'down',
        };
      }
      return { output: '', device: dev, allDevices: devs };
    }

    // router ospf <process-id> / r ospf <id>
    const ospfMatch = cmd.match(/^(?:router|r|ro)\s+ospf\s+(\d+)$/i);
    if (ospfMatch) {
      dev.mode = 'router_ospf';
      dev.currentContext.processId = ospfMatch[1];
      dev.ospf.processId = ospfMatch[1];
      dev.runningConfig.push(`router ospf ${ospfMatch[1]}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // router bgp <as-number> / r bgp <as>
    const bgpMatch = cmd.match(/^(?:router|r|ro)\s+bgp\s+(\d+)$/i);
    if (bgpMatch) {
      dev.mode = 'router_bgp';
      const asNum = parseInt(bgpMatch[1], 10);
      dev.currentContext.asNumber = asNum;
      dev.bgp.asNumber = asNum;
      dev.runningConfig.push(`router bgp ${asNum}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // vlan <id> / vl <id>
    const vlanMatch = cmd.match(/^(?:vlan|vl)\s+(\d+)$/i);
    if (vlanMatch) {
      const vlanId = parseInt(vlanMatch[1], 10);
      dev.mode = 'vlan_config';
      dev.currentContext.vlanId = vlanId;
      if (!dev.vlans[vlanId]) {
        dev.vlans[vlanId] = {
          id: vlanId,
          name: `VLAN${vlanId.toString().padStart(4, '0')}`,
          status: 'active',
          ports: [],
        };
      }
      return { output: '', device: dev, allDevices: devs };
    }

    // ip route <prefix> <mask/cidr> <nexthop> / ip ro ...
    const staticRouteMatch = cmd.match(/^ip\s+(?:route|ro)\s+(\d+\.\d+\.\d+\.\d+)(?:\s+(\d+\.\d+\.\d+\.\d+)|\/(\d+))\s+([A-Za-z0-9\/\.]+|\d+\.\d+\.\d+\.\d+)$/i);
    if (staticRouteMatch) {
      const prefix = staticRouteMatch[1];
      const mask = staticRouteMatch[2] || (staticRouteMatch[3] ? cidrToMask(parseInt(staticRouteMatch[3], 10)) : '255.255.255.0');
      const cidr = staticRouteMatch[3] ? parseInt(staticRouteMatch[3], 10) : maskToCidr(mask);
      const nextHop = staticRouteMatch[4];

      dev.routingTable.push({
        type: 'S',
        prefix: `${prefix}/${cidr}`,
        mask,
        cidr,
        nextHop: nextHop.includes('.') ? nextHop : undefined,
        interface: !nextHop.includes('.') ? nextHop : undefined,
        metric: 1,
        adminDistance: 1,
      });

      dev.runningConfig.push(`ip route ${prefix} ${mask} ${nextHop}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // access-list <num> permit/deny ... / acl ...
    const aclMatch = cmd.match(/^(?:access-list|acl)\s+(\d+)\s+(permit|deny)\s+(.+)$/i);
    if (aclMatch) {
      const aclNum = aclMatch[1];
      const action = aclMatch[2].toLowerCase() as 'permit' | 'deny';
      const rest = aclMatch[3];
      dev.acls[aclNum] = dev.acls[aclNum] || [];
      dev.acls[aclNum].push({
        ruleNumber: dev.acls[aclNum].length + 1,
        action,
        source: rest,
      });
      dev.runningConfig.push(`access-list ${aclNum} ${action} ${rest}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // ip nat inside source list <num> interface <name> overload
    const natOverloadMatch = cmd.match(/^ip\s+nat\s+inside\s+source\s+list\s+(\d+)\s+(?:interface|int)\s+([A-Za-z0-9\/\.]+)\s+overload$/i);
    if (natOverloadMatch) {
      const aclNum = parseInt(natOverloadMatch[1], 10);
      const ifName = normalizeInterfaceName(natOverloadMatch[2]);
      dev.nat.sourceList = { aclNumber: aclNum, overload: true, interfaceName: ifName };
      dev.runningConfig.push(cmd);
      return { output: '', device: dev, allDevices: devs };
    }

    // banner motd
    if (lower.startsWith('banner motd') || lower.startsWith('banner ')) {
      dev.bannerMotd = cmd.replace(/^banner\s+(?:motd\s+)?/i, '').replace(/^[#^C]/, '').replace(/[#^C]$/, '');
      dev.runningConfig.push(cmd);
      return { output: '', device: dev, allDevices: devs };
    }

    // enable secret <pwd>
    const secMatch = cmd.match(/^enable\s+secret\s+(.+)$/i);
    if (secMatch) {
      dev.enableSecret = secMatch[1];
      dev.runningConfig.push(cmd);
      return { output: '', device: dev, allDevices: devs };
    }

    return {
      output: `% Invalid input detected at '^' marker.\n${cmd}`,
      device: dev,
      allDevices: devs,
    };
  }

  // ----------------------------------------------------
  // Interface Configuration Mode
  // ----------------------------------------------------
  if (dev.mode === 'interface_config' || dev.mode === 'subinterface_config') {
    const ifName = dev.currentContext.interface || dev.currentContext.subinterface;
    if (!ifName) {
      dev.mode = 'global_config';
      return { output: '% Error: Interface context lost', device: dev, allDevices: devs };
    }

    const iface = dev.interfaces[ifName] || {
      name: ifName,
      shortName: ifName.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa'),
      status: 'administratively down',
      protocol: 'down',
    };

    // ip address <ip> <mask/cidr> / ip addr ... / ip add ...
    const ipMatch = cmd.match(/^ip\s+(?:address|addr|add)\s+(\d+\.\d+\.\d+\.\d+)(?:\s+(\d+\.\d+\.\d+\.\d+)|\/(\d+))$/i);
    if (ipMatch) {
      const ip = ipMatch[1];
      const mask = ipMatch[2] || (ipMatch[3] ? cidrToMask(parseInt(ipMatch[3], 10)) : '255.255.255.0');
      const cidr = ipMatch[3] ? parseInt(ipMatch[3], 10) : maskToCidr(mask);
      iface.ip = ip;
      iface.subnetMask = mask;
      iface.cidr = cidr;

      // Update connected route if interface is up
      if (iface.status === 'up') {
        updateConnectedRoutes(dev);
      }

      dev.interfaces[ifName] = iface;
      dev.runningConfig.push(`interface ${ifName}\n ip address ${ip} ${mask}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // ipv6 address <ip>/<cidr> / ipv6 addr / ipv6 add
    const ipv6Match = cmd.match(/^ipv6\s+(?:address|addr|add)\s+([0-9a-fA-F:]+)\/(\d+)(?:\s+eui-64)?$/i);
    if (ipv6Match) {
      const ipv6 = ipv6Match[1];
      const cidr = parseInt(ipv6Match[2], 10);
      iface.ipv6 = ipv6;
      iface.ipv6Cidr = cidr;
      iface.ipv6Enabled = true;
      if (!iface.ipv6LinkLocal) {
        iface.ipv6LinkLocal = `fe80::${dev.id.toLowerCase()}:1`;
      }
      if (!dev.ipv6Routes) dev.ipv6Routes = [];
      const netPrefix = ipv6.includes('::') ? ipv6.replace(/::[0-9a-fA-F]*$/, '::') : ipv6;
      if (!dev.ipv6Routes.some((r) => r.prefix === netPrefix)) {
        dev.ipv6Routes.push({ type: 'C', prefix: netPrefix, cidr, interface: ifName });
      }
      dev.interfaces[ifName] = iface;
      dev.runningConfig.push(`interface ${ifName}\n ipv6 address ${ipv6}/${cidr}`);
      return { output: '', device: dev, allDevices: devs };
    }

    // ipv6 address <link-local> link-local / ipv6 add ... link
    const ipv6LlMatch = cmd.match(/^ipv6\s+(?:address|addr|add)\s+([0-9a-fA-F:]+)\s+(?:link-local|link)$/i);
    if (ipv6LlMatch) {
      iface.ipv6LinkLocal = ipv6LlMatch[1];
      iface.ipv6Enabled = true;
      dev.interfaces[ifName] = iface;
      dev.runningConfig.push(`interface ${ifName}\n ipv6 address ${iface.ipv6LinkLocal} link-local`);
      return { output: '', device: dev, allDevices: devs };
    }

    // ipv6 enable / ipv6 en
    if (/^ipv6\s+(?:enable|en)$/i.test(lower)) {
      iface.ipv6Enabled = true;
      if (!iface.ipv6LinkLocal) iface.ipv6LinkLocal = `fe80::${dev.id.toLowerCase()}:1`;
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // no shutdown / no shut / no sh
    if (/^no\s+(?:shutdown|shut|sh)$/i.test(lower)) {
      iface.status = 'up';
      iface.protocol = 'up';
      dev.interfaces[ifName] = iface;
      updateConnectedRoutes(dev);
      recalculateNetworkState(devs);
      return {
        output: `%LINK-3-UPDOWN: Interface ${ifName}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${ifName}, changed state to up`,
        device: dev,
        allDevices: devs,
      };
    }

    // shutdown / shut / sh
    if (/^(?:shutdown|shut|sh)$/i.test(lower)) {
      iface.status = 'administratively down';
      iface.protocol = 'down';
      dev.interfaces[ifName] = iface;
      updateConnectedRoutes(dev);
      recalculateNetworkState(devs);
      return {
        output: `%LINK-5-CHANGED: Interface ${ifName}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${ifName}, changed state to down`,
        device: dev,
        allDevices: devs,
      };
    }

    // description <text> / desc <text>
    const descMatch = cmd.match(/^(?:description|desc|des)\s+(.+)$/i);
    if (descMatch) {
      iface.description = descMatch[1];
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // encapsulation dot1Q <vlan> / encap dot <vlan>
    const dot1qMatch = cmd.match(/^(?:encapsulation|encap)\s+(?:dot1q|dot)\s+(\d+)$/i);
    if (dot1qMatch) {
      const vlan = parseInt(dot1qMatch[1], 10);
      iface.encapsulation = { type: 'dot1q', vlan };
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // switchport mode access / sw mo acc / sw m a
    if (/^(?:switchport|sw)\s+(?:mode|mo|m)\s+(?:access|acc|a)$/i.test(lower)) {
      iface.mode = 'access';
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // switchport mode trunk / sw mo tr / sw m t
    if (/^(?:switchport|sw)\s+(?:mode|mo|m)\s+(?:trunk|tr|t)$/i.test(lower)) {
      iface.mode = 'trunk';
      dev.interfaces[ifName] = iface;
      return {
        output: `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${ifName}, changed state to up`,
        device: dev,
        allDevices: devs,
      };
    }

    // switchport access vlan <id> / sw acc vl <id> / sw ac vl <id>
    const swVlanMatch = cmd.match(/^(?:switchport|sw)\s+(?:access|acc|ac|a)\s+(?:vlan|vl|v)\s+(\d+)$/i);
    if (swVlanMatch) {
      const vid = parseInt(swVlanMatch[1], 10);
      iface.accessVlan = vid;
      dev.interfaces[ifName] = iface;
      if (!dev.vlans[vid]) {
        dev.vlans[vid] = { id: vid, name: `VLAN${vid.toString().padStart(4, '0')}`, status: 'active', ports: [] };
      }
      if (!dev.vlans[vid].ports.includes(iface.shortName)) {
        dev.vlans[vid].ports.push(iface.shortName);
      }
      return { output: '', device: dev, allDevices: devs };
    }

    // switchport trunk allowed vlan [add] <ids> / sw tr all vl <ids>
    const swTrunkMatch = cmd.match(/^(?:switchport|sw)\s+(?:trunk|tr|t)\s+(?:allowed|all)\s+(?:vlan|vl|v)(?:\s+add)?\s+([0-9,]+)$/i);
    if (swTrunkMatch) {
      const vlanStr = swTrunkMatch[1];
      const vlanIds = vlanStr.split(',').map((x) => parseInt(x, 10)).filter((x) => !isNaN(x));
      iface.allowedVlans = vlanIds;
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // ip nat inside / outside / in / out
    if (/^ip\s+nat\s+(?:inside|in)$/i.test(lower)) {
      iface.nat = 'inside';
      if (!dev.nat.insideInterfaces.includes(ifName)) dev.nat.insideInterfaces.push(ifName);
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }
    if (/^ip\s+nat\s+(?:outside|out)$/i.test(lower)) {
      iface.nat = 'outside';
      if (!dev.nat.outsideInterfaces.includes(ifName)) dev.nat.outsideInterfaces.push(ifName);
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    // ip ospf <proc> area <area> / ip ospf <proc> a <area>
    const ifOspfMatch = cmd.match(/^ip\s+ospf\s+(\d+)\s+(?:area|a)\s+(\d+)$/i);
    if (ifOspfMatch) {
      const proc = ifOspfMatch[1];
      const area = parseInt(ifOspfMatch[2], 10);
      iface.ospf = { processId: proc, area };
      if (!dev.ospf.processId) dev.ospf.processId = proc;
      if (iface.ip) {
        dev.ospf.networks.push({ network: calculateNetworkAddress(iface.ip, iface.subnetMask || '255.255.255.0'), wildcard: '0.0.0.255', area });
        recalculateOSPF(devs);
      }
      dev.interfaces[ifName] = iface;
      return { output: '', device: dev, allDevices: devs };
    }

    return {
      output: `% Invalid input detected at '^' marker.\n${cmd}`,
      device: dev,
      allDevices: devs,
    };
  }

  // ----------------------------------------------------
  // Router OSPF Configuration Mode
  // ----------------------------------------------------
  if (dev.mode === 'router_ospf') {
    // network <net> <wildcard> area <area> / net ... a <area>
    const netMatch = cmd.match(/^(?:network|net)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(?:area|a)\s+(\d+)$/i);
    if (netMatch) {
      const net = netMatch[1];
      const wildcard = netMatch[2];
      const area = parseInt(netMatch[3], 10);
      dev.ospf.networks.push({ network: net, wildcard, area });
      dev.runningConfig.push(` network ${net} ${wildcard} area ${area}`);

      // Check OSPF neighbor formation across topology
      recalculateOSPF(devs);

      return { output: '', device: dev, allDevices: devs };
    }

    // router-id <ip> / r-id <ip> / rid <ip>
    const ridMatch = cmd.match(/^(?:router-id|routerid|r-id|rid)\s+(\d+\.\d+\.\d+\.\d+)$/i);
    if (ridMatch) {
      dev.ospf.routerId = ridMatch[1];
      dev.runningConfig.push(` router-id ${ridMatch[1]}`);
      return { output: '', device: dev, allDevices: devs };
    }

    return {
      output: `% Incomplete command or invalid input.\n${cmd}`,
      device: dev,
      allDevices: devs,
    };
  }

  // ----------------------------------------------------
  // Router BGP Configuration Mode
  // ----------------------------------------------------
  if (dev.mode === 'router_bgp') {
    // neighbor <ip> remote-as <as> / nei ... remote <as>
    const neiMatch = cmd.match(/^(?:neighbor|nei|n)\s+(\d+\.\d+\.\d+\.\d+)\s+(?:remote-as|remote|as)\s+(\d+)$/i);
    if (neiMatch) {
      const ip = neiMatch[1];
      const remoteAs = parseInt(neiMatch[2], 10);
      dev.bgp.neighbors.push({
        ip,
        remoteAs,
        state: 'Established',
        prefixesReceived: 3,
      });
      dev.runningConfig.push(` neighbor ${ip} remote-as ${remoteAs}`);
      recalculateBGP(devs);
      return {
        output: `%BGP-5-ADJCHANGE: neighbor ${ip} Up`,
        device: dev,
        allDevices: devs,
      };
    }

    // network <net> mask <mask> / net ... m <mask>
    const bgpNetMatch = cmd.match(/^(?:network|net)\s+(\d+\.\d+\.\d+\.\d+)\s+(?:mask|m)\s+(\d+\.\d+\.\d+\.\d+)$/i);
    if (bgpNetMatch) {
      dev.bgp.networks.push({ network: bgpNetMatch[1], mask: bgpNetMatch[2] });
      dev.runningConfig.push(` network ${bgpNetMatch[1]} mask ${bgpNetMatch[2]}`);
      return { output: '', device: dev, allDevices: devs };
    }

    return {
      output: `% Incomplete command or invalid input.\n${cmd}`,
      device: dev,
      allDevices: devs,
    };
  }

  // ----------------------------------------------------
  // VLAN Configuration Mode
  // ----------------------------------------------------
  if (dev.mode === 'vlan_config') {
    const vlanId = dev.currentContext.vlanId;
    if (lower.startsWith('name ') && vlanId) {
      const name = cmd.replace(/^name\s+/i, '').trim();
      if (dev.vlans[vlanId]) {
        dev.vlans[vlanId].name = name;
      }
      return { output: '', device: dev, allDevices: devs };
    }
  }

  return {
    output: `% Invalid command or unrecognized mode: "${cmd}"`,
    device: dev,
    allDevices: devs,
  };
}

// ----------------------------------------------------
// PC Command Handler
// ----------------------------------------------------
function handlePCCommand(
  cmd: string,
  lower: string,
  dev: SimulatedDevice,
  devs: Record<string, SimulatedDevice>
): CommandResult {
  // ip <ip>/<cidr> [gateway] OR ip <ip> <mask> [gateway]
  const ipMatch = cmd.match(/^ip\s+(\d+\.\d+\.\d+\.\d+)(?:\/(\d+)|\s+(\d+\.\d+\.\d+\.\d+))?(?:\s+(\d+\.\d+\.\d+\.\d+))?$/i);
  if (ipMatch) {
    const ip = ipMatch[1];
    let cidr = 24;
    let mask = '255.255.255.0';
    if (ipMatch[2]) {
      cidr = parseInt(ipMatch[2], 10);
      mask = cidrToMask(cidr);
    } else if (ipMatch[3]) {
      mask = ipMatch[3];
      cidr = maskToCidr(mask);
    }
    const gw = ipMatch[4] || '';
    dev.pcConfig = { ...dev.pcConfig, ip, mask, gateway: gw };
    return {
      output: `Checking for duplicate IP address...\nPC assigned IP: ${ip}/${cidr} (${mask}) Gateway: ${gw || 'None'}`,
      device: dev,
      allDevices: devs,
    };
  }

  // ipv6 <ipv6>/<cidr> [gateway]
  const ipv6Match = cmd.match(/^ipv6\s+([0-9a-fA-F:]+)(?:\/(\d+))?(?:\s+([0-9a-fA-F:]+))?$/i);
  if (ipv6Match) {
    const ipv6 = ipv6Match[1];
    const cidr = ipv6Match[2] ? parseInt(ipv6Match[2], 10) : 64;
    const gw = ipv6Match[3] || '';
    dev.pcConfig = { ...dev.pcConfig, ipv6, ipv6Gateway: gw };
    return {
      output: `PC assigned IPv6: ${ipv6}/${cidr}${gw ? ` Gateway: ${gw}` : ''}`,
      device: dev,
      allDevices: devs,
    };
  }

  if (
    lower === 'show ip' ||
    lower === 'sh ip' ||
    lower === 's ip' ||
    lower === 'ip show' ||
    lower === 'show' ||
    lower === 'sh' ||
    lower === 'show ipv6' ||
    lower === 'sh ipv6'
  ) {
    const cfg = dev.pcConfig || {};
    return {
      output: [
        `NAME        : ${dev.hostname}`,
        `IP/MASK     : ${cfg.ip || '0.0.0.0'}/${cfg.mask || '0.0.0.0'}`,
        `GATEWAY     : ${cfg.gateway || '0.0.0.0'}`,
        `IPv6        : ${cfg.ipv6 || 'unassigned'}`,
        `IPv6 GW     : ${cfg.ipv6Gateway || 'unassigned'}`,
        `MAC         : 00:50:79:66:68:${dev.id.substring(0, 2).toLowerCase()}`,
      ].join('\n'),
      device: dev,
      allDevices: devs,
    };
  }

  if (lower.startsWith('ping ')) {
    return handlePingCommand(lower, dev, devs);
  }

  if (lower === 'help' || lower === '?') {
    return {
      output: `PC Commands:\n  ip <ip>/<cidr> [gateway]     Set IPv4 address and default gateway\n  ipv6 <addr>/<cidr> [gateway] Set IPv6 address and default gateway\n  show ip                      Show current IP configuration\n  ping <ip/ipv6>               Ping destination address\n  trace <ip>                   Trace path to destination IP`,
      device: dev,
      allDevices: devs,
    };
  }

  return {
    output: `Invalid command. Type 'help' or '?' for available commands.`,
    device: dev,
    allDevices: devs,
  };
}

// ----------------------------------------------------
// PING Handler with Topology Reachability
// ----------------------------------------------------
function handlePingCommand(
  cmd: string,
  dev: SimulatedDevice,
  devs: Record<string, SimulatedDevice>
): CommandResult {
  const parts = cmd.split(/\s+/);
  const targetIp = parts[1];

  if (!targetIp) {
    return { output: '% Incomplete command. Usage: ping <target-ip>', device: dev, allDevices: devs };
  }

  const isIpv6 = targetIp.includes(':');

  // Check if targetIp matches any device interface in the topology
  let targetDevice: SimulatedDevice | null = null;
  let targetInterfaceName: string | null = null;

  for (const d of Object.values(devs)) {
    if (isIpv6) {
      if (d.pcConfig?.ipv6?.toLowerCase() === targetIp.toLowerCase()) {
        targetDevice = d;
        break;
      }
      for (const [ifName, iface] of Object.entries(d.interfaces)) {
        if (
          iface.status === 'up' &&
          (iface.ipv6?.toLowerCase() === targetIp.toLowerCase() ||
            iface.ipv6LinkLocal?.toLowerCase() === targetIp.toLowerCase())
        ) {
          targetDevice = d;
          targetInterfaceName = ifName;
          break;
        }
      }
    } else {
      if (d.pcConfig?.ip === targetIp) {
        targetDevice = d;
        break;
      }
      for (const [ifName, iface] of Object.entries(d.interfaces)) {
        if (iface.ip === targetIp && iface.status === 'up') {
          targetDevice = d;
          targetInterfaceName = ifName;
          break;
        }
      }
    }
    if (targetDevice) break;
  }

  // Determine if reachable
  let isReachable = false;

  if (targetDevice) {
    if (targetDevice.id === dev.id) {
      isReachable = true; // self ping
    } else if (isIpv6) {
      // IPv6 reachability: any device with ipv6 configured and link up
      isReachable = true;
    } else {
      // Check direct subnet match
      const sourceIps = Object.values(dev.interfaces)
        .filter((i) => i.status === 'up' && i.ip)
        .map((i) => ({ ip: i.ip!, mask: i.subnetMask || '255.255.255.0' }));

      if (dev.pcConfig?.ip) {
        sourceIps.push({ ip: dev.pcConfig.ip, mask: dev.pcConfig.mask || '255.255.255.0' });
      }

      for (const src of sourceIps) {
        if (areInSameSubnet(src.ip, targetIp, src.mask)) {
          isReachable = true;
          break;
        }
      }

      // Check routing table
      if (!isReachable && dev.routingTable.length > 0) {
        for (const route of dev.routingTable) {
          if (route.type === 'O' || route.type === 'B' || route.type === 'S' || route.type === 'C') {
            isReachable = true;
            break;
          }
        }
      }

      // For PC with gateway
      if (!isReachable && dev.pcConfig?.gateway) {
        isReachable = true;
      }
    }
  }

  if (isReachable) {
    return {
      output: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
      device: dev,
      allDevices: devs,
      pingSuccess: { source: dev.id, target: targetDevice ? targetDevice.id : 'unknown', targetIp },
    };
  } else {
    return {
      output: `Type escape sequence to abort.\nSending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:\n.....\nSuccess rate is 0 percent (0/5)`,
      device: dev,
      allDevices: devs,
    };
  }
}

function areInSameSubnet(ip1: string, ip2: string, mask: string): boolean {
  try {
    const o1 = ip1.split('.').map(Number);
    const o2 = ip2.split('.').map(Number);
    const m = mask.split('.').map(Number);
    for (let i = 0; i < 4; i++) {
      if ((o1[i] & m[i]) !== (o2[i] & m[i])) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function updateConnectedRoutes(dev: SimulatedDevice) {
  // Remove existing connected and local routes
  dev.routingTable = dev.routingTable.filter((r) => r.type !== 'C' && r.type !== 'L');

  for (const [name, iface] of Object.entries(dev.interfaces)) {
    if (iface.ip && iface.status === 'up' && iface.protocol === 'up') {
      const cidr = iface.cidr || 24;
      const mask = iface.subnetMask || '255.255.255.0';
      const net = calculateNetworkAddress(iface.ip, mask);

      dev.routingTable.push({
        type: 'C',
        prefix: `${net}/${cidr}`,
        mask,
        cidr,
        interface: name,
        adminDistance: 0,
        metric: 0,
      });

      dev.routingTable.push({
        type: 'L',
        prefix: `${iface.ip}/32`,
        mask: '255.255.255.255',
        cidr: 32,
        interface: name,
        adminDistance: 0,
        metric: 0,
      });
    }
  }
}

function calculateNetworkAddress(ip: string, mask: string): string {
  const o = ip.split('.').map(Number);
  const m = mask.split('.').map(Number);
  return `${o[0] & m[0]}.${o[1] & m[1]}.${o[2] & m[2]}.${o[3] & m[3]}`;
}

export function recalculateNetworkState(devs: Record<string, SimulatedDevice>) {
  recalculateOSPF(devs);
  recalculateBGP(devs);
}

function recalculateOSPF(devs: Record<string, SimulatedDevice>) {
  const routers = Object.values(devs).filter((d) => d.deviceType === 'router' && d.ospf.processId);

  for (let i = 0; i < routers.length; i++) {
    for (let j = i + 1; j < routers.length; j++) {
      const r1 = routers[i];
      const r2 = routers[j];

      // Check if they share a common subnet on an up interface with OSPF configured
      for (const [if1Name, if1] of Object.entries(r1.interfaces)) {
        if (!if1.ip || if1.status !== 'up') continue;
        for (const [if2Name, if2] of Object.entries(r2.interfaces)) {
          if (!if2.ip || if2.status !== 'up') continue;

          if (areInSameSubnet(if1.ip, if2.ip, if1.subnetMask || '255.255.255.0')) {
            // Check if both have OSPF network matching
            const r1HasOspf = r1.ospf.networks.length > 0;
            const r2HasOspf = r2.ospf.networks.length > 0;

            if (r1HasOspf && r2HasOspf) {
              const r1Id = r1.ospf.routerId || r1.interfaces['Loopback0']?.ip || if1.ip;
              const r2Id = r2.ospf.routerId || r2.interfaces['Loopback0']?.ip || if2.ip;

              if (!r1.ospf.neighbors.some((n) => n.address === if2.ip)) {
                r1.ospf.neighbors.push({
                  neighborId: r2Id,
                  address: if2.ip,
                  interface: if1Name,
                  state: 'FULL',
                  role: 'BDR',
                });
              }
              if (!r2.ospf.neighbors.some((n) => n.address === if1.ip)) {
                r2.ospf.neighbors.push({
                  neighborId: r1Id,
                  address: if1.ip,
                  interface: if2Name,
                  state: 'FULL',
                  role: 'DR',
                });
              }

              // Propagate routes from r2 to r1
              for (const [r2IfName, r2If] of Object.entries(r2.interfaces)) {
                if (r2If.ip && r2If.status === 'up' && r2IfName !== if2Name) {
                  const prefix = `${calculateNetworkAddress(r2If.ip, r2If.subnetMask || '255.255.255.0')}/${r2If.cidr || 24}`;
                  if (!r1.routingTable.some((r) => r.prefix === prefix)) {
                    r1.routingTable.push({
                      type: 'O',
                      prefix,
                      mask: r2If.subnetMask || '255.255.255.0',
                      cidr: r2If.cidr || 24,
                      nextHop: if2.ip,
                      interface: if1Name,
                      metric: 2,
                      adminDistance: 110,
                    });
                  }
                }
              }

              // Propagate routes from r1 to r2
              for (const [r1IfName, r1If] of Object.entries(r1.interfaces)) {
                if (r1If.ip && r1If.status === 'up' && r1IfName !== if1Name) {
                  const prefix = `${calculateNetworkAddress(r1If.ip, r1If.subnetMask || '255.255.255.0')}/${r1If.cidr || 24}`;
                  if (!r2.routingTable.some((r) => r.prefix === prefix)) {
                    r2.routingTable.push({
                      type: 'O',
                      prefix,
                      mask: r1If.subnetMask || '255.255.255.0',
                      cidr: r1If.cidr || 24,
                      nextHop: if1.ip,
                      interface: if2Name,
                      metric: 2,
                      adminDistance: 110,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

function recalculateBGP(devs: Record<string, SimulatedDevice>) {
  const routers = Object.values(devs).filter((d) => d.deviceType === 'router' && d.bgp.asNumber);
  for (const r of routers) {
    for (const nei of r.bgp.neighbors) {
      nei.state = 'Established';
      nei.prefixesReceived = 2;
    }
  }
}

// ----------------------------------------------------
// Output Formatters
// ----------------------------------------------------
function formatShowIpv6InterfaceBrief(dev: SimulatedDevice): string {
  const lines = [
    'Interface              Status         IPv6 Address/Link-Local',
    '---------------------- -------------- --------------------------------------------',
  ];
  for (const [name, iface] of Object.entries(dev.interfaces)) {
    const short = iface.shortName.padEnd(22);
    const status = `${iface.status}/${iface.protocol}`.padEnd(14);
    if (iface.ipv6) {
      lines.push(`${short} ${status} ${iface.ipv6}/${iface.ipv6Cidr || 64}`);
      if (iface.ipv6LinkLocal) {
        lines.push(`${''.padEnd(22)} ${''.padEnd(14)} ${iface.ipv6LinkLocal} [link-local]`);
      }
    } else if (iface.ipv6LinkLocal) {
      lines.push(`${short} ${status} ${iface.ipv6LinkLocal} [link-local]`);
    } else {
      lines.push(`${short} ${status} [unassigned]`);
    }
  }
  return lines.join('\n');
}

function formatShowIpv6Route(dev: SimulatedDevice): string {
  const lines = [
    `IPv6 Routing Table - default - ${(dev.ipv6Routes?.length || 0) + (dev.ipv6Routing ? 2 : 0)} entries`,
    'Codes: C - Connected, L - Local, S - Static, U - User Static',
    '       O - OSPF, B - BGP',
    '',
  ];
  if (!dev.ipv6Routing) {
    lines.push('% IPv6 unicast routing is not enabled (configure "ipv6 unicast-routing")');
  }
  let hasRoutes = false;
  if (dev.ipv6Routes && dev.ipv6Routes.length > 0) {
    hasRoutes = true;
    for (const r of dev.ipv6Routes) {
      lines.push(`${r.type}   ${r.prefix}/${r.cidr} [0/0]`);
      lines.push(`     via ${r.interface || 'GigabitEthernet0/0'}, directly connected`);
    }
  }
  // Connected interface routes
  for (const [ifName, iface] of Object.entries(dev.interfaces)) {
    if (iface.ipv6 && iface.status === 'up') {
      hasRoutes = true;
      const netPrefix = iface.ipv6.includes('::') ? iface.ipv6.replace(/::[0-9a-fA-F]*$/, '::') : iface.ipv6;
      lines.push(`C   ${netPrefix}/${iface.ipv6Cidr || 64} [0/0]`);
      lines.push(`     via ${ifName}, directly connected`);
      lines.push(`L   ${iface.ipv6}/128 [0/0]`);
      lines.push(`     via ${ifName}, receive`);
    }
  }
  if (!hasRoutes) {
    lines.push('% No IPv6 routes configured');
  }
  return lines.join('\n');
}

function formatShowIpInterfaceBrief(dev: SimulatedDevice): string {
  const lines = [
    'Interface                  IP-Address      OK? Method Status                Protocol',
  ];

  for (const [name, iface] of Object.entries(dev.interfaces)) {
    const ip = iface.ip || 'unassigned';
    const ok = 'YES';
    const method = 'manual';
    const status = iface.status === 'up' ? 'up' : 'administratively down';
    const proto = iface.protocol;

    const line = `${name.padEnd(26)} ${ip.padEnd(15)} ${ok.padEnd(3)} ${method.padEnd(6)} ${status.padEnd(21)} ${proto}`;
    lines.push(line);
  }

  return lines.join('\n');
}

function formatShowIpRoute(dev: SimulatedDevice): string {
  const lines = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2',
    '       E1 - OSPF external type 1, E2 - OSPF external type 2',
    '       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2',
    '       ia - IS-IS inter area, * - candidate default, U - per-user static route',
    '       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP',
    '       + - replicated route, % - next hop override',
    '',
    'Gateway of last resort is not set',
    '',
  ];

  if (dev.routingTable.length === 0) {
    lines.push('% No routes in routing table.');
    return lines.join('\n');
  }

  for (const r of dev.routingTable) {
    if (r.type === 'C') {
      lines.push(`C    ${r.prefix} is directly connected, ${r.interface}`);
    } else if (r.type === 'L') {
      lines.push(`L    ${r.prefix} is directly connected, ${r.interface}`);
    } else if (r.type === 'O') {
      lines.push(`O    ${r.prefix} [${r.adminDistance || 110}/${r.metric || 2}] via ${r.nextHop}, 00:08:14, ${r.interface}`);
    } else if (r.type === 'B') {
      lines.push(`B    ${r.prefix} [${r.adminDistance || 20}/${r.metric || 0}] via ${r.nextHop}, 00:04:12`);
    } else if (r.type === 'S') {
      lines.push(`S    ${r.prefix} [${r.adminDistance || 1}/${r.metric || 0}] via ${r.nextHop || r.interface}`);
    }
  }

  return lines.join('\n');
}

function formatShowVlanBrief(dev: SimulatedDevice): string {
  const lines = [
    'VLAN Name                             Status    Ports',
    '---- -------------------------------- --------- -------------------------------',
  ];

  const vlans = Object.values(dev.vlans);
  if (vlans.length === 0) {
    lines.push('1    default                          active    Fa0/1, Fa0/2, Fa0/3, Fa0/4');
  } else {
    for (const v of vlans) {
      const id = v.id.toString().padEnd(4);
      const name = v.name.padEnd(32);
      const status = v.status.padEnd(9);
      const ports = v.ports.join(', ');
      lines.push(`${id} ${name} ${status} ${ports}`);
    }
  }

  return lines.join('\n');
}

function formatShowIpOspfNeighbor(dev: SimulatedDevice): string {
  const lines = [
    'Neighbor ID     Pri   State           Dead Time   Address         Interface',
  ];

  if (dev.ospf.neighbors.length === 0) {
    lines.push('% No OSPF neighbors established.');
    return lines.join('\n');
  }

  for (const n of dev.ospf.neighbors) {
    const id = n.neighborId.padEnd(15);
    const pri = '1    ';
    const state = `${n.state}/${n.role || 'DR'}`.padEnd(15);
    const dead = '00:00:34    ';
    const addr = n.address.padEnd(15);
    const iface = n.interface;
    lines.push(`${id} ${pri}${state} ${dead}${addr} ${iface}`);
  }

  return lines.join('\n');
}

function formatShowIpBgpSummary(dev: SimulatedDevice): string {
  const as = dev.bgp.asNumber || 65000;
  const rid = dev.bgp.routerId || '1.1.1.1';
  const lines = [
    `BGP router identifier ${rid}, local AS number ${as}`,
    'BGP table version is 3, main routing table version 3',
    '2 network entries using 496 bytes of memory',
    '',
    'Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd',
  ];

  for (const n of dev.bgp.neighbors) {
    const nei = n.ip.padEnd(15);
    const ver = '4           ';
    const asNum = n.remoteAs.toString().padEnd(8);
    const state = n.state === 'Established' ? `${n.prefixesReceived || 2}` : n.state;
    lines.push(`${nei} ${ver}${asNum} 14      15       3       0    0 00:12:45 ${state}`);
  }

  return lines.join('\n');
}

function formatShowRunningConfig(dev: SimulatedDevice): string {
  const lines = [
    'Building configuration...',
    'Current configuration : 2140 bytes',
    '!',
    'version 15.7',
    'service timestamps debug datetime msec',
    'service timestamps log datetime msec',
    'no service password-encryption',
    '!',
    `hostname ${dev.hostname}`,
    '!',
  ];

  if (dev.bannerMotd) {
    lines.push(`banner motd ^C${dev.bannerMotd}^C`);
  }

  for (const [id, vlan] of Object.entries(dev.vlans)) {
    lines.push(`vlan ${id}`);
    lines.push(` name ${vlan.name}`);
  }

  for (const [name, iface] of Object.entries(dev.interfaces)) {
    lines.push(`interface ${name}`);
    if (iface.description) lines.push(` description ${iface.description}`);
    if (iface.mode) lines.push(` switchport mode ${iface.mode}`);
    if (iface.accessVlan) lines.push(` switchport access vlan ${iface.accessVlan}`);
    if (iface.encapsulation) lines.push(` encapsulation dot1Q ${iface.encapsulation.vlan}`);
    if (iface.ip && iface.subnetMask) lines.push(` ip address ${iface.ip} ${iface.subnetMask}`);
    if (iface.nat) lines.push(` ip nat ${iface.nat}`);
    if (iface.status === 'administratively down') {
      lines.push(' shutdown');
    } else {
      lines.push(' no shutdown');
    }
  }

  if (dev.ospf.processId) {
    lines.push(`router ospf ${dev.ospf.processId}`);
    if (dev.ospf.routerId) lines.push(` router-id ${dev.ospf.routerId}`);
    for (const net of dev.ospf.networks) {
      lines.push(` network ${net.network} ${net.wildcard} area ${net.area}`);
    }
  }

  if (dev.bgp.asNumber) {
    lines.push(`router bgp ${dev.bgp.asNumber}`);
    for (const n of dev.bgp.neighbors) {
      lines.push(` neighbor ${n.ip} remote-as ${n.remoteAs}`);
    }
    for (const net of dev.bgp.networks) {
      lines.push(` network ${net.network} mask ${net.mask}`);
    }
  }

  for (const [aclNum, rules] of Object.entries(dev.acls)) {
    for (const rule of rules) {
      lines.push(`access-list ${aclNum} ${rule.action} ${rule.source}`);
    }
  }

  lines.push('line con 0');
  lines.push(' logging synchronous');
  lines.push('line vty 0 4');
  lines.push(' login local');
  lines.push(' transport input ssh');
  lines.push('!');
  lines.push('end');

  return lines.join('\n');
}

function formatShowVersion(dev: SimulatedDevice): string {
  return [
    `Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M2, RELEASE SOFTWARE (fc2)`,
    `Technical Support: http://www.cisco.com/techsupport`,
    `Copyright (c) 1986-2024 by Cisco Systems, Inc.`,
    `ROM: System Bootstrap, Version 15.0(1r)M16, RELEASE SOFTWARE (fc1)`,
    ``,
    `${dev.hostname} uptime is 4 weeks, 2 days, 16 hours, 31 minutes`,
    `System returned to ROM by power-on`,
    `System image file is "flash0:c2900-universalk9-mz.SPA.157-3.M2.bin"`,
    `Last reload type: Normal Reload`,
    ``,
    `Cisco CISCO2901/K9 (revision 1.0) with 499712K/24576K bytes of memory.`,
    `Processor board ID FGL162220HG`,
    `2 Gigabit Ethernet interfaces`,
    `DRAM configuration is 64 bits wide with parity enabled.`,
    `255K bytes of non-volatile configuration memory.`,
    `249856K bytes of ATA System CompactFlash 0 (Read/Write)`,
    ``,
    `Configuration register is 0x2102`,
  ].join('\n');
}

function formatShowInterfaces(dev: SimulatedDevice): string {
  const chunks: string[] = [];
  for (const [name, iface] of Object.entries(dev.interfaces)) {
    chunks.push(
      `${name} is ${iface.status}, line protocol is ${iface.protocol}\n` +
      `  Hardware is Gigabit Ethernet, address is 0050.7966.${name.replace(/\D/g, '') || '01'}\n` +
      `  Internet address is ${iface.ip || 'unassigned'}/${iface.cidr || 24}\n` +
      `  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,\n` +
      `     reliability 255/255, txload 1/255, rxload 1/255\n` +
      `  Encapsulation ARPA, loopback not set\n` +
      `  5 minute input rate 1000 bits/sec, 2 packets/sec\n` +
      `  5 minute output rate 1000 bits/sec, 2 packets/sec\n` +
      `     2482 packets input, 284192 bytes, 0 no buffer\n` +
      `     2490 packets output, 290124 bytes, 0 underruns`
    );
  }
  return chunks.join('\n!\n');
}

function formatShowAccessLists(dev: SimulatedDevice): string {
  const lines: string[] = [];
  for (const [num, rules] of Object.entries(dev.acls)) {
    lines.push(`Standard IP access list ${num}`);
    for (const rule of rules) {
      lines.push(`    ${rule.ruleNumber * 10} ${rule.action} ${rule.source} (14 matches)`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '% No access-lists configured';
}

function formatShowIpNatTranslations(dev: SimulatedDevice): string {
  const lines = [
    'Pro  Inside global         Inside local          Outside local         Outside global',
  ];
  if (dev.nat.translations.length === 0) {
    lines.push('icmp 203.0.113.1:1         192.168.1.10:1        8.8.8.8:1             8.8.8.8:1');
    lines.push('tcp  203.0.113.1:49210     192.168.1.10:49210    198.51.100.2:80       198.51.100.2:80');
  } else {
    for (const t of dev.nat.translations) {
      lines.push(`${t.protocol.padEnd(4)} ${t.insideGlobal.padEnd(21)} ${t.insideLocal.padEnd(21)} ${t.outsideLocal.padEnd(21)} ${t.outsideGlobal}`);
    }
  }
  return lines.join('\n');
}

function formatShowMacAddressTable(dev: SimulatedDevice): string {
  const lines = [
    '          Mac Address Table',
    '-------------------------------------------',
    '',
    'Vlan    Mac Address       Type        Ports',
    '----    -----------       --------    -----',
  ];
  let count = 0;
  for (const [name, iface] of Object.entries(dev.interfaces)) {
    const vlan = iface.accessVlan || 1;
    const mac = `0050.7966.${name.replace(/\D/g, '').padStart(2, '0')}${count + 1}`;
    lines.push(`${vlan.toString().padEnd(7)} ${mac.padEnd(17)} DYNAMIC     ${iface.shortName}`);
    count++;
  }
  if (count === 0) {
    lines.push('1       0050.7966.0101    DYNAMIC     Gi0/0');
    count = 1;
  }
  lines.push(`Total Mac Addresses for this criterion: ${count}`);
  return lines.join('\n');
}

function formatShowCdpNeighbors(dev: SimulatedDevice, devs: Record<string, SimulatedDevice>): string {
  const lines = [
    'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge',
    '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone',
    '',
    'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID',
  ];

  const others = Object.values(devs).filter((d) => d.id !== dev.id);
  if (others.length === 0) {
    lines.push('% No CDP neighbors discovered');
    return lines.join('\n');
  }

  for (const o of others) {
    const devId = o.hostname.padEnd(16);
    const localInt = (Object.values(dev.interfaces)[0]?.shortName || 'Gi0/0').padEnd(17);
    const hold = '148        ';
    const cap = o.deviceType === 'router' ? 'R          ' : o.deviceType === 'switch' ? 'S I        ' : 'H          ';
    const plat = (o.deviceType === 'router' ? 'C2900     ' : 'WS-C3850  ');
    const portId = Object.values(o.interfaces)[0]?.shortName || 'Gi0/0';
    lines.push(`${devId} ${localInt} ${hold}${cap}${plat}${portId}`);
  }

  return lines.join('\n');
}

function formatShowLldpNeighbors(dev: SimulatedDevice, devs: Record<string, SimulatedDevice>): string {
  const lines = [
    'Capability codes:',
    '    (R) Router, (B) Bridge, (C) DOCSIS Cable Device, (W) WLAN Access Point,',
    '    (P) Repeater, (S) Station, (O) Other',
    '',
    'Device ID           Local Intf          Hold-time  Capability      Port ID',
  ];

  const others = Object.values(devs).filter((d) => d.id !== dev.id);
  if (others.length === 0) {
    lines.push('% No LLDP neighbors discovered');
    return lines.join('\n');
  }

  for (const o of others) {
    const devId = o.hostname.padEnd(19);
    const localInt = (Object.values(dev.interfaces)[0]?.shortName || 'Gi0/0').padEnd(19);
    const hold = '120        ';
    const cap = o.deviceType === 'router' ? 'R               ' : 'B               ';
    const portId = Object.values(o.interfaces)[0]?.shortName || 'Gi0/0';
    lines.push(`${devId} ${localInt} ${hold}${cap}${portId}`);
  }

  return lines.join('\n');
}

function getHelpForMode(mode: string): string {
  switch (mode) {
    case 'user_exec':
      return [
        'Exec commands:',
        '  enable      Turn on privileged commands',
        '  exit        Exit from the EXEC',
        '  help        Description of the interactive help system',
        '  ping        Send echo messages',
        '  show        Show running system information',
        '  traceroute  Trace route to destination',
      ].join('\n');
    case 'priv_exec':
      return [
        'Privileged Exec commands:',
        '  configure   Enter configuration mode',
        '  disable     Turn off privileged commands',
        '  exit        Exit from the EXEC',
        '  ping        Send echo messages',
        '  reload      Halt and perform a cold restart',
        '  show        Show running system information',
        '  traceroute  Trace route to destination',
        '  write       Write running configuration to memory',
      ].join('\n');
    case 'global_config':
      return [
        'Global configuration commands:',
        '  access-list      Specify access control list',
        '  banner           Define a login banner',
        '  enable           Modify enable password parameters',
        '  end              Exit from configure mode',
        '  exit             Exit from configure mode',
        '  hostname         Set system network name',
        '  interface        Select an interface to configure',
        '  ip               Global IP configuration subcommands',
        '  router           Enable a routing process (ospf, bgp)',
        '  vlan             VLAN configuration commands',
      ].join('\n');
    case 'interface_config':
    case 'subinterface_config':
      return [
        'Interface configuration commands:',
        '  description      Interface specific description',
        '  encapsulation    Set encapsulation type for subinterface (dot1q)',
        '  exit             Exit from interface configuration mode',
        '  ip               Interface Internet Protocol config commands',
        '  no               Negate a command or set its defaults',
        '  shutdown         Shutdown the selected interface',
        '  switchport       Set switching characteristics of the Layer 2 port',
      ].join('\n');
    case 'router_ospf':
      return [
        'Router OSPF configuration commands:',
        '  exit             Exit from routing protocol configuration mode',
        '  network          Enable routing on an IP network',
        '  router-id        router-id for this OSPF process',
      ].join('\n');
    case 'vlan_config':
      return [
        'VLAN configuration commands:',
        '  exit             Apply changes and exit from VLAN mode',
        '  name             Ascii name of the VLAN',
      ].join('\n');
    default:
      return 'Type ? for command help or exit to return to previous mode.';
  }
}
