"""
Network Kings Python 3.10 Automation Library (netkings)
Provides realistic Cisco IOS/Netmiko simulation and topology automation tools.
"""
import json
import os
import sys

STATE_FILE = os.environ.get("NETKINGS_STATE_FILE", "/tmp/netkings_devices_state.json")

def _load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "R1": {
            "hostname": "R1",
            "interfaces": {
                "GigabitEthernet0/0": {"ip": "192.168.1.1", "mask": "255.255.255.0", "status": "up"},
                "GigabitEthernet0/1": {"ip": "10.0.0.1", "mask": "255.255.255.252", "status": "up"},
                "Loopback0": {"ip": "1.1.1.1", "mask": "255.255.255.255", "status": "up"}
            },
            "routes": [
                {"prefix": "192.168.1.0/24", "type": "C", "interface": "GigabitEthernet0/0"},
                {"prefix": "10.0.0.0/30", "type": "C", "interface": "GigabitEthernet0/1"},
                {"prefix": "192.168.2.0/24", "type": "O", "via": "10.0.0.2", "metric": 2}
            ],
            "ospf_neighbors": [
                {"neighbor_id": "2.2.2.2", "address": "10.0.0.2", "interface": "Gi0/1", "state": "FULL/BDR"}
            ],
            "running_config": [
                "hostname R1",
                "interface GigabitEthernet0/0",
                " ip address 192.168.1.1 255.255.255.0",
                " no shutdown",
                "interface GigabitEthernet0/1",
                " ip address 10.0.0.1 255.255.255.252",
                " no shutdown",
                "router ospf 1",
                " router-id 1.1.1.1",
                " network 192.168.1.0 0.0.0.255 area 0",
                " network 10.0.0.0 0.0.0.3 area 0"
            ]
        },
        "R2": {
            "hostname": "R2",
            "interfaces": {
                "GigabitEthernet0/0": {"ip": "10.0.0.2", "mask": "255.255.255.252", "status": "up"},
                "GigabitEthernet0/1": {"ip": "192.168.2.1", "mask": "255.255.255.0", "status": "up"},
                "Loopback0": {"ip": "2.2.2.2", "mask": "255.255.255.255", "status": "up"}
            },
            "routes": [
                {"prefix": "10.0.0.0/30", "type": "C", "interface": "GigabitEthernet0/0"},
                {"prefix": "192.168.2.0/24", "type": "C", "interface": "GigabitEthernet0/1"},
                {"prefix": "192.168.1.0/24", "type": "O", "via": "10.0.0.1", "metric": 2}
            ],
            "ospf_neighbors": [
                {"neighbor_id": "1.1.1.1", "address": "10.0.0.1", "interface": "Gi0/0", "state": "FULL/DR"}
            ],
            "running_config": [
                "hostname R2",
                "interface GigabitEthernet0/0",
                " ip address 10.0.0.2 255.255.255.252",
                " no shutdown",
                "interface GigabitEthernet0/1",
                " ip address 192.168.2.1 255.255.255.0",
                " no shutdown",
                "router ospf 1",
                " router-id 2.2.2.2",
                " network 10.0.0.0 0.0.0.3 area 0",
                " network 192.168.2.0 0.0.0.255 area 0"
            ]
        },
        "SW1": {
            "hostname": "SW1",
            "vlans": [
                {"id": 1, "name": "default", "ports": ["Fa0/3", "Fa0/4"]},
                {"id": 10, "name": "DATA_SALES", "ports": ["Fa0/1"]},
                {"id": 20, "name": "DATA_ENG", "ports": ["Fa0/2"]}
            ],
            "trunks": ["Gi0/1"],
            "running_config": [
                "hostname SW1",
                "vlan 10",
                " name DATA_SALES",
                "vlan 20",
                " name DATA_ENG",
                "interface FastEthernet0/1",
                " switchport mode access",
                " switchport access vlan 10",
                "interface FastEthernet0/2",
                " switchport mode access",
                " switchport access vlan 20",
                "interface GigabitEthernet0/1",
                " switchport mode trunk"
            ]
        }
    }

def _save_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass


