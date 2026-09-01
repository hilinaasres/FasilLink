# Desktop Homepage UI Update

## Goal Description
Update the desktop homepage navigation and filter UI to meet the requested specifications, improving consistency, modern look, and functionality.

## User Review Required
- Confirm that the proposed component and style changes align with the desired modern website aesthetics.
- Approve removal of existing navbar items and re‑grouping of categories.

## Open Questions
- Should the notification dropdown display a list of recent notifications, or is a simple icon sufficient?
- Desired dimensions for the FasilLink logo (e.g., width in `rem` or specific pixel height)?
- Preferred font size for the "Browse by Category" text (e.g., `text-sm` vs `text-base`).

## Proposed Changes
---
### Navbar Component
- **[MODIFY]** `frontend/src/Navbar.tsx`
  - Change second navbar item text "Home" to "Main".
  - Ensure the second navbar now contains only the items: Home (now Main), Rent, Sell, Homes, Event Materials, Vehicles, each filtered to their respective routes.
  - Remove any extra items not listed.
  - Update the search placeholder to a shorter, modern style.

### DesktopNavbar Component
- **[MODIFY]** `frontend/src/components/desktop/DesktopNavbar.tsx`
  - Adjust the navigation links:
    - Keep `Home` link but rename displayed text to "Main".
    - Ensure `Rent` link only shows rent items; similarly for `Sell`.
    - Add separate links for `Homes`, `Event Materials`, `Vehicles` that filter their respective categories.
  - Add filter categories UI below the secondary navigation bar with compact styling.
  - Update filter bar size and spacing using Tailwind utilities (`text-sm`, `gap-2`).
  - Insert a responsive logo size: set logo height to `h-8` (or user‑specified) and adjust surrounding padding.
  - Reduce font size of the middle‑page "Browse by Category" heading to `text-sm` and shrink the icon.
  - Refactor the notification icon to include a dropdown panel that lists recent notifications (placeholder list) and ensure it matches modern UI patterns.
  - Add hover and transition effects for all navbar links (`hover:text-primary`, `transition-colors`).

### CSS Adjustments
- **[MODIFY]** `frontend/src/App.css`
  - Add/adjust classes for `.desktop-navbar-brand img` to control logo dimensions (`height: 2rem; width: auto;`).
  - Define `.browse-by-category` class with reduced font size and spacing.
  - Add styles for notification dropdown (`.notification-dropdown`) with shadow and rounded corners.
  - Ensure the navbar background uses a subtle gradient or glass‑morphism (`bg-white/70 backdrop-blur`).

### Additional Components
- **[NEW]** `frontend/src/components/desktop/NotificationDropdown.tsx`
  - Simple component rendering a list of mock notifications with styling.
  - Integrated into `DesktopNavbar` where the Bell icon is clicked.

### Asset Updates
- Update `fasillink_log.png` if needed for higher resolution; otherwise set CSS to scale appropriately.

## Verification Plan
- **Automated Tests**: Run the development server (`npm run dev`) and verify that navigation links route correctly and that the logo appears at the intended size.
- **Manual Verification**: Inspect the UI in a browser, ensure the navbar items match the list, filter bar appears compact, and notification dropdown works.
- Review CSS to confirm modern aesthetics (smooth transitions, appropriate spacing, reduced text sizes).
