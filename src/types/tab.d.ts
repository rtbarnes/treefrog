declare module "@bomb.sh/tab" {
  export type Complete = (value: string, description: string) => void;
  export type OptionsMap = Map<string, any>;
  export type ArgumentHandler = (this: any, complete: Complete, options: OptionsMap) => void;
  export interface RootCommand {
    commands: Map<string, any>;
    setup(name: string, executable: string, shell: string): void;
  }
  export const t: RootCommand;
  export default t;
}

declare module "@bomb.sh/tab/commander" {
  import type { Command } from "commander";
  import type { RootCommand } from "@bomb.sh/tab";
  export default function tab(instance: Command): RootCommand;
}
