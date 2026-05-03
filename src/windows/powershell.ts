/**
 * PowerShellService provides PowerShell command execution with structured output.
 * Supports executing scripts, capturing output, and error handling.
 */
import type { ShellService } from "../core/shell-service";

export interface PowerShellResult {
  output: string;
  errors: string[];
  exitCode: number;
  success: boolean;
}

export class PowerShellService {
  constructor(private readonly shell: ShellService) {}

  async execute(command: string): Promise<PowerShellResult> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-NoLogo",
      "-NonInteractive",
      "-Command",
      command
    ]);

    return {
      output: result.stdout,
      errors: result.stderr ? result.stderr.split("\n").filter(Boolean) : [],
      exitCode: result.exitCode,
      success: result.success
    };
  }

  async executeSilent(command: string): Promise<PowerShellResult> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-NoLogo",
      "-NonInteractive",
      "-Command",
      command
    ], true);

    return {
      output: result.stdout,
      errors: result.stderr ? result.stderr.split("\n").filter(Boolean) : [],
      exitCode: result.exitCode,
      success: result.success
    };
  }

  async executeJson<T = any>(command: string): Promise<T | null> {
    const wrapped = `${command} | ConvertTo-Json -Depth 10 -Compress`;
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      wrapped
    ], true);

    if (!result.success || !result.stdout.trim()) return null;

    try {
      return JSON.parse(result.stdout) as T;
    } catch {
      return null;
    }
  }

  async executeScriptFile(path: string, args: string[] = []): Promise<PowerShellResult> {
    const argStr = args.map(a => `'${a}'`).join(" ");
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-NoLogo",
      "-NonInteractive",
      "-File",
      path,
      ...args
    ]);

    return {
      output: result.stdout,
      errors: result.stderr ? result.stderr.split("\n").filter(Boolean) : [],
      exitCode: result.exitCode,
      success: result.success
    };
  }

  async testConnection(computerName: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Test-Connection -ComputerName '${computerName}' -Count 1 -Quiet`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async invokeCommand(computerName: string, command: string): Promise<PowerShellResult> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `Invoke-Command -ComputerName '${computerName}' -ScriptBlock { ${command} }`
    ]);

    return {
      output: result.stdout,
      errors: result.stderr ? result.stderr.split("\n").filter(Boolean) : [],
      exitCode: result.exitCode,
      success: result.success
    };
  }

  async getExecutionPolicy(): Promise<string | null> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-ExecutionPolicy`
    ], true);

    if (!result.success) return null;
    return result.stdout.trim();
  }

  async setExecutionPolicy(policy: "Restricted" | "AllSigned" | "RemoteSigned" | "Unrestricted"): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Set-ExecutionPolicy ${policy} -Force`
    ]);

    return result.success;
  }

  async testAdmin(): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }
}