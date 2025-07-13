# HowUFeel Backend

A Cloudflare Worker backend service that powers the HowUFeel application's email functionality. Built with Hono and Chanfana for high-performance, edge-deployed API endpoints.

## About HowUFeel

Mood tracking app for groups. Visit at [https://howufeelingtoday.online](https://howufeelingtoday.online)


## Technical Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) - Fast, lightweight web framework
- **API Documentation**: [Chanfana](https://chanfana.pages.dev/) - OpenAPI 3.0 schema generation
- **Email Service**: [worker-mailer](https://github.com/a-h/worker-mailer) via Hostinger SMTP
- **Template Engine**: [Mustache](https://mustache.github.io/) for HTML email templates
- **Storage**: Cloudflare KV for template caching
- **Testing**: Vitest with `@cloudflare/vitest-pool-workers`

## API Endpoints

### Mail Service

All mail endpoints are prefixed with `/mail/`

#### POST `/mail/send`
Send an email using a template.

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Your Subject",
  "template_name": "group",
  "template_data": {
    "group_name": "My Group",
    "to_name": "John Doe",
    "from_name": "Jane Smith",
    "rating": "8",
    "message": "😊",
    "note": "Having a great day!"
  }
}
```

#### POST `/mail/validate`
Validate template data without sending an email.

**Request Body:**
```json
{
  "template_name": "group",
  "template_data": {
    "group_name": "My Group",
    "to_name": "John Doe"
  }
}
```

#### POST `/mail/group-announcement`
Send mood update emails to all group members.

**Request Body:**
```json
{
  "data": {
    "from_name": "Jane Smith",
    "group_name": "My Group",
    "rating": 8,
    "message": "😊",
    "note": "Having a great day!",
    "recipients": [
      {
        "to_email": "user1@example.com",
        "to_name": "John Doe"
      },
      {
        "to_email": "user2@example.com",
        "to_name": "Alice Johnson"
      }
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "event": "rating_notification"
}
```

### Setup Endpoints

#### POST `/setup/templates`
Upload or update email templates in KV storage.

## Configuration

### Environment Variables

The following environment variables must be configured in your Cloudflare Worker:

```bash
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=your-email@yourdomain.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@yourdomain.com
```

### CORS Configuration

The API is configured to accept requests from:
- `https://howufeelingtoday.online/`
- `https://howufeelin-6c920.web.app/`
- `http://localhost:*` (development only)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare Workers CLI (`wrangler`)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp wrangler.jsonc.example wrangler.jsonc
# Edit wrangler.jsonc with your configuration
```

3. Run locally:
```bash
npm run dev
```

### Testing

Run the test suite:
```bash
npm test
```

The test suite covers:
- Template processing and validation
- Mail service functionality
- API endpoint behavior
- Error handling scenarios

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Email Templates

Templates are stored in Cloudflare KV and processed using Mustache. The system supports:

- Variable substitution: `{{variable_name}}`
- Conditional blocks: `{{#condition}}...{{/condition}}`
- Template caching for performance
- Fallback to hardcoded templates

### Available Templates

- `group`: Group mood announcement template


