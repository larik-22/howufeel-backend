import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { mailRouter } from "./endpoints/mail/router";
import { ContentfulStatusCode } from "hono/utils/http-status";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use("*", cors({
  origin: [
    "https://howufeelingtoday.online",
    "https://howufeelin-6c920.web.app",
    "http://localhost:5173", // for local development
    "http://localhost:8787", // for local testing
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500,
  );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "HowUFeel Backend API",
      version: "1.0.0",
      description: "Backend API for HowUFeel - A mood tracking application with email notifications",
    },
  },
});

// Register Mail API routes
openapi.route("/mail", mailRouter);

// Export the Hono app
export default app;
