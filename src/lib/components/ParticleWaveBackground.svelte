<script>
  import { onMount, onDestroy } from 'svelte';

  // Props
  export let accentColor = '#00c853'; // Default accent color
  export let useThemeColors = true; // Whether to use theme.css color variations
  export let particleCount = 100; // Number of particles
  export let waveAmplitude = 50; // Wave height
  export let waveFrequency = 0.02; // Wave frequency
  export let speed = 0.5; // Animation speed
  export let opacity = 0.7; // Background opacity
  export let particleSize = 3; // Size of particles

  let canvas;
  let ctx;
  let particles = [];
  let animationId;
  let width;
  let height;

  // Computed values for colors
  $: primaryColor = useThemeColors ? 'var(--accent-color, ' + accentColor + ')' : accentColor;
  $: secondaryColor = useThemeColors ? 'var(--accent-color-saturated, ' + accentColor + ')' : accentColor;

  // Convert CSS color to RGBA string with opacity
  function cssColorToRGBA(cssColor, alpha) {
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

  // Particle class
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.baseY = y;
      this.y = y;
      this.size = Math.random() * particleSize + 1;
      this.color = color;
      this.speedX = Math.random() * 2 - 1; // Random horizontal movement
      this.speedY = 0;
      this.waveOffset = Math.random() * Math.PI * 2; // Random starting point in the wave
    }

    update(time) {
      // Move horizontally
      this.x += this.speedX * speed;
      
      // Wrap around horizontally
      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      
      // Calculate wave position
      this.y = this.baseY + Math.sin(time * speed + this.x * waveFrequency + this.waveOffset) * waveAmplitude;
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  function initCanvas() {
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
    
    // Create particles
    particles = [];
    const primaryColorRGBA = cssColorToRGBA(primaryColor, opacity);
    const secondaryColorRGBA = cssColorToRGBA(secondaryColor, opacity);
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const color = Math.random() > 0.5 ? primaryColorRGBA : secondaryColorRGBA;
      particles.push(new Particle(x, y, color));
    }
  }

  function animate() {
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    
    const time = performance.now() * 0.001;
    
    // Update and draw particles
    particles.forEach(particle => {
      particle.update(time);
      particle.draw(ctx);
    });
    
    // Draw connections between nearby particles
    ctx.strokeStyle = cssColorToRGBA(primaryColor, opacity * 0.3);
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    
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
        
        // Adjust particle positions
        particles.forEach(particle => {
          particle.baseY = Math.random() * height;
        });
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

<div class="particle-wave-container">
  <canvas bind:this={canvas} class="particle-wave-canvas"></canvas>
  <slot></slot>
</div>

<style>
  .particle-wave-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .particle-wave-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
</style>
