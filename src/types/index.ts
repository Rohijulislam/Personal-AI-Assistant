export type ToolId =
  | "dashboard"
  | "command-center"
  | "chat"
  | "daily-status"
  | "prompt-rewriter"
  | "text-refiner"
  | "task-generator"
  | "command-library"
  | "saved-instructions"
  | "history"
  | "settings";

export interface NavItem {
  id: ToolId;
  label: string;
  href: string;
  icon: string;
  description: string;
}

export type InstructionCategory =
  | "git"
  | "shell"
  | "credentials"
  | "ai-prompt"
  | "workflow"
  | "other";

export interface SavedInstruction {
  id: string;
  title: string;
  content: string;
  category: InstructionCategory;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export type CommandCategory =
  | "git"
  | "shell"
  | "xcode"
  | "cocoapods"
  | "swift-pm"
  | "fastlane"
  | "flutter"
  | "other";

export interface SavedCommand {
  id: string;
  title: string;
  command: string;
  description: string;
  category: CommandCategory;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}
