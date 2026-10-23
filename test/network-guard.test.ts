import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

test.each([
  "fetch('https://example.invalid')",
  "require('node:https').get('https://example.invalid')",
  "require('node:net').connect(443, 'example.invalid')",
  "require('node:dgram').createSocket('udp4').send('x', 53, '127.0.0.1')",
  "require('node:dns').lookup('example.invalid', () => {})",
  "require('node:dns').resolve4('example.invalid', () => {})",
  "new (require('node:dns').promises.Resolver)().resolveTxt('example.invalid')",
  "require('node:net').connect(12345, '127.0.0.1')",
  "require('node:child_process').execSync('curl https://example.invalid')",
])("Node descendants with a fresh env cannot escape the offline guard: %s", (script) => {
  const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf8", env: {}, timeout: 10_000 });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Network access is disabled");
});

test("the preload reaches grandchildren", () => {
  const result = spawnSync(process.execPath, ["-e", `
    const child = require('node:child_process').spawnSync(process.execPath,
      ['-e', "fetch('https://example.invalid')"], { encoding: 'utf8', env: {} });
    process.stderr.write(child.stderr); process.exitCode = child.status;
  `], { encoding: "utf8", env: {}, timeout: 10_000 });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Network access is disabled");
});
