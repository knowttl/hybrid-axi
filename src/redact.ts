const REDACTED = "***redacted***";

// One registry follows a credential through output, diagnostics and journal metadata.
export class SecretRedactor {
  private readonly secrets = new Set<string>();

  add(secret: string | undefined): void {
    if (!secret) return;
    this.secrets.add(secret);
    this.secrets.add(JSON.stringify(secret).slice(1, -1));
    if (secret.isWellFormed()) {
      const encoded = encodeURIComponent(secret);
      this.secrets.add(encoded);
      this.secrets.add(encoded.replace(/%[A-F0-9]{2}/g, (match) => match.toLowerCase()));
    }
  }

  text(value: string): string {
    for (const secret of [...this.secrets].sort((a, b) => b.length - a.length)) value = value.split(secret).join(REDACTED);
    return value;
  }

  value(value: unknown): unknown {
    if (typeof value === "string") return this.text(value);
    if (Array.isArray(value)) return value.map((child) => this.value(child));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [this.text(key), this.value(child)]));
    return value;
  }

  payload(value: unknown): unknown {
    if (typeof value === "string") return this.text(value)
      .replace(/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )*PRIVATE KEY-----/g, REDACTED)
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
      .replace(/(\bAccountKey=)[^;\s]+/gi, `$1${REDACTED}`)
      .replace(/([?&]sig=)[^&\s]+/gi, `$1${REDACTED}`);
    if (Array.isArray(value)) return value.map((child) => this.payload(child));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
      // /key/current must never expose these, including through --full or --fields.
      .filter(([key]) => !/^(?:api[_-]?key|user)$/i.test(key))
      .map(([key, child]) => [this.text(key),
        /^(?:password|secret|access[_-]?key|secret[_-]?key|client[_-]?secret|token|access[_-]?token|refresh[_-]?token|authorization|cookie|set-cookie|private[_-]?key|accountkey|sas[_-]?token)$/i.test(key) ? REDACTED : this.payload(child)]));
    return value;
  }
}
