const burger = document.querySelector(".burger");
const menu = document.getElementById("menu");

burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
menu.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    menu.classList.remove("open");
    burger.setAttribute("aria-expanded", false);
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

const targets = document.querySelectorAll(".card, .steps li, .work-item, .values, .also, h2");
targets.forEach((el) => el.classList.add("reveal"));
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }),
  { threshold: 0.15 }
);
targets.forEach((el) => io.observe(el));

/* ===== Stage de serviços ===== */
(() => {
  const stage = document.getElementById("servicos");
  if (!stage) return;
  const scenes = [
    { nav: "Edição", kicker: "01 · Edição e montagem", title: "Edição", wipe: "#FF8A3D", text: "Ritmo, narrativa e formato certo para cada plataforma — de redes sociais a institucionais e documentais." },
    { nav: "Motion", kicker: "02 · Motion graphics", title: "Motion", wipe: "#DA1984", text: "Aberturas, lettering, lower thirds e animações que dão identidade ao seu vídeo." },
    { nav: "Cor", kicker: "03 · Cor e finalização", title: "Cor", wipe: "#F9E267", text: "Correção e color grading mantendo a essência do seu olhar, com acabamento de cinema." },
    { nav: "Som", kicker: "04 · Som e mixagem", title: "Som", wipe: "#03257E", text: "Limpeza de áudio, trilha, sound design e mixagem para o vídeo soar tão bem quanto parece." },
  ];
  const $ = (s) => stage.querySelector(s);
  const title = $(".scene-title"), kicker = $(".scene-kicker"), text = $(".scene-text");
  const nav = $(".scene-nav"), wipe = $(".wipe");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let cur = 0, busy = false, timer;

  for (let i = 0; i < 10; i++) { const s = document.createElement("i"); s.style.setProperty("--d", Math.round(Math.random() * 260)); wipe.append(s); }
  scenes.forEach((s, i) => {
    const li = document.createElement("li"), b = document.createElement("button");
    b.innerHTML = `<span>${s.nav}</span>`; b.setAttribute("aria-label", s.nav);
    b.addEventListener("click", () => go(i)); li.append(b); nav.append(li);
  });

  function apply(n) {
    const s = scenes[n];
    cur = n; stage.dataset.scene = n;
    stage.style.setProperty("--p", (n + 1) / scenes.length);
    kicker.textContent = s.kicker; text.textContent = s.text;
    title.setAttribute("aria-label", s.title); title.textContent = "";
    [...s.title].forEach((c, i) => { const sp = document.createElement("span"); sp.className = "ch"; sp.setAttribute("aria-hidden", "true"); sp.style.setProperty("--i", i); sp.textContent = c; title.append(sp); });
    stage.querySelector(".cur").textContent = String(n + 1).padStart(2, "0");
    nav.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-current", i === n));
  }
  function go(n) {
    n = (n + scenes.length) % scenes.length;
    if (busy || n === cur) return;
    clearTimeout(timer);
    if (reduce) return apply(n);
    busy = true;
    stage.style.setProperty("--wc", scenes[n].wipe);
    wipe.classList.remove("out"); wipe.classList.add("in");
    setTimeout(() => { apply(n); wipe.classList.add("out"); wipe.classList.remove("in"); }, 800);
    setTimeout(() => { wipe.classList.remove("out"); busy = false; auto(); }, 1650);
  }
  const auto = () => { clearTimeout(timer); if (!reduce) timer = setTimeout(() => go(cur + 1), 7000); };

  $(".next").addEventListener("click", () => go(cur + 1));
  $(".prev").addEventListener("click", () => go(cur - 1));
  stage.tabIndex = 0;
  stage.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(cur + 1); if (e.key === "ArrowLeft") go(cur - 1); });
  let x0 = null;
  stage.addEventListener("pointerdown", (e) => (x0 = e.clientX));
  stage.addEventListener("pointerup", (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 60) go(cur + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    stage.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5) * 24 + "deg");
    stage.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5) * -18 + "deg");
  });
  new IntersectionObserver(([en]) => { en.isIntersecting ? auto() : clearTimeout(timer); }, { threshold: 0.5 }).observe(stage);
  apply(0);
})();
