import React, { useState, useRef, useEffect } from 'react';
import { SimulatedDevice } from '../types/network';
import { getPrompt, executeCommand, CommandResult } from '../services/ciscoIOS';
import { getAutocompletions, CompletionSuggestion } from '../services/ciscoAutocomplete';
import {
  Terminal,
  Copy,
  Trash2,
  HelpCircle,
  CornerDownLeft,
  PanelRightOpen,
  PanelRightClose,
  Search,
  Sparkles,
  ArrowRight,
  Send,
} from 'lucide-react';

interface CiscoTerminalProps {
  devices: SimulatedDevice[];
  activeDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
  onDeviceStateChange: (updatedDevices: Record<string, SimulatedDevice>) => void;
  onPingDetected?: (pulse: { source: string; target: string }) => void;
}

interface QuickCommandItem {
  cmd: string;
  desc: string;
  category: 'Show' | 'Config' | 'Operations' | 'Protocol';
}

const QUICK_COMMAND_LIST: QuickCommandItem[] = [
  // Show Commands
  { cmd: 'show ip int brief', desc: 'Interface IP and status summary', category: 'Show' },
  { cmd: 'show ip route', desc: 'IP routing table entries', category: 'Show' },
  { cmd: 'show running-config', desc: 'Current active configuration', category: 'Show' },
  { cmd: 'show vlan brief', desc: 'VLAN port membership table', category: 'Show' },
  { cmd: 'show ip ospf neighbor', desc: 'OSPF adjacencies and state', category: 'Show' },
  { cmd: 'show ip bgp summary', desc: 'BGP peering sessions table', category: 'Show' },
  { cmd: 'show version', desc: 'System uptime and software image', category: 'Show' },
  { cmd: 'show access-lists', desc: 'Configured ACL rules & matches', category: 'Show' },
  { cmd: 'show interfaces', desc: 'Full interface hardware & packet stats', category: 'Show' },

  // Config Commands
  { cmd: 'enable', desc: 'Enter Privileged EXEC mode', category: 'Config' },
  { cmd: 'conf t', desc: 'Enter Global Configuration mode', category: 'Config' },
  { cmd: 'interface GigabitEthernet0/0', desc: 'Select Gi0/0 interface context', category: 'Config' },
  { cmd: 'interface GigabitEthernet0/1', desc: 'Select Gi0/1 interface context', category: 'Config' },
  { cmd: 'ip address 192.168.1.1 255.255.255.0', desc: 'Assign IPv4 address and netmask', category: 'Config' },
  { cmd: 'no shutdown', desc: 'Enable interface (bring line up)', category: 'Config' },
  { cmd: 'shutdown', desc: 'Administratively disable interface', category: 'Config' },
  { cmd: 'exit', desc: 'Exit one level up in hierarchy', category: 'Config' },
  { cmd: 'end', desc: 'Return immediately to Privileged EXEC', category: 'Config' },

  // Operations
  { cmd: 'wr', desc: 'Save running-config to NVRAM memory', category: 'Operations' },
  { cmd: 'copy run start', desc: 'Copy running-config to startup-config', category: 'Operations' },
  { cmd: 'ping 192.168.1.1', desc: 'Send ICMP echo request packets', category: 'Operations' },
  { cmd: 'reload', desc: 'Soft reboot the network device', category: 'Operations' },

  // Protocol
  { cmd: 'router ospf 1', desc: 'Start OSPF routing process 1', category: 'Protocol' },
  { cmd: 'network 192.168.1.0 0.0.0.255 area 0', desc: 'Advertise network in OSPF Area 0', category: 'Protocol' },
  { cmd: 'vlan 10', desc: 'Create or configure VLAN 10', category: 'Protocol' },
  { cmd: 'switchport mode access', desc: 'Set port as untagged access link', category: 'Protocol' },
  { cmd: 'switchport access vlan 10', desc: 'Assign port to VLAN 10', category: 'Protocol' },
  { cmd: 'switchport mode trunk', desc: 'Configure 802.1Q trunk link', category: 'Protocol' },
];

