/**
 * NetworkShareService provides SMB/network share management.
 * Supports mapping, unmapping, listing shares.
 */
import type { ShellService } from "../core/shell-service";

export interface NetworkShare {
  name: string;
  path: string;
  description?: string;
  type: string;
}

export interface MappedDrive {
  letter: string;
  remotePath: string;
  status: string;
}

export class NetworkShareService {
  constructor(private readonly shell: ShellService) {}

  async listShares(computer?: string): Promise<NetworkShare[]> {
    const computerArg = computer ? ` -ComputerName '${computer}'` : "";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-SmbShare${computerArg} | Select-Object Name,Path,Description,ShareType | ConvertTo-Json -Compress`
    ], true);

    if (!result.success || !result.stdout.trim()) return [];

    try {
      const shares = JSON.parse(result.stdout);
      return (Array.isArray(shares) ? shares : [shares]).map((s: any) => ({
        name: s.Name,
        path: s.Path,
        description: s.Description,
        type: String(s.ShareType)
      })) as NetworkShare[];
    } catch {
      return [];
    }
  }

  async createShare(name: string, path: string, description?: string): Promise<boolean> {
    const descArg = description ? ` -Description '${description}'` : "";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-SmbShare -Name '${name}' -Path '${path}'${descArg} -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async deleteShare(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Remove-SmbShare -Name '${name}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async mapDrive(letter: string, uncPath: string, persistent = false): Promise<boolean> {
    const persistArg = persistent ? "-Persist" : "";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-PSDrive -Name '${letter}' -PSProvider FileSystem -Root '${uncPath}' ${persistArg} -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async unmapDrive(letter: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Remove-PSDrive -Name '${letter}' -Force -ErrorAction SilentlyContinue`
    ]);

    if (!result.success) {
      const result2 = await this.shell.exec("net", ["use", `${letter}:`, "/delete", "/y"]);
      return result2.success;
    }
    return result.success;
  }

  async listMappedDrives(): Promise<MappedDrive[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-PSDrive -PSProvider FileSystem | Where-Object { $_.DisplayRoot } | Select-Object Name,DisplayRoot | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const drives = JSON.parse(result.stdout);
      return (Array.isArray(drives) ? drives : [drives]).map((d: any) => ({
        letter: d.Name,
        remotePath: d.DisplayRoot,
        status: "OK"
      })) as MappedDrive[];
    } catch {
      return [];
    }
  }

  async shareExists(name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-SmbShare -Name '${name}' -ErrorAction SilentlyContinue) -ne $null`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async getSharePermissions(name: string): Promise<string[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-SmbShareAccess -Name '${name}' | Select-Object AccountName,AccessRight | ConvertTo-Json -Compress`
    ], true);

    if (!result.success) return [];

    try {
      const perms = JSON.parse(result.stdout);
      return (Array.isArray(perms) ? perms : [perms]).map((p: any) =>
        `${p.AccountName}: ${p.AccessRight}`
      );
    } catch {
      return [];
    }
  }

  async grantShareAccess(name: string, account: string, access: "Read" | "Change" | "Full"): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Grant-SmbShareAccess -Name '${name}' -AccountName '${account}' -AccessRight ${access} -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async revokeShareAccess(name: string, account: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Revoke-SmbShareAccess -Name '${name}' -AccountName '${account}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async testConnection(uncPath: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Test-Path '${uncPath}'`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }
}