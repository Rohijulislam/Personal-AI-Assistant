import { clsx } from "clsx";

interface ToolMeshBackgroundProps {
  /** Three literal Tailwind background-color classes, e.g. ["bg-blue-500", "bg-cyan-400", "bg-violet-500"] */
  colors: [string, string, string];
}

/**
 * Bold, saturated multi-color gradient-mesh wallpaper behind a tool
 * workspace — Raycast/Arc-style "space" background rather than a flat
 * surface. Three slowly drifting blurred blobs in different hues create
 * a mesh-gradient effect. Purely decorative, absolutely positioned within
 * a `relative` ancestor and clipped by the page's own overflow.
 */
export function ToolMeshBackground({ colors }: ToolMeshBackgroundProps) {
  const [a, b, c] = colors;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden -z-10"
    >
      <div
        className={clsx(
          "animate-mesh-a absolute -top-32 -right-20 w-[30rem] h-[30rem] rounded-full blur-[100px] opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen",
          a
        )}
      />
      <div
        className={clsx(
          "animate-mesh-b absolute top-1/3 -left-24 w-[26rem] h-[26rem] rounded-full blur-[100px] opacity-30 dark:opacity-25 mix-blend-multiply dark:mix-blend-screen",
          b
        )}
      />
      <div
        className={clsx(
          "animate-mesh-c absolute -bottom-24 right-1/4 w-[24rem] h-[24rem] rounded-full blur-[100px] opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen",
          c
        )}
      />
    </div>
  );
}
