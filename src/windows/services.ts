/**
 * =================================================================================
 * WINDOWS SERVICES CONTAINER
 * =================================================================================
 *
 * Dependency injection container for Windows-specific services.
 * Mirrors the pattern of CoreServiceContainer for platform-agnostic services.
 *
 */
import type { ShellService } from "../core/shell-service";
import { ProcessService } from "./process";
import { WindowService } from "./window";
import { RegistryService } from "./registry";
import { ServiceManagerService } from "./service-manager";
import { PowerShellService } from "./powershell";
import { WMIService } from "./wmi";
import { FirewallService } from "./firewall";
import { NetworkShareService } from "./network-share";

export interface WindowsServices {
  readonly process: ProcessService;
  readonly window: WindowService;
  readonly registry: RegistryService;
  readonly service: ServiceManagerService;
  readonly powershell: PowerShellService;
  readonly wmi: WMIService;
  readonly firewall: FirewallService;
  readonly networkShare: NetworkShareService;
}

export class WindowsServiceContainer implements WindowsServices {
  public readonly process: ProcessService;
  public readonly window: WindowService;
  public readonly registry: RegistryService;
  public readonly service: ServiceManagerService;
  public readonly powershell: PowerShellService;
  public readonly wmi: WMIService;
  public readonly firewall: FirewallService;
  public readonly networkShare: NetworkShareService;

  constructor(shell: ShellService) {
    this.process = new ProcessService(shell);
    this.window = new WindowService(shell);
    this.registry = new RegistryService(shell);
    this.service = new ServiceManagerService(shell);
    this.powershell = new PowerShellService(shell);
    this.wmi = new WMIService(shell);
    this.firewall = new FirewallService(shell);
    this.networkShare = new NetworkShareService(shell);
  }
}