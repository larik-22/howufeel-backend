import { describe, it, expect, beforeEach, vi } from "vitest";
import { TemplateProcessor } from "../../src/services/mailService";
import { TemplateService } from "../../src/services/templateService";
import { MailService } from "../../src/services/mailService";

// No external mocks needed for Cloudflare Workers compatible implementation

describe("Mail Service Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear template cache before each test
    TemplateService.clearCache();
  });

  describe("TemplateProcessor", () => {
    it("should process simple variable substitution", () => {
      const template = "Hello {{name}}, your rating is {{rating}}!";
      const data = { name: "John", rating: "8" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John, your rating is 8!");
    });

    it("should handle conditional blocks when condition is true", () => {
      const template = "Hello {{name}}! {{#note}}Note: {{note}}{{/note}}";
      const data = { name: "John", note: "Important message" };
      
      const result = TemplateProcessor.process(template, data);
      
      expect(result).toBe("Hello John! Note: Important message");
    });

    it("should remove conditional blocks when condition is false", () => {
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
  });

  describe("TemplateService", () => {
    it("should load and cache group template", async () => {
      const template1 = await TemplateService.loadTemplate("group");
      const template2 = await TemplateService.loadTemplate("group");
      
      expect(template1).toContain("<!DOCTYPE html>");
      expect(template1).toContain("{{group_name}}");
      expect(template1).toContain("{{to_name}}");
      expect(template1).toContain("{{from_name}}");
      expect(template1).toContain("{{rating}}");
      expect(template1).toContain("{{message}}");
      expect(template1).toContain("{{#note}}");
      expect(template1).toContain("{{/note}}");
      
      // Should be the same instance (cached)
      expect(template1).toBe(template2);
    });

    it("should process group template with real data", async () => {
      const templateData = {
        group_name: "Test Group",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "7",
        message: "Feeling good",
        note: "Had a productive day",
      };

      const processed = await TemplateService.processTemplate("group", templateData);
      
      expect(processed).toContain("Test Group");
      expect(processed).toContain("John Doe");
      expect(processed).toContain("Jane Smith");
      expect(processed).toContain("7 / 10 – Feeling good");
      expect(processed).toContain("Had a productive day");
    });

    it("should handle template without optional note", async () => {
      const templateData = {
        group_name: "Test Group",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "7",
        message: "Feeling good",
        // note is missing
      };

      const processed = await TemplateService.processTemplate("group", templateData);
      
      expect(processed).toContain("Test Group");
      expect(processed).toContain("John Doe");
      expect(processed).toContain("7 / 10 – Feeling good");
      expect(processed).not.toContain("Note:");
    });

    it("should validate template data successfully", async () => {
      const templateData = {
        group_name: "Test Group",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "7",
        message: "Feeling good",
      };

      const validation = await TemplateService.validateTemplateData("group", templateData);
      
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it("should return available templates", () => {
      const templates = TemplateService.getAvailableTemplates();
      
      expect(templates).toContain("group");
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe("MailService", () => {
    it("should send email with valid configuration", async () => {
      const mailService = new MailService();
      
      const result = await mailService.sendMail({
        from: "ceo@howufeelingtoday.online",
        to: "test@example.com",
        subject: "Test Email",
        html: "<h1>Hello World</h1>",
      });
      
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(result.error).toBeUndefined();
    });

    it("should handle email sending errors", async () => {
      const mailService = new MailService();
      
      // Test with invalid configuration to trigger error
      const result = await mailService.sendMail({
        from: "invalid-email",
        to: "test@example.com",
        subject: "Test Email",
        html: "<h1>Hello World</h1>",
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.messageId).toBeUndefined();
    });

    it("should validate template successfully", () => {
      const mailService = new MailService();
      const template = "Hello {{name}}!";
      const data = { name: "John" };
      
      const isValid = mailService.validateTemplate(template, data);
      
      expect(isValid).toBe(true);
    });

    it("should fail template validation with invalid data", () => {
      const mailService = new MailService();
      const template = "Hello {{name}}!";
      const data = null; // Invalid data
      
      const isValid = mailService.validateTemplate(template, data as any);
      
      expect(isValid).toBe(false);
    });
  });

  describe("End-to-End Mail Flow", () => {
    it("should process complete group announcement flow", async () => {
      const mailService = new MailService();
      
      // Simulate group announcement data
      const announcementData = {
        group_name: "Test Group",
        to_name: "John Doe",
        from_name: "Jane Smith",
        rating: "8",
        message: "Feeling great!",
        note: "Had an amazing day",
      };

      // Process template
      const processedTemplate = await TemplateService.processTemplate("group", announcementData);
      
      // Send email
      const result = await mailService.sendMail({
        from: "ceo@howufeelingtoday.online",
        to: "john@example.com",
        subject: "Mood Update in Test Group",
        html: processedTemplate,
      });
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("test-message-id-123");
      expect(processedTemplate).toContain("Test Group");
      expect(processedTemplate).toContain("John Doe");
      expect(processedTemplate).toContain("8 / 10 – Feeling great!");
      expect(processedTemplate).toContain("Had an amazing day");
    });
  });
}); 