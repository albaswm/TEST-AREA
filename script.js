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
