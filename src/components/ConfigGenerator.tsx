import React, { useState } from 'react';
import { SimulatedDevice } from '../types/network';
import { Cpu, Copy, Check, Terminal, Download, ArrowRight, Sparkles, Layers } from 'lucide-react';

interface ConfigGeneratorProps {
  activeDevice?: SimulatedDevice;
  onApplyToDevice?: (commands: string[]) => void;
}

type VendorType = 'cisco-ios' | 'cisco-nxos' | 'juniper' | 'fortinet' | 'paloalto' | 'linux';

type FeatureType =
  | 'interface'
  | 'vlan'
  | 'ospf'
  | 'bgp'
  | 'staticRoute'
  | 'acl'
  | 'nat'
  | 'dhcp'
  | 'hsrp'
  | 'hardening';

export const ConfigGenerator: React.FC<ConfigGeneratorProps> = ({
  activeDevice,
  onApplyToDevice,
}) => {
  const [vendor, setVendor] = useState<VendorType>('cisco-ios');
  const [feature, setFeature] = useState<FeatureType>('interface');
  const [copied, setCopied] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);

  // Form parameters
  const [hostname, setHostname] = useState<string>(activeDevice?.hostname || 'Core-R1');
  const [interfaceName, setInterfaceName] = useState<string>('GigabitEthernet0/0');
  const [ipAddress, setIpAddress] = useState<string>('192.168.10.1');
  const [subnetMask, setSubnetMask] = useState<string>('255.255.255.0');
  const [cidr, setCidr] = useState<string>('24');
  const [description, setDescription] = useState<string>('Uplink to Core Switch');
  const [vlanId, setVlanId] = useState<string>('10');
  const [vlanName, setVlanName] = useState<string>('DATA_SALES');
  const [ospfProcess, setOspfProcess] = useState<string>('1');
  const [ospfArea, setOspfArea] = useState<string>('0');
  const [ospfNetwork, setOspfNetwork] = useState<string>('192.168.10.0');
  const [ospfWildcard, setOspfWildcard] = useState<string>('0.0.0.255');
  const [bgpLocalAs, setBgpLocalAs] = useState<string>('65001');
  const [bgpNeighborIp, setBgpNeighborIp] = useState<string>('203.0.113.2');
  const [bgpRemoteAs, setBgpRemoteAs] = useState<string>('65002');
  const [bgpNetwork, setBgpNetwork] = useState<string>('198.51.100.0');
  const [nextHop, setNextHop] = useState<string>('10.0.0.2');
  const [domainName, setDomainName] = useState<string>('nwkings.lab');
  const [enableSecret, setEnableSecret] = useState<string>('Cisco12345!');

  // Generate configurations based on vendor and feature
  const generateConfig = (): { rawCommands: string[]; displayCode: string } => {
    const raw: string[] = [];

    if (vendor === 'cisco-ios') {
      if (feature === 'interface') {
        raw.push(`interface ${interfaceName}`);
        raw.push(` description ${description}`);
        raw.push(` ip address ${ipAddress} ${subnetMask}`);
        raw.push(` no shutdown`);
      } else if (feature === 'vlan') {
        raw.push(`vlan ${vlanId}`);
        raw.push(` name ${vlanName}`);
        raw.push(`interface ${interfaceName}`);
        raw.push(` switchport mode access`);
        raw.push(` switchport access vlan ${vlanId}`);
        raw.push(` no shutdown`);
      } else if (feature === 'ospf') {
        raw.push(`router ospf ${ospfProcess}`);
        raw.push(` router-id ${ipAddress}`);
        raw.push(` network ${ospfNetwork} ${ospfWildcard} area ${ospfArea}`);
        raw.push(` passive-interface default`);
        raw.push(` no passive-interface ${interfaceName}`);
      } else if (feature === 'bgp') {
        raw.push(`router bgp ${bgpLocalAs}`);
        raw.push(` bgp router-id ${ipAddress}`);
        raw.push(` neighbor ${bgpNeighborIp} remote-as ${bgpRemoteAs}`);
        raw.push(` neighbor ${bgpNeighborIp} description Peering with Upstream Provider`);
        raw.push(` network ${bgpNetwork} mask ${subnetMask}`);
      } else if (feature === 'staticRoute') {
        raw.push(`ip route 0.0.0.0 0.0.0.0 ${nextHop}`);
        raw.push(`ip route ${ospfNetwork} ${subnetMask} ${nextHop} 10`);
      } else if (feature === 'acl') {
        raw.push(`ip access-list extended SECURE_INBOUND`);
        raw.push(` permit tcp 192.168.1.0 0.0.0.255 any eq 443`);
        raw.push(` permit tcp 192.168.1.0 0.0.0.255 any eq 22`);
        raw.push(` permit icmp any any echo-reply`);
        raw.push(` deny ip any any log`);
        raw.push(`interface ${interfaceName}`);
        raw.push(` ip access-group SECURE_INBOUND in`);
      } else if (feature === 'nat') {
        raw.push(`access-list 1 permit 192.168.0.0 0.0.255.255`);
        raw.push(`ip nat inside source list 1 interface ${interfaceName} overload`);
        raw.push(`interface ${interfaceName}`);
        raw.push(` ip nat outside`);
        raw.push(`interface GigabitEthernet0/1`);
        raw.push(` ip nat inside`);
      } else if (feature === 'dhcp') {
        raw.push(`ip dhcp excluded-address 192.168.10.1 192.168.10.20`);
        raw.push(`ip dhcp pool LAN_POOL`);
        raw.push(` network 192.168.10.0 255.255.255.0`);
        raw.push(` default-router ${ipAddress}`);
        raw.push(` dns-server 8.8.8.8 1.1.1.1`);
        raw.push(` lease 0 8 0`);
      } else if (feature === 'hsrp') {
        raw.push(`interface ${interfaceName}`);
        raw.push(` standby version 2`);
        raw.push(` standby 10 ip 192.168.10.254`);
        raw.push(` standby 10 priority 110`);
        raw.push(` standby 10 preempt`);
        raw.push(` standby 10 authentication md5 key-string NetworkKingsSecret`);
      } else if (feature === 'hardening') {
        raw.push(`hostname ${hostname}`);
        raw.push(`ip domain-name ${domainName}`);
        raw.push(`crypto key generate rsa modulus 2048`);
        raw.push(`ip ssh version 2`);
        raw.push(`username admin privilege 15 secret ${enableSecret}`);
        raw.push(`line vty 0 4`);
        raw.push(` login local`);
        raw.push(` transport input ssh`);
        raw.push(` service password-encryption`);
        raw.push(` banner motd ^C Unauthorized Access Strictly Prohibited ^C`);
      }
    } else if (vendor === 'juniper') {
      if (feature === 'interface') {
        raw.push(`set interfaces ge-0/0/0 unit 0 family inet address ${ipAddress}/${cidr}`);
        raw.push(`set interfaces ge-0/0/0 description "${description}"`);
      } else if (feature === 'ospf') {
        raw.push(`set protocols ospf area 0.0.0.${ospfArea} interface ge-0/0/0.0`);
        raw.push(`set protocols ospf reference-bandwidth 100g`);
      } else if (feature === 'bgp') {
        raw.push(`set routing-options autonomous-system ${bgpLocalAs}`);
        raw.push(`set protocols bgp group EBGP-PEERS type external`);
        raw.push(`set protocols bgp group EBGP-PEERS neighbor ${bgpNeighborIp} peer-as ${bgpRemoteAs}`);
      } else {
        raw.push(`set system host-name ${hostname}`);
        raw.push(`set system services ssh root-login deny`);
      }
    } else if (vendor === 'fortinet') {
      if (feature === 'interface') {
        raw.push(`config system interface`);
        raw.push(`    edit "${interfaceName}"`);
        raw.push(`        set ip ${ipAddress} ${subnetMask}`);
        raw.push(`        set allowaccess ping https ssh`);
        raw.push(`        set description "${description}"`);
        raw.push(`    next`);
        raw.push(`end`);
      } else if (feature === 'ospf') {
        raw.push(`config router ospf`);
        raw.push(`    set router-id ${ipAddress}`);
        raw.push(`    config network`);
        raw.push(`        edit 1`);
        raw.push(`            set prefix ${ospfNetwork}/${cidr}`);
        raw.push(`            set area 0.0.0.${ospfArea}`);
        raw.push(`        next`);
        raw.push(`    end`);
        raw.push(`end`);
      } else {
        raw.push(`config system global`);
        raw.push(`    set hostname "${hostname}"`);
        raw.push(`    set admin-sport 8443`);
        raw.push(`end`);
      }
    } else if (vendor === 'linux') {
      if (feature === 'interface') {
        raw.push(`# Netplan modern Linux network config`);
        raw.push(`network:`);
        raw.push(`  version: 2`);
        raw.push(`  ethernets:`);
        raw.push(`    eth0:`);
        raw.push(`      addresses: [${ipAddress}/${cidr}]`);
        raw.push(`      routes:`);
        raw.push(`        - to: default`);
        raw.push(`          via: ${nextHop}`);
        raw.push(`      nameservers:`);
        raw.push(`        addresses: [8.8.8.8, 1.1.1.1]`);
      } else {
        raw.push(`sudo hostnamectl set-hostname ${hostname}`);
        raw.push(`sudo ip addr add ${ipAddress}/${cidr} dev eth0`);
        raw.push(`sudo ip link set eth0 up`);
      }
    } else {
      raw.push(`! Generic Cisco NX-OS / Arista config`);
      raw.push(`hostname ${hostname}`);
      raw.push(`interface ${interfaceName}`);
      raw.push(` ip address ${ipAddress}/${cidr}`);
      raw.push(` no shutdown`);
    }

    return { rawCommands: raw, displayCode: raw.join('\n') };
  };

  const { rawCommands, displayCode } = generateConfig();

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([displayCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hostname}_${feature}_config.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = () => {
    if (onApplyToDevice) {
      onApplyToDevice(rawCommands);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rawCommands, onApplyToDevice]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full p-4 bg-slate-950">
      {/* Left: Configuration Form Parameters */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Network Config Syntax Generator</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">config.nwkings.com engine</span>
        </div>

        {/* Vendor Selector */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/60">
          <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
            Network Vendor / Operating System
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[
              { id: 'cisco-ios', label: 'Cisco IOS-XE' },
              { id: 'cisco-nxos', label: 'Cisco NX-OS' },
              { id: 'juniper', label: 'Juniper Junos' },
              { id: 'fortinet', label: 'Fortinet FortiOS' },
              { id: 'paloalto', label: 'Palo Alto PAN-OS' },
              { id: 'linux', label: 'Linux OS' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVendor(v.id as VendorType)}
                className={`px-2 py-1.5 rounded text-[11px] font-mono transition-colors text-center truncate ${
                  vendor === v.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Selector */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
            Protocol / Feature Module
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'interface', label: 'Interface & IP' },
              { id: 'vlan', label: 'VLAN & Trunk' },
              { id: 'ospf', label: 'OSPFv2 Routing' },
              { id: 'bgp', label: 'BGP Peering' },
              { id: 'staticRoute', label: 'Static Routes' },
              { id: 'acl', label: 'Access Lists' },
              { id: 'nat', label: 'NAT / PAT' },
              { id: 'dhcp', label: 'DHCP Server' },
              { id: 'hsrp', label: 'HSRP Redundancy' },
              { id: 'hardening', label: 'SSH & Hardening' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFeature(f.id as FeatureType)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  feature === f.id
                    ? 'bg-indigo-950 border border-indigo-700 text-indigo-300 font-medium'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Form Parameters */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-mono block mb-1">Hostname</label>
              <input
                type="text"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 font-mono block mb-1">Target Interface</label>
              <input
                type="text"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 font-mono block mb-1">IP Address</label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 font-mono block mb-1">Subnet Mask / CIDR</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subnetMask}
                  onChange={(e) => setSubnetMask(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={cidr}
                  onChange={(e) => setCidr(e.target.value)}
                  className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono text-center focus:border-indigo-500 focus:outline-none"
                  placeholder="/24"
                />
              </div>
            </div>

            {(feature === 'vlan') && (
              <>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">VLAN ID</label>
                  <input
                    type="text"
                    value={vlanId}
                    onChange={(e) => setVlanId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">VLAN Name</label>
                  <input
                    type="text"
                    value={vlanName}
                    onChange={(e) => setVlanName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {(feature === 'ospf') && (
              <>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">OSPF Process ID</label>
                  <input
                    type="text"
                    value={ospfProcess}
                    onChange={(e) => setOspfProcess(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">OSPF Area ID</label>
                  <input
                    type="text"
                    value={ospfArea}
                    onChange={(e) => setOspfArea(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Network Subnet</label>
                  <input
                    type="text"
                    value={ospfNetwork}
                    onChange={(e) => setOspfNetwork(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Wildcard Mask</label>
                  <input
                    type="text"
                    value={ospfWildcard}
                    onChange={(e) => setOspfWildcard(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {(feature === 'bgp') && (
              <>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Local Autonomous System (AS)</label>
                  <input
                    type="text"
                    value={bgpLocalAs}
                    onChange={(e) => setBgpLocalAs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Remote AS</label>
                  <input
                    type="text"
                    value={bgpRemoteAs}
                    onChange={(e) => setBgpRemoteAs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Peer Neighbor IP</label>
                  <input
                    type="text"
                    value={bgpNeighborIp}
                    onChange={(e) => setBgpNeighborIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-mono block mb-1">Advertised Network</label>
                  <input
                    type="text"
                    value={bgpNetwork}
                    onChange={(e) => setBgpNetwork(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {(feature === 'staticRoute') && (
              <div>
                <label className="text-slate-400 font-mono block mb-1">Next-Hop Gateway IP</label>
                <input
                  type="text"
                  value={nextHop}
                  onChange={(e) => setNextHop(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Generated Production CLI Script */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">Generated Production CLI Syntax</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download</span>
            </button>

            {onApplyToDevice && activeDevice && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded text-xs transition-colors shadow-sm"
              >
                <span>{applied ? 'Applied to ' + activeDevice.hostname : 'Push to ' + activeDevice.hostname}</span>
              </button>
            )}
          </div>
        </div>

        {/* Code Display Area */}
        <div className="flex-1 p-4 bg-[#030712] font-mono text-[12.5px] leading-relaxed overflow-y-auto select-text">
          <pre className="text-cyan-200/95 whitespace-pre-wrap">{displayCode}</pre>
        </div>

        {/* Information Callout */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ready to paste directly into Cisco IOS terminal or active simulator node.</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{rawCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
};
