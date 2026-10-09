// Cubos de vidro da abertura, em duas profundidades (componente de servidor, sem JS).
// Reaproveita as classes .dw / .dcube / .glass de app/globals.css:
//   --x/--y  posição em % do palco;  --s  lado em px;  --d  profundidade (parallax do ponteiro e "voo" na rolagem)
//   --b  desfoque em px;  --o  opacidade base.
// "back" fica atrás do personagem (longe: pequeno, lento, nítido); "front" passa à frente (perto: grande e fora de foco).
type Cube = { x: number; y: number; s: number; d: number; b: number; o: number; spin: number; delay: number; tilt: number };

const BACK: readonly Cube[] = [
  { x: 34, y: 15, s: 138, d: 0.7, b: 1, o: 0.95, spin: 44, delay: -6, tilt: -24 },
  { x: 21, y: 60, s: 92, d: 0.5, b: 1.5, o: 0.9, spin: 52, delay: -14, tilt: -30 },
  { x: 72, y: 31, s: 58, d: 0.4, b: 2, o: 0.85, spin: 48, delay: -9, tilt: -20 },
  { x: 83, y: 70, s: 76, d: 0.55, b: 2.5, o: 0.8, spin: 58, delay: -21, tilt: -26 },
];

const FRONT: readonly Cube[] = [
  { x: 7, y: 88, s: 250, d: 2.4, b: 8, o: 0.6, spin: 60, delay: -3, tilt: -26 },
  { x: 95, y: 17, s: 190, d: 2.0, b: 6, o: 0.7, spin: 66, delay: -11, tilt: -32 },
  { x: 79, y: 94, s: 140, d: 1.6, b: 4, o: 0.8, spin: 54, delay: -17, tilt: -22 },
  { x: 5, y: 26, s: 88, d: 1.1, b: 2, o: 0.9, spin: 46, delay: -8, tilt: -28 },
];

export default function HeroCubes({ layer }: { layer: "back" | "front" }) {
  const cubes = layer === "back" ? BACK : FRONT;
  return (
    <>
      {cubes.map((c, i) => (
        <div
          key={i}
          className="dw"
          style={{ "--x": c.x, "--y": c.y, "--s": c.s, "--d": c.d, "--b": c.b, "--o": c.o } as React.CSSProperties}
        >
          <div className="dcube glass" style={{ "--spin": c.spin, "--delay": c.delay, "--tilt": `${c.tilt}deg` } as React.CSSProperties}>
            <i /><i /><i /><i /><i /><i />
          </div>
        </div>
      ))}
    </>
  );
}
