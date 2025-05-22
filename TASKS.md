# 🏌️ Mini-Golf Leaderboard - Project Tasks

## ✅ Completed
- [x] QR code generation (client-side, dynamic URLs)
- [x] Scorecard pulls dynamic event + score data via slug
- [x] Panel-based edit UI tested
- [x] Toast system working globally

## 🛠️ In Progress

### 🔄 1. Account & Event Settings Refactor
**Route:** `/dashboard/organization/settings`
- [x] Create organization settings page
  - [x] Add organization logo upload component
  - [x] Add ad image upload component
  - [x] Save images to Supabase storage
  - [x] Store image URLs in organization settings
  - [x] Add form validation and error handling
  - [x] Implement accent color picker
  - [x] Add billing email field
  - [ ] Add organization name editing

### 🎨 2. Leaderboard Restyling
- [x] **QR Code Generation**
  - [x] Generate QR code natively for scorecard URL
  - [x] Display in designated box with animations
  - [x] Dynamic color based on event settings
- [x] **Theme & Styling**
  - [x] Implement dynamic accent color theming across leaderboard and scorecard
  - [x] Update CSS variables in leaderboard.css and scorecard.css
  - [x] Add dynamic dark accent color variant
  - [x] Ensure color contrast meets accessibility standards
  - [x] Update header and background styles to use new color scheme
- [ ] **Header**
  - [x] Add logo in top left corner
  - [x] Show event title and date
  - [x] Style header with dynamic accent color
  - [ ] Add responsive behavior for mobile devices
- [ ] **Dynamic Score Display**
  - [ ] Keep left score box static (positions 1-4)
  - [ ] Implement rotation for right score box (5-10, 11-15, 16-20)
  - [ ] Set 4-second interval for rotation
  - [ ] Add smooth transitions between rotations
  - [ ] Ensure score display is readable with new color scheme
- [ ] **Visual Hierarchy**
  - [ ] Add top 3 medal styling (🥇, 🥈, 🥉)
  - [ ] Show hole-in-ones count
  - [ ] Highlight current rotation group
  - [ ] Style score pills with accent color
  - [ ] Add subtle hover effects for interactive elements
- [ ] **Responsive Design**
  - [ ] Optimize for mobile and iPad
  - [ ] Adjust layout for different screen sizes
  - [ ] Ensure touch targets are appropriately sized

## 📋 Backlog

### 🎯 Scorecard Improvements

#### Player Input & Management
- [ ] **Enhanced Player Name Input**
  - [x] Add form submission on mobile keyboard 'enter'
  - [x] Implement 18-character limit for player names with toast notification
  - [x] Add profanity filter using a prebuilt library
  - [?] Add input validation feedback

#### Gameplay Experience
- [x] **Flexible Player Selection** ✅
  - [x] Player Selection Flow
  - [x] Interaction Guidelines
  - [x] Score Recording Logic
  - [x] Game State Management

#### Visual Enhancements
- [x] **Player Transition Animations** ✅
  > *Skipped animations for performance and simplicity*

### 🧹 3. MVP Polish
- [ ] **CSS Cleanup & Consistency**
  - [ ] Fix button overflow issues in scorecard
    - Add proper width constraints and box-sizing
    - Ensure buttons respect container padding
  - [ ] Center numbers in score selector
    - Adjust flex/grid alignment
    - Ensure proper vertical centering
  - [ ] Standardize accent color usage
    - Replace hardcoded colors with CSS variables
    - Ensure consistent hover/focus states

- [ ] Skeleton loaders for:
  - Events dashboard
  - Scorecard
  - Leaderboard
- [ ] Add polished date picker (icon, clear button)
- [ ] Input validation + trimming (e.g., title, slug)
- [ ] Show save feedback (toast or inline "Saved ✅")
- [ ] Add loading spinner to all Save buttons

### ✉️ 5. Auth Email + Provider Setup
- [ ] Customize Supabase email templates (branding, tone)
- [ ] Integrate email provider (Resend, Postmark, Mailgun)
- [ ] Add "Resend magic link" on login screen
- [ ] Set up verified sender + reply-to

### 🔐 5. Auth + Route Protection
- [ ] Add guard to all `/dashboard/*` routes
- [ ] Only allow users to view/edit events tied to their org
- [ ] Fallback if org or event doesn't exist

### 🧪 6. Pre-Launch Checklist
- [ ] Mobile testing for scorecard, leaderboard, admin
- [ ] 404 page for bad slugs or event not found
- [ ] SEO meta tags on public leaderboard pages
- [ ] Add Meta Pixel + Google Analytics if needed
- [ ] Set up custom domain in Vercel (ldrboard.co, score.clubgreen.au, etc.)

## 📁 Relevant Files

### Core Components
- `src/routes/dashboard/events/[slug]/+page.svelte` - Main event edit page
- `src/routes/[org]/[event]/leaderboard/+page.svelte` - Leaderboard display
- `src/routes/[org]/[event]/scorecard/+page.svelte` - Scorecard interface
- `src/lib/styles/leaderboard.css` - Leaderboard styles
- `src/lib/styles/dashboard.css` - Dashboard styles

## 🏗️ Implementation Plan

### Technical Stack
- **Frontend**: Svelte/SvelteKit
- **Backend**: Supabase
- **Hosting**: Vercel
- **Version Control**: GitHub

### Database Schema
- **Events Table**: Stores event details and settings
- **Scorecard Table**: Manages player scores and game data
- **Leaderboard Settings**: Controls display preferences and theming

### Deployment
1. Set up Vercel project
2. Configure environment variables
3. Set up custom domain
4. Enable CI/CD from GitHub

### Testing Strategy
- Unit tests for utility functions
- Component tests for UI elements
- End-to-end tests for critical user flows
- Cross-browser and device testing