document.documentElement.classList.add("js");

(function starfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars = [];
    let width = 0;
    let height = 0;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.min(220, Math.floor((width * height) / 7000));
        stars = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.3 + 0.3,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.005,
        }));
        draw(0);
    }

    function draw(t) {
        ctx.clearRect(0, 0, width, height);
        for (const s of stars) {
            const alpha = 0.35 + 0.65 * Math.abs(Math.sin(s.phase + t * s.speed));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function loop(t) {
        draw(t / 16);
        requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    resize();
    if (!reduceMotion) requestAnimationFrame(loop);
})();

(function revealEntries() {
    const entries = document.querySelectorAll(".entry");
    if (!("IntersectionObserver" in window)) {
        entries.forEach((e) => e.classList.add("visible"));
        return;
    }
    const observer = new IntersectionObserver(
        (items) => {
            items.forEach((item) => {
                if (item.isIntersecting) {
                    item.target.classList.add("visible");
                    observer.unobserve(item.target);
                }
            });
        },
        { threshold: 0.15 }
    );
    entries.forEach((e, i) => {
        e.style.transitionDelay = i * 0.12 + "s";
        observer.observe(e);
    });
})();
