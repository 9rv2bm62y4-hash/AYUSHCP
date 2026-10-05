import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, HelpCircle, CheckCircle2, Terminal } from 'lucide-react';

interface ScenarioItem {
  id: string;
  category: 'OSPF' | 'BGP' | 'Switching & VLAN' | 'Security & NAT' | 'Python Automation';
  title: string;
  scenario: string;
  troubleshootingSteps: string[];
  cliVerification: string;
  solution: string;
}

const SCENARIOS: ScenarioItem[] = [
  {
    id: 'sc-1',
    category: 'OSPF',
    title: 'OSPF Neighbor Stuck in 2-WAY or EXSTART State',
    scenario: 'Two Cisco ISR routers connected over GigabitEthernet0/0 fail to exchange routing tables. "show ip ospf neighbor" displays EXSTART/DROTHER or 2-WAY indefinitely.',
    troubleshootingSteps: [
      '1. Verify MTU match on both interface endpoints (MTU mismatch causes EXSTART hang when exchanging DBD packets).',
      '2. Check for duplicate Router IDs on both routers.',
      '3. Verify Hello and Dead timer intervals match exactly (Default: 10s hello / 40s dead).',
      '4. Check if interface is configured as passive-interface or blocked by an Access Control List (ACL) on UDP/IP proto 89.',
    ],
    cliVerification: `R1# show ip ospf neighbor
R1# show ip ospf interface GigabitEthernet0/0
R1# show interfaces GigabitEthernet0/0 | include MTU
R1# debug ip ospf adj`,
    solution: `Resolve MTU mismatch:
R1(config)# interface GigabitEthernet0/0
R1(config-if)# ip mtu 1500
or ignore MTU:
R1(config-if)# ip ospf mtu-ignore`,
  },
  {
    id: 'sc-2',
    category: 'Switching & VLAN',
    title: 'Native VLAN Mismatch & STP Root Bridge Inconsistency',
    scenario: 'Syslog reports %CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (1) with SW2 GigabitEthernet0/1 (99).',
    troubleshootingSteps: [
      '1. Identify configured native VLAN on both sides of the 802.1Q trunk.',
      '2. Understand that 802.1Q trunks send native VLAN frames untagged, causing frames from VLAN 1 to be received into VLAN 99.',
      '3. Spanning Tree Protocol puts the port into PVID-inconsistent state to avoid layer 2 loops.',
    ],
    cliVerification: `SW1# show interfaces trunk
SW1# show spanning-tree inconsistentports
SW2# show interfaces trunk`,
    solution: `Align native VLAN on SW1 to match SW2:
SW1(config)# interface GigabitEthernet0/1
SW1(config-if)# switchport trunk native vlan 99`,
  },
  {
    id: 'sc-3',
    category: 'BGP',
    title: 'eBGP Neighbor Fails to Establish (Stuck in Idle or Active)',
    scenario: 'Enterprise edge router peering with ISP over BGP shows neighbor state "Idle" or oscillating between "Active" and "Idle".',
    troubleshootingSteps: [
      '1. State Idle: Router cannot find a route to the peer IP address in the routing table (check ping reachability).',
      '2. State Active: TCP SYN packets sent to TCP port 179 are not receiving SYN-ACKs (check firewall rules, ACLs, or wrong peer IP).',
      '3. Check if peering to a loopback address without "ebgp-multihop" and "update-source".',
    ],
    cliVerification: `R1# show ip bgp summary
R1# show ip route 203.0.113.2
R1# ping 203.0.113.2
R1# show tcp brief | include 179`,
    solution: `Ensure IP connectivity and multihop if using loopbacks:
R1(config)# router bgp 65001
R1(config-router)# neighbor 203.0.113.2 remote-as 65002
R1(config-router)# neighbor 203.0.113.2 ebgp-multihop 2`,
  },
  {
    id: 'sc-4',
    category: 'Security & NAT',
    title: 'Inside Hosts Cannot Access Internet via Dynamic PAT',
    scenario: 'Internal clients with IP 192.168.1.0/24 are unable to browse internet sites or ping public DNS (8.8.8.8) through branch router.',
    troubleshootingSteps: [
      '1. Check that "ip nat inside" is configured on LAN interface and "ip nat outside" on WAN interface.',
      '2. Verify that the ACL referenced in "ip nat inside source list <num>" matches the client IP subnet.',
      '3. Verify that the default route (ip route 0.0.0.0 0.0.0.0 <ISP>) is present.',
    ],
    cliVerification: `R1# show ip nat translations
R1# show ip nat statistics
R1# show access-lists 1
R1# show ip route | include 0.0.0.0`,
    solution: `Correct NAT overload configuration:
R1(config)# access-list 1 permit 192.168.1.0 0.0.0.255
R1(config)# ip nat inside source list 1 interface GigabitEthernet0/1 overload
R1(config)# interface GigabitEthernet0/0
R1(config-if)# ip nat inside
R1(config)# interface GigabitEthernet0/1
R1(config-if)# ip nat outside`,
  },
  {
    id: 'sc-5',
    category: 'Python Automation',
    title: 'Handling Network Timeout & Connection Drops in Python 3.10 Netmiko',
    scenario: 'A batch automation script pushing configurations to 100 enterprise switches hangs indefinitely when one switch in the data center is rebooting.',
    troubleshootingSteps: [
      '1. Implement Netmiko NetmikoTimeoutException and NetmikoAuthenticationException try/except blocks.',
      '2. Set global_delay_factor or timeout parameters.',
      '3. Use Python concurrent.futures.ThreadPoolExecutor with timeout to run tasks in parallel.',
    ],
    cliVerification: `python3 -c "from netmiko.exceptions import NetmikoTimeoutException; print('Ready')"`,
    solution: `Robust Python 3.10 implementation:
from netmiko import ConnectHandler
from netmiko.exceptions import NetmikoTimeoutException

def configure_device(dev):
    try:
        with ConnectHandler(**dev) as conn:
            output = conn.send_config_set(["ntp server 10.0.0.10"])
            return (dev['host'], True, output)
    except NetmikoTimeoutException:
        return (dev['host'], False, "Connection Timed Out")`,
  },
];

export const InterviewScenarios: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(SCENARIOS[0].id);

  const categories = ['All', 'OSPF', 'BGP', 'Switching & VLAN', 'Security & NAT', 'Python Automation'];

  const filtered = selectedCategory === 'All'
    ? SCENARIOS
    : SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <div className="flex flex-col h-full p-4 bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Network Kings Interview & Troubleshooting Scenarios</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Curated CCNA / CCNP production troubleshooting challenges and technical interview questions.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1 text-xs">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedCategory === c
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700 font-medium'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden transition-all shadow-md"
            >
              {/* Question Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-850/60 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">Production Troubleshooting Case</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.scenario}</p>
                </div>

                <div className="mt-1 text-slate-400">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {/* Collapsible Solution & Analysis */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-950/70 space-y-3.5 text-xs">
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                      Diagnostic Ladder & Troubleshooting Steps
                    </h4>
                    <ul className="space-y-1 text-slate-300">
                      {item.troubleshootingSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-purple-400 select-none font-mono">›</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      <span>CLI Diagnostic Commands</span>
                    </h4>
                    <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-cyan-300 whitespace-pre-wrap">
                      {item.cliVerification}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Resolution Configuration</span>
                    </h4>
                    <pre className="p-2.5 bg-emerald-950/30 border border-emerald-900/50 rounded font-mono text-[11px] text-emerald-300 whitespace-pre-wrap">
                      {item.solution}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
