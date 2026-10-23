import { expect, test } from "vitest";
import { SecretRedactor } from "../src/redact.js";

test("redacts raw, JSON escaped and URL encoded secrets throughout metadata", () => {
  const secret = 'synthetic/"key\\with?delimiters';
  const redactor = new SecretRedactor();
  redactor.add(secret);
  const values = [secret, JSON.stringify(secret).slice(1, -1), encodeURIComponent(secret),
    encodeURIComponent(secret).replace(/%[A-F0-9]{2}/g, (match) => match.toLowerCase())];
  expect(redactor.value({ preview: values, help: values, headers: values, filename: secret, path: secret, audit: { [secret]: secret } }))
    .toEqual({ preview: values.map(() => "***redacted***"), help: values.map(() => "***redacted***"), headers: values.map(() => "***redacted***"), filename: "***redacted***", path: "***redacted***", audit: { "***redacted***": "***redacted***" } });
});

test("full key-current payload omits credentials and user details before projection", () => {
  const redactor = new SecretRedactor();
  expect(redactor.payload({ api_key: "synthetic-upstream-key", user: { email: "synthetic@example.invalid", name: "Synthetic User" },
    auth_level_name: "restricted", unknown: { apiKey: "synthetic-nested-key", user: { id: "private" }, preserved: true } }))
    .toEqual({ auth_level_name: "restricted", unknown: { preserved: true } });
});

test("unknown Labs fields retain useful data while scrubbing sensitive names and value patterns", () => {
  const redactor = new SecretRedactor();
  expect(redactor.payload({ newField: { token: "synthetic-token", authorization: "synthetic-header", password: "synthetic-password", verdict: "unknown" },
    note: "AccountKey=synthetic-account; https://example.invalid?sig=synthetic-signature", pem: "-----BEGIN PRIVATE KEY-----synthetic-----END PRIVATE KEY-----" }))
    .toEqual({ newField: { token: "***redacted***", authorization: "***redacted***", password: "***redacted***", verdict: "unknown" },
      note: "AccountKey=***redacted***; https://example.invalid?sig=***redacted***", pem: "***redacted***" });
});
