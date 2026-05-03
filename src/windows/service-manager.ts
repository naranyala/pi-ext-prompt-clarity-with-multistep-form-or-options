/**
 * ServiceManagerService provides Windows services (daemon equivalent) management.
 * Supports listing, starting, stopping, installing services.
 */
import type { ShellService } from "../core/shell-service";

export interface WindowsServiceInfo {
  name: string;
  displayName: string;
  status: string;
  startType: string;
  description?: string;
}

export type ServiceStatus = "Running" | "Stopped" | "Paused" | "StartPending" | "StopPending";

export class ServiceManagerService {
  constructor(private readonly shell: ShellService) {}

  async list(): Promise<WindowsServiceInfo[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-Service | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const services = JSON.parse(result.stdout);
      return (Array.isArray(services) ? services : [services]).map((s: any) => ({
        name: s.Name,
        displayName: s.DisplayName,
        status: String(s.Status),
        startType: String(s.StartType)
      }));
    } catch {
      return [];
    }
  }

  async find(name: string): Promise<WindowsServiceInfo | null> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-Service -Name '${name}' -ErrorAction SilentlyContinue | Select-Object Name, DisplayName, Status, StartType | ConvertTo-Json`
    ], true);

    if (!result.success) return null;

    try {
      const s = JSON.parse(result.stdout);
      return {
        name: s.Name,
        displayName: s.DisplayName,
        status: String(s.Status),
        startType: String(s.StartType)
      };
    } catch {
      return null;
    }
  }

  async start(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Start-Service -Name '${name}' -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async stop(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Stop-Service -Name '${name}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async restart(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Restart-Service -Name '${name}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async status(name: string): Promise<ServiceStatus | null> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-Service -Name '${name}' -ErrorAction SilentlyContinue).Status`
    ], true);

    if (!result.success) return null;
    return result.stdout.trim() as ServiceStatus;
  }

  async isRunning(name: string): Promise<boolean> {
    const s = await this.status(name);
    return s === "Running";
  }

  async isStopped(name: string): Promise<boolean> {
    const s = await this.status(name);
    return s === "Stopped";
  }

  async setStartType(name: string, startType: "Automatic" | "Manual" | "Disabled"): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Set-Service -Name '${name}' -StartupType ${startType} -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async install(path: string, name: string, displayName: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-Service -Name '${name}' -BinaryPathName '${path}' -DisplayName '${displayName}' -Description 'Service installed by pi-ext' -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async uninstall(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `sc.exe delete '${name}'`
    ]);

    return result.success;
  }

  async waitForStatus(name: string, desired: ServiceStatus, timeoutMs = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const s = await this.status(name);
      if (s === desired) return true;
      if (s !== null) return false;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }
}