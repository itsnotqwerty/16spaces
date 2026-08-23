import { Handlers } from "$fresh/server.ts";
import { flag } from "../../../lib/flags.ts";
import { buildCallbackUrl, sendPasswordResetEmail } from "../../../lib/mail.ts";

export const handler: Handlers = {
  async POST(req) {
    if (!flag("FEATURE_AUTH")) {
      return Response.json(
        { error: "feature_disabled", code: "feature_auth_disabled" },
        { status: 503 },
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "invalid_request", code: "missing_email" },
        { status: 400 },
      );
    }

    try {
      await sendPasswordResetEmail(
        email,
        buildCallbackUrl("/reset-password"),
      );
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "reset_failed",
          code: "reset_failed",
        },
        { status: 400 },
      );
    }

    return Response.json({ ok: true, sent: true });
  },
};