export const CiscoTerminal: React.FC<CiscoTerminalProps> = ({
  devices,
  activeDeviceId,
  onSelectDevice,
  onDeviceStateChange,
  onPingDetected,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [tabHistories, setTabHistories] = useState<Record<string, Array<{ type: 'input' | 'output'; text: string; prompt?: string }>>>({});
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Show' | 'Config' | 'Operations' | 'Protocol'>('All');
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [tabCycleIndex, setTabCycleIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || devices[0];

  // Initialize history for active device if not present
  useEffect(() => {
    if (activeDevice && !tabHistories[activeDevice.id]) {
      setTabHistories((prev) => ({
        ...prev,
        [activeDevice.id]: [
          {
            type: 'output',
            text: `Connected to ${activeDevice.hostname} console (tty0).\nType 'enable' for privileged commands, '?' for help.\nUse the Quick Commands sidebar to inject common shortcuts.\n`,
          },
        ],
      }));
    }
  }, [activeDevice?.id]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tabHistories, activeDeviceId]);

  // Focus input when tab changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeDeviceId]);

  const currentHistory = tabHistories[activeDevice?.id] || [];
  const currentPrompt = activeDevice ? getPrompt(activeDevice) : 'Router#';

  const handleSendCommand = (cmdToSend?: string) => {
    const text = (cmdToSend !== undefined ? cmdToSend : inputVal).trim();
    if (!activeDevice) return;

    const promptAtExecution = currentPrompt;

    // Build device lookup map
    const devMap: Record<string, SimulatedDevice> = {};
    devices.forEach((d) => { devMap[d.id] = d; });

    // Execute through Cisco IOS parser
    const result: CommandResult = executeCommand(text, activeDevice, devMap);

    // Ping visual feedback
    if (result.pingSuccess && onPingDetected) {
      onPingDetected({
        source: result.pingSuccess.source,
        target: result.pingSuccess.target,
      });
    }

    // Update histories
    const newItems: Array<{ type: 'input' | 'output'; text: string; prompt?: string }> = [
      ...currentHistory,
      { type: 'input', text, prompt: promptAtExecution },
    ];
    if (result.output) {
      newItems.push({ type: 'output', text: result.output });
    }

    setTabHistories((prev) => ({
      ...prev,
      [activeDevice.id]: newItems,
    }));

    if (result.allDevices) {
      onDeviceStateChange(result.allDevices);
    }

    setInputVal('');
    setHistoryIndex(-1);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  // Inject command into prompt without executing immediately
  const handleInjectCommand = (cmdText: string) => {
    setInputVal(cmdText);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    } else if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      setIsSidebarOpen((prev) => !prev);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      handleClear();
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      handleSendCommand('end');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cmds = activeDevice.commandHistory || [];
      if (cmds.length === 0) return;

      const nextIdx = historyIndex === -1 ? cmds.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputVal(cmds[nextIdx]);
      setSuggestions([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cmds = activeDevice.commandHistory || [];
      if (historyIndex === -1) return;

      if (historyIndex < cmds.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputVal(cmds[nextIdx]);
      } else {
        setHistoryIndex(-1);
        setInputVal('');
      }
      setSuggestions([]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabAutocomplete();
    }
  };

  const handleTabAutocomplete = () => {
    if (!activeDevice) return;
    const res = getAutocompletions(inputVal, activeDevice, devices);

    if (res.isExactOrUnique) {
      setInputVal(res.completedText);
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    } else if (res.suggestions.length > 0) {
      if (res.hasChanged) {
        // Expand common prefix
        setInputVal(res.completedText);
        setSuggestions(res.suggestions);
        setSelectedSuggestionIndex(0);
        setTabCycleIndex(0);
      } else {
        // Repeated Tab press: cycle through options
        const nextIdx = (tabCycleIndex + 1) % res.suggestions.length;
        setTabCycleIndex(nextIdx);
        setInputVal(res.suggestions[nextIdx].fullCommand);
        setSuggestions(res.suggestions);
        setSelectedSuggestionIndex(nextIdx);
      }
    } else {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleCopy = () => {
    const fullText = currentHistory
      .map((item) => (item.type === 'input' ? `${item.prompt} ${item.text}` : item.text))
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    if (!activeDevice) return;
    setTabHistories((prev) => ({
      ...prev,
      [activeDevice.id]: [],
    }));
  };

  // Filter commands for sidebar
  const filteredCommands = QUICK_COMMAND_LIST.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.cmd.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
      {/* Device Tabs Bar */}
      <div className="flex items-center justify-between bg-slate-900 border-b border-slate-800 px-3 py-1.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => onSelectDevice(d.id)}
                className={`px-3 py-1 text-xs font-mono rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  d.id === activeDeviceId
                    ? 'bg-slate-950 text-cyan-300 border border-cyan-800/80 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    d.id === activeDeviceId ? 'bg-cyan-400' : 'bg-slate-600'
                  }`}
                />
                <span>{d.hostname}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Console Action Buttons & Sidebar Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Hide Quick Commands Sidebar' : 'Show Quick Commands Sidebar'}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
              isSidebarOpen
                ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300'
            }`}
          >
            {isSidebarOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Quick Commands</span>
          </button>

          <button
            onClick={() => handleSendCommand('?')}
            title="Interactive help (?)"
            className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy terminal session"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            title="Clear screen"
            className="p-1 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Area (Terminal Screen + Quick Commands Sidebar) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Terminal Screen (Left / Main) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#030712] min-h-[240px]">
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 p-3.5 overflow-y-auto font-mono text-[12.5px] leading-relaxed select-text"
          >
            {currentHistory.map((item, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-words">
                {item.type === 'input' ? (
                  <div className="text-slate-300 flex items-start gap-1 py-0.5">
                    <span className="text-cyan-400 font-semibold select-none">{item.prompt}</span>
                    <span className="text-white font-medium">{item.text}</span>
                  </div>
                ) : (
                  <div className="text-slate-300 text-xs py-0.5 pl-1 font-mono text-emerald-300/90 leading-tight">
                    {item.text}
                  </div>
                )}
              </div>
            ))}

            {/* Intelligent Cisco CCNA/CCNP Autocomplete Suggestions Popup */}
            {suggestions.length > 0 && (
              <div className="my-2 p-2.5 bg-slate-900/95 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] rounded-lg text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>CCNA/CCNP Autocomplete Suggestions ({suggestions.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Tab</kbd> cycle · <kbd className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> dismiss
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 max-h-36 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setInputVal(s.fullCommand);
                        setSuggestions([]);
                        setSelectedSuggestionIndex(-1);
                        inputRef.current?.focus();
                      }}
                      className={`p-1.5 px-2 rounded cursor-pointer transition-colors flex flex-col justify-center ${
                        selectedSuggestionIndex === idx
                          ? 'bg-cyan-950/90 border border-cyan-400 text-cyan-100 shadow-sm'
                          : 'hover:bg-slate-800/80 border border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span className="text-cyan-300">{s.fullCommand}</span>
                        {selectedSuggestionIndex === idx && (
                          <span className="text-[9px] bg-cyan-500/30 text-cyan-300 px-1 rounded font-mono">active</span>
                        )}
                      </div>
                      {s.description && (
                        <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                          {s.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Command Prompt Line */}
            <div className="flex items-center gap-1 pt-1 text-slate-200">
              <span className="text-cyan-400 font-semibold select-none whitespace-nowrap">{currentPrompt}</span>
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (suggestions.length > 0) setSuggestions([]);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-[12.5px] focus:ring-0 p-0 selection:bg-cyan-500/40"
                placeholder="Type command or press [Tab] for CCNA/CCNP completion..."
              />
              <button
                onClick={() => handleSendCommand()}
                className="text-slate-500 hover:text-cyan-400 p-0.5 select-none"
                title="Send (Enter)"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Commands Sidebar (Right) */}
        {isSidebarOpen && (
          <aside className="w-full md:w-64 lg:w-72 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 select-none z-10 max-h-[220px] md:max-h-none">
            {/* Sidebar Header */}
            <div className="p-2.5 px-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Commands</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{filteredCommands.length} items</span>
            </div>

            {/* Search Input */}
            <div className="p-2 border-b border-slate-800/80 bg-slate-900/50">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter CLI commands..."
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-7 pr-2 py-1 text-[11px] font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto scrollbar-none text-[10px]">
                {(['All', 'Show', 'Config', 'Operations', 'Protocol'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors whitespace-nowrap ${
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

            {/* Commands List */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No matching commands
                </div>
              ) : (
                filteredCommands.map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center justify-between p-1.5 px-2 rounded bg-slate-950/60 hover:bg-slate-800/90 border border-slate-800/60 hover:border-cyan-500/40 transition-all text-left"
                  >
                    <button
                      onClick={() => handleInjectCommand(item.cmd)}
                      className="flex-1 text-left min-w-0"
                      title="Click to inject into prompt"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-cyan-300 font-medium group-hover:text-cyan-200 truncate">
                          {item.cmd}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {item.desc}
                      </div>
                    </button>

                    {/* Quick Run / Send Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendCommand(item.cmd);
                      }}
                      title="Execute immediately"
                      className="ml-1 p-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/40 rounded transition-colors shrink-0"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar Hint Footer */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 font-mono text-center">
              Click command to inject · <Send className="w-2.5 h-2.5 inline text-emerald-400" /> to execute
            </div>
          </aside>
        )}
      </div>

      {/* Quick Cisco Macro Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 overflow-x-auto scrollbar-none text-[11px]">
        <span className="text-slate-500 font-mono shrink-0">Quick CLI:</span>
        {['enable', 'conf t', 'show ip int brief', 'wr', 'show running-config', 'no shut', 'exit'].map((q) => (
          <button
            key={q}
            onClick={() => handleInjectCommand(q)}
            title="Inject into prompt"
            className="px-2 py-0.5 rounded font-mono bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-cyan-300 border border-slate-700/50 transition-colors whitespace-nowrap"
          >
            {q}
          </button>
        ))}
        {copied && (
          <span className="ml-auto text-emerald-400 text-[10px] font-mono shrink-0">Copied!</span>
        )}
      </div>
    </div>
  );
};
