"use client";

import { useState, useEffect, useCallback } from "react";
import type { SavedCommand, CommandCategory } from "@/types";

const STORAGE_KEY = "command-library";

function generateId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type CommandDraft = {
  title: string;
  command: string;
  description: string;
  category: CommandCategory;
  tags: string[];
  favorite: boolean;
};

/**
 * Starter pack of high-value commands for a professional iOS developer —
 * Xcode/simulator troubleshooting, CocoaPods/SwiftPM, fastlane, plus the
 * git and shell commands that come up daily. Seeded once on first load.
 */
const STARTER_COMMANDS: Array<Omit<CommandDraft, "favorite"> & { favorite?: boolean }> = [
  // Xcode
  {
    title: "Delete Derived Data",
    command: "rm -rf ~/Library/Developer/Xcode/DerivedData/*",
    description: "Fixes most phantom build errors, stale previews, and \"module not found\" issues.",
    category: "xcode",
    tags: ["build", "troubleshooting", "cache"],
    favorite: true,
  },
  {
    title: "Build from CLI (simulator)",
    command:
      "xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build",
    description: "Build without opening Xcode — useful for CI or a quick sanity check.",
    category: "xcode",
    tags: ["build", "ci"],
  },
  {
    title: "Clean build folder from CLI",
    command: "xcodebuild clean -workspace App.xcworkspace -scheme App",
    description: "Equivalent of Cmd+Shift+K, scriptable.",
    category: "xcode",
    tags: ["build", "clean"],
  },
  {
    title: "Archive & export IPA",
    command:
      "xcodebuild archive -workspace App.xcworkspace -scheme App -archivePath build/App.xcarchive && xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist",
    description: "Two-step release build: archive, then export a signed .ipa.",
    category: "xcode",
    tags: ["release", "archive", "ipa"],
  },
  {
    title: "Run unit tests from CLI",
    command:
      "xcodebuild test -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16 Pro'",
    description: "Runs the test target headlessly — good for pre-push hooks or CI.",
    category: "xcode",
    tags: ["testing", "ci"],
  },
  {
    title: "List code signing identities",
    command: "security find-identity -v -p codesigning",
    description: "Shows every valid signing certificate in your keychain — first stop when a build fails to sign.",
    category: "xcode",
    tags: ["signing", "certificates", "troubleshooting"],
  },
  {
    title: "Open project in Xcode from terminal",
    command: "xed .",
    description: "Opens the .xcodeproj/.xcworkspace in the current directory without hunting in Finder.",
    category: "xcode",
    tags: ["shortcut"],
  },
  // Simulator (grouped under Xcode)
  {
    title: "List all simulators",
    command: "xcrun simctl list devices",
    description: "Shows every simulator and its state (Booted / Shutdown) with its UDID.",
    category: "xcode",
    tags: ["simulator"],
  },
  {
    title: "Boot a simulator by name",
    command: 'xcrun simctl boot "iPhone 16 Pro"',
    description: "Boots a simulator headlessly without opening Xcode first.",
    category: "xcode",
    tags: ["simulator"],
  },
  {
    title: "Erase all simulator content & settings",
    command: "xcrun simctl erase all",
    description: "Factory-resets every simulator — clears stuck state, keychain gunk, and old test data.",
    category: "xcode",
    tags: ["simulator", "troubleshooting"],
    favorite: true,
  },
  {
    title: "Install app on booted simulator",
    command: "xcrun simctl install booted /path/to/App.app",
    description: "Sideload a build without dragging it into the simulator window.",
    category: "xcode",
    tags: ["simulator"],
  },
  {
    title: "Clean status bar for screenshots",
    command:
      'xcrun simctl status_bar booted override --time "9:41" --cellularBars 4 --wifiBars 3 --batteryState charged --batteryLevel 100',
    description: "Sets the classic App Store screenshot status bar (9:41, full signal, full battery).",
    category: "xcode",
    tags: ["simulator", "screenshots", "app-store"],
  },
  // CocoaPods
  {
    title: "Clean pod reinstall",
    command: "pod deintegrate && pod install",
    description: "Fully removes and reinstalls CocoaPods integration — fixes most \"pod install\" weirdness.",
    category: "cocoapods",
    tags: ["troubleshooting"],
    favorite: true,
  },
  {
    title: "Update pod repo & pods",
    command: "pod repo update && pod update",
    description: "Refreshes the local spec repo before updating to the latest allowed versions.",
    category: "cocoapods",
    tags: ["update"],
  },
  {
    title: "Clear CocoaPods cache",
    command: "pod cache clean --all",
    description: "Clears cached pod sources when a pod fails to download or is corrupted.",
    category: "cocoapods",
    tags: ["cache", "troubleshooting"],
  },
  // Swift Package Manager
  {
    title: "Reset Swift Package caches",
    command:
      "rm -rf ~/Library/Caches/org.swift.swiftpm && rm -rf .build .swiftpm && rm -rf ~/Library/Developer/Xcode/DerivedData/*",
    description: "The SPM equivalent of a clean pod reinstall — fixes stuck or corrupted package resolution.",
    category: "swift-pm",
    tags: ["troubleshooting", "cache"],
  },
  {
    title: "Resolve packages",
    command: "swift package resolve",
    description: "Re-resolves Package.resolved against your Package.swift without a full clean.",
    category: "swift-pm",
    tags: ["dependencies"],
  },
  // Fastlane
  {
    title: "Ship a TestFlight build",
    command: "fastlane beta",
    description: "Common lane name for building, signing, and uploading to TestFlight in one command.",
    category: "fastlane",
    tags: ["testflight", "release"],
  },
  {
    title: "Sync signing certs & profiles (match)",
    command: "fastlane match appstore --readonly",
    description: "Pulls the team's shared signing certs/profiles without generating new ones — safe for CI.",
    category: "fastlane",
    tags: ["signing", "certificates"],
  },
  // Git
  {
    title: "Amend last commit, keep message",
    command: "git commit --amend --no-edit",
    description: "Folds staged changes into the previous commit without touching its message.",
    category: "git",
    tags: ["commit"],
    favorite: true,
  },
  {
    title: "Interactive rebase last N commits",
    command: "git rebase -i HEAD~5",
    description: "Squash, reorder, or reword recent commits before pushing/opening a PR.",
    category: "git",
    tags: ["rebase", "cleanup"],
  },
  {
    title: "Undo last commit, keep changes staged",
    command: "git reset --soft HEAD~1",
    description: "Uncommits without losing your work — the changes stay staged and ready to redo.",
    category: "git",
    tags: ["undo"],
  },
  {
    title: "Delete local branches already merged",
    command: 'git branch --merged main | grep -v "\\* \\|main" | xargs -n 1 git branch -d',
    description: "Sweeps up stale feature branches once they've landed on main.",
    category: "git",
    tags: ["cleanup", "branches"],
  },
  {
    title: "Stash including untracked files",
    command: "git stash -u",
    description: "Stashes new files too, not just tracked changes — the default `git stash` skips them.",
    category: "git",
    tags: ["stash"],
  },
  {
    title: "Tag a release and push it",
    command: 'git tag -a v1.2.0 -m "Release 1.2.0" && git push origin v1.2.0',
    description: "Annotated tag + push, ready for a release build or changelog reference.",
    category: "git",
    tags: ["release", "tag"],
  },
  // Shell
  {
    title: "Kill whatever is holding a port",
    command: "lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9",
    description: "Frees a port a dead dev server or simulator process is still holding.",
    category: "shell",
    tags: ["troubleshooting", "process"],
    favorite: true,
  },
  {
    title: "Show largest files/folders here",
    command: "du -sh * | sort -rh | head -20",
    description: "Fast way to find what's eating disk space (DerivedData and simulators are usual suspects).",
    category: "shell",
    tags: ["disk", "cleanup"],
  },
  {
    title: "Recursive text search",
    command: 'grep -rn "searchTerm" .',
    description: "Finds every occurrence of a string across the current directory tree, with line numbers.",
    category: "shell",
    tags: ["search"],
  },
  {
    title: "Remove quarantine flag from an app",
    command: "xattr -cr /Applications/SomeApp.app",
    description: "Fixes \"can't be opened because Apple cannot check it for malicious software\" for trusted, unsigned builds.",
    category: "shell",
    tags: ["macos", "troubleshooting"],
  },
];

