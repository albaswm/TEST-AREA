import Footer from "@/components/Footer";
import PosterGallery from "@/components/PosterGallery";
import Stage from "@/components/Stage";
import { contact, extraSteps, marquee, portfolio, posters, process, scenes, values } from "@/data/content";

const marqueeLoop = [...marquee, ...marquee];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap">
          <p className="eyebrow">Produtora audiovisual · Pós-produção</p>
          <h1>Damos <em>forma</em> e <em>movimento</em> ao seu conteúdo.</h1>
          <p className="lead">
            Criamos conteúdos que atraem, inspiram e motivam pessoas. Edição, motion, cor e som para quem quer uma cara
            profissional — e, se precisar, também cuidamos da produção.
          </p>
          <div className="actions">
            <a className="btn" href="#contato">Pedir orçamento</a>
            <a className="btn btn-ghost" href="#portfolio">Ver trabalhos</a>
          </div>
        </div>
        <div className="hero-cube" aria-hidden="true">
          <div className="big-cube"><i /><i /><i /></div>
        </div>
      </section>

      <section className="marquee" aria-hidden="true">
        <div className="track">
          {marqueeLoop.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </section>

      <Stage scenes={scenes} />

      <section className="section also-sec">
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

      <section id="processo" className="section dark">
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

      <section id="portfolio" className="section">
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

      <section id="universo" className="section universe">
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

      <section id="sobre" className="section dark about">
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

      <section id="contato" className="section contact">
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
