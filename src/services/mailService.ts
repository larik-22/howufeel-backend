import { z } from "zod";
import { WorkerMailer } from "worker-mailer";

// Mail sending configuration
export const mailConfigSchema = z.object({
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
});

export type MailConfig = z.infer<typeof mailConfigSchema>;

// Mail service interface
export interface IMailService {
  sendMail(config: MailConfig): Promise<MailResult>;
  validateTemplate(template: string, data: Record<string, any>): boolean;
}

// Mail result types
export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Template processing utility
export class TemplateProcessor {
  static process(template: string, data: Record<string, any>): string {
    let processed = template;
    
    // Handle conditional blocks {{#key}}...{{/key}} first
    Object.entries(data).forEach(([key, value]) => {
      const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
      // Consider empty strings, null, undefined, and false as falsy
      if (value && value !== '') {
        processed = processed.replace(conditionalRegex, '$1');
      } else {
        processed = processed.replace(conditionalRegex, '');
      }
    });
    
    // Remove any remaining conditional blocks for missing keys
    processed = processed.replace(/\{\{#[^}]+\}\}[\s\S]*?\{\{\/[^}]+\}\}/g, '');
    
    // Handle simple mustache-style templates {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });
    
    // Remove any remaining unmatched variables
    processed = processed.replace(/\{\{[^}]+\}\}/g, '');
    
    return processed;
  }
}

// Mail service implementation using worker-mailer
export class MailService implements IMailService {
  private readonly fromEmail: string;
  private readonly smtpConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
  };
  
  constructor(env?: Env, fromEmail: string = "ceo@howufeelingtoday.online") {
    this.fromEmail = fromEmail;
    this.smtpConfig = {
      host: env?.SMTP_HOST || "smtp.hostinger.com",
      port: parseInt(env?.SMTP_PORT || "465"),
      username: env?.SMTP_USER || "ceo@howufeelingtoday.online",
      password: env?.SMTP_USER_PASSWORD || "",
    };
  }
  
  async sendMail(config: MailConfig): Promise<MailResult> {
    try {
      // Validate configuration
      const validatedConfig = mailConfigSchema.parse(config);
      
      // Connect to SMTP server using worker-mailer
      const mailer = await WorkerMailer.connect({
        credentials: {
          username: this.smtpConfig.username,
          password: this.smtpConfig.password,
        },
        authType: 'plain',
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: true, // SSL for port 465
      });
      
      // Send email using worker-mailer
      await mailer.send({
        from: { 
          name: 'HowUFeel Team', 
          email: this.fromEmail 
        },
        to: { 
          name: '', 
          email: validatedConfig.to 
        },
        subject: validatedConfig.subject,
        html: validatedConfig.html,
        text: validatedConfig.text,
      });
      
      // Generate a unique message ID for tracking
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error("SMTP error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  validateTemplate(template: string, data: Record<string, any>): boolean {
    try {
      TemplateProcessor.process(template, data);
      return true;
    } catch {
      return false;
    }
  }
} 