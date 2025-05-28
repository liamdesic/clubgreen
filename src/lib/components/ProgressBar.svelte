<script lang="ts">
  export let currentStep: number;
  export let totalSteps: number;
  export let className: string = '';

  $: progressPercentage = ((currentStep) / totalSteps) * 100;
</script>

<div class="progress-bar">
  <div class="progress-header">
    <span class="step-info">Step {currentStep} of {totalSteps}</span>
    <span class="percentage">{Math.round(progressPercentage)}%</span>
  </div>
  <div class="progress-container">
    <div 
      class="progress-bar-inner" 
      style={`width: ${progressPercentage}%`}
    ></div>
  </div>
</div>

<style>
  .progress-bar {
    width: 100%;
  }
  
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .progress-bar span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .progress-bar span:first-child {
    color: #333;
  }

  .progress {
    width: 100%;
    background-color: #e5e7eb;
    border-radius: 0.5rem;
    height: 0.625rem;
  }

  .progress-bar .progress .progress-bar-inner {
    background-color: #4f46e5;
    border-radius: 0.5rem;
    height: 100%;
    transition: width 0.3s ease;
  }
</style>