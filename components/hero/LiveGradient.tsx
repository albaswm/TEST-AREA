/**
 * Degradê vivo da abertura (componente de servidor, sem JavaScript).
 *
 * Cobre o contêiner pai (position:absolute; inset:0). Em repouso reproduz o fundo do pôster:
 * preto no topo-esquerdo, laranja à esquerda, amarelo-oliva embaixo à esquerda, magenta forte
 * no topo-centro/direita, azul no canto superior direito e preto no canto inferior direito.
 *
 * Tudo é CSS (ver app/hero-bg.css). Lê, por herança, as variáveis do elemento [data-hero-root]:
 *   --mx, --my  ponteiro suavizado, -1..1 (parallax das manchas + brilho que segue o cursor)
 *   --p         progresso da rolagem, 0..1 (laranja migra e esquenta, magenta cresce)
 *   --pa        opcional, 0..1: intensidade do brilho do cursor (padrão 1)
 */
export default function LiveGradient({ className }: { className?: string }) {
  return (
    <div className={className ? `lg ${className}` : "lg"} aria-hidden="true">
      <i className="lg-b lg-olive" />
      <i className="lg-b lg-orange" />
      <i className="lg-b lg-coral" />
      <i className="lg-b lg-violet" />
      <i className="lg-b lg-blue" />
      <i className="lg-b lg-magenta" />
      <i className="lg-b lg-hot" />
      <i className="lg-shade" />
      <i className="lg-b lg-glow" />
    </div>
  );
}
