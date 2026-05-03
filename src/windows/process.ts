/**
 * ProcessService provides high-level process management via PowerShell.
 * Supports creation, termination, and enumeration of Windows processes.
 */
import type { ShellService } from "../core/shell-service";

export interface ProcessInfo {
  pid: number;
  name: string;
  path?: string;
  cpu: number;
  memory: number;
  startTime?: string;
}

export class ProcessService {
  constructor(private readonly shell: ShellService) {}

  async list(): Promise<ProcessInfo[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-Process | Select-Object Id, ProcessName, Path, CPU, WorkingSet64, StartTime | ConvertTo-Json -Compress`
    ], true);

    if (!result.success || !result.stdout.trim()) return [];

    try {
      const parsed = JSON.parse(result.stdout);
      const processes = Array.isArray(parsed) ? parsed : [parsed];
      return processes.map((p: any) => ({
        pid: p.Id,
        name: p.ProcessName,
        path: p.Path,
        cpu: p.CPU,
        memory: p.WorkingSet64,
        startTime: p.StartTime
      }));
    } catch {
      return [];
    }
  }

  async find(name: string): Promise<ProcessInfo[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-Process -Name '${name}' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const parsed = JSON.parse(result.stdout);
      const processes = Array.isArray(parsed) ? parsed : [parsed];
      return processes.filter(Boolean).map((p: any) => ({
        pid: p.Id,
        name: p.ProcessName,
        path: undefined,
        cpu: 0,
        memory: 0
      }));
    } catch {
      return [];
    }
  }

  async start(path: string, args: string[] = []): Promise<number | null> {
    const argStr = args.length > 0 ? ` -ArgumentList '${args.join(" ")}'` : "";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Start-Process -FilePath '${path}'${argStr} -PassThru).Id`
    ]);

    if (!result.success) return null;

    const pid = parseInt(result.stdout.trim(), 10);
    return isNaN(pid) ? null : pid;
  }

  async kill(pid: number): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async killAll(name: string): Promise<number> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-Process -Name '${name}' -ErrorAction SilentlyContinue | Stop-Process -Force -PassThru).Count`
    ]);

    if (!result.success) return 0;

    return parseInt(result.stdout.trim() || "0", 10);
  }

  async isRunning(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-Process -Name '${name}' -ErrorAction SilentlyContinue) -ne $null`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async waitForExit(name: string, timeoutMs = 30000): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `$start = Get-Date; while ((Get-Process -Name '${name}' -ErrorAction SilentlyContinue) -and ((Get-Date) - $start).TotalMilliseconds -lt ${timeoutMs}) { Start-Sleep -Milliseconds 100 }; -not (Get-Process -Name '${name}' -ErrorAction SilentlyContinue)`
    ]);

    return result.success;
  }
}