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
  }

  export function defineTool(definition: ToolDefinition): ToolDefinition
}

declare module '@deepseek-ai/dsh-system-prompt' {}

declare module '@deepseek-ai/dsh-invariants' {
  export type InvariantInstaller = () => void
}
