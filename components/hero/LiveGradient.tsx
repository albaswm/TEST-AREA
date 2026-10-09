/**
 * Degradê vivo da abertura (componente de servidor, sem JavaScript).
 *
 * Cobre o contêiner pai (position:absolute; inset:0). Em repouso reproduz o fundo do pôster:
 * preto no topo-esquerdo, laranja à esquerda, amarelo-oliva embaixo à esquerda, magenta forte
 * no topo-centro/direita, azul no canto superior direito e preto no canto inferior direito.
 *
 * Tudo é CSS (ver app/hero-bg.css). Cada mancha tem um invólucro (.lg-p: variáveis, parallax do ponteiro e deslocamento da
 * rolagem, escritos em JS por HeroSequence) e a elipse (.lg-b: gradiente e deriva ociosa, nunca recalculados por quadro):
 *   ponteiro suavizado (-1..1)   parallax das manchas + brilho que segue o cursor
 *   progresso da rolagem (0..1)  laranja migra e esquenta, magenta cresce
 *   --pa        opcional, 0..1: intensidade do brilho do cursor (padrão 1)
 */
export default function LiveGradient({ className }: { className?: string }) {
  return (
    <div className={className ? `lg ${className}` : "lg"} aria-hidden="true">
      <i className="lg-p lg-olive"><i className="lg-b" /></i>
      <i className="lg-p lg-orange"><i className="lg-b" /></i>
      <i className="lg-p lg-coral"><i className="lg-b" /></i>
      <i className="lg-p lg-violet"><i className="lg-b" /></i>
      <i className="lg-p lg-blue"><i className="lg-b" /></i>
      <i className="lg-p lg-magenta"><i className="lg-b" /></i>
      <i className="lg-p lg-hot"><i className="lg-b" /></i>
      <i className="lg-p lg-shade lg-shade-l"><i className="lg-b" /></i>
      <i className="lg-p lg-shade lg-shade-r"><i className="lg-b" /></i>
      <i className="lg-p lg-glow"><i className="lg-b" /></i>
    </div>
  );
}
