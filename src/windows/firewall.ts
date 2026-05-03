/**
 * FirewallService provides Windows Defender Firewall management.
 * Supports enabling, disabling rules and profiles.
 */
import type { ShellService } from "../core/shell-service";

export interface FirewallRule {
  name: string;
  displayName: string;
  enabled: boolean;
  direction: string;
  action: string;
  protocol?: string;
  localPort?: string;
  remotePort?: string;
  program?: string;
}

export type FirewallProfile = "Domain" | "Private" | "Public";

export class FirewallService {
  constructor(private readonly shell: ShellService) {}

  async listRules(): Promise<FirewallRule[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetFirewallRule | Select-Object Name,DisplayName,Enabled,Direction,Action | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const rules = JSON.parse(result.stdout);
      return (Array.isArray(rules) ? rules : [rules]).map((r: any) => ({
        name: r.Name,
        displayName: r.DisplayName,
        enabled: r.Enabled === "True",
        direction: r.Direction,
        action: r.Action
      })) as FirewallRule[];
    } catch {
      return [];
    }
  }

  async findRules(name: string): Promise<FirewallRule[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetFirewallRule -Name '*${name}*' | Select-Object Name,DisplayName,Enabled,Direction,Action | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const rules = JSON.parse(result.stdout);
      return (Array.isArray(rules) ? rules : [rules]).map((r: any) => ({
        name: r.Name,
        displayName: r.DisplayName,
        enabled: r.Enabled === "True",
        direction: r.Direction,
        action: r.Action
      })) as FirewallRule[];
    } catch {
      return [];
    }
  }

  async enableRule(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Enable-NetFirewallRule -Name '${name}' -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async disableRule(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Disable-NetFirewallRule -Name '${name}' -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async createRule(name: string, params: {
    direction: "Inbound" | "Outbound";
    action: "Allow" | "Block";
    port?: string;
    program?: string;
    remoteAddress?: string;
  }): Promise<boolean> {
    const args = [`-Name '${name}'`, `-Direction ${params.direction}`, `-Action ${params.action}`];
    if (params.port) args.push(`-LocalPort ${params.port}`);
    if (params.program) args.push(`-Program '${params.program}'`);
    if (params.remoteAddress) args.push(`-RemoteAddress '${params.remoteAddress}'`);

    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-NetFirewallRule ${args.join(" ")} -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async deleteRule(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Remove-NetFirewallRule -Name '${name}' -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async isEnabled(): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-NetFirewallProfile).Enabled -contains 'True'`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async getProfileStatus(profile: FirewallProfile): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-NetFirewallProfile -Name '${profile}').Enabled`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async setProfileStatus(profile: FirewallProfile, enabled: boolean): Promise<boolean> {
    const value = enabled ? "True" : "False";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Set-NetFirewallProfile -Name '${profile}' -Enabled ${value}`
    ]);

    return result.success;
  }

  async allowProgram(program: string, name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-NetFirewallRule -DisplayName '${name}' -Program '${program}' -Action Allow -Direction Inbound -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async blockProgram(program: string, name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-NetFirewallRule -DisplayName '${name}' -Program '${program}' -Action Block -Direction Inbound -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async allowPort(port: number, name: string, protocol: "TCP" | "UDP" = "TCP"): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-NetFirewallRule -DisplayName '${name}' -LocalPort ${port} -Protocol ${protocol} -Action Allow -Direction Inbound -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }
}