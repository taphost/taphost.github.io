(() => {
// Input and canvas setup
const Input = {
  mouse: { x: 0, y: 0 }
};

let pendingMouseUpdate = false;
let lastMouseX = 0;
let lastMouseY = 0;
const handleMouseMove = (e) => {
  lastMouseX = e.pageX;
  lastMouseY = e.pageY;
  if (pendingMouseUpdate) return;
  pendingMouseUpdate = true;
  requestAnimationFrame(() => {
    // Use page coordinates so drawing stays aligned when the page scrolls
    Input.mouse.x = lastMouseX;
    Input.mouse.y = lastMouseY;
    pendingMouseUpdate = false;
  });
};
document.addEventListener("mousemove", handleMouseMove);

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
Object.assign(canvas.style, {
  position: "absolute", // scrolls with the page
  left: "0",
  top: "0",
  backgroundColor: "transparent",
  pointerEvents: "none",
  zIndex: "1",
  width: "100%"
});
// Allow vertical scroll while preventing horizontal overflow
document.body.style.overflowX = "hidden";
document.body.style.overflowY = "auto";

const ctx = canvas.getContext("2d");
const primaryColor = (getComputedStyle(document.documentElement).getPropertyValue("--primary-color") || "#00ff9d").trim();
ctx.strokeStyle = primaryColor || "#00ff9d";
ctx.lineWidth = 1;

// Random lookup table to avoid repeated Math.random calls
const RAND_LEN = 256;
const RAND_TABLE = Array.from({ length: RAND_LEN }, () => Math.random());
let randIndex = 0;
const nextRandom = () => {
  const v = RAND_TABLE[randIndex];
  randIndex = (randIndex + 1) % RAND_LEN;
  return v;
};

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let resizeTimeout;
let rafId = null;
const resizeCanvas = () => {
  const dpr = window.devicePixelRatio || 1;
  viewportWidth = window.innerWidth;
  viewportHeight = document.documentElement.scrollHeight;
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  canvas.width = viewportWidth * dpr;
  canvas.height = viewportHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = primaryColor || "#00ff9d";
  ctx.lineWidth = 1.5 / dpr;
};
resizeCanvas();
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 100);
};
window.addEventListener('resize', handleResize);

// Math utilities
const MathUtils = {
  // Normalize angle to [-PI, PI]
  normalizeAngle(angle) {
    return angle - Math.PI * 2 * Math.floor(angle / Math.PI / 2 + 0.5);
  },
  
  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },
  
  angleTo(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  }
};

// Configuration
const DEFAULTS = {
  range: Math.PI * 2 / 3,
  stiffness: 1.1,
  sideLength: 3,
  sideAngle: 1,
  sideRange: 0.1,
  sideStiffness: 2,
  tipCount: 3,
  tipLength: 0.1,
  tipAngle: 0.1,
  tipRange: 0.1,
  tipStiffness: 2
};

const CONFIG = {
  creatureScale: 1,
  legCount: 3,
  tailSegments: 12, // fewer tail segments to reduce draw cost
  headRadius: 8,
  tickMs: 50, // lower update rate to ease CPU/GPU load
  behavior: {
    chaseRadius: 220,       // start chasing mouse when closer than this
    loseRadius: 380,        // stop chasing when farther than this
    wanderChangeThreshold: 24, // pick a new wander point when close
    wanderMargin: 80        // keep wander targets away from the edges
  },
  
  creature: {
    forwardAccel: 20, // doubled for higher translation speed
    forwardFriction: 2,
    forwardResistance: 0.5,
    forwardThreshold: 16,
    rotationAccel: 1, // doubled turning acceleration
    rotationFriction: 0.085,
    rotationResistance: 0.5,
    rotationThreshold: 0.3
  },
  
  neck: {
    count: 3,
    segmentLength: 4,
    ...DEFAULTS
  },
  
  torso: {
    gapSegments: 6,
    segmentLength: 4,
    range: Math.PI / 2,
    stiffness: 1.5,
    sideLength: 3,
    sideAngle: Math.PI / 2,
    sideRange: 0.1,
    sideStiffness: 1.5,
    branchCount: 3,
    branchLength: 3,
    branchAngle: 0.3,
    branchRange: 0.1,
    branchStiffness: 2
  },
  
  leg: {
    baseLength: 12,
    baseAngle: Math.PI / 4,
    baseRange: 0,
    baseStiffness: 8,
    midLength: 16,
    midAngle: Math.PI / 4,
    midRange: Math.PI * 2,
    midStiffness: 1,
    endLength: 16,
    endAngle: Math.PI / 2,
    endRange: Math.PI,
    endStiffness: 2,
    toeLength: 4,
    toeCount: 4,
    toeRange: 0.1,
    toeStiffness: 4,
    toeSpread: Math.PI / 2,
    chainLength: 3,
    reachSpeedFactor: 24, // double to keep feet in sync with faster body
    reachFactor: 0.9,
    stepThreshold: 1,
    settleThreshold: 1
  },
  
  tail: {
    segmentLength: 4,
    ...DEFAULTS,
    tipLengthFactor: 3
  }
};

