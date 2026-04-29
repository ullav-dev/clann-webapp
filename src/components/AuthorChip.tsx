"use client";

interface Props {
  username: string;
  isSelf: boolean;
  size?: "xs" | "sm";
}

export default function AuthorChip({ username, isSelf, size = "xs" }: Props) {
  const initial = username[0]?.toUpperCase() ?? "?";
  const circleSize = size === "sm" ? "w-5 h-5 text-xs" : "w-4 h-4 text-[10px]";
  const textSize = size === "sm" ? "text-xs" : "text-[11px]";
  const colors = isSelf
    ? "bg-emerald-100 text-emerald-700"
    : "bg-violet-100 text-violet-700";

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`${circleSize} ${colors} rounded-full flex items-center justify-center font-semibold shrink-0`}>
        {initial}
      </span>
      <span className={`${textSize} text-stone-500 font-medium`}>{username}</span>
    </span>
  );
}
