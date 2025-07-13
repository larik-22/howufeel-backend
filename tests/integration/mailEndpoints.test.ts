import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { fromHono } from "chanfana";
import { mailRouter } from "../../src/endpoints/mail/router";

// Mock the services
vi.mock("../../src/services/mailService", () => ({
  MailService: vi.fn().mockImplementation(() => ({
    sendMail: vi.fn().mockResolvedValue({
      success: true,
      messageId: "test-message-id-123",
    }),
  })),
}));

vi.mock("../../src/services/templateService", () => ({
  TemplateService: {
    loadTemplate: vi.fn().mockResolvedValue("<!DOCTYPE html><html><body>Test template</body></html>"),
    processTemplate: vi.fn().mockResolvedValue("<!DOCTYPE html><html><body>Processed template</body></html>"),
    validateTemplateData: vi.fn().mockResolvedValue({ valid: true }),
    getAvailableTemplates: vi.fn().mockReturnValue(["group"]),
    clearCache: vi.fn(),
  },
}));

describe("Mail Endpoints Integration Tests", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/mail", mailRouter);
  });

  describe("POST /mail/send", () => {
    it("should send email successfully", async () => {
      const requestBody = {
        to: "test@example.com",
        subject: "Test Email",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John",
          from_name: "Jane",
          rating: "8",
          message: "Feeling great",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.message_id).toBe("test-message-id-123");
    });

    it("should return 400 for invalid template name", async () => {
      const requestBody = {
        to: "test@example.com",
        subject: "Test Email",
        template_name: "invalid-template",
        template_data: {
          group_name: "Test Group",
          to_name: "John",
          from_name: "Jane",
          rating: "8",
          message: "Feeling great",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid template name");
    });

    it("should return 400 for invalid email", async () => {
      const requestBody = {
        to: "invalid-email",
        subject: "Test Email",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John",
          from_name: "Jane",
          rating: "8",
          message: "Feeling great",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /mail/validate", () => {
    it("should validate template data successfully", async () => {
      const requestBody = {
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John",
          from_name: "Jane",
          rating: "8",
          message: "Feeling great",
        },
      };

      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.valid).toBe(true);
    });

    it("should return 400 for invalid template name", async () => {
      const requestBody = {
        template_name: "invalid-template",
        template_data: {
          group_name: "Test Group",
          to_name: "John",
          from_name: "Jane",
          rating: "8",
          message: "Feeling great",
        },
      };

      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
      const data = await response.json() as any;
      expect(data.valid).toBe(false);
      expect(data.error).toContain("Invalid template name");
    });
  });

  describe("POST /mail/group-announcement", () => {
    it("should send group announcement successfully", async () => {
      const requestBody = {
        data: {
          from_name: "Jane Smith",
          group_name: "Test Group",
          rating: 8,
          message: "Feeling great!",
          note: "Had an amazing day",
          recipients: [
            {
              to_email: "john@example.com",
              to_name: "John Doe",
            },
            {
              to_email: "jane@example.com",
              to_name: "Jane Doe",
            },
          ],
        },
        timestamp: "2025-01-15T10:00:00.000Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.sent_count).toBe(2);
      expect(data.failed_count).toBe(0);
      expect(data.message_ids).toHaveLength(2);
      expect(data.errors).toBeUndefined();
    });

    it("should handle partial failures gracefully", async () => {
      // Mock partial failure
      const { MailService } = await import("../../src/services/mailService");
      const mockMailService = MailService as any;
      
      let callCount = 0;
      mockMailService.mockImplementation(() => ({
        sendMail: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              success: true,
              messageId: "msg-1",
            });
          } else {
            return Promise.resolve({
              success: false,
              error: "SMTP error",
            });
          }
        }),
      }));

      const requestBody = {
        data: {
          from_name: "Jane Smith",
          group_name: "Test Group",
          rating: 8,
          message: "Feeling great!",
          recipients: [
            {
              to_email: "john@example.com",
              to_name: "John Doe",
            },
            {
              to_email: "jane@example.com",
              to_name: "Jane Doe",
            },
          ],
        },
        timestamp: "2025-01-15T10:00:00.000Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(207); // Multi-Status
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.sent_count).toBe(1);
      expect(data.failed_count).toBe(1);
      expect(data.message_ids).toHaveLength(1);
      expect(data.errors).toHaveLength(1);
    });

    it("should return 400 for invalid request data", async () => {
      const requestBody = {
        data: {
          from_name: "Jane Smith",
          group_name: "Test Group",
          rating: "invalid-rating", // Should be number
          message: "Feeling great!",
          recipients: [
            {
              to_email: "invalid-email", // Invalid email
              to_name: "John Doe",
            },
          ],
        },
        timestamp: "2025-01-15T10:00:00.000Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      expect(response.status).toBe(400);
    });
  });
}); 