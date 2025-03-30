type SpaceProps = {
  x: number;
  y: number;
  value: "X" | "O" | null;
  isSelected: boolean;
  isWinning: boolean;
  onClick: () => void;
};

export default function Space({ x, y, value, isSelected, isWinning, onClick }: SpaceProps) {
  const _pos = [x, y];
  const isDark = (x + y) % 2 === 0;

  return (
    <div
      class={`w-16 h-16 flex items-center justify-center border
        ${isWinning ? "bg-green-300" : isSelected ? "bg-yellow-300" : isDark ? "bg-gray-500" : "bg-gray-200"}
      `}
      onClick={onClick}
    >
      <h2 class="font-bold">{value}</h2>
    </div>
  );
}