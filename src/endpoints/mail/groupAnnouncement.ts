import { OpenAPIRoute, OpenAPIRouteSchema } from "chanfana";
import { Context } from "hono";
import { MailSchemas, GroupAnnouncementRequest, GroupAnnouncementResponse } from "./base";
import { MailService } from "../../services/mailService";
import { TemplateService } from "../../services/templateService";

export class GroupAnnouncement extends OpenAPIRoute {
  schema: OpenAPIRouteSchema = {
    tags: ["Mail"],
    summary: "Send group announcement emails",
    description: "Send mood update emails to all group members using the group template",
    request: {
      body: {
        content: {
          "application/json": {
            schema: MailSchemas.groupAnnouncementRequest,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Group announcement sent successfully",
        content: {
          "application/json": {
            schema: MailSchemas.groupAnnouncementResponse,
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
      const body = await c.req.json<GroupAnnouncementRequest>();
      const validatedData = MailSchemas.groupAnnouncementRequest.parse(body);

      // Initialize services
      const env = c.env;
      const mailService = new MailService(env);

      // Prepare email data for each recipient
      const emailPromises = validatedData.data.recipients.map(async (recipient) => {
        try {
          // Prepare template data for this recipient
          const templateData = {
            group_name: validatedData.data.group_name,
            to_name: recipient.to_name,
            from_name: validatedData.data.from_name,
            rating: validatedData.data.rating.toString(),
            message: validatedData.data.message,
            note: validatedData.data.note,
          };

          // Process template
          const processedTemplate = await TemplateService.processTemplate("group", templateData, env);

          // Send email
          const result = await mailService.sendMail({
            from: "ceo@howufeelingtoday.online",
            to: recipient.to_email,
            subject: `Mood Update in ${validatedData.data.group_name}`,
            html: processedTemplate,
          });

          return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            recipient: recipient.to_email,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            recipient: recipient.to_email,
          };
        }
      });

      // Wait for all emails to be sent
      const results = await Promise.all(emailPromises);

      // Calculate statistics
      const successfulSends = results.filter(r => r.success);
      const failedSends = results.filter(r => !r.success);

      const response: GroupAnnouncementResponse = {
        success: failedSends.length === 0,
        sent_count: successfulSends.length,
        failed_count: failedSends.length,
        message_ids: successfulSends.map(r => r.messageId).filter(Boolean) as string[],
        errors: failedSends.map(r => `${r.recipient}: ${r.error}`),
      };

      // Return appropriate status code
      const statusCode = failedSends.length === 0 ? 200 : 
                        successfulSends.length === 0 ? 500 : 207; // 207 = Multi-Status

      return c.json<GroupAnnouncementResponse>(response, statusCode);
    } catch (error) {
      console.error("Group announcement error:", error);
      
      return c.json<GroupAnnouncementResponse>(
        {
          success: false,
          sent_count: 0,
          failed_count: 0,
          errors: [error instanceof Error ? error.message : "Unknown error occurred"],
        },
        500,
      );
    }
  }
} 