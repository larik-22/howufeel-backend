import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { MailSchemas, MailSendRequest, MailSendResponse, TemplateName } from "./base";
import { MailService } from "../../services/mailService";
import { TemplateService } from "../../services/templateService";

export class MailSend extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    tags: ["Mail"],
    summary: "Send an email using a template",
    description: "Send an email to a recipient using a predefined HTML template",
    request: {
      body: {
        content: {
          "application/json": {
            schema: MailSchemas.sendRequest,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Email sent successfully",
        content: {
          "application/json": {
            schema: MailSchemas.sendResponse,
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
                success: { type: "boolean" },
                error: { type: "string" },
              },
            },
          },
        },
      },
      "500": {
        description: "Internal server error",
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

  async handle(
    c: Context<{ Bindings: Env }>,
  ): Promise<Response> {
    try {
      // Parse and validate request body
      const body = await c.req.json<MailSendRequest>();
      const validatedData = MailSchemas.sendRequest.parse(body);

      // Validate template name
      const availableTemplates = TemplateService.getAvailableTemplates();
      if (!availableTemplates.includes(validatedData.template_name as TemplateName)) {
        return c.json<MailSendResponse>(
          {
            success: false,
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

      if (!validation.valid) {
        return c.json<MailSendResponse>(
          {
            success: false,
            error: `Template validation failed: ${validation.error}`,
          },
          400,
        );
      }

      // Process template
      const processedTemplate = await TemplateService.processTemplate(
        validatedData.template_name as TemplateName,
        validatedData.template_data,
        env,
      );

      // Initialize mail service
      const mailService = new MailService(env);

      // Send email
      const result = await mailService.sendMail({
        from: "ceo@howufeelingtoday.online",
        to: validatedData.to,
        subject: validatedData.subject,
        html: processedTemplate,
      });

      // Return result
      return c.json<MailSendResponse>(
        {
          success: result.success,
          message_id: result.messageId,
          error: result.error,
        },
        result.success ? 200 : 500,
      );
    } catch (error) {
      console.error("Mail send error:", error);
      
      return c.json<MailSendResponse>(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        },
        500,
      );
    }
  }
} 