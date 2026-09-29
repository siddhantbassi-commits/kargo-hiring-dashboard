const PALETTE = [
  "#16233d",
  "#2c4570",
  "#5b3a29",
  "#3f5b3a",
  "#5b3a55",
  "#3a5158",
  "#6b4a1e",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const bg = colorFor(name || "?");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </div>
  );
}
