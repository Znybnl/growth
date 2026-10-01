import { registerHooks } from "node:module";

const base = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const relativePath = specifier.slice(2).split("/").join("/");
      return nextResolve(new URL(`${relativePath}.ts`, base).href, context);
    }
    return nextResolve(specifier, context);
  },
});
