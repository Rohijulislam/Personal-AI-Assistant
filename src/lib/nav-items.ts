import type { NavItem, ToolId } from "@/types";

export const navGroups: { label: string | null; ids: ToolId[] }[] = [
  { label: null, ids: ["dashboard", "command-center"] },
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
    color: "from-violet-500 to-purple-600",
  },
  {
    id: "command-center",
    label: "Command Center",
    href: "/command-center",
    icon: "BrainCircuit",
    description: "Goal-oriented AI assistant — just describe what you need",
    color: "from-violet-500 to-fuchsia-600",
  },
  {
    id: "daily-status",
    label: "Daily Status",
    href: "/daily-status",
    icon: "ClipboardList",
    description: "Convert raw updates into your exact format",
    color: "from-blue-500 to-cyan-600",
  },
  {
    id: "prompt-rewriter",
    label: "Prompt Rewriter",
    href: "/prompt-rewriter",
    icon: "Wand2",
    description: "Improve rough prompts for better AI output",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "text-refiner",
    label: "Text Refiner",
    href: "/text-refiner",
    icon: "PenLine",
    description: "Refine messages with selectable tones",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "task-generator",
    label: "Task Generator",
    href: "/task-generator",
    icon: "ListTodo",
    description: "Turn ideas into structured developer tasks",
    color: "from-rose-500 to-pink-600",
  },
  {
    id: "command-library",
    label: "Command Library",
    href: "/command-library",
    icon: "Terminal",
    description: "Saved commands, shortcuts, and snippets",
    color: "from-slate-500 to-zinc-600",
  },
  {
    id: "saved-instructions",
    label: "Saved Instructions",
    href: "/saved-instructions",
    icon: "BookMarked",
    description: "Reusable AI instructions for each workflow",
    color: "from-indigo-500 to-blue-600",
  },
  {
    id: "history",
    label: "History",
    href: "/history",
    icon: "History",
    description: "Recently generated results",
    color: "from-stone-500 to-neutral-600",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    description: "Choose default and backup AI models",
    color: "from-gray-500 to-slate-600",
  },
];
