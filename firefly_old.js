(() => {
  const primaryColor = (getComputedStyle(document.documentElement).getPropertyValue("--primary-color") || "#00ff9d").trim() || "#00ff9d";

  const CFG = {
    size: 14,
    trailEase: 0.18,
    hideCursorSelectors: "html, body, *",
    body: {
      width: 1.2,
      height: 0.7,
      radius: "50% / 65%",
      translate: [-3, 0],
      rotateDeg: -50,
      glow: [4, 9, 15],
      gradientStops: { inner: 0, mid: 0.1, midPos: 55, outerPos: 85 }
    },
    wings: {
      w: 18,
      h: 8,
      baseRotDeg: 18,
      shift: 2,
      opacity: 0.8,
      blur: "0.1px",
      flapMs: 140
    }
  };

  const px = (n) => `${n}px`;
  const glow = (vals) => `0 0 ${vals[0]}px ${primaryColor}, 0 0 ${vals[1]}px ${primaryColor}, 0 0 ${vals[2]}px ${primaryColor}`;
  const gradient = (stops) =>
    `radial-gradient(circle at 30% 30%, ${primaryColor} ${stops.inner}%, rgba(0,0,0,${stops.mid}) ${stops.midPos}%, rgba(0,0,0,0) ${stops.outerPos}%)`;

  const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes wing-flap {
        0%, 100% { transform: rotate(var(--base-rot)) scaleY(0.8) translateX(var(--shift)); opacity: 0.8; }
        50% { transform: rotate(var(--base-rot)) scaleY(1.2) translateX(var(--shift)); opacity: 0.6; }
      }
      ${CFG.hideCursorSelectors} { cursor: none !important; }
    `;
    document.head.appendChild(style);
  };

  const create = (styles) => {
    const el = document.createElement("div");
    Object.assign(el.style, styles);
    return el;
  };

  injectStyles();

  const container = create({
    position: "fixed",
    left: "0px",
    top: "0px",
    pointerEvents: "none",
    zIndex: "5",
    transform: "translate(-50%, -50%)",
    mixBlendMode: "screen"
  });

  const bodyTransform = `translate(${px(CFG.body.translate[0])}, ${px(CFG.body.translate[1])}) rotate(${CFG.body.rotateDeg}deg)`;
  const body = create({
    position: "absolute",
    left: "0",
    top: "0",
    width: px(CFG.size * CFG.body.width),
    height: px(CFG.size * CFG.body.height),
    borderRadius: CFG.body.radius,
    background: gradient(CFG.body.gradientStops),
    boxShadow: glow(CFG.body.glow),
    transform: bodyTransform,
    transformOrigin: "50% 50%",
    transition: "box-shadow 120ms ease, transform 120ms ease, filter 120ms ease"
  });

  const makeWing = (side) => {
    const sign = side === "left" ? -1 : 1;
    return create({
      position: "absolute",
      width: px(CFG.wings.w),
      height: px(CFG.wings.h),
      borderRadius: "50%",
      background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9), ${primaryColor})`,
      opacity: CFG.wings.opacity,
      filter: `blur(${CFG.wings.blur})`,
      transformOrigin: side === "left" ? "100% 50%" : "0% 50%",
      left: side === "left" ? px(-CFG.wings.w * 0.75) : px(CFG.size * 0.25),
      top: px(-CFG.wings.h * 0.2),
      "--base-rot": `${sign * CFG.wings.baseRotDeg}deg`,
      "--shift": `${sign * CFG.wings.shift}px`,
      animation: `wing-flap ${CFG.wings.flapMs}ms ease-in-out infinite`
    });
  };

  const wingLeft = makeWing("left");
  const wingRight = makeWing("right");

  container.appendChild(wingLeft);
  container.appendChild(wingRight);
  container.appendChild(body);
  document.body.appendChild(container);

  const previousCursor = document.body.style.cursor;
  document.body.style.cursor = "none";
  window.addEventListener("beforeunload", () => {
    document.body.style.cursor = previousCursor;
  });

  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { ...target };

  window.addEventListener("mousemove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
  });

  const animate = () => {
    pos.x += (target.x - pos.x) * CFG.trailEase;
    pos.y += (target.y - pos.y) * CFG.trailEase;
    container.style.left = px(pos.x);
    container.style.top = px(pos.y);
    requestAnimationFrame(animate);
  };
  animate();
})();
