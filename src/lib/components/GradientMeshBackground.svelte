<script>
  import { onMount, onDestroy } from 'svelte';

  // Props
  export let accentColor = '#00c853'; // Default accent color
  export let useThemeColors = true; // Whether to use theme.css color variations
  export let intensity = 1.0; // Animation intensity
  export let speed = 0.5; // Animation speed
  export let complexity = 5; // Mesh complexity (higher = more complex pattern)
  export let opacity = 0.8; // Background opacity

  let canvas;
  let gl;
  let program;
  let animationId;
  let startTime;

  // Computed values for colors
  $: primaryColor = useThemeColors ? 'var(--accent-color, ' + accentColor + ')' : accentColor;
  $: secondaryColor = useThemeColors ? 'var(--accent-color-saturated, ' + accentColor + ')' : accentColor;
  $: tertiaryColor = useThemeColors ? 'var(--accent-color-desaturated, ' + accentColor + ')' : accentColor;

  // Convert CSS color to RGB array
  function cssColorToRGB(cssColor) {
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
      return [
        parseInt(rgbMatch[0]) / 255,
        parseInt(rgbMatch[1]) / 255,
        parseInt(rgbMatch[2]) / 255
      ];
    }
    
    // Fallback to default green
    return [0, 0.784, 0.325];
  }

  onMount(() => {
    initWebGL();
    startTime = Date.now();
    animate();

    // Handle resize
    const handleResize = () => {
      if (canvas && gl) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });

  function initWebGL() {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);

    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      
      uniform float time;
      uniform vec2 resolution;
      uniform float intensity;
      uniform float complexity;
      uniform float opacity;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      
      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        
        // Create multiple layers of noise
        float n1 = snoise(uv * complexity + time * 0.1) * 0.5 + 0.5;
        float n2 = snoise(uv * complexity * 2.0 - time * 0.15) * 0.5 + 0.5;
        float n3 = snoise(uv * complexity * 0.5 + time * 0.05) * 0.5 + 0.5;
        
        // Combine noise layers with intensity
        float noise = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * intensity;
        
        // Mix colors based on noise
        vec3 color;
        if (noise < 0.33) {
          color = mix(color1, color2, noise * 3.0);
        } else if (noise < 0.66) {
          color = mix(color2, color3, (noise - 0.33) * 3.0);
        } else {
          color = mix(color3, color1, (noise - 0.66) * 3.0);
        }
        
        gl_FragColor = vec4(color, opacity);
      }
    `);

    // Create program
    program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    // Create a buffer for the position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    // Set up position attribute
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  function animate() {
    if (!gl || !program) return;
    
    const elapsedTime = (Date.now() - startTime) * 0.001 * speed;
    
    // Set uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'time'), elapsedTime);
    gl.uniform2f(gl.getUniformLocation(program, 'resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'intensity'), intensity);
    gl.uniform1f(gl.getUniformLocation(program, 'complexity'), complexity);
    gl.uniform1f(gl.getUniformLocation(program, 'opacity'), opacity);
    
    // Get and set color uniforms
    const color1 = cssColorToRGB(primaryColor);
    const color2 = cssColorToRGB(secondaryColor);
    const color3 = cssColorToRGB(tertiaryColor);
    
    gl.uniform3fv(gl.getUniformLocation(program, 'color1'), color1);
    gl.uniform3fv(gl.getUniformLocation(program, 'color2'), color2);
    gl.uniform3fv(gl.getUniformLocation(program, 'color3'), color3);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Request next frame
    animationId = requestAnimationFrame(animate);
  }
</script>

<div class="gradient-mesh-container">
  <canvas bind:this={canvas} class="gradient-mesh-canvas"></canvas>
  <slot></slot>
</div>

<style>
  .gradient-mesh-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .gradient-mesh-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }
</style>
