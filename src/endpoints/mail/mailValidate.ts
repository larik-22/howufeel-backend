import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { MailSchemas, MailValidateRequest, MailValidateResponse, TemplateName } from "./base";
import { TemplateService } from "../../services/templateService";

export class MailValidate extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    tags: ["Mail"],
    summary: "Validate template data",
    description: "Validate template data against a template without sending an email",
    request: {
      body: {
        content: {
          "application/json": {
            schema: MailSchemas.validateRequest,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Template validation result",
        content: {
          "application/json": {
            schema: MailSchemas.validateResponse,
          },
        },
      },
      "400": {
        description: "Invalid request data",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                valid: { type: "boolean" },
                error: { type: "string" },
              },
            },
          },
        },
      },
    },
  };

  async handle(
    c: Context<{ Bindings: Env }>,
  ): Promise<Response> {
    try {
      // Parse and validate request body
      const body = await c.req.json<MailValidateRequest>();
      const validatedData = MailSchemas.validateRequest.parse(body);

      // Validate template name
      const availableTemplates = TemplateService.getAvailableTemplates();
      if (!availableTemplates.includes(validatedData.template_name as TemplateName)) {
        return c.json<MailValidateResponse>(
          {
            valid: false,
            error: `Invalid template name. Available templates: ${availableTemplates.join(", ")}`,
          },
          400,
        );
      }

      // Validate template data
      const env = c.env;
      const validation = await TemplateService.validateTemplateData(
        validatedData.template_name as TemplateName,
        validatedData.template_data,
        env,
      );

      return c.json<MailValidateResponse>(
        {
          valid: validation.valid,
          error: validation.error,
        },
        200,
      );
    } catch (error) {
      console.error("Mail validate error:", error);
      
      return c.json<MailValidateResponse>(
        {
          valid: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
        400,
      );
    }
  }
} 