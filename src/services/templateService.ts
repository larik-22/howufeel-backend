import { AVAILABLE_TEMPLATES, TemplateName } from "../endpoints/mail/base";
import { TemplateProcessor } from "./mailService";

export class TemplateService {
  private static templateCache = new Map<string, string>();
  
  /**
   * Load a template by name
   */
  static async loadTemplate(templateName: TemplateName, env?: Env): Promise<string> {
    const templateFile = AVAILABLE_TEMPLATES[templateName];
    const cacheKey = templateFile;
    
    // Check cache first
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }
    
    try {
      // Try to read from KV first, fallback to hardcoded template
      const template = await this.readTemplateFile(templateFile, env);
      
      // Cache the template
      this.templateCache.set(cacheKey, template);
      
      return template;
    } catch (error) {
      throw new Error(`Failed to load template ${templateName}: ${error}`);
    }
  }
  
  /**
   * Process a template with data
   */
  static async processTemplate(
    templateName: TemplateName,
    data: Record<string, any>,
    env?: Env
  ): Promise<string> {
    const template = await this.loadTemplate(templateName, env);
    return TemplateProcessor.process(template, data);
  }
  
  /**
   * Validate template data against a template
   */
  static async validateTemplateData(
    templateName: TemplateName,
    data: Record<string, any>,
    env?: Env
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const template = await this.loadTemplate(templateName, env);
      TemplateProcessor.process(template, data);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }
  
  /**
   * Get available template names
   */
  static getAvailableTemplates(): TemplateName[] {
    return Object.keys(AVAILABLE_TEMPLATES) as TemplateName[];
  }
  
  /**
   * Clear template cache
   */
  static clearCache(): void {
    this.templateCache.clear();
  }
  
  /**
   * Read template file - actual implementation using KV storage
   */
  private static async readTemplateFile(filename: string, env?: Env): Promise<string> {
    // Try to read from KV storage first if environment is available
    if (env && env.TEMPLATES_KV) {
      try {
        const template = await env.TEMPLATES_KV.get(filename);
        if (template) {
          return template;
        }
      } catch (error) {
        console.warn(`Failed to read template ${filename} from KV:`, error);
      }
    }
    
    // Fallback to hardcoded template
    if (filename === "group.html") {
      // Return the actual group.html template content
      return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Mood Update in {{group_name}}</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
          sans-serif;
        line-height: 1.6;
        color: #2d3748;
        margin: 0 auto;
        max-width: 600px;
        padding: 24px;
        background-color: #f7fafc;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
        padding: 32px;
        margin-bottom: 24px;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 32px 24px;
        text-align: center;
        margin-bottom: 24px;
        color: white;
      }
      .header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
        letter-spacing: -0.5px;
      }
      .rating {
        font-size: 28px;
        font-weight: 700;
        text-align: center;
        margin: 32px 0;
        color: #4a5568;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .note {
        background: #f8fafc;
        border-radius: 8px;
        padding: 20px;
        margin-top: 24px;
        border: 1px solid #e2e8f0;
      }
      .note strong {
        color: #4a5568;
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .footer {
        text-align: center;
        margin-top: 32px;
        font-size: 13px;
        color: #718096;
        line-height: 1.5;
      }
      p {
        margin: 0 0 16px 0;
        color: #4a5568;
        font-size: 16px;
      }
      p:last-child {
        margin-bottom: 0;
      }
      @media screen and (max-width: 480px) {
        body {
          padding: 16px;
        }
        .card {
          padding: 24px;
        }
        .header {
          padding: 24px 16px;
        }
        .rating {
          font-size: 24px;
          margin: 24px 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>New Mood Rating in {{group_name}}</h2>
    </div>

    <div class="card">
      <p>Hi {{to_name}},</p>
      <p>{{from_name}} has shared today's mood:</p>

      <div class="rating">{{rating}} / 10 – {{message}}</div>

      {{#note}}
      <div class="note">
        <strong>Note:</strong><br />
        {{note}}
      </div>
      {{/note}}

      <p style="margin-top: 20px">Keep supporting each other on your mood-tracking journey!</p>
    </div>

    <div class="footer">This is an automated email from HowUFeel. Please do not reply.</div>
  </body>
</html>`;
    }
    
    throw new Error(`Template file ${filename} not found`);
  }
} 