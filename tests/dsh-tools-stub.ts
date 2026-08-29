/**
 * Minimal runtime stub for @deepseek-ai/dsh-tools, used by the adapter mapping
 * tests so tests/adapter-mapping.spec.ts can load the adapter without the real
 * (peer, not installed) dsh-tools package. The host's defineTool is an identity
 * for our purposes: the adapter already attaches name/execute/presentCall/output
 * on the definition object, which the test then asserts on.
 * @module dsh-evolve-in-git/tests/dsh-tools-stub
 */
export function defineTool<T>(definition: T): T {
  return definition
}
