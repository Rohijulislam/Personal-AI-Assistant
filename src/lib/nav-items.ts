import type { NavItem, ToolId } from "@/types";

export const navGroups: { label: string | null; ids: ToolId[] }[] = [
  { label: null, ids: ["dashboard", "command-center", "chat"] },
  {
    label: "AI Tools",
    ids: ["daily-status", "prompt-rewriter", "text-refiner", "task-generator"],
  },
  {
    label: "Library",
    ids: ["command-library", "saved-instructions", "history"],
  },
  {
    label: "Preferences",
    ids: ["settings"],
  },
];

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    description: "Quick access to all your tools",
  },
  {
    id: "command-center",
    label: "Command Center",
    href: "/command-center",
    icon: "BrainCircuit",
    description: "Goal-oriented AI assistant — just describe what you need",
  },
  {
    id: "chat",
    label: "Chat",
    href: "/chat",
    icon: "MessageSquare",
    description: "General-purpose conversation with the AI",
  },
  {
    id: "daily-status",
    label: "Daily Status",
    href: "/daily-status",
    icon: "ClipboardList",
    description: "Convert raw updates into your exact format",
  },
  {
    id: "prompt-rewriter",
    label: "Prompt Rewriter",
    href: "/prompt-rewriter",
    icon: "Wand2",
    description: "Improve rough prompts for better AI output",
  },
  {
    id: "text-refiner",
    label: "Text Refiner",
    href: "/text-refiner",
    icon: "PenLine",
    description: "Refine messages with selectable tones",
  },
  {
    id: "task-generator",
    label: "Task Generator",
    href: "/task-generator",
    icon: "ListTodo",
    description: "Turn ideas into structured developer tasks",
  },
  {
    id: "command-library",
    label: "Command Library",
    href: "/command-library",
    icon: "Terminal",
    description: "Saved commands, shortcuts, and snippets",
  },
  {
    id: "saved-instructions",
    label: "Saved Instructions",
    href: "/saved-instructions",
    icon: "BookMarked",
    description: "Reusable AI instructions for each workflow",
  },
  {
    id: "history",
    label: "History",
    href: "/history",
    icon: "History",
    description: "Recently generated results",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    description: "Choose default and backup AI models",
  },
];
