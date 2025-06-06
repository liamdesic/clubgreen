<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';

  // Props
  export let accentColor = '#00c853'; // Default accent color
  export let useThemeColors = true; // Whether to use theme.css color variations
  export let particleCount = 200; // Number of particles
  export let speed = 0.5; // Animation speed
  export let opacity = 1; // Background opacity
  export let noiseScale = 0.005; // Scale of the noise field
  export let particleSize = 10; // Size of particles
  export let trailLength = 0.03; // Trail length (fade rate)
  export let connectionDistance = 210; // Distance for connections
  export let connectionThickness = 0.5; // Thickness of connections
  export let connectionOpacity = 0.5; // Opacity of connections
  export let blurAmount = 10; // Default blur amount in pixels
  export let showSettings = false; // Whether to show settings panel
  
  // Settings store for export
  const settings = writable({
    particleCount,
    speed,
    opacity,
    noiseScale,
    particleSize,
    trailLength,
    connectionDistance,
    connectionThickness,
    connectionOpacity,
    blurAmount
  });
  
  // Update settings store when props change
  $: {
    $settings = {
      particleCount,
      speed,
      opacity,
      noiseScale,
      particleSize,
      trailLength,
      connectionDistance,
      connectionThickness,
      connectionOpacity,
      blurAmount
    };
  }
  
  // Track previous values to detect significant changes
  let prevParticleCount = particleCount;
  let prevParticleSize = particleSize;
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Debounced reinitialize function for particle size changes
  function debouncedReinitialize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (Math.abs(prevParticleSize - particleSize) > 1) {
        prevParticleSize = particleSize;
        initCanvas();
      }
    }, 300); // Wait 300ms after slider stops moving
  }
  
  // Only reinitialize when count changes significantly
  $: if (particles.length > 0 && ctx) {
    if (Math.abs(prevParticleCount - particleCount) > 50) {
      // Significant change in particle count - reinitialize
      prevParticleCount = particleCount;
      initCanvas();
    }
    
    // For particle size, use debounced reinitialization
    if (Math.abs(prevParticleSize - particleSize) > 1) {
      debouncedReinitialize();
    }
  }

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let particles: Particle[] = [];
  let animationId: number;
  let width: number;
  let height: number;
  let simplex: any; // Using any for now to avoid TypeScript errors with our custom implementation

  // Computed values for colors
  $: primaryColor = useThemeColors ? 'var(--accent-color, ' + accentColor + ')' : accentColor;
  $: secondaryColor = useThemeColors ? 'var(--accent-color-saturated, ' + accentColor + ')' : accentColor;
  $: tertiaryColor = useThemeColors ? 'var(--accent-color-desaturated, ' + accentColor + ')' : accentColor;
  
  // Additional theme colors
  $: color100 = useThemeColors ? 'var(--accent-color-100, ' + accentColor + ')' : accentColor;
  $: color300 = useThemeColors ? 'var(--accent-color-300, ' + accentColor + ')' : accentColor;
  $: color500 = useThemeColors ? 'var(--accent-color-500, ' + accentColor + ')' : accentColor;
  $: color700 = useThemeColors ? 'var(--accent-color-700, ' + accentColor + ')' : accentColor;
  $: color900 = useThemeColors ? 'var(--accent-color-900, ' + accentColor + ')' : accentColor;

  // Convert CSS color to RGBA string with opacity
  function cssColorToRGBA(cssColor: string, alpha: number): string {
    // Create a temporary element to compute the color
    const tempElem = document.createElement('div');
    tempElem.style.color = cssColor;
    tempElem.style.display = 'none';
    document.body.appendChild(tempElem);
    
    // Get computed style
    const computedColor = window.getComputedStyle(tempElem).color;
    document.body.removeChild(tempElem);
    
    // Parse RGB values
    const rgbMatch = computedColor.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      return `rgba(${rgbMatch[0]}, ${rgbMatch[1]}, ${rgbMatch[2]}, ${alpha})`;
    }
    
    // Fallback to default green
    return `rgba(0, 200, 83, ${alpha})`;
  }

  // Simple 2D noise implementation (Perlin-like)
  class SimplexNoise {
    constructor() {
      this.grad3 = [
        [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
        [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
        [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
      ];
      this.p = [];
      for (let i=0; i<256; i++) {
        this.p[i] = Math.floor(Math.random()*256);
      }
      
      // To remove the need for index wrapping, double the permutation table length
      this.perm = new Array(512);
      for(let i=0; i<512; i++) {
        this.perm[i] = this.p[i & 255];
      }
    }
    
    dot(g: number[], x: number, y: number): number {
      return g[0]*x + g[1]*y;
    }
    
    noise(xin: number, yin: number): number {
      // Skew the input space to determine which simplex cell we're in
      const F2 = 0.5*(Math.sqrt(3.0)-1.0);
      const s = (xin+yin)*F2; // Hairy factor for 2D
      const i = Math.floor(xin+s);
      const j = Math.floor(yin+s);
      
      const G2 = (3.0-Math.sqrt(3.0))/6.0;
      const t = (i+j)*G2;
      const X0 = i-t; // Unskew the cell origin back to (x,y) space
      const Y0 = j-t;
      const x0 = xin-X0; // The x,y distances from the cell origin
      const y0 = yin-Y0;
      
      // Determine which simplex we are in
      let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
      if(x0>y0) {i1=1; j1=0;} // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      else {i1=0; j1=1;} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      
      // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
      // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
      // c = (3-sqrt(3))/6
      
      const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
      const y2 = y0 - 1.0 + 2.0 * G2;
      
      // Work out the hashed gradient indices of the three simplex corners
      const ii = i & 255;
      const jj = j & 255;
      const gi0 = this.perm[ii+this.perm[jj]] % 12;
      const gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
      const gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
      
      // Calculate the contribution from the three corners
      let t0 = 0.5 - x0*x0-y0*y0;
      let n0 = 0;
      if(t0>=0) {
        t0 *= t0;
        n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0); // (x,y) of grad3 used for 2D gradient
      }
      
      let t1 = 0.5 - x1*x1-y1*y1;
      let n1 = 0;
      if(t1>=0) {
        t1 *= t1;
        n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
      }
      
      let t2 = 0.5 - x2*x2-y2*y2;
      let n2 = 0;
      if(t2>=0) {
        t2 *= t2;
        n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
      }
      
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 70.0 * (n0 + n1 + n2);
    }
  }

  // Particle class
  class Particle {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    vx: number;
    vy: number;
    colorIndex: number;
    alpha: number;
    size: number;
    maxSpeed: number;
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.prevX = this.x;
      this.prevY = this.y;
      this.vx = 0;
      this.vy = 0;
      this.colorIndex = Math.floor(Math.random() * 8); // Use all 8 colors
      this.alpha = Math.random() * opacity * 0.8 + opacity * 0.2;
      // Use a fixed base size with a smaller random variation
      this.size = particleSize * 0.8 + Math.random() * (particleSize * 0.4);
      this.maxSpeed = 1 + Math.random() * 2;
    }

    update(time: number): void {
      // Get flow direction from noise
      const angle = simplex.noise(this.x * noiseScale, this.y * noiseScale + time * 0.1) * Math.PI * 2;
      
      // Set velocity based on flow field
      this.vx = Math.cos(angle) * this.maxSpeed * speed;
      this.vy = Math.sin(angle) * this.maxSpeed * speed;
      
      // Save previous position for line drawing
      this.prevX = this.x;
      this.prevY = this.y;
      
      // Update position
      this.x += this.vx;
      this.y += this.vy;
      
      // Reset if out of bounds
      if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.prevX = this.x;
        this.prevY = this.y;
      }
    }

    draw(ctx: CanvasRenderingContext2D, colors: string[]): void {
      // Draw line from previous position
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = colors[this.colorIndex];
      ctx.lineWidth = this.size * 0.5; // Line width proportional to particle size
      ctx.stroke();
      
      // Draw a circle at the current position for more visibility
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = colors[this.colorIndex];
      ctx.fill();
    }
  }

  function initCanvas() {
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    ctx = context;
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
    
    // Initialize noise
    simplex = new SimplexNoise();
    
    // Create particles
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    // Set initial background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);
  }

  function animate() {
    if (!ctx) return;
    
    // Semi-transparent overlay to create fade effect
    ctx.fillStyle = `rgba(0, 0, 0, ${trailLength})`;
    ctx.fillRect(0, 0, width, height);
    
    const time = performance.now() * 0.001;
    
    // Prepare colors
    const colors = [
      cssColorToRGBA(primaryColor, opacity),
      cssColorToRGBA(secondaryColor, opacity),
      cssColorToRGBA(tertiaryColor, opacity),
      cssColorToRGBA(color100, opacity),
      cssColorToRGBA(color300, opacity),
      cssColorToRGBA(color500, opacity),
      cssColorToRGBA(color700, opacity),
      cssColorToRGBA(color900, opacity)
    ];
    
    // Update and draw particles
    particles.forEach(particle => {
      particle.update(time);
      particle.draw(ctx, colors);
    });
    
    // Draw connections between nearby particles
    ctx.strokeStyle = cssColorToRGBA(primaryColor, connectionOpacity);
    ctx.lineWidth = connectionThickness;
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < connectionDistance) {
          // Draw connection with opacity based on distance
          const opacity = 1 - (distance / connectionDistance);
          ctx.globalAlpha = opacity * connectionOpacity;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    
    // Reset global alpha
    ctx.globalAlpha = 1;
    
    animationId = requestAnimationFrame(animate);
  }

  onMount(() => {
    initCanvas();
    animate();

    // Handle resize
    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.clientWidth;
        height = canvas.height = canvas.clientHeight;
        
        // Reset particles
        particles.forEach(particle => {
          particle.x = Math.random() * width;
          particle.y = Math.random() * height;
          particle.prevX = particle.x;
          particle.prevY = particle.y;
        });
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fillRect(0, 0, width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<div class="noise-flow-container" bind:this={container}>
  <canvas bind:this={canvas} class="canvas"></canvas>
  <div class="blur-layer" style="filter: blur({blurAmount}px)"></div>
  <slot></slot>
  
  {#if showSettings}
    <div class="settings-panel">
      <div class="settings-content">
        <h3>NoiseFlow Settings</h3>
        
        <div class="setting">
          <label for="particleSize">Particle Size: {particleSize}</label>
          <input type="range" id="particleSize" bind:value={particleSize} min="1" max="30" step="1" />
        </div>
        
        <div class="setting">
          <label for="particleCount">Particle Count: {particleCount}</label>
          <input type="range" id="particleCount" bind:value={particleCount} min="100" max="3000" step="100" />
        </div>
        
        <div class="setting">
          <label for="speed">Speed: {speed.toFixed(2)}</label>
          <input type="range" id="speed" bind:value={speed} min="0.1" max="2" step="0.1" />
        </div>
        
        <div class="setting">
          <label for="opacity">Opacity: {opacity.toFixed(2)}</label>
          <input type="range" id="opacity" bind:value={opacity} min="0.1" max="1" step="0.1" />
        </div>
        
        <div class="setting">
          <label for="noiseScale">Noise Scale: {noiseScale.toFixed(4)}</label>
          <input type="range" id="noiseScale" bind:value={noiseScale} min="0.001" max="0.02" step="0.001" />
        </div>
        
        <div class="setting">
          <label for="trailLength">Trail Length: {trailLength.toFixed(3)}</label>
          <input type="range" id="trailLength" bind:value={trailLength} min="0.01" max="0.2" step="0.01" />
        </div>
        
        <div class="setting">
          <label for="connectionDistance">Connection Distance: {connectionDistance}</label>
          <input type="range" id="connectionDistance" bind:value={connectionDistance} min="50" max="400" step="10" />
        </div>
        
        <div class="setting">
          <label for="connectionThickness">Connection Thickness: {connectionThickness.toFixed(1)}</label>
          <input type="range" id="connectionThickness" bind:value={connectionThickness} min="0.5" max="5" step="0.5" />
        </div>
        
        <div class="setting">
          <label for="connectionOpacity">Connection Opacity: {connectionOpacity.toFixed(2)}</label>
          <input type="range" id="connectionOpacity" bind:value={connectionOpacity} min="0.1" max="1" step="0.1" />
        </div>
        
        <div class="setting">
          <label for="blurAmount">Blur Amount: {blurAmount}px</label>
          <input type="range" id="blurAmount" bind:value={blurAmount} min="0" max="20" step="1" />
        </div>
        
        <div class="settings-output">
          <h4>Current Settings JSON:</h4>
          <pre>{JSON.stringify($settings, null, 2)}</pre>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .noise-flow-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background-color: rgba(0, 0, 0, 0.9);
  }
  
  .settings-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 8px;
    color: white;
    max-width: 300px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 100;
  }
  
  .blur-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    background: transparent;
  }
  
  .settings-content {
    padding: 1rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  .setting {
    margin-bottom: 0.75rem;
  }
  
  .setting label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }
  
  .setting input[type="range"] {
    width: 100%;
    accent-color: var(--accent-color, #00c853);
  }
  
  .settings-output {
    margin-top: 1.5rem;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    font-size: 0.8rem;
  }
  
  .settings-output pre {
    white-space: pre-wrap;
    overflow-x: auto;
    color: var(--accent-color-300, #7aff9d);
  }
  
  h3, h4 {
    color: white;
    margin-top: 0;
    margin-bottom: 1rem;
  }
  
  h4 {
    font-size: 0.9rem;
    opacity: 0.8;
  }
</style>
