export default function Teaser() {
  return (
    <div className="teaser paper t-lav">
      <svg className="blob" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
        <path
          fill="#F9E267"
          d="M300 40C410 20 520 90 545 200C575 320 520 360 540 450C555 530 450 590 340 565C250 545 210 585 120 540C40 500 60 420 80 350C100 280 30 230 80 150C130 70 220 60 300 40Z"
        />
      </svg>
      <span className="vtext" aria-hidden="true">Pós-produção criativa</span>
      <div className="teaser-copy">
        <p className="eyebrow">Trills · produtora audiovisual</p>
        <h2>Pós-produção criativa.</h2>
        <p>Guiar o conteúdo, adequar o formato &amp; conduzir a narrativa.</p>
        <a className="btn" href="#servicos">Ver o que fazemos ↓</a>
      </div>
    </div>
  );
}