function withMetadata(draft: Omit<CommandDraft, "favorite"> & { favorite?: boolean }, index: number): SavedCommand {
  const now = new Date(Date.now() - (STARTER_COMMANDS.length - index) * 1000).toISOString();
  return {
    id: generateId(),
    title: draft.title,
    command: draft.command,
    description: draft.description,
    category: draft.category,
    tags: draft.tags,
    favorite: draft.favorite ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

function loadFromStorage(): SavedCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First-ever load: seed with a curated starter pack instead of an empty library.
      return STARTER_COMMANDS.map(withMetadata);
    }
    return JSON.parse(raw) as SavedCommand[];
  } catch {
    return [];
  }
}

function saveToStorage(commands: SavedCommand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch {
    // storage quota exceeded or unavailable — fail silently
  }
}

export function useCommandLibrary() {
  const [commands, setCommands] = useState<SavedCommand[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCommands(loadFromStorage());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveToStorage(commands);
    }
  }, [commands, hydrated]);

  const add = useCallback((draft: CommandDraft): SavedCommand => {
    const now = new Date().toISOString();
    const newCommand: SavedCommand = {
      id: generateId(),
      ...draft,
      createdAt: now,
      updatedAt: now,
    };
    setCommands((prev) => [newCommand, ...prev]);
    return newCommand;
  }, []);

  const update = useCallback((id: string, draft: Partial<CommandDraft>): void => {
    setCommands((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...draft, updatedAt: new Date().toISOString() } : item
      )
    );
  }, []);

  const remove = useCallback((id: string): void => {
    setCommands((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string): void => {
    setCommands((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  // Favorites first, then most recently updated
  const sorted = [...commands].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { commands: sorted, hydrated, add, update, remove, toggleFavorite };
}
