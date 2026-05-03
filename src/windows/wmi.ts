/**
 * WMIService provides Windows Management Instrumentation queries.
 * Supports querying system info, hardware, and event logs.
 */
import type { ShellService } from "../core/shell-service";

export interface WMIObject {
  [key: string]: any;
}

export class WMIService {
  constructor(private readonly shell: ShellService) {}

  async query(className: string, properties?: string[]): Promise<WMIObject[]> {
    const props = properties ? properties.join(",") : "*";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-WmiObject -Class '${className}' | Select-Object ${props} | ConvertTo-Json -Compress`
    ], true);

    if (!result.success || !result.stdout.trim()) return [];

    try {
      const parsed = JSON.parse(result.stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.filter(Boolean) as WMIObject[];
    } catch {
      return [];
    }
  }

  async queryOne(className: string, properties?: string[]): Promise<WMIObject | null> {
    const props = properties ? properties.join(",") : "*";
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-WmiObject -Class '${className}' | Select-Object ${props} | ConvertTo-Json`
    ], true);

    if (!result.success || !result.stdout.trim()) return null;

    try {
      return JSON.parse(result.stdout) as WMIObject;
    } catch {
      return null;
    }
  }

  async getOSInfo(): Promise<WMIObject | null> {
    return this.queryOne("Win32_OperatingSystem", "Caption,Version,BuildNumber,OSArchitecture,TotalVisibleMemorySize,FreePhysicalMemory");
  }

  async getCPUInfo(): Promise<WMIObject[]> {
    return this.query("Win32_Processor", "Name,Manufacturer,MaxClockSpeed,NumberOfCores,NumberOfLogicalProcessors");
  }

  async getDiskInfo(): Promise<WMIObject[]> {
    return this.query("Win32_LogicalDisk", "DeviceID,Size,FreeSpace,VolumeName,FileSystem");
  }

  async getNetworkAdapters(): Promise<WMIObject[]> {
    return this.query("Win32_NetworkAdapterConfiguration", "Description,MACAddress,IPAddress,DefaultIPGateway,DNSHostName");
  }

  async getBIOSInfo(): Promise<WMIObject | null> {
    return this.queryOne("Win32_BIOS", "Manufacturer,Version,SerialNumber,ReleaseDate");
  }

  async getComputerInfo(): Promise<WMIObject | null> {
    return this.queryOne("Win32_ComputerSystem", "Name,Domain,Manufacturer,Model,TotalPhysicalMemory");
  }

  async getInstalledPrograms(): Promise<WMIObject[]> {
    return this.query("Win32_Product", "Name,Vendor,Version,InstallDate");
  }

  async getServices(): Promise<WMIObject[]> {
    return this.query("Win32_Service", "Name,DisplayName,State,PathName,StartMode");
  }

  async getEventLog(error: string, hours = 24): Promise<WMIObject[]> {
    const after = `$(Get-Date).AddHours(-${hours})`;
    const result = await this.shell.exec("powershell", [
      "-NoProfile",
      "-Command",
      `Get-WinEvent -FilterHashtable @{LogName='${error}'; StartTime=${after}} -MaxEvents 100 -ErrorAction SilentlyContinue | Select-Object TimeCreated,Id,Message | ConvertTo-Json -Compress`
    ], true);

    if (!result.success || !result.stdout.trim()) return [];

    try {
      const parsed = JSON.parse(result.stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.filter(Boolean) as WMIObject[];
    } catch {
      return [];
    }
  }

  async getPrinters(): Promise<WMIObject[]> {
    return this.query("Win32_Printer", "Name,PortName,DriverName,Status");
  }

  async getStartupPrograms(): Promise<WMIObject[]> {
    return this.query("Win32_StartupCommand", "Name,Command,Location");
  }
}