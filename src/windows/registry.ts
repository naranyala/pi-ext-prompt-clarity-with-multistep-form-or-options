/**
 * RegistryService provides Windows registry read/write operations.
 * Supports getting, setting, deleting keys and values.
 */
import type { ShellService } from "../core/shell-service";

export type RegistryHive = "HKLM" | "HKCU" | "HKCR" | "HKU" | "HKCC";

export interface RegistryValue {
  name: string;
  type: string;
  data: string;
}

export class RegistryService {
  constructor(private readonly shell: ShellService) {}

  async readKey(hive: RegistryHive, path: string): Promise<Map<string, RegistryValue>> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-ItemProperty -Path '${hive}:\\${path}' -ErrorAction SilentlyContinue | ConvertTo-Json -Compress`
    ], true);

    const values = new Map<string, RegistryValue>();
    if (!result.success || !result.stdout.trim()) return values;

    try {
      const obj = JSON.parse(result.stdout);
      Object.keys(obj).forEach(key => {
        if (key !== "PSPath" && key !== "PSParentPath" && key !== "PSChildName" && key !== "PSDrive" && key !== "PSProvider") {
          values.set(key, {
            name: key,
            type: typeof obj[key],
            data: String(obj[key])
          });
        }
      });
    } catch {
      // ignore parse errors
    }
    return values;
  }

  async getValue(hive: RegistryHive, path: string, name: string): Promise<string | null> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `(Get-ItemProperty -Path '${hive}:\\${path}' -Name '${name}' -ErrorAction SilentlyContinue).'${name}'`
    ], true);

    if (!result.success) return null;
    const val = result.stdout.trim();
    return val === "" ? null : val;
  }

  async setValue(hive: RegistryHive, path: string, name: string, value: string, type = "String"): Promise<boolean> {
    const typeMap: Record<string, string> = {
      "String": "String",
      "ExpandString": "ExpandString",
      "Binary": "Binary",
      "DWord": "DWord",
      "MultiString": "MultiString",
      "QWord": "QWord"
    };
    const regType = typeMap[type] || "String";

    const psType = regType === "String" || regType === "ExpandString" ? `"${value}"` : value;

    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-ItemProperty -Path '${hive}:\\${path}' -Name '${name}' -Value ${psType} -PropertyType ${regType} -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async deleteValue(hive: RegistryHive, path: string, name: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Remove-ItemProperty -Path '${hive}:\\${path}' -Name '${name}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async createKey(hive: RegistryHive, path: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `New-Item -Path '${hive}:\\${path}' -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async deleteKey(hive: RegistryHive, path: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Remove-Item -Path '${hive}:\\${path}' -Recurse -Force -ErrorAction SilentlyContinue`
    ]);

    return result.success;
  }

  async keyExists(hive: RegistryHive, path: string): Promise<boolean> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Test-Path '${hive}:\\${path}'`
    ], true);

    return result.success && result.stdout.trim().toLowerCase() === "true";
  }

  async valueExists(hive: RegistryHive, path: string, name: string): Promise<boolean> {
    const val = await this.getValue(hive, path, name);
    return val !== null;
  }

  async listSubKeys(hive: RegistryHive, path: string): Promise<string[]> {
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-ChildItem -Path '${hive}:\\${path}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty PSChildName`
    ], true);

    if (!result.success) return [];
    return result.stdout.trim().split("\n").filter(Boolean);
  }
}