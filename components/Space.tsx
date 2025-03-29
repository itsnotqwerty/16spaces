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

  return (
    <div
      class={`w-16 h-16 flex items-center justify-center border
        ${isSelected ? "bg-yellow-300" : "bg-white"}
        ${isWinning ? "bg-green-300": "bg-white"}
      `}
      onClick={onClick}
    >
      {value}
    </div>
  );
}