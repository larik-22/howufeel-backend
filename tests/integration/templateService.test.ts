import { describe, it, expect, beforeEach } from "vitest";
import { TemplateService } from "../../src/services/templateService";
import { TemplateProcessor } from "../../src/services/mailService";
import type { Env } from "../bindings";

describe("Template Service Integration Tests", () => {
  let mockEnv: Env;

  beforeEach(() => {
    // Clear template cache before each test
    TemplateService.clearCache();
    
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
  });

  describe("Template Processing", () => {
    it("should process simple variable substitution", () => {
      const template = "Hello {{name}}, your rating is {{rating}}!";
      const data = { name: "John", rating: "8" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John, your rating is 8!");
    });

    it("should handle conditional blocks when condition is truthy", () => {
      const template = "Hello {{name}}! {{#note}}Note: {{note}}{{/note}}";
      const data = { name: "John", note: "Important message" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John! Note: Important message");
    });

    it("should remove conditional blocks when condition is falsy", () => {
      const template = "Hello {{name}}! {{#note}}Note: {{note}}{{/note}}";
      const data = { name: "John", note: "" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John! ");
    });

    it("should handle missing variables gracefully", () => {
      const template = "Hello {{name}}, rating: {{rating}}";
      const data = { name: "John" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John, rating: ");
    });

    it("should handle nested conditional blocks", () => {
      const template = "{{#user}}Hello {{name}}! {{#premium}}Premium user{{/premium}}{{/user}}";
      const data = { user: { name: "John", premium: true } };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John! Premium user");
    });

    it("should clean up unmatched variables and conditional blocks", () => {
      const template = "Hello {{name}}! {{#missing}}This won't show{{/missing}} {{unknown}}";
      const data = { name: "John" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John!  ");
    });
  });

  describe("Template Loading", () => {
    it("should load template from KV storage", async () => {
      const template = await TemplateService.loadTemplate("group", mockEnv);
      
      expect(template).toContain("<!DOCTYPE html>");
      expect(template).toContain("{{group_name}}");
      expect(template).toContain("{{to_name}}");
      expect(template).toContain("{{from_name}}");
      expect(template).toContain("{{rating}}");
      expect(template).toContain("{{message}}");
      expect(template).toContain("{{#note}}");
    });

    it("should use cached template on subsequent calls", async () => {
      const template1 = await TemplateService.loadTemplate("group", mockEnv);
      const template2 = await TemplateService.loadTemplate("group", mockEnv);
      
      expect(template1).toBe(template2);
    });

    it("should fallback to hardcoded template if KV fails", async () => {
      const failingEnv = {
        ...mockEnv,
        TEMPLATES_KV: {
          get: async () => null,
          put: async () => {},
          delete: async () => {},
          list: async () => ({ keys: [] }),
        },
      } as Env;

      const template = await TemplateService.loadTemplate("group", failingEnv);
      
      expect(template).toContain("<!DOCTYPE html>");
      expect(template).toContain("{{group_name}}");
    });
  });

  describe("Template Processing End-to-End", () => {
    it("should process complete group template", async () => {
      const templateData = {
        group_name: "Development Team",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "9",
        message: "Feeling productive! 🚀",
        note: "Great sprint planning session",
      };

      const result = await TemplateService.processTemplate("group", templateData, mockEnv);
      
      expect(result).toContain("Development Team - Mood Update");
      expect(result).toContain("Hello John Doe!");
      expect(result).toContain("Jane Smith shared their mood in Development Team:");
      expect(result).toContain("Rating: 9/10");
      expect(result).toContain("Message: Feeling productive! 🚀");
      expect(result).toContain("Note: Great sprint planning session");
    });

    it("should handle missing optional fields", async () => {
      const templateData = {
        group_name: "Development Team",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "9",
        message: "Feeling productive! 🚀",
      };

      const result = await TemplateService.processTemplate("group", templateData, mockEnv);
      
      expect(result).toContain("Development Team - Mood Update");
      expect(result).toContain("Hello John Doe!");
      expect(result).not.toContain("Note:");
    });
  });

  describe("Template Validation", () => {
    it("should validate correct template data", async () => {
      const templateData = {
        group_name: "Test Group",
        to_name: "John",
        from_name: "Jane",
        rating: "8",
        message: "Great day!",
        note: "Optional note",
      };

      const result = await TemplateService.validateTemplateData("group", templateData, mockEnv);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should detect missing required fields", async () => {
      const templateData = {
        group_name: "Test Group",
        to_name: "John",
        // missing from_name, rating, message
      };

      const result = await TemplateService.validateTemplateData("group", templateData, mockEnv);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Missing required");
    });

    it("should validate available templates", () => {
      const templates = TemplateService.getAvailableTemplates();
      
      expect(templates).toContain("group");
      expect(templates).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle template loading errors gracefully", async () => {
      const errorEnv = {
        ...mockEnv,
        TEMPLATES_KV: {
          get: async () => { throw new Error("KV error"); },
          put: async () => {},
          delete: async () => {},
          list: async () => ({ keys: [] }),
        },
      } as Env;

      const template = await TemplateService.loadTemplate("group", errorEnv);
      
      // Should fallback to hardcoded template
      expect(template).toContain("<!DOCTYPE html>");
    });

    it("should handle invalid template name", async () => {
      await expect(
        TemplateService.processTemplate("invalid" as any, {}, mockEnv)
      ).rejects.toThrow("Template not found");
    });
  });
}); 