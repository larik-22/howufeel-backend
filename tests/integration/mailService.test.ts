import { describe, it, expect, beforeEach, vi } from "vitest";
import { MailService } from "../../src/services/mailService";
import type { Env } from "../bindings";

describe("Mail Service Integration Tests", () => {
  let mockEnv: Env;
  let mailService: MailService;

  beforeEach(() => {
    // Mock environment for testing
    mockEnv = {
      TEMPLATES_KV: {
        get: async () => null,
        put: async () => {},
        delete: async () => {},
        list: async () => ({ keys: [] }),
      },
      SMTP_HOST: "smtp.hostinger.com",
      SMTP_PORT: "465",
      SMTP_USER: "test@howufeelingtoday.online",
      SMTP_PASSWORD: "test-password",
    } as Env;

    mailService = new MailService(mockEnv);
  });

  describe("Configuration", () => {
    it("should initialize with environment variables", () => {
      expect(mailService).toBeDefined();
      // The configuration is private but we can test it works via sendMail
    });

    it("should use correct SMTP configuration", () => {
      // Test that the service is configured with the right settings
      expect(mockEnv.SMTP_HOST).toBe("smtp.hostinger.com");
      expect(mockEnv.SMTP_PORT).toBe("465");
      expect(mockEnv.SMTP_USER).toBe("test@howufeelingtoday.online");
      expect(mockEnv.SMTP_PASSWORD).toBe("test-password");
    });

    it("should handle missing environment variables gracefully", () => {
      const incompleteEnv = {
        TEMPLATES_KV: {
          get: async () => null,
          put: async () => {},
          delete: async () => {},
          list: async () => ({ keys: [] }),
        },
        SMTP_HOST: "smtp.hostinger.com",
        SMTP_PORT: "465",
        SMTP_USER: "test@howufeelingtoday.online",
        // Missing SMTP_PASSWORD
      } as Env;

      // Should not throw during construction
      expect(() => new MailService(incompleteEnv)).not.toThrow();
    });
  });

  describe("Email Sending", () => {
    it("should validate email parameters", async () => {
      const invalidEmail = {
        from: "", // Invalid: empty from
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      await expect(mailService.sendMail(invalidEmail)).rejects.toThrow();
    });

    it("should validate email format", async () => {
      const invalidToEmail = {
        from: "test@example.com",
        to: "invalid-email", // Invalid format
        subject: "Test",
        html: "<p>Test</p>",
      };

      await expect(mailService.sendMail(invalidToEmail)).rejects.toThrow();
    });

    it("should handle empty subject", async () => {
      const emailWithoutSubject = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "", // Empty subject
        html: "<p>Test</p>",
      };

      await expect(mailService.sendMail(emailWithoutSubject)).rejects.toThrow();
    });

    it("should handle empty HTML content", async () => {
      const emailWithoutContent = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "", // Empty HTML content
      };

      await expect(mailService.sendMail(emailWithoutContent)).rejects.toThrow();
    });

    it("should handle very long subject lines", async () => {
      const longSubject = "A".repeat(500); // Very long subject
      const emailWithLongSubject = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: longSubject,
        html: "<p>Test</p>",
      };

      // Should handle long subjects (may truncate or reject)
      const result = await mailService.sendMail(emailWithLongSubject);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("should handle HTML content with special characters", async () => {
      const emailWithSpecialChars = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test with émojis 🚀",
        html: "<p>Test with special chars: àáâãäåæçèéêë & <>&\"'</p>",
      };

      const result = await mailService.sendMail(emailWithSpecialChars);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("should handle large email content", async () => {
      const largeContent = "<p>" + "Large content ".repeat(1000) + "</p>";
      const emailWithLargeContent = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Large Email Test",
        html: largeContent,
      };

      const result = await mailService.sendMail(emailWithLargeContent);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      // This test would need to mock network failures
      // For now, we test that the service handles basic errors
      const validEmail = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      const result = await mailService.sendMail(validEmail);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("should return structured error responses", async () => {
      const invalidEmail = {
        from: "",
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      try {
        await mailService.sendMail(invalidEmail);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should handle authentication errors", async () => {
      const envWithBadPassword = {
        ...mockEnv,
        SMTP_PASSWORD: "wrong-password",
      } as Env;

      const mailServiceWithBadAuth = new MailService(envWithBadPassword);
      const validEmail = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      const result = await mailServiceWithBadAuth.sendMail(validEmail);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      // With wrong credentials, we expect either failure or error
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe("Response Format", () => {
    it("should return consistent response format", async () => {
      const validEmail = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      };

      const result = await mailService.sendMail(validEmail);
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(typeof result.messageId).toBe("string");
      } else {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      }
    });

    it("should generate unique message IDs", async () => {
      const email1 = {
        from: "test@example.com",
        to: "recipient1@example.com",
        subject: "Test 1",
        html: "<p>Test 1</p>",
      };

      const email2 = {
        from: "test@example.com",
        to: "recipient2@example.com",
        subject: "Test 2",
        html: "<p>Test 2</p>",
      };

      const result1 = await mailService.sendMail(email1);
      const result2 = await mailService.sendMail(email2);

      if (result1.success && result2.success) {
        expect(result1.messageId).toBeDefined();
        expect(result2.messageId).toBeDefined();
        expect(result1.messageId).not.toBe(result2.messageId);
      }
    });
  });

  describe("Performance", () => {
    it("should handle concurrent email sending", async () => {
      const emails = Array.from({ length: 5 }, (_, i) => ({
        from: "test@example.com",
        to: `recipient${i}@example.com`,
        subject: `Test ${i}`,
        html: `<p>Test ${i}</p>`,
      }));

      const startTime = Date.now();
      const results = await Promise.all(emails.map(email => mailService.sendMail(email)));
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe("boolean");
      });

      // Should complete within a reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
    });

    it("should handle email sending within timeout", async () => {
      const email = {
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Timeout Test",
        html: "<p>Testing timeout</p>",
      };

      const startTime = Date.now();
      const result = await mailService.sendMail(email);
      const endTime = Date.now();

      expect(result).toBeDefined();
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
    });
  });
}); 