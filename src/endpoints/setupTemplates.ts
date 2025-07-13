import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { setupTemplatesInKV, areTemplatesSetup } from "../utils/setupTemplates";

export class SetupTemplates extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    tags: ["Setup"],
    summary: "Setup email templates in KV storage",
    description: "Initialize email templates in KV storage for the mail service",
    responses: {
      "200": {
        description: "Templates setup successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                message: { type: "string" },
                already_setup: { type: "boolean" },
              },
            },
          },
        },
      },
      "500": {
        description: "Setup failed",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                error: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  async handle(c: Context<{ Bindings: Env }>): Promise<Response> {
    try {
      const env = c.env;

      // Check if templates are already setup
      const alreadySetup = await areTemplatesSetup(env);
      
      if (alreadySetup) {
        return c.json({
          success: true,
          message: "Templates are already setup in KV storage",
          already_setup: true,
        });
      }

      // Setup templates
      await setupTemplatesInKV(env);

      return c.json({
        success: true,
        message: "Templates successfully setup in KV storage",
        already_setup: false,
      });
    } catch (error) {
      console.error("Setup templates error:", error);
      
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
        500,
      );
    }
  }
} 