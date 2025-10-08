import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve as resolvePath, dirname } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import ts from "typescript"

const repoRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), "../../..")
const webRoot = resolvePath(repoRoot, "apps/web")
const contractsRoot = resolvePath(repoRoot, "packages/contracts/src")
const stubsRoot = resolvePath(webRoot, "scripts/stubs")

function resolveWithExtensions(baseDir, specifier) {
  const basePath = baseDir ? resolvePath(baseDir, specifier) : resolvePath(specifier)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    resolvePath(basePath, "index.ts"),
    resolvePath(basePath, "index.tsx"),
    resolvePath(basePath, "index.js"),
    resolvePath(basePath, "index.mjs")
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentUrl = context.parentURL
    const baseDir = parentUrl ? dirname(fileURLToPath(parentUrl)) : process.cwd()
    const resolved = resolveWithExtensions(baseDir, specifier)
    if (resolved) {
      return {
        url: pathToFileURL(resolved).href,
        shortCircuit: true
      }
    }
  }

  if (specifier.startsWith("file://")) {
    const filePath = fileURLToPath(specifier)
    if (!existsSync(filePath)) {
      const resolved = resolveWithExtensions(null, filePath)
      if (resolved) {
        return {
          url: pathToFileURL(resolved).href,
          shortCircuit: true
        }
      }
    }
  }

  if (specifier === "next/headers") {
    const resolved = resolveWithExtensions(stubsRoot, "next-headers")
    if (!resolved) {
      throw new Error("Unable to resolve stub for next/headers")
    }
    return {
      url: pathToFileURL(resolved).href,
      shortCircuit: true
    }
  }

  if (specifier.startsWith("@/")) {
    const resolved = resolveWithExtensions(webRoot, specifier.slice(2))
    if (!resolved) {
      throw new Error(`Unable to resolve module ${specifier}`)
    }
    return {
      url: pathToFileURL(resolved).href,
      shortCircuit: true
    }
  }

  if (specifier === "@video-chat/contracts") {
    const resolved = resolveWithExtensions(contractsRoot, "index")
    if (!resolved) {
      throw new Error("Unable to resolve @video-chat/contracts")
    }
    return {
      url: pathToFileURL(resolved).href,
      shortCircuit: true
    }
  }

  if (specifier.startsWith("@video-chat/contracts/")) {
    const resolved = resolveWithExtensions(contractsRoot, specifier.replace("@video-chat/contracts/", ""))
    if (!resolved) {
      throw new Error(`Unable to resolve module ${specifier}`)
    }
    return {
      url: pathToFileURL(resolved).href,
      shortCircuit: true
    }
  }

  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  if (!url.endsWith(".ts") && !url.endsWith(".tsx")) {
    return defaultLoad(url, context, defaultLoad)
  }

  const source = await readFile(new URL(url))
  const transpiled = ts.transpileModule(source.toString(), {
    fileName: fileURLToPath(url),
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    }
  })

  return {
    format: "module",
    source: transpiled.outputText,
    shortCircuit: true
  }
}
