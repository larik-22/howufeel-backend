import { z } from "zod";

// Group announcement schema (matches the real data format)
export const groupAnnouncementSchema = z.object({
  data: z.object({
    from_name: z.string().describe("Name of the person sharing their mood"),
    group_name: z.string().describe("Name of the group"),
    rating: z.number().min(0).max(10).describe("Mood rating from 0-10"),
    message: z.string().describe("Mood message/emoji"),
    note: z.string().optional().describe("Optional note about the mood"),
    recipients: z.array(z.object({
      to_email: z.string().email().describe("Recipient email address"),
      to_name: z.string().describe("Recipient name"),
    })).describe("List of recipients to send the email to"),
  }),
  timestamp: z.string().describe("ISO timestamp of the announcement"),
  event: z.string().describe("Event type (e.g., 'rating_notification')"),
});

// Mail request/response schemas
export const mailSendRequest = z.object({
  to: z.string().email().describe("Recipient email address"),
  subject: z.string().min(1).describe("Email subject"),
  template_name: z.string().min(1).describe("Template name (e.g., 'group')"),
  template_data: z.record(z.any()).describe("Template data for variable substitution"),
});

export const mailSendResponse = z.object({
  success: z.boolean().describe("Whether the email was sent successfully"),
  message_id: z.string().optional().describe("Unique message identifier"),
  error: z.string().optional().describe("Error message if sending failed"),
});

export const groupAnnouncementResponse = z.object({
  success: z.boolean().describe("Whether the group announcement was sent successfully"),
  sent_count: z.number().describe("Number of emails successfully sent"),
  failed_count: z.number().describe("Number of emails that failed to send"),
  errors: z.array(z.string()).optional().describe("List of error messages for failed sends"),
  message_ids: z.array(z.string()).optional().describe("List of message IDs for successful sends"),
});

export const mailValidateRequest = z.object({
  template_name: z.string().min(1).describe("Template name to validate"),
  template_data: z.record(z.any()).describe("Template data for validation"),
});

export const mailValidateResponse = z.object({
  valid: z.boolean().describe("Whether the template is valid"),
  error: z.string().optional().describe("Validation error message"),
});

// Mail endpoint schemas
export const MailSchemas = {
  sendRequest: mailSendRequest,
  sendResponse: mailSendResponse,
  groupAnnouncementRequest: groupAnnouncementSchema,
  groupAnnouncementResponse: groupAnnouncementResponse,
  validateRequest: mailValidateRequest,
  validateResponse: mailValidateResponse,
};

// Template configuration
export const AVAILABLE_TEMPLATES = {
  group: "group.html",
} as const;

export type TemplateName = keyof typeof AVAILABLE_TEMPLATES;

// Mail endpoint types
export type GroupAnnouncementRequest = z.infer<typeof groupAnnouncementSchema>;
export type GroupAnnouncementResponse = z.infer<typeof groupAnnouncementResponse>;
export type MailSendRequest = z.infer<typeof mailSendRequest>;
export type MailSendResponse = z.infer<typeof mailSendResponse>;
export type MailValidateRequest = z.infer<typeof mailValidateRequest>;
export type MailValidateResponse = z.infer<typeof mailValidateResponse>; 