import React, { useState } from 'react';
import { SimulatedDevice } from '../types/network';
import { Play, RotateCcw, CheckCircle2, AlertTriangle, Terminal, Code2, BookOpen, Clock, Sparkles } from 'lucide-react';

interface PythonAutomationLabProps {
  devices: SimulatedDevice[];
  onDeviceStateUpdate?: (updatedDevices: Record<string, SimulatedDevice>) => void;
}

const TEMPLATES: Record<string, { title: string; description: string; code: string }> = {
  audit: {
    title: 'Multi-Device Interface & Routing Audit',
    description: 'Connects to routers R1 and R2 using netmiko ConnectHandler, retrieves interfaces, and prints route summaries.',
    code: `import json
from netmiko import ConnectHandler

devices = ["R1", "R2"]

print("==================================================")
print(" Network Kings: Python 3.10 Device Telemetry Audit")
print("==================================================")

for dev_name in devices:
    try:
        conn = ConnectHandler(device_type="cisco_ios", host=dev_name)
        print(f"\\n[+] Connected to {dev_name} -> Prompt: {conn.find_prompt()}")
        
        # Audit interfaces
        output = conn.send_command("show ip int br")
        print("--- Interface Status ---")
        print(output)
        
        # Audit routing table
        routes = conn.send_command("show ip route")
        print("\\n--- Routing Summary ---")
        print(routes[:260] + "... (truncated)")
        
        conn.disconnect()
    except Exception as e:
        print(f"[-] Error connecting to {dev_name}: {e}")

print("\\n[✓] Audit Completed Successfully via Python 3.10")
`,
  },
  configPush: {
    title: 'Automated Loopback & OSPF Config Deployment',
    description: 'Pushes standardized management Loopback interfaces and routing configuration to devices programmatically.',
    code: `from netmiko import ConnectHandler

r1 = ConnectHandler(device_type="cisco_ios", host="R1")
print(f"Connected to: {r1.find_prompt()}")

# Config commands to push
configs = [
    "interface Loopback100",
    "description Corporate Management Loopback",
    "ip address 10.254.1.1 255.255.255.255",
    "no shutdown",
    "router ospf 1",
    "network 10.254.1.1 0.0.0.0 area 0"
]

print("Pushing configuration commands...")
result = r1.send_config_set(configs)
print(result)

# Verify updated interfaces
print("\\nVerifying updated interface list:")
print(r1.send_command("show ip int br"))
`,
  },
  subnetCalc: {
    title: 'IP Subnetting & CIDR Analysis (ipaddress module)',
    description: 'Uses Python 3.10 standard ipaddress library to split enterprise supernets and calculate host addresses.',
    code: `import ipaddress

print("=== Python 3.10 Enterprise Subnet Planner ===")

# Parent supernet
network = ipaddress.ip_network("10.100.0.0/16")
print(f"Parent Supernet: {network}")
print(f"Netmask: {network.netmask} | Total Addresses: {network.num_addresses}")

# Subnet into /24 departmental subnets
subnets = list(network.subnets(new_prefix=24))[:6]

print(f"\\nFirst {len(subnets)} Subnets for Campus Deployment:")
print(f"{'Subnet':<20} {'First Usable':<16} {'Last Usable':<16} {'Broadcast'}")
print("-" * 65)

for sub in subnets:
    hosts = list(sub.hosts())
    first_host = hosts[0] if hosts else "N/A"
    last_host = hosts[-1] if hosts else "N/A"
    print(f"{str(sub):<20} {str(first_host):<16} {str(last_host):<16} {sub.broadcast_address}")

# Check IP membership
sample_ip = ipaddress.ip_address("10.100.2.45")
print(f"\\nIP {sample_ip} belongs to subnet: {[s for s in subnets if sample_ip in s][0]}")
`,
  },
  regexParse: {
    title: 'CLI Output Regex Parsing (re module)',
    description: 'Parses raw Cisco IOS CLI output strings into structured Python dictionaries using regular expressions.',
    code: `import re
from netmiko import ConnectHandler

r1 = ConnectHandler(device_type="cisco_ios", host="R1")
raw_output = r1.send_command("show ip int br")

print("Raw Cisco Output:")
print(raw_output)
print("-" * 55)

# Regex pattern for Cisco show ip interface brief
pattern = re.compile(
    r"^(?P<iface>\\S+)\\s+(?P<ip>\\S+)\\s+\\S+\\s+\\S+\\s+(?P<status>\\S+)\\s+(?P<proto>\\S+)$",
    re.MULTILINE
)

parsed_interfaces = []
for match in pattern.finditer(raw_output):
    if match.group("iface").lower() != "interface":
        parsed_interfaces.append(match.groupdict())

print(f"Structured Python Telemetry ({len(parsed_interfaces)} interfaces found):")
for item in parsed_interfaces:
    is_up = item["status"].lower() == "up" and item["proto"].lower() == "up"
    symbol = "🟢" if is_up else "🔴"
    print(f"{symbol} Interface: {item['iface']:<20} IP: {item['ip']:<15} Status: {item['status']}")
`,
  },
};

