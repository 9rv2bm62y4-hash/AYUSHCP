/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_LABS } from './data/labsData';
import { NetworkLab, SimulatedDevice } from './types/network';
import { TopBar, ActiveTab } from './components/TopBar';
import { TopologyView } from './components/TopologyView';
import { CiscoTerminal } from './components/CiscoTerminal';
import { LabGuide } from './components/LabGuide';
import { PythonAutomationLab } from './components/PythonAutomationLab';
import { ConfigGenerator } from './components/ConfigGenerator';
import { NetworkBuilderStudio } from './components/NetworkBuilderStudio';
import { InterviewScenarios } from './components/InterviewScenarios';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('labs');
  const [selectedTrack, setSelectedTrack] = useState<string>('All Tracks');
  const [currentLabId, setCurrentLabId] = useState<string>(INITIAL_LABS[0].id);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Store labs with independent device states
  const [allLabs, setAllLabs] = useState<NetworkLab[]>(INITIAL_LABS);

  // Currently active device in console
  const [activeDeviceId, setActiveDeviceId] = useState<string>(
    INITIAL_LABS[0].topology.devices[0]?.id || 'R1'
  );

  // Ping packet animation pulse
  const [pingPulse, setPingPulse] = useState<{ source: string; target: string } | null>(null);

  // Filtered labs by track
  const filteredLabs = useMemo(() => {
    if (selectedTrack === 'All Tracks') return allLabs;
    return allLabs.filter((lab) => lab.track.toLowerCase().includes(selectedTrack.toLowerCase()));
  }, [allLabs, selectedTrack]);

  // Current active lab
  const currentLab = useMemo(() => {
    return allLabs.find((l) => l.id === currentLabId) || filteredLabs[0] || allLabs[0];
  }, [allLabs, currentLabId, filteredLabs]);

  // Current lab index in filtered list
  const currentLabFilteredIndex = filteredLabs.findIndex((l) => l.id === currentLab.id);

  // Completed labs calculation
  const completedLabsCount = useMemo(() => {
    return allLabs.filter((lab) => {
      const devMap: Record<string, SimulatedDevice> = {};
      lab.topology.devices.forEach((d) => { devMap[d.id] = d; });
      return lab.objectives.every((obj) => obj.isCompleted(devMap, lab.topology.links));
    }).length;
  }, [allLabs]);

  // Global keyboard shortcuts listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      // Toggle shortcuts modal with '?' or 'Ctrl+/' (only when not typing in text field)
      if ((e.key === '?' && !isInputFocused) || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Tab navigation hotkeys: Alt + 1..5
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('labs'); }
        else if (e.key === '2') { e.preventDefault(); setActiveTab('python'); }
        else if (e.key === '3') { e.preventDefault(); setActiveTab('generator'); }
        else if (e.key === '4') { e.preventDefault(); setActiveTab('sandbox'); }
        else if (e.key === '5') { e.preventDefault(); setActiveTab('interview'); }
      }

      // Lab navigation: Ctrl + ] and Ctrl + [
      if (e.ctrlKey && e.key === ']') {
        e.preventDefault();
        handleNextLab();
      } else if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        handlePrevLab();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentLabFilteredIndex, filteredLabs]);

  // Select another lab
  const handleSelectLab = (labId: string) => {
    setCurrentLabId(labId);
    const targetLab = allLabs.find((l) => l.id === labId);
    if (targetLab && targetLab.topology.devices.length > 0) {
      setActiveDeviceId(targetLab.topology.devices[0].id);
    }
  };

  // Next Lab navigation
  const handleNextLab = () => {
    if (currentLabFilteredIndex < filteredLabs.length - 1) {
      const nextLab = filteredLabs[currentLabFilteredIndex + 1];
      handleSelectLab(nextLab.id);
    }
  };

  // Previous Lab navigation
  const handlePrevLab = () => {
    if (currentLabFilteredIndex > 0) {
      const prevLab = filteredLabs[currentLabFilteredIndex - 1];
      handleSelectLab(prevLab.id);
    }
  };

  // Device state change handler from terminal or python
  const handleDeviceStateChange = (updatedMap: Record<string, SimulatedDevice>) => {
    setAllLabs((prevLabs) =>
      prevLabs.map((lab) => {
        if (lab.id !== currentLab.id) return lab;
        const newDevices = lab.topology.devices.map((d) => updatedMap[d.id] || d);
        return {
          ...lab,
          topology: {
            ...lab.topology,
            devices: newDevices,
          },
        };
      })
    );
  };

  // Reset single lab state
  const handleResetLab = () => {
    const original = INITIAL_LABS.find((l) => l.id === currentLab.id);
    if (!original) return;

    setAllLabs((prevLabs) =>
      prevLabs.map((lab) => (lab.id === currentLab.id ? JSON.parse(JSON.stringify(original)) : lab))
    );
    if (original.topology.devices.length > 0) {
      setActiveDeviceId(original.topology.devices[0].id);
    }
  };

  // Reset all labs to initial pristine state
  const handleResetAll = () => {
    if (window.confirm('Reset all labs and virtual device configurations to factory defaults?')) {
      setAllLabs(JSON.parse(JSON.stringify(INITIAL_LABS)));
      setActiveDeviceId(INITIAL_LABS[0].topology.devices[0]?.id || 'R1');
      setCurrentLabId(INITIAL_LABS[0].id);
    }
  };

  // Automated ping mesh test
  const handleTestPingAll = () => {
    const devs = currentLab.topology.devices;
    if (devs.length >= 2) {
      setPingPulse({ source: devs[0].id, target: devs[1].id });
      setTimeout(() => setPingPulse(null), 2500);
    }
  };

  // Apply config generator output directly to current device
  const handleApplyConfigToActiveDevice = (commands: string[]) => {
    const targetDev = currentLab.topology.devices.find((d) => d.id === activeDeviceId);
    if (!targetDev) return;

    const devMap: Record<string, SimulatedDevice> = {};
    currentLab.topology.devices.forEach((d) => { devMap[d.id] = d; });

    // Append config commands
    commands.forEach((c) => {
      targetDev.runningConfig.push(c);
      if (c.startsWith('interface ')) {
        const name = c.replace('interface ', '').trim();
        if (!targetDev.interfaces[name]) {
          targetDev.interfaces[name] = {
            name,
            shortName: name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa'),
            status: 'up',
            protocol: 'up',
          };
        }
      }
    });

    devMap[targetDev.id] = targetDev;
    handleDeviceStateChange(devMap);
    setActiveTab('labs');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Bar with Brand & Navigation */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedTrack={selectedTrack}
        setSelectedTrack={setSelectedTrack}
        completedLabsCount={completedLabsCount}
        totalLabsCount={allLabs.length}
        onResetAll={handleResetAll}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* VIEW 1: Hands-on Interactive Labs */}
        {activeTab === 'labs' && (
          <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 overflow-y-auto">
            {/* Lab Switcher Bar */}
            <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-slate-500 font-mono flex items-center gap-1 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Lab:</span>
                </span>
                {filteredLabs.map((l, idx) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelectLab(l.id)}
                    className={`px-3 py-1 rounded-md font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      l.id === currentLab.id
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-500">{idx + 1}.</span>
                    <span>{l.title.replace(/^Lab \d+:\s*/, '')}</span>
                  </button>
                ))}
              </div>

              {/* Lab Next/Prev Buttons */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={handlePrevLab}
                  disabled={currentLabFilteredIndex === 0}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                  title="Previous Lab"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextLab}
                  disabled={currentLabFilteredIndex === filteredLabs.length - 1}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                  title="Next Lab"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Screen Workspace: Topology + Terminal (Left) & Lab Guide (Right) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[620px]">
              {/* Left Column: Topology Canvas & Live Terminal */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                {/* Topology Visualizer */}
                <div className="h-[280px] sm:h-[320px]">
                  <TopologyView
                    devices={currentLab.topology.devices}
                    links={currentLab.topology.links}
                    activeDeviceId={activeDeviceId}
                    onSelectDevice={setActiveDeviceId}
                    pingPulse={pingPulse}
                    onTestPingAll={handleTestPingAll}
                    labTitle={currentLab.title}
                  />
                </div>

                {/* Cisco IOS Terminal */}
                <div className="flex-1 min-h-[300px]">
                  <CiscoTerminal
                    devices={currentLab.topology.devices}
                    activeDeviceId={activeDeviceId}
                    onSelectDevice={setActiveDeviceId}
                    onDeviceStateChange={handleDeviceStateChange}
                    onPingDetected={(pulse) => {
                      setPingPulse(pulse);
                      setTimeout(() => setPingPulse(null), 2000);
                    }}
                  />
                </div>
              </div>

              {/* Right Column: Lab Guide & Real-Time Objectives Evaluator */}
              <div className="lg:col-span-4 h-full">
                <LabGuide
                  lab={currentLab}
                  devices={currentLab.topology.devices}
                  links={currentLab.topology.links}
                  onResetLab={handleResetLab}
                  onNextLab={handleNextLab}
                  hasNextLab={currentLabFilteredIndex < filteredLabs.length - 1}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Python 3.10 Automation Studio */}
        {activeTab === 'python' && (
          <PythonAutomationLab
            devices={currentLab.topology.devices}
            onDeviceStateUpdate={handleDeviceStateChange}
          />
        )}

        {/* VIEW 3: Config Generator */}
        {activeTab === 'generator' && (
          <ConfigGenerator
            activeDevice={currentLab.topology.devices.find((d) => d.id === activeDeviceId)}
            onApplyToDevice={handleApplyConfigToActiveDevice}
          />
        )}

        {/* VIEW 4: GNS3 & Packet Tracer Studio */}
        {activeTab === 'sandbox' && <NetworkBuilderStudio currentLab={currentLab} />}

        {/* VIEW 5: Interview Scenarios */}
        {activeTab === 'interview' && <InterviewScenarios />}
      </main>

      {/* Keyboard Shortcuts Helper Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
