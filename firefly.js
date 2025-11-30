// Firefly cursor configuration
const canvas = document.getElementById('firefly');
const ctx = canvas.getContext('2d');
let mouseX = 0;
let mouseY = 0;
let wingAngle = 0;
let sparkleAngle = 0;

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Main drawing function
function drawFirefly() {
    ctx.clearRect(0, 0, 50, 50);
    
    const centerX = 25;
    const centerY = 25;
    
    // Draw body first
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2d5016';
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
    
    // Left wing
    ctx.save();
    ctx.translate(centerX - 3, centerY);
    ctx.rotate(leftWingAngle);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff9d';
    ctx.fillStyle = 'rgba(0, 255, 157, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Right wing
    ctx.save();
    ctx.translate(centerX + 3, centerY);
    ctx.rotate(rightWingAngle);
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff9d';
    ctx.fillStyle = 'rgba(0, 255, 157, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Pulsing central glow
    const glowIntensity = 0.8 + Math.sin(Date.now() * 0.01) * 0.2;
    ctx.fillStyle = `rgba(0, 255, 157, ${glowIntensity})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff9d';
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
    ctx.shadowColor = '#00ff9d';
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

// Animation loop
function animate() {
    canvas.style.left = (mouseX - 25) + 'px';
    canvas.style.top = (mouseY - 25) + 'px';
    drawFirefly();
    requestAnimationFrame(animate);
}

// Start animation
animate();