// Segment - forward kinematics chain
class Segment {
  constructor(parent, length, relativeAngle, angleRange, stiffness) {
    this.isSegment = true;
    this.parent = parent;
    this.children = [];
    
    if (parent.children) {
      parent.children.push(this);
    }
    
    this.length = length;
    this.relativeAngle = relativeAngle;
    this.defaultAngle = relativeAngle;
    this.absoluteAngle = parent.absoluteAngle + relativeAngle;
    this.angleRange = angleRange;
    this.stiffness = stiffness;
    
    this.updatePosition(false, true);
  }

  updatePosition(recursive = false, applyFlex = true) {
    // Normalize angle
    this.relativeAngle = MathUtils.normalizeAngle(this.relativeAngle);
    
    // Apply stiffness constraint
    if (applyFlex) {
      const deviation = (this.relativeAngle - this.defaultAngle) / this.stiffness;
      this.relativeAngle = Math.max(
        this.defaultAngle - this.angleRange / 2,
        Math.min(
          this.defaultAngle + this.angleRange / 2,
          this.defaultAngle + deviation
        )
      );
    }
    
    // Update absolute position
    this.absoluteAngle = this.parent.absoluteAngle + this.relativeAngle;
    this.x = this.parent.x + Math.cos(this.absoluteAngle) * this.length;
    this.y = this.parent.y + Math.sin(this.absoluteAngle) * this.length;
    
    if (recursive) {
      this.children.forEach(child => child.updatePosition(true, applyFlex));
    }
  }

  draw(recursive = false) {
    ctx.moveTo(this.parent.x, this.parent.y);
    ctx.lineTo(this.x, this.y);
    
    if (recursive) {
      this.children.forEach(child => child.draw(true));
    }
  }

  // Pull segment toward parent (FABRIK backward pass)
  pullToParent(recursive = false) {
    const distance = MathUtils.distance(this.x, this.y, this.parent.x, this.parent.y);
    
    if (distance > 0) {
      this.x = this.parent.x + this.length * (this.x - this.parent.x) / distance;
      this.y = this.parent.y + this.length * (this.y - this.parent.y) / distance;
    }
    
    this.absoluteAngle = MathUtils.angleTo(this.parent.x, this.parent.y, this.x, this.y);
    this.relativeAngle = this.absoluteAngle - this.parent.absoluteAngle;
    this.updatePosition(false, true);
    
    if (recursive) {
      this.children.forEach(child => child.pullToParent(true));
    }
  }
}

// Limb system - base IK
class LimbSystem {
  constructor(endEffector, chainLength, reachSpeed, creature) {
    this.endEffector = endEffector;
    this.creature = creature;
    this.reachSpeed = reachSpeed;
    creature.systems.push(this);
    
    // Build chain from end to root
    this.chain = [];
    let currentNode = endEffector;
    
    for (let i = 0; i < chainLength; i++) {
      this.chain.unshift(currentNode);
      currentNode = currentNode.parent;
      
      if (!currentNode.isSegment) {
        break;
      }
    }
    
    this.rootJoint = this.chain[0].parent;
  }

