# Script-to-Shot: Page Descriptions

This document provides detailed descriptions of each page in the Script-to-Shot application.

## Home Page

The home page is the landing page for unauthenticated users. It features a sleek, dark design with:

- A hero section with a bold headline and a clear value proposition
- Three-step process explanation (Upload, Customize, Export)
- Testimonials from filmmakers who've used the service
- Pricing information highlighting the free tier and premium features
- Call-to-action buttons to sign up or learn more

The page uses a dark color scheme (#0C0E13) with indigo accents (#4C6EF5) and gradient elements to create a premium, professional appearance that appeals to filmmakers and production teams.

## Dashboard

The dashboard is the central hub for authenticated users. It features:

- Usage statistics showing pages used vs. pages available
- Recent scripts with quick access to continue working
- Status cards showing counts of uploaded scripts and completed jobs
- Quick action buttons for common tasks
- Analytics visualization for script metrics

The dashboard employs card-based UI elements with subtle shadows, borders, and hover effects. The dark theme continues throughout with gradient accents to highlight important actions.

## Upload Page

The upload page allows users to upload scripts for processing. It includes:

- A drag-and-drop file upload area supporting PDF, DOCX, and TXT formats
- Text input area where users can paste script content directly
- Auto-calculation of page count with remaining quota display
- Recently uploaded scripts list with quick actions
- File size and type validations with error messaging

The upload interface uses an elegant file upload component with clear visual feedback for different states (drag active, uploading, error, success).

## Columns Selection Page

This page allows users to choose which elements to extract from their script:

- Sophisticated column selector UI with visual indicators for selected items
- Each column option shows an icon, label, and description
- Script metadata display showing title, page count, and format
- Clear explanation of what data will be extracted
- Navigation buttons to return to upload or proceed to parsing

The column selectors feature subtle visual feedback when selected, using light indigo backgrounds and borders to indicate active state.

## Parse Page

The parse page shows the script being processed:

- Script details panel showing metadata
- Preview of extracted data in a cleanly formatted table
- Processing status with visual indicators
- Action buttons to trigger full parsing
- Download option appears once parsing is complete

During processing, the page displays an elegant loading animation and placeholder content. Once complete, it transitions to show the full results table.

## Review Page

The review page allows users to review the parsed results:

- Full-screen data table showing all parsed script elements
- Downloadable results in CSV format (with Excel option for Pro)
- Rating options to provide feedback on the parsing quality
- Ability to go back and modify column selections
- Visual watermark indicating the free tier

The review interface emphasizes the data with a clean, accessible table layout and prominent download action.

## Feedback Page

The feedback page collects user input on the parsing quality:

- Star rating interface for overall satisfaction
- Text area for detailed feedback and suggestions
- Confirmation of successful feedback submission
- Return to dashboard option

The feedback form has a clean, minimal design to focus attention on the rating interface and comment area.

## Common Elements Across Pages

All pages share these design elements:

- Sleek, dark interface with refined typography using Inter font
- Left navigation panel with collapsible sections
- Header with app branding and user account menu
- Responsive design that adapts to different screen sizes
- Right panel context-sensitive settings (when applicable)
- Elegant transitions and animations for UI interactions