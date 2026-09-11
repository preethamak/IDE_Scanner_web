import fs from "node:fs";
import path from "node:path";

const [, , snapshotPath = "public/registry-snapshot.json", outputPath = ".tmp/public-registry-d1.sql"] = process.argv;
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const generatedAt = String(snapshot.generated_at || new Date().toISOString());
const sections = ["metrics", "feed", "inventory", "history", "catalog", "benchmark"];
const chunkSize = 80_000;

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function chunks(value) {
  const text = JSON.stringify(value);
  const result = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    result.push(text.slice(index, index + chunkSize));
  }
  return result.length ? result : ["null"];
}

const statements = [
  "DELETE FROM registry_section_chunks;",
  "DELETE FROM registry_product_chunks;",
];

for (const section of sections) {
  chunks(snapshot[section]).forEach((payload, chunkIndex) => {
    statements.push(
      `INSERT INTO registry_section_chunks (section, chunk_index, generated_at, payload) VALUES (${sql(section)}, ${chunkIndex}, ${sql(generatedAt)}, ${sql(payload)});`,
    );
  });
}

for (const [extensionId, product] of Object.entries(snapshot.products || {})) {
  chunks(product).forEach((payload, chunkIndex) => {
    statements.push(
      `INSERT INTO registry_product_chunks (extension_id, chunk_index, generated_at, payload) VALUES (${sql(extensionId)}, ${chunkIndex}, ${sql(generatedAt)}, ${sql(payload)});`,
    );
  });
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${statements.join("\n")}\n`);
console.log(JSON.stringify({ snapshotPath, outputPath, generatedAt, statements: statements.length, bytes: fs.statSync(outputPath).size }));
