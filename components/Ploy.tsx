type PloyProps = {
  index: number;
  xMove: string | null;
  oMove: string | null;
};

export default function Ploy({ index, xMove, oMove }: PloyProps) {
  // Determine the background color for each cell based on row and column index
  const getCellClass = (colIndex: number) => {
    const isEvenRow = index % 2 === 0;
    const isEvenCol = colIndex % 2 === 0;
    return isEvenRow === isEvenCol ? "bg-gray-300" : "bg-gray-400"; // Light or dark background
  };

  return (
    <tr>
      <td class={`text-xs text-center ${getCellClass(0)}`}>{index}</td>
      <td class={`text-xs text-center ${getCellClass(1)}`}>{xMove || "—"}</td>
      <td class={`text-xs text-center ${getCellClass(2)}`}>{oMove || "—"}</td>
    </tr>
  );
}