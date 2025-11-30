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
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let mouseX = targetX;
  let mouseY = targetY;
  let prevMouseX = mouseX;
  let prevMouseY = mouseY;
  let wingAngle = 0;
  let wingSpeed = 0.8;
  let targetWingSpeed = 0.8;
  let sparkleAngle = 0;
  let rotation = 0;

  // Track mouse movement
  document.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  // Detect cursor style
  function isCursorPointer() {
    const el = document.elementFromPoint(targetX, targetY);
    if (!el) return false;
    const cursor = window.getComputedStyle(el).cursor;
    return cursor === "pointer";
  }

  // Main drawing function
  function drawFirefly() {
    ctx.clearRect(0, 0, CFG.size, CFG.size);
    
    const centerX = CFG.size / 2;
    const centerY = CFG.size / 2;
    
    // Apply rotation transform
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);
    
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
    wingAngle += wingSpeed;
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
    ctx.restore();
  }

  // Animation loop
  function animate() {
    // Smooth mouse following with delay/acceleration
    const easing = 0.08;
    mouseX += (targetX - mouseX) * easing;
    mouseY += (targetY - mouseY) * easing;
    
    // Calculate mouse direction and rotation
    const deltaX = targetX - prevMouseX;
    const deltaY = targetY - prevMouseY;
    const moveAngle = Math.atan2(deltaY, deltaX);
    const targetRotation = moveAngle * 0.15; // Rotation proportional to direction
    
    rotation += (targetRotation - rotation) * 0.1;
    
    prevMouseX = targetX;
    prevMouseY = targetY;
    
    // Adjust wing speed based on cursor type
    targetWingSpeed = isCursorPointer() ? 0 : 0.8;
    wingSpeed += (targetWingSpeed - wingSpeed) * 0.05;
    
    // Add flutter effect (vertical)
    const flutterY = Math.sin(wingAngle) * 3;
    
    // Add wobble effect (horizontal)
    const wobbleX = Math.cos(wingAngle * 0.7) * 2;
    
    canvas.style.left = (mouseX + wobbleX) + "px";
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

