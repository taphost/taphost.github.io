
const CONFIG = {
  "particles": {
    "count": 60,
    "minSize": 1,
    "maxSize": 2,
    "shape": "circle",
    "angle": 0
  },
  "physics": {
    "gravity": 0,
    "wind": 0,
    "spawnSpeed": 0,
    "turbulence": 3,
    "speed": 0.5
  },
  "behavior": {
    "fadeSpeed": 0.015,
    "fadeMode": "always",
    "rotation": false
  },
  "mouse": {
    "influence": 50,
    "tracking": false
  },
  "colors": {
    "palette": [
      "#23fb64",
      "#00ff4c",
      "#95fe3e",
      "#9ffea1",
      "#7eeca3"
    ],
    "background": "#000000"
  }
};
const PI2 = Math.PI * 2;
const SPAWN_MARGIN = 100;
const SPAWN_WIDTH_MULTIPLIER = 1.2;
const SPAWN_WIDTH_OFFSET = 0.1;
const PHYSICS_DELTA = 0.05;
const MOUSE_INFLUENCE_FACTOR = 0.01;
const BOUNDARY_MARGIN_MULTIPLIER = 4;
const FADE_EXIT_THRESHOLD = 50;
const STATIC_GRAVITY_THRESHOLD = 0.15;
const SHAPE_PROPORTIONS = {
  rectangle: { widthRatio: 0.3, heightRatio: 2 },
  triangle: { heightRatio: 2, baseRatio: 0.5 },
  star: { innerRatio: 0.5, spikes: 5 },
  snowflake: { branchCount: 6, branchPoint: 0.6, sideLength: 0.3, lineWidthRatio: 0.15 }
};
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let mouseX = 0.5, mouseY = 0.5, resizeTimeout;
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resize, 100);
});
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = e.clientY / window.innerHeight;
});
class Particle {
  constructor(firstTime = false) {
    this.reset(firstTime);
  }
  reset(firstTime = false) {
    const { minSize, maxSize } = CONFIG.particles;
    this.shape = CONFIG.particles.shape;
    this.opacity = CONFIG.behavior.fadeMode === 'none' ? 1 : 0;
    this.fadeDirection = 1;
    this.fadeSpeed = CONFIG.behavior.fadeSpeed * (Math.random() * 2 + 1);
    const isStaticMode = Math.abs(CONFIG.physics.gravity) < STATIC_GRAVITY_THRESHOLD;
    this.size = minSize + Math.random() * (maxSize - minSize);
    this.color = CONFIG.colors.palette[Math.floor(Math.random() * CONFIG.colors.palette.length)];
    if (isStaticMode) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * CONFIG.physics.spawnSpeed * 0.5;
      this.vy = (Math.random() - 0.5) * CONFIG.physics.spawnSpeed * 0.5;
    } else {
      if (firstTime) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        this.x = Math.random() * canvas.width * SPAWN_WIDTH_MULTIPLIER - canvas.width * SPAWN_WIDTH_OFFSET;
        this.y = -Math.random() * SPAWN_MARGIN;
      }
      this.vx = (Math.random() - 0.5) * CONFIG.physics.spawnSpeed;
      this.vy = this.size * 0.3 + Math.random() * Math.abs(CONFIG.physics.gravity) * 0.5;
    }
    this.rotation = CONFIG.particles.angle * (Math.PI / 180);
    this.rotationSpeed = (Math.random() - 0.5) * 0.1;
  }
  update() {
    const speedMult = CONFIG.physics.speed;
    const mouseVx = CONFIG.mouse.tracking ? (mouseX * canvas.width - this.x) / canvas.width * CONFIG.mouse.influence : 0;
    this.vx += mouseVx * MOUSE_INFLUENCE_FACTOR * speedMult;
    this.vx += (Math.random() - 0.5) * CONFIG.physics.turbulence * PHYSICS_DELTA;
    this.vx += CONFIG.physics.wind * PHYSICS_DELTA;
    this.vy += CONFIG.physics.gravity * PHYSICS_DELTA * speedMult;
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    if (CONFIG.behavior.rotation) {
      this.rotation += this.rotationSpeed * speedMult;
    }
    if (CONFIG.behavior.fadeMode === 'always') {
      this.opacity += this.fadeSpeed * this.fadeDirection;
      if (this.opacity >= 1) {
        this.opacity = 1;
        this.fadeDirection = -1;
      }
      if (this.opacity <= 0) {
        this.reset();
      }
    } else if (CONFIG.behavior.fadeMode === 'exit') {
      if (this.y > canvas.height - FADE_EXIT_THRESHOLD || this.y < FADE_EXIT_THRESHOLD) {
        this.opacity -= this.fadeSpeed * 2;
      } else if (this.opacity < 1) {
        this.opacity += this.fadeSpeed;
      }
      if (this.opacity <= 0) {
        this.reset();
      }
    }
    if (this.y > canvas.height + SPAWN_MARGIN || this.y < -SPAWN_MARGIN) {
      this.reset();
    }
    const boundaryMargin = this.size * BOUNDARY_MARGIN_MULTIPLIER;
    if (this.x < -boundaryMargin) {
      this.x = canvas.width + boundaryMargin;
    } else if (this.x > canvas.width + boundaryMargin) {
      this.x = -boundaryMargin;
    }
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, PI2);
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
    } else if (this.shape === 'rectangle') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const { widthRatio, heightRatio } = SHAPE_PROPORTIONS.rectangle;
      ctx.fillRect(-this.size * widthRatio, -this.size * heightRatio, this.size * widthRatio * 2, this.size * heightRatio * 2);
    } else if (this.shape === 'triangle') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const { heightRatio, baseRatio } = SHAPE_PROPORTIONS.triangle;
      ctx.beginPath();
      ctx.moveTo(0, -this.size * heightRatio);
      ctx.lineTo(-this.size * baseRatio, this.size);
      ctx.lineTo(this.size * baseRatio, this.size);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'star') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const { spikes, innerRatio } = SHAPE_PROPORTIONS.star;
      const outer = this.size, inner = this.size * innerRatio;
      let rot = Math.PI / 2 * 3, step = Math.PI / spikes;
      ctx.beginPath();
      ctx.moveTo(0, -outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'snowflake') {
      ctx.translate(this.x, this.y);
      if (CONFIG.behavior.rotation) ctx.rotate(this.rotation);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = this.size * SHAPE_PROPORTIONS.snowflake.lineWidthRatio;
      ctx.lineCap = 'round';
      const { branchCount, branchPoint, sideLength } = SHAPE_PROPORTIONS.snowflake;
      ctx.beginPath();
      for (let i = 0; i < branchCount; i++) {
        const angle = (Math.PI / 3) * i;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.moveTo(0, 0);
        ctx.lineTo(-sin * this.size, -cos * this.size);
        const branchY = -cos * this.size * branchPoint;
        const branchX = -sin * this.size * branchPoint;
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(branchX - sin * this.size * sideLength - cos * this.size * (1 - branchPoint), branchY - cos * this.size * sideLength + sin * this.size * (1 - branchPoint));
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(branchX + sin * this.size * sideLength - cos * this.size * (1 - branchPoint), branchY + cos * this.size * sideLength + sin * this.size * (1 - branchPoint));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
const particles = Array.from({ length: CONFIG.particles.count }, () => new Particle(true));
function animate() {
  ctx.fillStyle = CONFIG.colors.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animate);
}
animate();
