import '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    readonly commands: import('@deepseek-ai/dsh-commands').CommandRuntime
    readonly tools: import('@deepseek-ai/dsh-tools').ToolRuntime
    readonly systemPrompt: {
      section(definition: { readonly name: string; readonly order: number; readonly text: string }): void
    }
    effect<T>(factory: () => T, label?: string): T
    readonly invariants: {
      register(packageName: string, installer: import('@deepseek-ai/dsh-invariants').InvariantInstaller): () => void
    }
  }
}
