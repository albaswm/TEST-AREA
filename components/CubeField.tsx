// Cubos de vidro em camadas de profundidade: longe = pequeno, borrado e lento;
// perto = grande e fora de foco. --d controla o parallax (mouse) e o "voo" na rolagem.
type Cfg = { x: number; y: number; s: number; d: number; b: number; o: number; spin: number; delay: number; tilt: number };

const CUBES: readonly Cfg[] = [
  { x: 6, y: 16, s: 54, d: 0.3, b: 3, o: 0.7, spin: 44, delay: -6, tilt: -22 },
  { x: 46, y: 84, s: 110, d: 1.1, b: 1, o: 0.95, spin: 36, delay: -12, tilt: -30 },
  { x: 47, y: 12, s: 44, d: 0.25, b: 5, o: 0.6, spin: 52, delay: -20, tilt: -18 },
  { x: 60, y: 88, s: 240, d: 2.4, b: 9, o: 0.5, spin: 60, delay: -3, tilt: -26 },
  { x: 88, y: 20, s: 130, d: 1.0, b: 0, o: 1, spin: 40, delay: -9, tilt: -34 },
  { x: 95, y: 72, s: 70, d: 0.45, b: 3, o: 0.8, spin: 48, delay: -15, tilt: -20 },
  { x: 76, y: 6, s: 300, d: 3, b: 12, o: 0.38, spin: 70, delay: -30, tilt: -28 },
  { x: 18, y: 52, s: 36, d: 0.2, b: 4, o: 0.55, spin: 56, delay: -2, tilt: -24 },
];

export default function CubeField() {
  return (
    <div className="cubefield" aria-hidden="true">
      {CUBES.map((c, i) => (
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
    </div>
  );
}
