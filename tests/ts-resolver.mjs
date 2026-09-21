/**
 * Test-only ESM resolver.
 *
 * The app is bundled by Next, so its sources use extensionless relative
 * imports ("./errors"). Node's native TypeScript execution is strict ESM and
 * needs a real file, so this hook retries a failed relative specifier as
 * `.ts` and then `/index.ts`. Keeping it here means the tests run against the
 * unmodified application sources.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw err;
    for (const suffix of [".ts", ".tsx", "/index.ts"]) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        /* try the next suffix */
      }
    }
    throw err;
  }
}

register(pathToFileURL(import.meta.filename));
