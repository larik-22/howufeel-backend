import { Hono } from "hono";
import { fromHono } from "chanfana";
import { MailSend } from "./mailSend";
import { MailValidate } from "./mailValidate";
import { GroupAnnouncement } from "./groupAnnouncement";

export const mailRouter = fromHono(new Hono());

// Mail endpoints
mailRouter.post("/send", MailSend);
mailRouter.post("/validate", MailValidate);
mailRouter.post("/group-announcement", GroupAnnouncement); 