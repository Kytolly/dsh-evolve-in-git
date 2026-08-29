declare module '@deepseek-ai/dsh-commands' {
  export interface CommandInvocation {
    readonly rawInput: string
  }

  export interface CommandResult {
    readonly kind: 'success' | 'error'
    readonly text: string
  }

  export interface CommandRuntime {
    register(definition: {
      name: string
      description: string
      input?: { readonly hint: string }
      handler(invocation: CommandInvocation): CommandResult | Promise<CommandResult>
    }): () => void
  }
}

declare module '@deepseek-ai/dsh-tools' {
  export interface ToolRuntime {
    register(definition: ToolDefinition): () => void
  }

  export interface ToolOutputDefinition {
    readonly schema: unknown
    readonly render: (args: unknown, value: unknown) => readonly unknown[]
  }

  export interface ToolDefinition {
    readonly name: string
    readonly description: string
    readonly parameters: unknown
    readonly output: ToolOutputDefinition
    readonly execute: (args: ToolArgs, exec: unknown) => unknown
    readonly presentCall?: (args: ToolArgs) => unknown
    readonly isConcurrencySafe?: (args: ToolArgs) => boolean
  }

  export interface ToolArgs {
    readonly kind: string
    readonly title: string
    readonly content: string
    readonly source: string | undefined
    readonly branch: string | undefined
    readonly tags: readonly string[] | undefined
    readonly name: string | undefined
    readonly ref: string | undefined
    readonly dryRun: boolean | undefined
    readonly path: string | undefined
    readonly strategy: string | undefined
    readonly query: string | undefined
    readonly tag: string | undefined
    readonly id: string | undefined
    readonly mode: string | undefined
    readonly format: string | undefined
    readonly maxSensitivity: string | undefined
    readonly topK: number | undefined
    readonly minScore: number | undefined
    readonly maxChars: number | undefined
    readonly includeContent: boolean | undefined
    readonly expiresAt: string | undefined
    readonly a: string | undefined
    readonly b: string | undefined
  }

  export function defineTool(definition: ToolDefinition): ToolDefinition
}

declare module '@deepseek-ai/dsh-skill' {
  export interface SkillInvocationPolicy {
    readonly modelInvocable: boolean
    readonly userInvocable: boolean
  }

  export interface SkillSummary {
    readonly name: string
    readonly description: string
    readonly whenToUse?: string
    readonly invocation: SkillInvocationPolicy
    readonly source: string
    readonly provider: string
    readonly resourceBase?: unknown
  }

  export interface SkillCandidate extends SkillSummary {
    readonly rank: number
    readonly locator: unknown
    readonly path?: string
    readonly metadata?: Readonly<Record<string, unknown>>
  }

  export interface SkillDefinition extends SkillSummary {
    readonly content: string
    readonly path?: string
    readonly metadata?: Readonly<Record<string, unknown>>
  }

  export interface SkillProviderControl {
    readonly signal: AbortSignal
    readonly invalidate: () => void
  }

  export interface SkillLookupOptions {
    readonly cwd?: string
    readonly signal?: AbortSignal
  }

  export interface SkillProviderObservation {
    readonly candidates: readonly SkillCandidate[]
    readonly complete: boolean
  }

  export interface SkillProvider {
    readonly name: string
    readonly list: (options: SkillLookupOptions) => Promise<readonly SkillCandidate[] | SkillProviderObservation>
    readonly get: (candidate: SkillCandidate, options: SkillLookupOptions) => Promise<SkillDefinition | undefined>
  }

  export interface SkillRegistry {
    registerProvider(create: (control: SkillProviderControl) => SkillProvider): () => void
  }
}

declare module '@deepseek-ai/dsh-system-prompt' {}

declare module '@deepseek-ai/dsh-invariants' {
  export type InvariantInstaller = () => void
}
