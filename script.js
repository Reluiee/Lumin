/* =========================
   CANVAS
========================= */

const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* =========================
   SETTINGS
========================= */

const settings = {
  particleCount: 140,
  particleSize: 5,
  particleSpeed: 1,
  particleColor: '#c4efff',
  particleForce: 10,
  showConnections: false,
  connectionDistance: 110,
};

let particlesArray = [];

/* =========================
   POINTER / TOUCH
========================= */

// Responsive Interaktionsradius
function getInteractionRadius() {
  return Math.min(160, Math.max(75, window.innerWidth * 0.15));
}

const mouse = {
  x: null,
  y: null,
  radius: getInteractionRadius(),
};

let activeTouchId = null;

function updatePointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
}

function resetPointer() {
  mouse.x = null;
  mouse.y = null;
}

// Maus und Stift bewegen
window.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') {
    if (event.pointerId !== activeTouchId) return;
  } else if (activeTouchId !== null) {
    return;
  }

  updatePointerPosition(event);
});

// Finger aufsetzen
window.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  if (activeTouchId !== null) return;

  activeTouchId = event.pointerId;
  updatePointerPosition(event);
});

// Finger loslassen
window.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch') return;
  if (event.pointerId !== activeTouchId) return;

  activeTouchId = null;
  resetPointer();
});

// Touch wurde abgebrochen, z. B. beim Scrollen
window.addEventListener('pointercancel', (event) => {
  if (event.pointerId !== activeTouchId) return;

  activeTouchId = null;
  resetPointer();
});

// Maus verlässt das Fenster
document.addEventListener('pointerout', (event) => {
  if (event.pointerType === 'touch') return;

  if (!event.relatedTarget) {
    resetPointer();
  }
});

// Fenster verliert Fokus
window.addEventListener('blur', () => {
  activeTouchId = null;
  resetPointer();
});

/* =========================
   PARTICLE CLASS
========================= */

class Particle {
  constructor() {
    // Individueller Größenfaktor
    this.sizeFactor = Math.random();
    this.size = this.calculateSize();

    // Zufällige Position
    this.x =
      Math.random() * Math.max(0, canvas.width - this.size * 2) + this.size;

    this.y =
      Math.random() * Math.max(0, canvas.height - this.size * 2) + this.size;

    // Grundbewegung
    this.baseDirectionX = Math.random() * 2 - 1;
    this.baseDirectionY = Math.random() * 2 - 1;

    this.directionX = this.baseDirectionX;
    this.directionY = this.baseDirectionY;

    // Farbe des aktuellen Themes
    this.color = settings.particleColor;
  }

  calculateSize() {
    return 1 + this.sizeFactor * settings.particleSize;
  }

  // Größe ändern, ohne Partikel neu zu erzeugen
  updateSize() {
    this.size = this.calculateSize();
    this.keepInsideCanvas();
  }

  // Partikel innerhalb des Canvas halten
  keepInsideCanvas() {
    const maxX = Math.max(this.size, canvas.width - this.size);
    const maxY = Math.max(this.size, canvas.height - this.size);

    this.x = Math.max(this.size, Math.min(this.x, maxX));

    this.y = Math.max(this.size, Math.min(this.y, maxY));
  }

  draw() {
    ctx.beginPath();

    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

    // Glow-Effekt
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  update() {
    // Kollision mit Canvas-Rand
    if (this.x >= canvas.width - this.size) {
      this.x = canvas.width - this.size;
      this.baseDirectionX = -Math.abs(this.baseDirectionX);
    }

    if (this.x <= this.size) {
      this.x = this.size;
      this.baseDirectionX = Math.abs(this.baseDirectionX);
    }

    if (this.y >= canvas.height - this.size) {
      this.y = canvas.height - this.size;
      this.baseDirectionY = -Math.abs(this.baseDirectionY);
    }

    if (this.y <= this.size) {
      this.y = this.size;
      this.baseDirectionY = Math.abs(this.baseDirectionY);
    }

    // Maus- und Touch-Abstoßung
    let forceX = 0;
    let forceY = 0;

    if (mouse.x !== null && mouse.y !== null) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const radius = mouse.radius + this.size;

      if (distance < radius && distance > 0) {
        const angle = Math.atan2(dy, dx);
        const force = (radius - distance) / radius;

        forceX = Math.cos(angle) * force * settings.particleForce;
         forceY = Math.sin(angle) * force * settings.particleForce;
      }
    }

    // Grundbewegung - Abstoßung
    this.directionX = this.baseDirectionX - forceX;
    this.directionY = this.baseDirectionY - forceY;

    // Geschwindigkeit berücksichtigen
    this.x += this.directionX * settings.particleSpeed;
    this.y += this.directionY * settings.particleSpeed;

    this.draw();
  }
}

