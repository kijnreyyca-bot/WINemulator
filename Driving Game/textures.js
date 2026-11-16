// ---------- Procedural Texture Generator (textures.js) ----------

// Helper to create a procedural canvas texture for Three.js
function createProceduralTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'grass') {
    // Base green
    ctx.fillStyle = '#3a7d3a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add blade variations and noise flecks
    for (let i = 0; i < 25000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#2d6a2d' : '#4e9a4e';
      ctx.fillRect(x, y, 1.5, 3 + Math.random() * 4);
    }
  } else if (type === 'road') {
    // Dark asphalt base
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 512, 512);
    
    // Speckled asphalt grain
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = Math.random() > 0.5 ? '#222222' : '#444444';
      ctx.fillRect(x, y, 2, 2);
    }
  } else if (type === 'building') {
    // Concrete / Brick base
    ctx.fillStyle = '#8a8a7a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Brick grid pattern
    ctx.strokeStyle = '#6a6a5a';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }
    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Global exported textures object
const GameTextures = {
  grass: createProceduralTexture('grass'),
  road: createProceduralTexture('road'),
  building: createProceduralTexture('building')
};

// Configure repeat scaling for vast open world coverage
GameTextures.grass.repeat.set(40, 40);
GameTextures.road.repeat.set(1, 10);
GameTextures.building.repeat.set(2, 4);