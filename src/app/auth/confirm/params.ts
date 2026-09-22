import { z } from "zod";

/** How the sign-in link identifies itself when it reaches `/auth/confirm`. */
export type ConfirmParams =
  /**
   * Our custom email template, which is what every sign-in email carries:
   * `?token_hash=…&type=email`. Verified without any cookie, so it works on a
   * different device than the one that asked.
   */
  | {
      kind: "token-hash";
      tokenHash: string;
      type: "email" | "magiclink" | "signup";
    }
  /**
   * Supabase's default email template: it verifies the link, then redirects
   * here with `?code=…`. Exchanging the code needs the PKCE verifier cookie
   * set when the link was requested, so it only works in that same browser.
   * Kept for links sent before the custom template was in place, and for local
   * work against a project that hasn't got it.
   */
  | { kind: "code"; code: string; flowId?: string }
  | { kind: "invalid" };

const tokenHashSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(["email", "magiclink", "signup"]),
});

const codeSchema = z.object({
  code: z.string().min(1),
  sb_flow_id: z.string().min(1).optional(),
});

/**
 * Works out which kind of sign-in link was followed. Anything else, including
 * Supabase redirecting back with `?error=otp_expired`, is `invalid`.
 */
export function parseConfirmParams(params: URLSearchParams): ConfirmParams {
  const values = Object.fromEntries(params);

  const code = codeSchema.safeParse(values);
  if (code.success) {
    return {
      kind: "code",
      code: code.data.code,
      ...(code.data.sb_flow_id && { flowId: code.data.sb_flow_id }),
    };
  }

  const tokenHash = tokenHashSchema.safeParse(values);
  if (tokenHash.success) {
    return {
      kind: "token-hash",
      tokenHash: tokenHash.data.token_hash,
      type: tokenHash.data.type,
    };
  }

  return { kind: "invalid" };
}
