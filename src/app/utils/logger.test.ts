import { describe, expect, it } from "vitest";
import { redactSecrets } from "./logger";

describe("logger security", () => {
  describe("redactSecrets", () => {
    it("redacts JWT tokens", () => {
      const message =
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      expect(redactSecrets(message)).toBe("[REDACTED]");
    });

    it("redacts API keys", () => {
      const message = "api_key=sk-1234567890abcdef";
      expect(redactSecrets(message)).toBe("[REDACTED]");
    });

    it("redacts passwords", () => {
      const message = "password: mysecretpassword";
      expect(redactSecrets(message)).toBe("[REDACTED]");
    });

    it("redacts wrapped keys", () => {
      const message = "wrapped_key=base64encodedkey==";
      expect(redactSecrets(message)).toBe("[REDACTED]");
    });

    it("preserves safe messages", () => {
      const message = "User logged in successfully";
      expect(redactSecrets(message)).toBe("User logged in successfully");
    });

    it("handles multiple secrets", () => {
      const message = "api_key=abc123 password=secret";
      const result = redactSecrets(message);
      expect(result).not.toContain("abc123");
      expect(result).not.toContain("secret");
    });
  });
});