  // FABRIK Algorithm: Forward And Backward Reaching Inverse Kinematics
  moveToTarget(targetX, targetY) {
    this.chain[0].updatePosition(true, true);
    
    const distance = MathUtils.distance(targetX, targetY, this.endEffector.x, this.endEffector.y);
    let remainingDistance = Math.max(0, distance - this.reachSpeed);
    
    // Backward pass: pull from end to start
    let currentX = targetX;
    let currentY = targetY;
    
    for (let i = this.chain.length - 1; i >= 0; i--) {
      let node = this.chain[i];
      let angle = MathUtils.angleTo(currentX, currentY, node.x, node.y);
      
      node.x = currentX + remainingDistance * Math.cos(angle);
      node.y = currentY + remainingDistance * Math.sin(angle);
      
      currentX = node.x;
      currentY = node.y;
      remainingDistance = node.length;
    }
    
    // Forward pass: update angles and side chains
    for (let i = 0; i < this.chain.length; i++) {
      let node = this.chain[i];
      node.absoluteAngle = MathUtils.angleTo(node.parent.x, node.parent.y, node.x, node.y);
      node.relativeAngle = node.absoluteAngle - node.parent.absoluteAngle;
      
      // Update non-chain children
      node.children.forEach(child => {
        if (!this.chain.includes(child)) {
          child.updatePosition(true, false);
        }
      });
    }
  }

  update() {
    this.moveToTarget(Input.mouse.x, Input.mouse.y);
  }
}

// Leg system - walking/step cycle
class LegSystem extends LimbSystem {
  constructor(endEffector, chainLength, reachSpeed, creature) {
    super(endEffector, chainLength, reachSpeed, creature);
    
    this.goalX = endEffector.x;
    this.goalY = endEffector.y;
    this.stepPhase = 0; // 0: planted, 1: stepping
    this.forwardProgress = 0;
    this.creature.plantedLegs += 1;

    // Calculate natural reach distance
    const hipToFoot = MathUtils.distance(
      this.endEffector.x, this.endEffector.y,
      this.rootJoint.x, this.rootJoint.y
    );
    this.maxReach = CONFIG.leg.reachFactor * hipToFoot;
    
    // Calculate swing direction relative to body
    const footAngle = MathUtils.angleTo(
      this.rootJoint.x, this.rootJoint.y,
      this.endEffector.x, this.endEffector.y
    );
    let swingAngle = this.creature.absoluteAngle - footAngle;
    swingAngle = MathUtils.normalizeAngle(swingAngle);
    this.swingDirection = -swingAngle + (swingAngle < 0 ? 1 : -1) * Math.PI / 2;
    this.swingOffset = this.creature.absoluteAngle - this.rootJoint.absoluteAngle;
  }

  update() {
    this.moveToTarget(this.goalX, this.goalY);
    
    if (this.stepPhase === 0) {
      // Check if foot needs to step
      const footDistance = MathUtils.distance(
        this.endEffector.x, this.endEffector.y,
        this.goalX, this.goalY
      );
      
      if (footDistance > CONFIG.leg.stepThreshold) {
        this.stepPhase = 1;
        this.creature.plantedLegs = Math.max(0, this.creature.plantedLegs - 1);
        
        // Calculate new step target with randomization
        const targetAngle = this.swingDirection + this.rootJoint.absoluteAngle + this.swingOffset;
        const randomOffset = (nextRandom() - 0.5) * this.maxReach;
        
        this.goalX = this.rootJoint.x + this.maxReach * Math.cos(targetAngle) + randomOffset;
        this.goalY = this.rootJoint.y + this.maxReach * Math.sin(targetAngle) + randomOffset;
      }
    } else if (this.stepPhase === 1) {
      // Check if foot has settled
      const footDx = this.endEffector.x - this.rootJoint.x;
      const footDy = this.endEffector.y - this.rootJoint.y;
      const footDistance = Math.hypot(footDx, footDy);
      const footAngle = Math.atan2(footDy, footDx);
      const newProgress = footDistance * Math.cos(footAngle - this.rootJoint.absoluteAngle);
      const progressChange = this.forwardProgress - newProgress;
      this.forwardProgress = newProgress;
      
      if (progressChange * progressChange < CONFIG.leg.settleThreshold) {
        this.stepPhase = 0;
        this.creature.plantedLegs += 1;
        this.goalX = this.endEffector.x;
        this.goalY = this.endEffector.y;
      }
    }
  }
}

