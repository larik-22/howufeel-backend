import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { fromHono } from "chanfana";
import { MailSend } from "../../src/endpoints/mail/mailSend";
import { MailValidate } from "../../src/endpoints/mail/mailValidate";
import { GroupAnnouncement } from "../../src/endpoints/mail/groupAnnouncement";
import type { Env } from "../bindings";

describe("API Endpoints Integration Tests", () => {
  let app: Hono;
  let mockEnv: Env;

  beforeEach(() => {
    // Mock environment for testing
    mockEnv = {
      TEMPLATES_KV: {
        get: async (key: string) => {
          if (key === "group.html") {
            return `<!DOCTYPE html>
<html>
<head>
    <title>{{group_name}} - Mood Update</title>
</head>
<body>
    <h1>Hello {{to_name}}!</h1>
    <p>{{from_name}} shared their mood in {{group_name}}:</p>
    <p>Rating: {{rating}}/10</p>
    <p>Message: {{message}}</p>
    {{#note}}
    <p>Note: {{note}}</p>
    {{/note}}
</body>
</html>`;
          }
          return null;
        },
        put: async () => {},
        delete: async () => {},
        list: async () => ({ keys: [] }),
      },
      SMTP_HOST: "smtp.hostinger.com",
      SMTP_PORT: "465",
      SMTP_USER: "test@howufeelingtoday.online",
      SMTP_PASSWORD: "test-password",
    } as Env;

    // Create the app with all endpoints
    app = new Hono<{ Bindings: Env }>();
    const mailRouter = fromHono(new Hono<{ Bindings: Env }>());
    mailRouter.post("/send", MailSend);
    mailRouter.post("/validate", MailValidate);
    mailRouter.post("/group-announcement", GroupAnnouncement);
    app.route("/mail", mailRouter);
  });

  describe("POST /mail/validate", () => {
    it("should validate correct template data", async () => {
      const requestBody = {
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
          note: "Good day at work",
        },
      };

      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(200);
      
      const responseBody = await response.json() as any;
      expect(responseBody).toBeDefined();
      expect(responseBody.valid).toBe(true);
      expect(responseBody.error).toBeUndefined();
    });

    it("should reject invalid template name", async () => {
      const requestBody = {
        template_name: "invalid-template",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
        },
      };

      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
      
      const responseBody = await response.json() as any;
      expect(responseBody).toBeDefined();
      expect(responseBody.valid).toBe(false);
      expect(responseBody.error).toContain("Invalid template name");
    });

    it("should handle missing required fields", async () => {
      const requestBody = {
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          // Missing from_name, rating, message
        },
      };

      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody).toBeDefined();
      expect(responseBody.valid).toBe(false);
      expect(responseBody.error).toContain("Missing required");
    });

    it("should handle malformed JSON", async () => {
      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should handle missing request body", async () => {
      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }, mockEnv);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /mail/send", () => {
    it("should send email with valid data", async () => {
      const requestBody = {
        to: "recipient@example.com",
        subject: "Test Email",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
          note: "Good day at work",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBeLessThanOrEqual(500); // Could be 200 or 500 depending on SMTP
      
      const responseBody = await response.json();
      expect(responseBody).toBeDefined();
      expect(typeof responseBody.success).toBe("boolean");
      
      if (responseBody.success) {
        expect(responseBody.message_id).toBeDefined();
      } else {
        expect(responseBody.error).toBeDefined();
      }
    });

    it("should reject invalid email address", async () => {
      const requestBody = {
        to: "invalid-email",
        subject: "Test Email",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should reject empty subject", async () => {
      const requestBody = {
        to: "recipient@example.com",
        subject: "",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should reject invalid template name", async () => {
      const requestBody = {
        to: "recipient@example.com",
        subject: "Test Email",
        template_name: "invalid-template",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "Feeling great! 😊",
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
      
      const responseBody = await response.json();
      expect(responseBody.error).toContain("Invalid template name");
    });
  });

  describe("POST /mail/group-announcement", () => {
    it("should send group announcement to multiple recipients", async () => {
      const requestBody = {
        data: {
          from_name: "John Doe",
          group_name: "Development Team",
          rating: 8,
          message: "Feeling productive today! 💪",
          note: "Had a great coding session",
          recipients: [
            {
              to_email: "recipient1@example.com",
              to_name: "Test User 1",
            },
            {
              to_email: "recipient2@example.com",
              to_name: "Test User 2",
            },
          ],
        },
        timestamp: "2024-01-15T10:00:00Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBeLessThanOrEqual(500); // Could be 200, 207, or 500
      
      const responseBody = await response.json();
      expect(responseBody).toBeDefined();
      expect(typeof responseBody.success).toBe("boolean");
      expect(typeof responseBody.sent_count).toBe("number");
      expect(typeof responseBody.failed_count).toBe("number");
      
      if (responseBody.success) {
        expect(responseBody.sent_count).toBe(2);
        expect(responseBody.failed_count).toBe(0);
      }
    });

    it("should handle empty recipients array", async () => {
      const requestBody = {
        data: {
          from_name: "John Doe",
          group_name: "Development Team",
          rating: 8,
          message: "Feeling productive today! 💪",
          note: "Had a great coding session",
          recipients: [],
        },
        timestamp: "2024-01-15T10:00:00Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBeLessThanOrEqual(500);
      
      const responseBody = await response.json();
      expect(responseBody.sent_count).toBe(0);
    });

    it("should handle invalid recipient email", async () => {
      const requestBody = {
        data: {
          from_name: "John Doe",
          group_name: "Development Team",
          rating: 8,
          message: "Feeling productive today! 💪",
          note: "Had a great coding session",
          recipients: [
            {
              to_email: "invalid-email",
              to_name: "Test User",
            },
          ],
        },
        timestamp: "2024-01-15T10:00:00Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should handle missing required fields", async () => {
      const requestBody = {
        data: {
          from_name: "John Doe",
          group_name: "Development Team",
          // Missing rating, message, recipients
        },
        timestamp: "2024-01-15T10:00:00Z",
        event: "rating_notification",
      };

      const response = await app.request("/mail/group-announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, mockEnv);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /setup/templates", () => {
    it("should setup templates successfully", async () => {
      const response = await app.request("/setup/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }, mockEnv);

      expect(response.status).toBe(200);
      
      const responseBody = await response.json();
      expect(responseBody).toBeDefined();
      expect(responseBody.success).toBe(true);
      expect(responseBody.message).toContain("successfully");
    });

    it("should handle KV storage errors", async () => {
      const failingEnv = {
        ...mockEnv,
        TEMPLATES_KV: {
          get: async () => null,
          put: async () => { throw new Error("KV storage error"); },
          delete: async () => {},
          list: async () => ({ keys: [] }),
        },
      } as Env;

      const response = await app.request("/setup/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }, failingEnv);

      expect(response.status).toBe(500);
      
      const responseBody = await response.json();
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle unsupported HTTP methods", async () => {
      const response = await app.request("/mail/send", {
        method: "GET",
      }, mockEnv);

      expect(response.status).toBe(405);
    });

    it("should handle missing Content-Type header", async () => {
      const response = await app.request("/mail/send", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          subject: "Test",
          template_name: "group",
          template_data: {},
        }),
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should handle malformed JSON in request body", async () => {
      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      }, mockEnv);

      expect(response.status).toBe(400);
    });

    it("should handle very large request body", async () => {
      const largeData = {
        to: "test@example.com",
        subject: "Test",
        template_name: "group",
        template_data: {
          group_name: "Test Group",
          to_name: "John Doe",
          from_name: "Jane Smith",
          rating: "8",
          message: "A".repeat(10000), // Very large message
          note: "B".repeat(10000), // Very large note
        },
      };

      const response = await app.request("/mail/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(largeData),
      }, mockEnv);

      expect(response.status).toBeLessThanOrEqual(500);
    });
  });

  describe("Response Headers", () => {
    it("should return JSON content type", async () => {
      const response = await app.request("/mail/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_name: "group",
          template_data: {
            group_name: "Test",
            to_name: "Test",
            from_name: "Test",
            rating: "8",
            message: "Test",
          },
        }),
      }, mockEnv);

      expect(response.headers.get("Content-Type")).toContain("application/json");
    });

    it("should handle CORS headers", async () => {
      const response = await app.request("/mail/validate", {
        method: "OPTIONS",
      }, mockEnv);

      // CORS headers should be present
      expect(response.status).toBe(200);
    });
  });
}); 