class ConnectHandler:
    """Netmiko-compatible connection handler for Network Kings lab simulator."""
    def __init__(self, device_type="cisco_ios", host="R1", username="admin", password="password", **kwargs):
        self.device_type = device_type
        self.host = host
        self.username = username
        self.password = password
        self.state = _load_state()
        
        # Match host by name or IP
        self.device_name = host
        if host not in self.state:
            for d_name, d_data in self.state.items():
                if d_name.lower() == host.lower():
                    self.device_name = d_name
                    break
                # Check interface IPs
                for iface in d_data.get("interfaces", {}).values():
                    if iface.get("ip") == host:
                        self.device_name = d_name
                        break
        
        self.connected = True
        self.prompt = f"{self.device_name}#"

    def find_prompt(self):
        return self.prompt

    def send_command(self, command: str) -> str:
        cmd = command.strip().lower()
        d_name = self.device_name
        dev = self.state.get(d_name, {})
        
        if "show ip int" in cmd or "sh ip int br" in cmd:
            out = ["Interface                  IP-Address      OK? Method Status                Protocol"]
            for if_name, if_data in dev.get("interfaces", {}).items():
                ip = if_data.get("ip", "unassigned")
                status = if_data.get("status", "up")
                proto = "up" if status == "up" else "down"
                status_str = "up                    " if status == "up" else "administratively down "
                out.append(f"{if_name:<26} {ip:<15} YES manual {status_str} {proto}")
            return "\n".join(out)

        elif "show ip route" in cmd or "sh ip ro" in cmd:
            out = [
                "Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP",
                "       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area",
                "Gateway of last resort is not set",
                ""
            ]
            for r in dev.get("routes", []):
                p = r.get("prefix")
                t = r.get("type", "C")
                if t == "C":
                    out.append(f"C    {p} is directly connected, {r.get('interface', 'Gi0/0')}")
                elif t == "O":
                    out.append(f"O    {p} [110/{r.get('metric', 2)}] via {r.get('via')}, 00:14:22, Gi0/1")
                elif t == "B":
                    out.append(f"B    {p} [20/{r.get('metric', 0)}] via {r.get('via')}, 00:08:11")
                elif t == "S":
                    out.append(f"S    {p} [1/0] via {r.get('via')}")
            return "\n".join(out)

        elif "show ip ospf neighbor" in cmd or "sh ip ospf nei" in cmd:
            out = [
                "Neighbor ID     Pri   State           Dead Time   Address         Interface",
            ]
            for n in dev.get("ospf_neighbors", []):
                out.append(f"{n.get('neighbor_id', '1.1.1.1'):<15} 1     {n.get('state', 'FULL/BDR'):<15} 00:00:36    {n.get('address', '10.0.0.2'):<15} {n.get('interface', 'Gi0/1')}")
            return "\n".join(out)

        elif "show vlan" in cmd or "sh vlan br" in cmd:
            out = [
                "VLAN Name                             Status    Ports",
                "---- -------------------------------- --------- -------------------------------"
            ]
            for v in dev.get("vlans", []):
                ports = ", ".join(v.get("ports", []))
                out.append(f"{v.get('id'):<4} {v.get('name'):<32} active    {ports}")
            return "\n".join(out)

        elif "show run" in cmd or "sh run" in cmd:
            lines = [
                "Building configuration...",
                "Current configuration : 1840 bytes",
                "!"
            ]
            lines.extend(dev.get("running_config", ["hostname " + d_name]))
            lines.append("end")
            return "\n".join(lines)

        elif "ping" in cmd:
            parts = command.strip().split()
            target = parts[1] if len(parts) > 1 else "unknown"
            return (
                f"Type escape sequence to abort.\n"
                f"Sending 5, 100-byte ICMP Echos to {target}, timeout is 2 seconds:\n"
                f"!!!!!\n"
                f"Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms"
            )

        elif "show version" in cmd or "sh ver" in cmd:
            return (
                f"Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M2\n"
                f"Technical Support: http://www.cisco.com/techsupport\n"
                f"{d_name} uptime is 3 weeks, 4 days, 12 hours\n"
                f"System image file is 'flash0:c2900-universalk9-mz.SPA.157-3.M2.bin'"
            )

        return f"% Command acknowledged on {d_name}: {command}"

    def send_config_set(self, config_commands: list[str]) -> str:
        d_name = self.device_name
        dev = self.state.setdefault(d_name, {"hostname": d_name, "running_config": []})
        configs = dev.setdefault("running_config", [])
        
        output = [f"configure terminal", f"Enter configuration commands, one per line. End with CNTL/Z."]
        for line in config_commands:
            line_str = line.strip()
            configs.append(line_str)
            output.append(f"{d_name}(config)# {line_str}")
            
            # Simple reactive state updates
            if line_str.startswith("hostname "):
                new_h = line_str.split()[1]
                dev["hostname"] = new_h
                self.device_name = new_h
                self.prompt = f"{new_h}#"
            elif line_str.startswith("vlan "):
                try:
                    vid = int(line_str.split()[1])
                    vlans = dev.setdefault("vlans", [])
                    if not any(v.get("id") == vid for v in vlans):
                        vlans.append({"id": vid, "name": f"VLAN{vid:04d}", "ports": []})
                except Exception:
                    pass

        output.append(f"{self.device_name}(config)# end")
        _save_state(self.state)
        return "\n".join(output)

    def disconnect(self):
        self.connected = False


def get_topology():
    return _load_state()

def ping_test(src, dst):
    """Simulate ICMP ping test between two network addresses or device names."""
    return True