// Creature - main controller
class Creature {
  constructor(x, y, angle, config) {
    this.x = x;
    this.y = y;
    this.absoluteAngle = angle;
    this.plantedLegs = 0;
    
    this.forwardSpeed = 0;
    this.forwardAccel = config.forwardAccel;
    this.forwardFriction = config.forwardFriction;
    this.forwardResistance = config.forwardResistance;
    this.forwardThreshold = config.forwardThreshold;
    
    this.rotationSpeed = 0;
    this.rotationAccel = config.rotationAccel;
    this.rotationFriction = config.rotationFriction;
    this.rotationResistance = config.rotationResistance;
    this.rotationThreshold = config.rotationThreshold;
    
    this.children = [];
    this.systems = [];
  }

  followTarget(targetX, targetY) {
    const distance = MathUtils.distance(this.x, this.y, targetX, targetY);
    const targetAngle = MathUtils.angleTo(this.x, this.y, targetX, targetY);
    
    // Forward motion: only accelerate when legs are planted
    let acceleration = this.forwardAccel;
    if (this.systems.length > 0 && this.plantedLegs > 0) {
      acceleration *= this.plantedLegs / this.systems.length;
    } else if (this.systems.length > 0) {
      acceleration = 0;
    }
    
    this.forwardSpeed += acceleration * (distance > this.forwardThreshold);
    this.forwardSpeed *= 1 - this.forwardResistance;
    this.forwardSpeed = Math.max(0, this.forwardSpeed - this.forwardFriction);
    
    // Rotation: turn toward target
    let angleDelta = this.absoluteAngle - targetAngle;
    angleDelta = MathUtils.normalizeAngle(angleDelta);
    
    if (Math.abs(angleDelta) > this.rotationThreshold && distance > this.forwardThreshold) {
      this.rotationSpeed -= this.rotationAccel * Math.sign(angleDelta);
    }
    
    this.rotationSpeed *= 1 - this.rotationResistance;
    if (Math.abs(this.rotationSpeed) > this.rotationFriction) {
      this.rotationSpeed -= this.rotationFriction * Math.sign(this.rotationSpeed);
    } else {
      this.rotationSpeed = 0;
    }

    // Apply movement
    this.absoluteAngle += this.rotationSpeed;
    this.absoluteAngle = MathUtils.normalizeAngle(this.absoluteAngle);
    const cosAngle = Math.cos(this.absoluteAngle);
    const sinAngle = Math.sin(this.absoluteAngle);
    this.x += this.forwardSpeed * cosAngle;
    this.y += this.forwardSpeed * sinAngle;
    
    // Update body segments (facing backward during update)
    this.absoluteAngle += Math.PI;
    this.children.forEach(child => child.pullToParent(true));
    this.systems.forEach(sys => sys.update());
    this.absoluteAngle -= Math.PI;
    
    this.draw(true);
  }

  draw(recursive = false) {
    const r = CONFIG.headRadius;
    const startAngle = Math.PI / 4 + this.absoluteAngle;
    const endAngle = 7 * Math.PI / 4 + this.absoluteAngle;
    const cosStart = Math.cos(startAngle);
    const sinStart = Math.sin(startAngle);
    const cosEnd = Math.cos(endAngle);
    const sinEnd = Math.sin(endAngle);
    const cosAbs = Math.cos(this.absoluteAngle);
    const sinAbs = Math.sin(this.absoluteAngle);
    
    ctx.arc(this.x, this.y, r, startAngle, endAngle);
    ctx.moveTo(
      this.x + r * cosEnd,
      this.y + r * sinEnd
    );
    ctx.lineTo(
      this.x + r * cosAbs * Math.SQRT2,
      this.y + r * sinAbs * Math.SQRT2
    );
    ctx.lineTo(
      this.x + r * cosStart,
      this.y + r * sinStart
    );
    
    if (recursive) {
      this.children.forEach(child => child.draw(true));
    }
  }
}

