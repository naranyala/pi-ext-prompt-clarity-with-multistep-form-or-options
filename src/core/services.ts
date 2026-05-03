/**
 * =================================================================================
 * SERVICES CONTAINER
 * =================================================================================
 *
 * This container holds all the core services used across the extension.
 * It implements a Dependency Injection (DI) pattern, allowing features
 * to access shared services without managing their lifecycles.
 *
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Store } from "./store";
import { ConfigValidator } from "./validation";
import { Logger } from "./logger";
import { FloatingContext } from "./floating-context";
import { InternalBus } from "./internal-bus";
import { ShellService } from "./shell-service";
import { NotificationService } from "./notification-service";
import { SystemToolService } from "./system-tool-service";
import { GnuUtilsService } from "./gnu-utils-service";

/**
 * Interface defining the available services in the extension.
 */
export interface Services {
  readonly api: ExtensionAPI;
  readonly store: Store;
  readonly config: ConfigValidator;
  readonly logger: Logger;
  readonly floatingContext: FloatingContext;
  readonly bus: InternalBus;
  readonly shell: ShellService;
  readonly notify: NotificationService;
  readonly systemTool: SystemToolService;
  readonly gnu: GnuUtilsService;
}

/**
 * Concrete implementation of the Services container.
 */
export class ServiceContainer implements Services {
  public readonly api: ExtensionAPI;
  public readonly store: Store;
  public readonly config: ConfigValidator;
  public readonly logger: Logger;
  public readonly floatingContext: FloatingContext;
  public readonly bus: InternalBus;
  public readonly shell: ShellService;
  public readonly notify: NotificationService;
  public readonly systemTool: SystemToolService;
  public readonly gnu: GnuUtilsService;

  constructor(api: ExtensionAPI) {
    this.api = api;
    
    // Initialize services in the required order of dependency
    this.logger = new Logger();
    this.config = new ConfigValidator(api);
    this.store = new Store(api, { sessionCount: 0, todoList: [] });
    this.floatingContext = new FloatingContext();
    this.bus = new InternalBus();
    this.notify = new NotificationService();
    this.shell = new ShellService(api, this.logger);
    this.systemTool = new SystemToolService(this.shell);
    this.gnu = new GnuUtilsService(this.shell, this.systemTool);
  }
}
