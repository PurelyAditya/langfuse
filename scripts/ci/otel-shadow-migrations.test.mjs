import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { prepareMigrations } from "../../packages/shared/clickhouse/scripts/prepare-migrations.mjs";

test("ClickHouse upgrades preserve the columns of an existing OTEL shadow table", (t) => {
  const root = fileURLToPath(
    new URL("../../packages/shared/clickhouse/migrations/", import.meta.url),
  );
  const rendered = prepareMigrations(
    join(root, "canonical"),
    "unclustered",
    "default",
  );
  t.after(() => rmSync(rendered, { recursive: true, force: true }));

  const sql = ["CREATE DATABASE shadow_upgrade", "USE shadow_upgrade"];
  for (const file of readdirSync(rendered)
    .filter((f) => f.endsWith(".up.sql"))
    .sort()) {
    sql.push(readFileSync(join(rendered, file), "utf8"));
    // 0061 creates the opt-in table. Later migrations upgrade that same table.
    const [version] = file.split("_");
    const shadow = join(root, "otel-shadow", `${version}.sql`);
    if (existsSync(shadow)) sql.push(readFileSync(shadow, "utf8"));
  }

  sql.push(`SELECT table, arraySort(groupArray((name, type, default_kind, default_expression))) AS columns
    FROM system.columns
    WHERE database = currentDatabase() AND table IN ('events_full', 'events_native_test')
    GROUP BY table ORDER BY table FORMAT JSONEachRow`);
  const output = execFileSync(
    "clickhouse",
    ["local", "--queries-file", "/dev/stdin"],
    {
      input: sql.join("\n;\n"),
      encoding: "utf8",
    },
  );
  const [primary, shadow] = output
    .trimEnd()
    .split("\n")
    .slice(-2)
    .map((line) => JSON.parse(line));
  assert.equal(primary.table, "events_full");
  assert.equal(shadow?.table, "events_native_test");
  assert.deepEqual(shadow.columns, primary.columns);
});
