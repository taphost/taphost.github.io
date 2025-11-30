(() => {
  const primaryColor = "#00ff9d";

  const CFG = {
    size: 50,
    hideCursorSelectors: "html, body, *"
  };

  const injectStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      ${CFG.hideCursorSelectors} { cursor: none !important; }
    `;
    document.head.appendChild(style);
  };

  injectStyles();

  // Create canvas element
  const canvas = document.createElement("canvas");
  canvas.width = CFG.size;
  canvas.height = CFG.size;
  canvas.style.position = "fixed";
  canvas.style.left = "0px";
  canvas.style.top = "0px";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.style.transform = "translate(-50%, -50%)";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let wingAngle = 0;
  let sparkleAngle = 0;
  let flutterOffset = 0;

  // Track mouse movement
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Main drawing function
  function drawFirefly() {
    ctx.clearRect(0, 0, CFG.size, CFG.size);
    
    const centerX = CFG.size / 2;
    const centerY = CFG.size / 2;
    
    // Draw body first
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#2d5016";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 3, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 6, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Fast-beating wings with green glow on top of body
    wingAngle += 0.8;
    const leftWingAngle = Math.sin(wingAngle) * 1.0 - 0.4;
    const rightWingAngle = -Math.sin(wingAngle) * 1.0 + 0.4;
    
    // Left wing - more transparent
    ctx.save();
    ctx.translate(centerX - 3, centerY);
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
    ctx.translate(centerX + 3, centerY);
    ctx.rotate(rightWingAngle);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00ff9d";
    ctx.fillStyle = "rgba(0, 255, 157, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Pulsing central glow
    const glowIntensity = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
    
    ctx.fillStyle = `rgba(0, 255, 157, ${glowIntensity})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00ff9d";
    ctx.beginPath();
    ctx.arc(centerX, centerY + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Orbiting sparkle particle
    sparkleAngle += 0.15;
    const sparkleDistance = 12;
    const sparkleX = centerX + Math.cos(sparkleAngle) * sparkleDistance;
    const sparkleY = centerY + 3 + Math.sin(sparkleAngle) * sparkleDistance;
    const sparkleIntensity = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
    
    ctx.fillStyle = `rgba(0, 255, 157, ${sparkleIntensity})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00ff9d";
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }

  // Animation loop
  function animate() {
    // Add flutter effect
    // flutterOffset += 0.15; // add flutterOffset to Math.sin instead of wingAngle
    const flutterY = Math.sin(-wingAngle) * 6;
    
    canvas.style.left = mouseX + "px";
    canvas.style.top = (mouseY + flutterY) + "px";
    drawFirefly();
    requestAnimationFrame(animate);
  }

  // Restore cursor on page unload
  const previousCursor = document.body.style.cursor;
  window.addEventListener("beforeunload", () => {
    document.body.style.cursor = previousCursor;
  });

  // Start animation
  animate();
})();