/* =========================
   PARTICLE MANAGEMENT
========================= */

function updateParticleCount() {
  const currentCount = particlesArray.length;
  const targetCount = settings.particleCount;

  if (targetCount > currentCount) {
    // Fehlende Partikel hinzufügen
    for (let i = currentCount; i < targetCount; i++) {
      particlesArray.push(new Particle());
    }
  } else if (targetCount < currentCount) {
    // Überschüssige Partikel entfernen
    particlesArray.length = targetCount;
  }
}

function updateParticleSizes() {
  particlesArray.forEach((particle) => {
    particle.updateSize();
  });
}

function init() {
  particlesArray = [];
  updateParticleCount();
}

/* =========================
   Lines
========================= */

function drawConnections() {
  if (!settings.showConnections) return;

  const maxDistance = settings.connectionDistance;
  const maxDistanceSquared = maxDistance * maxDistance;

  ctx.save();

  ctx.strokeStyle = settings.particleColor;
  ctx.lineWidth = 0.8;
  ctx.shadowBlur = 0;

  for (let i = 0; i < particlesArray.length; i++) {
    const particleA = particlesArray[i];

    for (let j = i + 1; j < particlesArray.length; j++) {
      const particleB = particlesArray[j];

      const dx = particleA.x - particleB.x;
      const dy = particleA.y - particleB.y;

      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > maxDistanceSquared) continue;

      const distance = Math.sqrt(distanceSquared);

      // Je näher die Partikel, desto sichtbarer die Linie
      const opacity = (1 - distance / maxDistance) * 0.45;

      ctx.globalAlpha = opacity;

      ctx.beginPath();
      ctx.moveTo(particleA.x, particleA.y);
      ctx.lineTo(particleB.x, particleB.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* =========================
   ANIMATION
========================= */

function animate() {
  requestAnimationFrame(animate);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Positionen aktualisieren und Partikel zeichnen
  particlesArray.forEach((particle) => {
    particle.update();
  });

  // Verbindungslinien zeichnen
  drawConnections();
}

/* =========================
   RESIZE
========================= */

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Interaktionsradius aktualisieren
  mouse.radius = getInteractionRadius();

  // Partikel innerhalb der neuen Grenzen halten
  particlesArray.forEach((particle) => {
    particle.keepInsideCanvas();
  });
});

/* =========================
   MENU
========================= */

const menuToggle = document.getElementById('menu-toggle');
const settingsMenu = document.getElementById('settings-menu');

menuToggle.addEventListener('click', () => {
  const isOpen = !settingsMenu.hidden;

  settingsMenu.hidden = isOpen;
  menuToggle.classList.toggle('active', !isOpen);

  menuToggle.setAttribute('aria-expanded', String(!isOpen));

  menuToggle.setAttribute(
    'aria-label',
    isOpen ? 'Open settings' : 'Close settings',
  );
});

/* =========================
   SLIDERS
========================= */

// Partikelanzahl
const countSlider = document.getElementById('particle-count');
const countValue = document.getElementById('particle-count-value');

countSlider.addEventListener('input', (event) => {
  settings.particleCount = Number(event.target.value);

  countValue.textContent = settings.particleCount;

  updateParticleCount();
});

// Partikelgröße
const sizeSlider = document.getElementById('particle-size');
const sizeValue = document.getElementById('particle-size-value');

sizeSlider.addEventListener('input', (event) => {
  settings.particleSize = Number(event.target.value);

  sizeValue.textContent = settings.particleSize;

  updateParticleSizes();
});

// Geschwindigkeit
const speedSlider = document.getElementById('particle-speed');
const speedValue = document.getElementById('particle-speed-value');

speedSlider.addEventListener('input', (event) => {
  settings.particleSpeed = Number(event.target.value);

  speedValue.textContent = settings.particleSpeed;
});



const forceSlider = document.getElementById('particle-force');
const forceValue = document.getElementById('particle-force-value');

forceSlider.addEventListener('input', (event) => {
  console.log('Force:', event.target.value);

  settings.particleForce = Number(event.target.value);
  forceValue.textContent = settings.particleForce;
});



//Lines
const connectionsToggle = document.getElementById('particle-connections');

connectionsToggle.addEventListener('change', (event) => {
  settings.showConnections = event.target.checked;
});

/* =========================
   BACKGROUND THEMES
========================= */

const backgroundThemes = {
  // MOODY

  'deep-ocean': {
    colors: ['#80adbf', '#0f1b26'],
    textColor: '#f1eaf2',
    menuBackground: 'rgba(15, 27, 38, 0.45)',
    particleColor: '#c4efff',
  },

  'black-cherry': {
    colors: ['#a56c88', '#220f22'],
    textColor: '#f8e7ef',
    menuBackground: 'rgba(34, 15, 34, 0.45)',
    particleColor: '#ffd0e5',
  },

  // PASTELL

  'cotton-candy': {
    colors: ['#eeaeca', '#94bbe9'],
    textColor: '#51445b',
    menuBackground: 'rgba(255, 255, 255, 0.25)',
    particleColor: '#fff0fa',
  },

  lavender: {
    colors: ['#c7b6e5', '#9dcacb'],
    textColor: '#403b59',
    menuBackground: 'rgba(255, 255, 255, 0.25)',
    particleColor: '#f4edff',
  },

  // FUN

  'cyber-cyan': {
    colors: ['#00e5ff', '#241044'],
    textColor: '#f5efff',
    menuBackground: 'rgba(22, 13, 55, 0.55)',
    particleColor: '#c9faff',
  },

  'cyber-lime': {
    colors: ['#b6dc65', '#244d54'],
    textColor: '#eaffd2',
    menuBackground: 'rgba(20, 50, 52, 0.55)',
    particleColor: '#dfff8a',
  },
};

/* =========================
   THEME SWITCHING
========================= */

const backgroundOptions = document.querySelectorAll('.background-option');

function setBackgroundTheme(themeName) {
  const theme = backgroundThemes[themeName];

  if (!theme) return;

  const [color1, color2] = theme.colors;

  // Hintergrund ändern
  document.body.style.background = `
    radial-gradient(
      circle,
      ${color1} 0%,
      ${color2} 100%
    )
  `;

  // Textfarbe ändern
  document.documentElement.style.setProperty('--text-color', theme.textColor);

  // Menü-Hintergrund ändern
  document.documentElement.style.setProperty(
    '--menu-background',
    theme.menuBackground,
  );

  // Partikelfarbe ändern
  settings.particleColor = theme.particleColor;

  // Bestehende Partikel aktualisieren
  particlesArray.forEach((particle) => {
    particle.color = theme.particleColor;
  });

  // Aktive Farbauswahl markieren
  backgroundOptions.forEach((option) => {
    const isActive = option.dataset.theme === themeName;

    option.classList.toggle('active', isActive);

    option.setAttribute('aria-pressed', String(isActive));
  });
}

// Klick-Events für Themes
backgroundOptions.forEach((button) => {
  button.addEventListener('click', () => {
    setBackgroundTheme(button.dataset.theme);
  });
});

/* =========================
   START
========================= */

// Deep Ocean als Standard-Theme
setBackgroundTheme('deep-ocean');

// Partikel erzeugen und Animation starten
init();
animate();
