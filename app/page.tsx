import Footer from "@/components/Footer";
import GradientField from "@/components/GradientField";
import HeroCubes from "@/components/hero/HeroCubes";
import HeroSequence from "@/components/hero/HeroSequence";
import LiveGradient from "@/components/hero/LiveGradient";
import SpaceScene from "@/components/hero/SpaceScene";
import PosterGallery from "@/components/PosterGallery";
import Stage from "@/components/Stage";
import { contact, extraSteps, marquee, portfolio, posters, process, scenes, values } from "@/data/content";

const marqueeLoop = [...marquee, ...marquee];

export default function Home() {
  return (
    <>
      <HeroSequence
        gradient={<LiveGradient />}
        cubesBack={<HeroCubes layer="back" />}
        cubesFront={<HeroCubes layer="front" />}
        space={<SpaceScene density={1.6} />}
      />

      <section className="marquee" aria-hidden="true">
        <div className="track">
          {marqueeLoop.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </section>

      <Stage scenes={scenes} />

      <section className="section also-sec paper t-lav">
        <div className="wrap">
          <div className="also reveal">
            <h3>E, se solicitado, as demais etapas</h3>
            <ul>
              {extraSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="processo" className="section paper t-lav">
        <div className="wrap">
          <p className="eyebrow">Como trabalhamos</p>
          <h2 className="reveal">Do material bruto à entrega final.</h2>
          <ol className="steps">
            {process.map((p) => (
              <li key={p.n} className="reveal">
                <b>{p.n}</b>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="portfolio" className="section paper t-black">
        <div className="wrap">
          <p className="eyebrow">Portfólio</p>
          <h2 className="reveal">Trabalhos selecionados.</h2>
          <div className="grid work">
            {portfolio.map((w) => (
              <a key={w.id} className="work-item reveal" href="#contato">
                <div className={`thumb ${w.id}`}><span>▶</span></div>
                <h3>{w.title}</h3>
                <p>{w.meta}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="universo" className="section universe paper t-black">
        <div className="wrap">
          <p className="eyebrow">Universo Trills</p>
          <h2 className="reveal">Um universo possível.</h2>
          <p className="universe-text reveal">
            O cubo é a nossa referência-chave: a câmara obscura, os mundos improváveis de Escher e a força da união entre
            criatividade, conhecimento e parcerias. Estes posters são a Trills em forma de imagem: guiar o conteúdo, adequar o formato e conduzir a narrativa.
          </p>
          <PosterGallery posters={posters} />
        </div>
      </section>

      <section id="sobre" className="section about paper t-lav">
        <svg className="about-blob" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
          <path fill="#F9E267" d="M300 40C410 20 520 90 545 200C575 320 520 360 540 450C555 530 450 590 340 565C250 545 210 585 120 540C40 500 60 420 80 350C100 280 30 230 80 150C130 70 220 60 300 40Z" />
        </svg>
        <div className="wrap two">
          <div>
            <p className="eyebrow">Sobre a Trills</p>
            <h2 className="reveal">Mais do que edição: é sobre orientar.</h2>
            <p>A Trills surge para descomplicar o seu conteúdo. É sobre dar a sua cara ao que você produz, delinear o seu diferencial e destacar a sua narrativa.</p>
            <p>O nome é sobre movimento, oscilação, vibração — movimento que transmite beleza, arte e confiança. Esculpimos e damos forma ao conteúdo, ajustando-o para se comunicar com pessoas.</p>
          </div>
          <div className="values reveal">
            <h3>Para quem é</h3>
            <p>Para quem cria o próprio conteúdo e quer inovar nos formatos, e para empresas que buscam melhorar a presença digital com criatividade e qualidade técnica.</p>
            <ul>
              {values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="contato" className="section contact paper">
        <GradientField variant="dusk" />
        <div className="wrap two">
          <div>
            <p className="eyebrow">Contato</p>
            <h2 className="reveal">Vamos dar forma ao seu próximo vídeo?</h2>
            <p>Conte um pouco do projeto e retornamos em breve.</p>
            <p className="links">
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <br />
              <a href={contact.whatsapp}>WhatsApp</a> · <a href={contact.instagram}>Instagram</a>
            </p>
          </div>
          <form action={`mailto:${contact.email}`} method="post" encType="text/plain">
            <label>Nome<input name="nome" required autoComplete="name" /></label>
            <label>E-mail<input type="email" name="email" required autoComplete="email" /></label>
            <label>Sobre o projeto<textarea name="mensagem" rows={4} required /></label>
            <button className="btn" type="submit">Enviar mensagem</button>
          </form>
        </div>
      </section>

      <Footer />
    </>
  );
}