export const PythonAutomationLab: React.FC<PythonAutomationLabProps> = ({
  devices,
  onDeviceStateUpdate,
}) => {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('audit');
  const [code, setCode] = useState<string>(TEMPLATES['audit'].code);
  const [output, setOutput] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);

  const handleTemplateChange = (key: string) => {
    setSelectedTemplateKey(key);
    setCode(TEMPLATES[key].code);
    setOutput('');
    setStderr('');
    setExitCode(null);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Executing script with Python 3.10.12 runtime...\n');
    setStderr('');
    setExitCode(null);

    // Build current topology state map to pass to Python
    const stateMap: Record<string, any> = {};
    devices.forEach((d) => {
      stateMap[d.id] = {
        hostname: d.hostname,
        interfaces: Object.fromEntries(
          Object.entries(d.interfaces).map(([name, iface]) => [
            name,
            { ip: iface.ip, mask: iface.subnetMask, status: iface.status },
          ])
        ),
        running_config: d.runningConfig,
      };
    });

    try {
      const resp = await fetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state: stateMap, timeoutMs: 10000 }),
      });

      const data = await resp.json();

      setOutput(data.stdout || '');
      setStderr(data.stderr || '');
      setExitCode(data.exitCode);
      setExecTime(data.executionTime);

      // If python modified device state, notify parent
      if (data.updatedState && onDeviceStateUpdate) {
        // Apply updates
      }
    } catch (err: any) {
      setStderr(`Execution error: ${err.message}`);
      setExitCode(-1);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full p-4 bg-slate-950">
      {/* Left Column: Script Editor & Templates */}
      <div className="flex-1 flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Python 3.10 Automation Script</span>
            <span className="text-[11px] text-amber-400/90 font-mono px-1.5 py-0.2 rounded bg-amber-950/50 border border-amber-800/40">
              netmiko + ipaddress
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <select
              value={selectedTemplateKey}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1 focus:ring-1 focus:ring-amber-400 focus:outline-none"
            >
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <option key={key} value={key}>
                  Template: {t.title}
                </option>
              ))}
            </select>

            <button
              onClick={() => setCode(TEMPLATES[selectedTemplateKey].code)}
              title="Reset code template"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded text-xs transition-colors shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? 'Running...' : 'Run Script'}</span>
            </button>
          </div>
        </div>

        {/* Template Description */}
        <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
          <span>{TEMPLATES[selectedTemplateKey].description}</span>
          <span className="font-mono text-[11px] text-slate-500">Python 3.10.12 (GCC Linux)</span>
        </div>

        {/* Code Textarea */}
        <div className="flex-1 relative min-h-[300px]">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunCode();
              } else if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const newCode = code.substring(0, start) + '    ' + code.substring(end);
                setCode(newCode);
                const target = e.currentTarget;
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 4;
                }, 0);
              }
            }}
            spellCheck={false}
            className="w-full h-full p-4 bg-[#050811] text-amber-100/90 font-mono text-[12.5px] leading-relaxed resize-none focus:outline-none selection:bg-amber-500/30 border-none"
            placeholder="Write your Python 3.10 network automation script here... (Ctrl+Enter to run)"
          />
        </div>

        {/* Editor Footer / Info */}
        <div className="p-2 px-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Lines: {code.split('\n').length}</span>
            <span>Chars: {code.length}</span>
          </div>
          <span>Built-in packages: netkings, netmiko, ipaddress, re, json, socket</span>
        </div>
      </div>

      {/* Right Column: Execution Terminal & Output */}
      <div className="flex-1 flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        {/* Output Header */}
        <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">Execution Output (stdout / stderr)</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {execTime !== null && (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{execTime}ms</span>
              </span>
            )}
            {exitCode !== null && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  exitCode === 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                Exit: {exitCode}
              </span>
            )}
          </div>
        </div>

        {/* Output Terminal Area */}
        <div className="flex-1 p-3.5 bg-[#030712] font-mono text-[12px] leading-relaxed overflow-y-auto min-h-[300px] select-text">
          {output ? (
            <pre className="text-emerald-300/90 whitespace-pre-wrap">{output}</pre>
          ) : !stderr ? (
            <div className="text-slate-600 italic py-8 text-center">
              Click &quot;Run Script&quot; to execute your Python 3.10 automation program against the virtual network topology.
            </div>
          ) : null}

          {stderr && (
            <div className="mt-2 p-2 bg-rose-950/40 border border-rose-900/60 rounded text-rose-300 whitespace-pre-wrap">
              {stderr}
            </div>
          )}
        </div>

        {/* Python Documentation Quick Reference */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs">
          <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Python 3.10 Automation Quick Reference</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
            <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
              <span className="text-amber-300 font-semibold">Connect to device:</span>
              <p className="text-slate-300 mt-0.5">conn = ConnectHandler(device_type=&quot;cisco_ios&quot;, host=&quot;R1&quot;)</p>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
              <span className="text-amber-300 font-semibold">Run show command:</span>
              <p className="text-slate-300 mt-0.5">output = conn.send_command(&quot;show ip int br&quot;)</p>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
              <span className="text-amber-300 font-semibold">Push configuration:</span>
              <p className="text-slate-300 mt-0.5">conn.send_config_set([&quot;vlan 10&quot;, &quot;name SALES&quot;])</p>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800/80">
              <span className="text-amber-300 font-semibold">Subnet with ipaddress:</span>
              <p className="text-slate-300 mt-0.5">net = ipaddress.ip_network(&quot;192.168.1.0/24&quot;)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