// Appendage builders
function createBranches(parent, scale, config, direction) {
  let node = new Segment(
    parent,
    scale * config.sideLength,
    direction * config.sideAngle,
    config.sideRange,
    config.sideStiffness
  );
  
  for (let i = 0; i < config.tipCount; i++) {
    node = new Segment(
      node,
      scale * config.tipLength,
      -direction * config.tipAngle,
      config.tipRange,
      config.tipStiffness
    );
  }
}

function createSegmentWithBranches(parent, scale, config, branchConfig = null) {
  const segment = new Segment(
    parent,
    scale * config.segmentLength,
    0,
    config.range,
    config.stiffness
  );
  
  if (branchConfig) {
    [-1, 1].forEach(dir => createBranches(segment, scale, branchConfig, dir));
  }
  
  return segment;
}

function createTorsoBranches(parent, scale, config, direction) {
  let node = new Segment(
    parent,
    scale * config.sideLength,
    direction * config.sideAngle,
    config.sideRange,
    config.sideStiffness
  );
  
  for (let i = 0; i < config.branchCount; i++) {
    node = new Segment(
      node,
      scale * config.branchLength,
      -direction * config.branchAngle,
      config.branchRange,
      config.branchStiffness
    );
  }
}

// Creature assembly
function assembleLizard(scale, legCount, tailSegmentCount) {
  const margin = CONFIG.behavior.wanderMargin;
  const spawnX = viewportWidth - margin - nextRandom() * Math.max(100, viewportWidth * 0.2);
  const spawnY = margin + nextRandom() * Math.max(100, viewportHeight * 0.2);
  const creature = new Creature(
    spawnX,
    spawnY,
    0,
    {
      forwardAccel: scale * CONFIG.creature.forwardAccel,
      forwardFriction: scale * CONFIG.creature.forwardFriction,
      forwardResistance: CONFIG.creature.forwardResistance,
      forwardThreshold: CONFIG.creature.forwardThreshold,
      rotationAccel: CONFIG.creature.rotationAccel,
      rotationFriction: CONFIG.creature.rotationFriction,
      rotationResistance: CONFIG.creature.rotationResistance,
      rotationThreshold: CONFIG.creature.rotationThreshold
    }
  );
  
  let spine = creature;
  const behavior = {
    mode: "wander",
    wanderTarget: null
  };
  const pickWanderTarget = () => {
    const margin = CONFIG.behavior.wanderMargin;
    const safeWidth = Math.max(100, viewportWidth - margin * 2);
    const safeHeight = Math.max(100, viewportHeight - margin * 2);
    return {
      x: margin + nextRandom() * safeWidth,
      y: margin + nextRandom() * safeHeight
    };
  };
  behavior.wanderTarget = pickWanderTarget();
  
  // Build neck
  for (let i = 0; i < CONFIG.neck.count; i++) {
    spine = createSegmentWithBranches(spine, scale, CONFIG.neck, CONFIG.neck);
  }
  
  // Build torso with legs
  for (let i = 0; i < legCount; i++) {
    // Add gap segments between legs
    if (i > 0) {
      for (let j = 0; j < CONFIG.torso.gapSegments; j++) {
        spine = new Segment(
          spine,
          scale * CONFIG.torso.segmentLength,
          0,
          CONFIG.torso.range,
          CONFIG.torso.stiffness
        );
        [-1, 1].forEach(dir => createTorsoBranches(spine, scale, CONFIG.torso, dir));
      }
    }
    
    // Attach legs
    [-1, 1].forEach(direction => {
      let legSegment = new Segment(
        spine,
        scale * CONFIG.leg.baseLength,
        direction * CONFIG.leg.baseAngle,
        CONFIG.leg.baseRange,
        CONFIG.leg.baseStiffness
      );
      
      legSegment = new Segment(
        legSegment,
        scale * CONFIG.leg.midLength,
        -direction * CONFIG.leg.midAngle,
        CONFIG.leg.midRange,
        CONFIG.leg.midStiffness
      );
      
      legSegment = new Segment(
        legSegment,
        scale * CONFIG.leg.endLength,
        direction * CONFIG.leg.endAngle,
        CONFIG.leg.endRange,
        CONFIG.leg.endStiffness
      );
      
      // Add toes
      for (let t = 0; t < CONFIG.leg.toeCount; t++) {
        const toeAngle = (t / (CONFIG.leg.toeCount - 1) - 0.5) * CONFIG.leg.toeSpread;
        new Segment(
          legSegment,
          scale * CONFIG.leg.toeLength,
          toeAngle,
          CONFIG.leg.toeRange,
          CONFIG.leg.toeStiffness
        );
      }
      
      new LegSystem(legSegment, CONFIG.leg.chainLength, scale * CONFIG.leg.reachSpeedFactor, creature);
    });
  }
  
  // Build tail
  for (let i = 0; i < tailSegmentCount; i++) {
    spine = new Segment(
      spine,
      scale * CONFIG.tail.segmentLength,
      0,
      CONFIG.tail.range,
      CONFIG.tail.stiffness
    );
    
    [-1, 1].forEach(direction => {
      let tailBranch = new Segment(
        spine,
        scale * CONFIG.tail.sideLength,
        direction * CONFIG.tail.sideAngle,
        CONFIG.tail.sideRange,
        CONFIG.tail.sideStiffness
      );
      
      for (let j = 0; j < CONFIG.tail.tipCount; j++) {
        const taperedLength = scale * CONFIG.tail.tipLengthFactor * (tailSegmentCount - i) / tailSegmentCount;
        tailBranch = new Segment(
          tailBranch,
          taperedLength,
          -direction * CONFIG.tail.tipAngle,
          CONFIG.tail.tipRange,
          CONFIG.tail.tipStiffness
        );
      }
    });
  }
  
  // Start animation loop with fixed timestep (CONFIG.tickMs)
  let accumulator = 0;
  let lastTime = performance.now();
  const step = CONFIG.tickMs;

  const loop = (now) => {
    if (document.hidden) {
      lastTime = now;
      requestAnimationFrame(loop);
      return;
    }

    accumulator += now - lastTime;
    lastTime = now;
    accumulator = Math.min(accumulator, step * 4);

    while (accumulator >= step) {
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      const mouseDistance = MathUtils.distance(creature.x, creature.y, Input.mouse.x, Input.mouse.y);
      if (behavior.mode === "wander" && mouseDistance < CONFIG.behavior.chaseRadius) {
        behavior.mode = "chase";
      } else if (behavior.mode === "chase" && mouseDistance > CONFIG.behavior.loseRadius) {
        behavior.mode = "wander";
        behavior.wanderTarget = pickWanderTarget();
      }

      let targetX;
      let targetY;
      if (behavior.mode === "wander") {
        const wanderDistance = MathUtils.distance(creature.x, creature.y, behavior.wanderTarget.x, behavior.wanderTarget.y);
        if (wanderDistance < CONFIG.behavior.wanderChangeThreshold) {
          behavior.wanderTarget = pickWanderTarget();
        }
        targetX = behavior.wanderTarget.x;
        targetY = behavior.wanderTarget.y;
      } else {
        targetX = Input.mouse.x;
        targetY = Input.mouse.y;
      }

      // Skip drawing if completely outside the viewport to save work
      const margin = CONFIG.behavior.wanderMargin;
      if (
        creature.x > -margin &&
        creature.x < viewportWidth + margin &&
        creature.y > -margin &&
        creature.y < viewportHeight + margin
      ) {
        ctx.shadowColor = 'rgba(0, 255, 157, 0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        creature.followTarget(targetX, targetY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        creature.followTarget(targetX, targetY);
      }
      accumulator -= step;
    }

    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

// Initialize
assembleLizard(CONFIG.creatureScale, CONFIG.legCount, CONFIG.tailSegments);
const cleanup = () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('resize', handleResize);
  document.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener('beforeunload', cleanup);
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  delete window.destroyCreatureOverlay;
};

window.destroyCreatureOverlay = cleanup;
window.addEventListener('beforeunload', cleanup);
})();
