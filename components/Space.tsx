type SpaceProps = {
  x: number;
  y: number;
  value: "X" | "O" | null;
  isSelected: boolean;
  isWinning: boolean;
  isTutorialTarget?: boolean;
  onClick: () => void;
};

export default function Space({
  x,
  y,
  value,
  isSelected,
  isWinning,
  isTutorialTarget = false,
  onClick,
}: SpaceProps) {
  const _pos = [x, y];
  const isDark = (x + y) % 2 === 0;

  return (
    <div
      class={`w-full aspect-square flex items-center justify-center rounded-sm cursor-pointer transition-all
        ${isWinning ? "bg-green-300 border-2 border-green-700" : isSelected ? "bg-yellow-300 border-2 border-yellow-500" : isDark ? "bg-gray-500 border border-white/80" : "bg-gray-200 border border-white/80"}
        ${isTutorialTarget ? "border-yellow-300 shadow-[inset_0_0_0_1px_rgba(253,224,71,0.9),0_0_0_1px_rgba(253,224,71,0.7)]" : ""}
      `}
      onClick={onClick}
    >
      <h2 class="font-bold text-xl sm:text-2xl lg:text-3xl text-black">
        {value}
      </h2>
    </div>
  );
}