/**
 * =================================================================================
 * MAIN EXTENSION ENTRY POINT (COMPOSER)
 * =================================================================================
 *
 * This file's sole responsibility is to initialize and wire together all the
 * services and features of the extension. This is known as the "composition root".
 *
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { ServiceContainer } from "./core/services";
import { createStatusWidget } from "./core/ui";
import { WIDGET_ID } from "./core/constants";

import { PromptClarityHandlers } from "./features/prompt_clarity";

export default function (api: ExtensionAPI) {
  // 1. Initialize Service Container (The DI Root)
  const services = new ServiceContainer(api);

  // 2. Initialize Features (passing in the services collection)
  new PromptClarityHandlers(services).register();

  // 3. Register Global Lifecycle Hooks
  api.on("session_start", async (_event, ctx) => {
    try {
      await services.store.load();
      const sessionCount = services.store.get().sessionCount + 1;
      await services.store.update({ sessionCount });

      const appConfig = services.config.get();
      const appState = services.store.get();

      // The following line creates the status widget on startup.
      // It is commented out as requested, but you can re-enable it here.
      // ctx.ui.setWidget(WIDGET_ID, createStatusWidget(appState, appConfig));
      
      services.logger.info(`Session #${sessionCount} started. Welcome, ${appConfig.username}.`, ctx);

    } catch (e: any) {
      services.logger.error(`Initialization failed: ${e.message}`, ctx);
    }
  });

  services.logger.info("Kitchen Sink Extension Initialized.");
}
