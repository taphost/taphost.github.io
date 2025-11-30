(() => {
  const primaryColor = "#00ff9d";

  const CFG = {
    size: 50
  };

  const STYLE_ID = "firefly-cursor-style";
  const CURSOR_HIDDEN_CLASS = "firefly-cursor-hidden";
  const TOGGLE_KEY = "Escape";
  const GLOBAL_KEY = "__fireflyCleanup";
  const WING_ACTIVE_SPEED = 0.8;
  const WING_STOP_SPEED = 0;
  const WING_TRANSITION_MS = 250;
  const POINTER_SAMPLE_MS = 100;
  const HALF_SIZE = CFG.size / 2;
  const SPARKLE_DISTANCE = 12;

  const injectStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      body.${CURSOR_HIDDEN_CLASS}, body.${CURSOR_HIDDEN_CLASS} * { cursor: none !important; }
    `;
    document.head.appendChild(style);
  };

  const setCursorHidden = (shouldHide) => {
    document.body.classList.toggle(CURSOR_HIDDEN_CLASS, shouldHide);
  };

  // Clean up any previous instance to avoid duplicate canvases/listeners
  if (window[GLOBAL_KEY]) {
    window[GLOBAL_KEY]();
  }

  injectStyles();
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  let cursorHidden = hasFinePointer;
  setCursorHidden(cursorHidden);

  // Create canvas element
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CFG.size * dpr;
  canvas.height = CFG.size * dpr;
  canvas.style.position = "fixed";
  canvas.style.width = `${CFG.size}px`;
  canvas.style.height = `${CFG.size}px`;
  canvas.style.left = "0px";
  canvas.style.top = "0px";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.style.transform = "translate(-50%, -50%)";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let mouseX = targetX;
  let mouseY = targetY;
  let prevMouseX = mouseX;
  let prevMouseY = mouseY;
  let wingAngle = 0;
  let wingSpeed = WING_ACTIVE_SPEED;
  let targetWingSpeed = WING_ACTIVE_SPEED;
  let sparkleAngle = 0;
  let rotation = 0;
  let animationId = null;
  let lastTime = performance.now();
  let lastPointerSample = 0;
  let pointerIsActive = false;

  // Track mouse movement (throttled to rAF)
  let lastMouseX = targetX;
  let lastMouseY = targetY;
  let pendingMouseUpdate = false;
  const syncToPosition = (x, y) => {
    targetX = x;
    targetY = y;
    mouseX = x;
    mouseY = y;
    prevMouseX = x;
    prevMouseY = y;
    lastMouseX = x;
    lastMouseY = y;
  };
  const handleMouseMove = (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (pendingMouseUpdate) return;
    pendingMouseUpdate = true;
    requestAnimationFrame(() => {
      targetX = lastMouseX;
      targetY = lastMouseY;
      pendingMouseUpdate = false;
    });
  };
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mousemove", (e) => {
    syncToPosition(e.clientX, e.clientY);
  }, { once: true });

  // Toggle cursor visibility for accessibility (Escape key)
  const handleKeyDown = (e) => {
    if (e.key === TOGGLE_KEY) {
      cursorHidden = !cursorHidden;
      setCursorHidden(cursorHidden);
    }
  };
  document.addEventListener("keydown", handleKeyDown);

  // Detect cursor style
  function detectPointer() {
    const el = document.elementFromPoint(targetX, targetY);
    if (!el) return false;
    // Temporarily unhide cursor to read the actual computed value
    const hadClass = document.body.classList.contains(CURSOR_HIDDEN_CLASS);
    if (hadClass) document.body.classList.remove(CURSOR_HIDDEN_CLASS);
    const cursor = window.getComputedStyle(el).cursor;
    if (hadClass) document.body.classList.add(CURSOR_HIDDEN_CLASS);
    return cursor === "pointer";
  }

  // Main drawing function
  function drawFirefly(time) {
    ctx.clearRect(0, 0, CFG.size, CFG.size);

    // Apply rotation transform
    ctx.save();
    ctx.translate(HALF_SIZE, HALF_SIZE);
    ctx.rotate(rotation);
    ctx.translate(-HALF_SIZE, -HALF_SIZE);
    
    // Draw body first
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#2d5016";
    ctx.beginPath();
    ctx.ellipse(HALF_SIZE, HALF_SIZE, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw head
    ctx.beginPath();
    ctx.arc(HALF_SIZE, HALF_SIZE - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Fast-beating wings with green glow on top of body
    wingAngle += wingSpeed;
    const sinWing = Math.sin(wingAngle);
    const leftWingAngle = sinWing - 0.4;
    const rightWingAngle = -sinWing + 0.4;
    
    // Left wing - more transparent
    ctx.save();
    ctx.translate(HALF_SIZE - 3, HALF_SIZE);
    ctx.rotate(leftWingAngle);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ff9d";
    ctx.fillStyle = "rgba(0, 255, 157, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right wing - more transparent
    ctx.save();
    ctx.translate(HALF_SIZE + 3, HALF_SIZE);
    ctx.rotate(rightWingAngle);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ff9d";
    ctx.fillStyle = "rgba(0, 255, 157, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Pulsing central glow
    const glowIntensity = 0.8 + Math.sin(time * 0.01) * 0.2;
    
    ctx.fillStyle = `rgba(0, 255, 157, ${glowIntensity})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ff9d";
    ctx.beginPath();
    ctx.arc(HALF_SIZE, HALF_SIZE + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Orbiting sparkle particle
    sparkleAngle += 0.15;
    const sinSparkle = Math.sin(sparkleAngle);
    const cosSparkle = Math.cos(sparkleAngle);
    const sparkleX = HALF_SIZE + cosSparkle * SPARKLE_DISTANCE;
    const sparkleY = HALF_SIZE + 3 + sinSparkle * SPARKLE_DISTANCE;
    const sparkleIntensity = 0.6 + Math.sin(time * 0.02) * 0.4;
    
    ctx.fillStyle = `rgba(0, 255, 157, ${sparkleIntensity})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00ff9d";
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Animation loop
  function animate() {
    const now = performance.now();
    const dt = Math.min(50, now - lastTime); // clamp to avoid huge steps on tab switch
    lastTime = now;

    // Smooth mouse following with delay/acceleration
    const easing = 0.15;
    mouseX += (targetX - mouseX) * easing;
    mouseY += (targetY - mouseY) * easing;
    
    // Calculate mouse direction and rotation
    const deltaX = targetX - prevMouseX;
    const deltaY = targetY - prevMouseY;
    const moveAngle = Math.atan2(deltaY, deltaX);
    const targetRotation = Math.cos(moveAngle) * 0.35; // Symmetric tilt: right positive, left negative
    
    rotation += (targetRotation - rotation) * 0.1;
    
    prevMouseX = targetX;
    prevMouseY = targetY;
    
    // Adjust wing speed based on cursor type with ~500ms transition
    if (now - lastPointerSample >= POINTER_SAMPLE_MS) {
      pointerIsActive = detectPointer();
      lastPointerSample = now;
    }

    targetWingSpeed = pointerIsActive ? WING_STOP_SPEED : WING_ACTIVE_SPEED;
    const diff = targetWingSpeed - wingSpeed;
    if (diff !== 0) {
      const maxStep = (WING_ACTIVE_SPEED * dt) / WING_TRANSITION_MS;
      const step = Math.max(-maxStep, Math.min(maxStep, diff));
      wingSpeed += step;
    }
    
    // Add flutter effect (vertical)
    const flutterY = Math.sin(wingAngle) * 3;
    
    // Add wobble effect (horizontal)
    const wobbleX = Math.cos(wingAngle * 0.7) * 2;
    
    canvas.style.left = (mouseX + wobbleX) + "px";
    canvas.style.top = (mouseY + flutterY) + "px";
    drawFirefly(now);
    animationId = requestAnimationFrame(animate);
  }

  // Restore cursor on page unload
  const previousCursor = document.body.style.cursor;
  const cleanup = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    setCursorHidden(false);
    document.body.style.cursor = previousCursor;
    canvas.remove();
    window[GLOBAL_KEY] = null;
  };

  const handleBeforeUnload = () => {
    cleanup();
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Start animation
  animate();
  window[GLOBAL_KEY] = cleanup;
})();
