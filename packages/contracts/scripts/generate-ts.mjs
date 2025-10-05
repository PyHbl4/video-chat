import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "openapi-typescript";

const cwd = dirname(fileURLToPath(import.meta.url));
const openapiPath = resolve(cwd, "../openapi.yaml");
const outDir = resolve(cwd, "../generated/ts");
const outFile = resolve(outDir, "types.d.ts");

const schema = await readFile(openapiPath, "utf8");
const dts = await generate(schema, {
  additionalProperties: false,
  httpHeaders: {
    "x-generated-at": new Date().toISOString()
  }
});

await mkdir(outDir, { recursive: true });
await writeFile(outFile, dts);

console.log(`✔ TypeScript definitions written to ${outFile}`);
