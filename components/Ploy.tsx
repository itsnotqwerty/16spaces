type PloyProps = {
  index: number;
  xMove: string | null;
  oMove: string | null;
};

export default function Ploy({ index, xMove, oMove }: PloyProps) {
  return (
    <tr>
      <td class="text-xs text-center">{index}</td>
      <td class="text-xs text-center">{xMove || "—"}</td>
      <td class="text-xs text-center">{oMove || "—"}</td>
    </tr>
  );
}