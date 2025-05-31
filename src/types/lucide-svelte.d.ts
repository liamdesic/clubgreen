// Type definitions for lucide-svelte
declare module 'lucide-svelte' {
  import { SvelteComponentTyped } from 'svelte';
  
  interface LucideIconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    class?: string;
  }

  export class LucideIcon extends SvelteComponentTyped<LucideIconProps> {}
  
  // Icons used in login page
  export class Mail extends LucideIcon {}
  export class Check extends LucideIcon {}
  export class ArrowRight extends LucideIcon {}
  export class RotateCcw extends LucideIcon {}
  export class Eye extends LucideIcon {}
  export class EyeOff extends LucideIcon {}
  export class Lock extends LucideIcon {}
  export class User extends LucideIcon {}
  
  // Additional icons used in other components
  export class Clock extends LucideIcon {}
  export class CloudUpload extends LucideIcon {}
  export class Link extends LucideIcon {}
  export class Calendar extends LucideIcon {}
  export class Pencil extends LucideIcon {}
  export class QrCode extends LucideIcon {}
  export class Plus extends LucideIcon {}
  export class Settings extends LucideIcon {}
  
  // Add any other icons as needed
}
