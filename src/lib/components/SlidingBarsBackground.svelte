<script>
  // Props
  export let accentColor = '#3498db'; // Default accent color
  export let secondaryColor = '#2ecc71'; // Default secondary color
  export let opacity = 0.7; // Default opacity
  export let duration = 3; // Animation duration in seconds
  export let useThemeColors = true; // Whether to use theme.css color variations
  export let blurAmount = 0; // Blur amount in pixels
  
  // Computed values for colors
  $: primaryColorValue = useThemeColors ? 'var(--accent-color-desaturated, ' + accentColor + ')' : accentColor;
  $: secondaryColorValue = useThemeColors ? 'var(--accent-color-saturated, ' + secondaryColor + ')' : secondaryColor;
</script>

<div class="sliding-bars-container">
  <div 
    class="bg" 
    style="--primary-color: {primaryColorValue}; --secondary-color: {secondaryColorValue}; --opacity: {opacity}; --duration: {duration}s; --blur-amount: {blurAmount}px;"
  ></div>
  <div 
    class="bg bg2" 
    style="--primary-color: {primaryColorValue}; --secondary-color: {secondaryColorValue}; --opacity: {opacity}; --duration: {duration}s; --blur-amount: {blurAmount}px;"
  ></div>
  <div 
    class="bg bg3" 
    style="--primary-color: {primaryColorValue}; --secondary-color: {secondaryColorValue}; --opacity: {opacity}; --duration: {duration}s; --blur-amount: {blurAmount}px;"
  ></div>
  
  <!-- Optional slot for content -->
  <slot></slot>
</div>

<style>
  .sliding-bars-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .bg {
    animation: slide var(--duration, 3s) ease-in-out infinite alternate;
    background-image: linear-gradient(-60deg, var(--primary-color, #3498db) 50%, var(--secondary-color, #2ecc71) 50%);
    bottom: 0;
    left: -50%;
    opacity: var(--opacity, 0.7);
    position: absolute;
    right: -50%;
    top: 0;
    z-index: 1;
    filter: blur(var(--blur-amount, 20px));
  }

  .bg2 {
    animation-direction: alternate-reverse;
    animation-duration: calc(var(--duration, 3s) * 1.3);
  }

  .bg3 {
    animation-duration: calc(var(--duration, 3s) * 1.7);
  }
  
  @keyframes slide {
    0% {
      transform: translateX(-3%);
    }
    100% {
      transform: translateX(3%);
    }
  }
</style>
