import { describe, expect, it } from "vitest";
import { parseConfirmParams } from "./params";

const parse = (query: string) => parseConfirmParams(new URLSearchParams(query));

describe("parseConfirmParams", () => {
  it("reads our custom template's token hash link", () => {
    expect(parse("token_hash=pkce_abc123&type=email")).toEqual({
      kind: "token-hash",
      tokenHash: "pkce_abc123",
      type: "email",
    });
  });

  it("reads the code from Supabase's default template redirect", () => {
    expect(parse("code=34e770dd-9ff9-416c-87fa-43b31d7ef225")).toEqual({
      kind: "code",
      code: "34e770dd-9ff9-416c-87fa-43b31d7ef225",
    });
  });

  it("passes along a PKCE flow id when present", () => {
    expect(parse("code=abc&sb_flow_id=flow-1")).toEqual({
      kind: "code",
      code: "abc",
      flowId: "flow-1",
    });
  });

  it.each([
    "",
    "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
    "token_hash=abc",
    "token_hash=abc&type=recovery",
    "code=",
  ])("treats %j as invalid", (query) => {
    expect(parse(query)).toEqual({ kind: "invalid" });
  });
});
