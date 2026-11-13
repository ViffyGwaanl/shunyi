/* 慢页翻译 · 站点脚本。没有统计，没有外部请求。 */

/* 下载链接：填上网址，对应的按钮就从「即将上架」变成可以点的链接；留空就保持「即将上架」。 */
const LINKS = {
  appStore: "",   // 例：https://apps.apple.com/app/id6830957189
  dmg: "",        // 例：dmg 的下载地址
};

(function () {
  const d = document;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* 下载按钮 */
  d.querySelectorAll("[data-link]").forEach((a) => {
    const url = LINKS[a.dataset.link];
    if (!url) return;
    a.href = url;
    a.removeAttribute("aria-disabled");
    const small = a.querySelector("small");
    if (small && small.dataset.live) small.textContent = small.dataset.live;
  });

  /* 滚动进场 */
  const reveals = d.querySelectorAll(".reveal");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* 首屏演示：选中 → 按键 → 卡片（本机译文）→ AI 译文 → 收起，循环 */
  const demo = d.getElementById("demo");
  if (!demo) return;
  const hero = demo.closest(".hero");
  const stage = demo.querySelector(".stage");
  const sheet = demo.querySelector(".sheet-body");
  const sel = d.getElementById("sel");
  const card = d.getElementById("card");
  const STATES = ["is-selected", "is-pressed", "is-card", "is-ai"];

  function set(...on) { STATES.forEach((c) => demo.classList.toggle(c, on.includes(c))); }
  function beat(n) { if (hero) { if (n) hero.dataset.beat = n; else delete hero.dataset.beat; } }

  /* 卡片贴在选区下面，和 App 里一样：左边比选区多出 18，上边隔 8 */
  function place() {
    const rects = sel.getClientRects();
    if (!rects.length) return;
    const box = stage.getBoundingClientRect();
    const first = rects[0], last = rects[rects.length - 1];
    const top = last.bottom - box.top + 8;
    const room = box.width - card.offsetWidth;
    const left = Math.max(Math.min(first.left - box.left - 18, room - 8), Math.min(8, room / 2));
    card.style.top = top + "px";
    card.style.left = left + "px";
    sheet.style.minHeight = "0px";
    // 重新量一次：上面把高度清掉以后，整块演示在首屏里的位置可能跟着变了
    const need = top + card.offsetHeight + 26 - (sheet.getBoundingClientRect().top - stage.getBoundingClientRect().top);
    sheet.style.minHeight = Math.max(need, 0) + "px";
  }

  const SEQ = [
    [900,  () => { set(); beat(0); }],
    [1050, () => { set("is-selected"); beat(1); }],
    [360,  () => { set("is-selected", "is-pressed"); beat(2); }],
    [1100, () => { set("is-selected", "is-card"); beat(3); }],
    [4200, () => { set("is-selected", "is-card", "is-ai"); }],
    [420,  () => { set("is-selected", "is-ai"); }],
  ];
  let timer = 0, step = 0, inView = false;

  function tick() {
    const [ms, fn] = SEQ[step];
    fn();
    step = (step + 1) % SEQ.length;
    timer = window.setTimeout(tick, ms);
  }
  function start() {
    if (timer || reduce.matches || d.hidden || !inView) return;
    step = 0;
    tick();
  }
  function stop() { window.clearTimeout(timer); timer = 0; }
  function showFinal() { stop(); set("is-selected", "is-card", "is-ai"); beat(0); }

  /* 网址后面加 ?demo=idle|selected|pressed|local|ai 可以把演示停在某一步（截图、检查用） */
  const FIXED = { idle: [], selected: ["is-selected"], pressed: ["is-selected", "is-pressed"],
                  local: ["is-selected", "is-card"], ai: ["is-selected", "is-card", "is-ai"] };
  const fixed = FIXED[new URLSearchParams(location.search).get("demo")];

  place();
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(place);
  window.addEventListener("load", place);
  window.addEventListener("resize", place);

  if (fixed) {
    d.documentElement.classList.add("still");   // 停住时不要过渡动画，截图拿到的就是最终样子
    reveals.forEach((el) => el.classList.add("in"));
    set(...fixed);
    return;
  }
  if (reduce.matches || !("IntersectionObserver" in window)) {
    showFinal();
  } else {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      if (inView) start(); else stop();
    }, { threshold: 0.3 }).observe(demo);
  }
  d.addEventListener("visibilitychange", () => { if (d.hidden) stop(); else start(); });
  const onMotionChange = () => { if (reduce.matches) showFinal(); else start(); };
  if (reduce.addEventListener) reduce.addEventListener("change", onMotionChange);
})();
