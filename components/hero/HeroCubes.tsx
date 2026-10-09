// Cubos de vidro da abertura, em duas profundidades (componente de servidor, sem JS).
// Poucos e escuros, como os do pôster (3 atrás do personagem, 2 desfocados à frente).
// Estilo em app/hero.css (.hs-cubes):
//   --x/--y  posição em % do palco;  --s  lado (unidade de vmin/1100: escala em 4K);  --d  profundidade (parallax do
//   ponteiro e "voo" na rolagem, lido pelo JS em data-d);  --b  desfoque (0 = nítido, sem filter: poupa uma render surface);  --o  opacidade base.
// "back" fica atrás do personagem (longe: nítido); "front" passa à frente (perto: grande e fora de foco).
type Cube = { x: number; y: number; s: number; d: number; b: number; o: number; spin: number; delay: number; tilt: number };

const BACK: readonly Cube[] = [
  { x: 33, y: 17, s: 150, d: 0.7, b: 0, o: 0.88, spin: 44, delay: -6, tilt: -24 },
  { x: 20, y: 62, s: 100, d: 0.5, b: 0, o: 0.82, spin: 52, delay: -14, tilt: -30 },
  { x: 84, y: 66, s: 64, d: 0.45, b: 0, o: 0.76, spin: 58, delay: -21, tilt: -26 },
];

const FRONT: readonly Cube[] = [
  { x: 6, y: 90, s: 230, d: 2.4, b: 9, o: 0.5, spin: 60, delay: -3, tilt: -26 },
  { x: 95, y: 14, s: 170, d: 2.0, b: 7, o: 0.55, spin: 66, delay: -11, tilt: -32 },
];

export default function HeroCubes({ layer }: { layer: "back" | "front" }) {
  const cubes = layer === "back" ? BACK : FRONT;
  return (
    <>
      {cubes.map((c, i) => (
        <div
          key={i}
          className="dw"
          data-d={c.d}
          data-sharp={c.b <= 0 ? "" : undefined}
          style={{ "--x": c.x, "--y": c.y, "--s": c.s, "--b": c.b, "--o": c.o } as React.CSSProperties}
        >
          <div className="dcube glass" style={{ "--spin": c.spin, "--delay": c.delay, "--tilt": `${c.tilt}deg` } as React.CSSProperties}>
            <i /><i /><i /><i /><i /><i />
          </div>
        </div>
      ))}
    </>
  );
}
