
UI/UX Design Prompt: Deep-Dive specifications for a Gradio-style Multi-modal AI Dashboard

DESIGN SYSTEM & THEME INSTRUCTIONS

Style: Gradio/HuggingFace Spaces aesthetic. Functional, clean, block-oriented. "Inputs on Left, Outputs on Right".
Color Palette:
Background: Very light gray (#F9FAFB) for Light Mode; Dark navy/gray (#0B0F19) for Dark mode.
Content Blocks/Panels: Solid White (#FFFFFF) or Dark Gray (#1F2937), acting as distinctive "cards" on the background.
Accents: Primary Blue (#3B82F6) for active states, buttons, and borders of focused inputs.
Geometry: 8px border-radius on all panels and inputs. 1px solid borders (#E5E7EB). Subtle drop shadows on panels.
Typography: Inter or Roboto. Clean hierarchy. Labels use 14px Medium. Explanatory text uses 12px Regular in gray.
GLOBAL LAYOUT
Top Navigation Bar: Fixed at the top. 64px height. Contains a Logo on the left ("Grok2API").
Tabbed Menu Navigation (Center of Top Nav): 4 Text Tabs: [ Chat & Reason ], [ Image Studio ], [ Video Studio ], [ API Setup ].
Tab Interaction: The active tab is bold and has a blue 2px underline. Hovering over inactive tabs slightly darkens the text.
SCREEN 1: "CHAT & REASON" TAB (Single Column Layout)
Layout: 900px centered main column. Block 1: Top Collapsible Settings

A gray panel at the top. Text: ⚙️ Model Settings ▾.
Click Interaction: Clicking the panel expands it downward, revealing:
A dropdown menu labeled "Select Model" (Default value: grok-4.20-0309).
A toggle switch labeled "Show AI Thinking/Reasoning Output". Clicking the toggle moves the knob right and turns it blue.
Block 2: Chat History Area

Occupies 70% of the screen height. Scrollable.
User Bubble: Right-aligned. Background #E0F2FE. Rounded corners (16px), but sharp corner at bottom-right.
AI Bubble: Left-aligned. Background white.
The "Reasoning" Component: Inside the AI bubble, prior to the text reply, there is a gray collapsible UI box labeled Thought Process (12 seconds) ▾.
Click Interaction: Clicking this expands the box to show a bulleted list of the AI's internal thoughts in italicized text.
Block 3: Input Bar

Pinned to the bottom. Contains a single, thick border text input area.
Left icon: Paperclip 📎.
Click Interaction: Clicking opens file explorer. Upon selection, a small 40x40 thumbnail of the uploaded image appears inside the text input box with an 'X' to delete it.
Right icon: A solid blue button Send ▶.
Click Interaction: Clicking changes the button immediately to a gray Stop ⏹ button. A typing indicator (3 bouncing dots) appears in the Chat History area.
SCREEN 2: "IMAGE STUDIO" TAB (2-Column Grid Layout)
Layout: Left Column is 40% width (Inputs). Right Column is 60% width (Outputs). Both are distinct white panels with 1px borders.

Left Column (Input Panel):

Prompt Textarea: 4 rows high. Label: "Detailed Prompt".
Base Image Dropzone: A dashed border box. Text: "Drag & Drop Image for Image Editing or Click to Browse".
Click Interaction: Opens file explorer, replaces dashed box with the image preview if uploaded.
Model Dropdown: Label "Image Model". Values: grok-imagine-image, pro, lite, edit.
Resolution Dropdown: Values: 1024x1024, 1280x720, 720x1280.
Bulk Count Slider: Label "Number of Images". Slider bar from 1 to 10. Current number floats above the slider thumb.
Generate Button: Large, full-width blue button at the bottom. Text: 🎨 Generate Images.
Click Interaction: On click, button text changes to Generating...⏳ and becomes un-clickable (disabled state).
Right Column (Output Gallery):

Displays a CSS Grid (2 columns or 3 columns depending on screen size).
Empty State: Gray placeholder icon saying "Outputs will appear here."
Generating State: Shows gray "skeleton loader" boxes pulsing, matching the number selected in the Bulk Count slider.
Finished State: Shows the generated images.
Image Hover Interaction: Hovering over any generated image dims it with a dark overlay and reveals a centered ⬇️ Download Full-Res button.
Image Click Interaction: Clicking the image pops up a full-screen Lightbox modal to view the image in high detail.
SCREEN 3: "VIDEO STUDIO" TAB (2-Column Grid Layout)
Layout: Same 40/60 split as the Image Studio to maintain UI consistency.

Left Column (Input Panel):

Prompt Textarea: 4 rows high. Label: "Video Scene Prompt".
Image Dropzone: Dashed box for Image-to-Video capabilities.
Segmented Button Group (Duration): Label "Seconds". A row of connected buttons: [ 6s | 10s | 12s | 16s | 20s ].
Click Interaction: Only one can be active at a time. The active one is filled blue, others are outlined gray.
Dropdowns: Two dropdowns for "Resolution (720p)" and "Style Preset (fun, normal, spicy)".
Generate Button: Large full-width button 🎬 Queue Video Generation.
Click Interaction: Triggers a green toast notification sliding in from the top-right corner: ✓ Video Task Added to Queue.
Right Column (Output & Queue):

Top Half (Video Player): A large 16:9 box containing an HTML5 Video Player UI (Play/Pause, timeline scrubber, volume). Below the player, a Download .MP4 button.
Bottom Half (Async Bulk Queue Table): Since video takes minutes to produce, show a table of running tasks.
Table Columns: Task ID | Prompt Snippet | Status.
Status Visuals: Processing has a spinning circle icon. Ready has a green checkmark.
Click Interaction: Clicking a row with Ready status loads that video into the Top Half Video Player for viewing.
SCREEN 4: "API SETUP" TAB (Form Layout)
Layout: Centered narrow column (max 600px).

Element 1: Input field labeled Backend Base URL. Placeholder: http://localhost:8000.
Element 2: Input field labeled API Access Key. Type is password (dots). A small "eye" icon inside the input to toggle visibility on click.
Element 3: Save Button.
Click Interaction: Clicking triggers a loading state, followed by a green success banner above the form: "Settings saved successfully."


SCREEN 5: "ADMIN & ACCOUNTS" TAB (Table & Dashboard Layout)
Layout: Full-width container with a top summary row and a bottom data table.

Top Row: Quick Metrics Cards (4 cards in a grid)

Card 1: Total Active Accounts (Number + Green 'Syncing' dot).
Card 2: Current Rate Limit Usage (Progress bar showing % used).
Card 3: System Cache Size (e.g., "1.4 GB").
Card 4: Auth Mode (Text: "Basic / Super / Heavy"). Design: Each card is a white block with a subtle border and a large bold number in the center.
Bottom Block: Account Pool Data Table

Table Header Row: Account ID | Tier | Status | Last Synced | Actions.
Table Rows:
Tier uses colored badges: Basic (Gray), Super (Purple), Heavy (Gold).
Status uses text colors: Active (Green), Rate Limited (Red), Offline (Orange).
Actions Column (Click Interactions):
Click Refresh icon: Spins the icon 360 degrees and changes Last Synced to "Just now".
Click Delete icon: Pops up a modal: "Are you sure you want to remove this account?" with a red confirmation button.
SCREEN 6: "LOCAL CACHE & ASSETS" TAB (Masonry Gallery)
Layout: A full-width media manager to view locally saved images/videos (since the API supports local caching).

Top Control Bar:

Element 1: A search input field with a magnifying glass icon.
Element 2: A filter dropdown File Type: All / Images / Videos.
Element 3: "Clear Cache" button (Red text, gray background).
Click Interaction: Clicking turns the screen slightly dark and brings up a "Danger" confirmation modal.
Main Content (Asset Grid):

A tight grid of square thumbnails representing all generated history.
Hover Interaction: Hovering over a thumbnail shows the exact text prompt used to generate it as a floating tooltip (white text on a black background), plus a trash can icon in the top right corner of the thumbnail.
Click Interaction (Trash Can): Immediately removes the item from the grid with a quick fading scale-down animation.
MOBILE RESPONSIVENESS AND BREAKPOINTS
Rules for Mobile Views (under 768px width):

Global Navigation: The Top Tab menu disappears. It is replaced by a "Hamburger Menu" ☰ icon on the top left.
Click Interaction (Hamburger): Slides a drawer out from the left side of the screen containing the navigation links.
2-Column Grids (Image & Video Studios): The 40/60 split breaks.
The Left Column (Inputs) becomes 100% width and sits on top.
The Right Column (Outputs gallery/video player) drops below it, also taking 100% width.
Chat Interface: The Model Settings Dropdown collapses into a simple gear ⚙️ icon to save space.
EDGE CASES & ERROR MICRO-INTERACTIONS (CRITICAL)
Design these states so developers know how errors should look:

API Key Missing Error: If the user tries to click any "Generate" button without an API key, the input panel shakes side-to-side (error animation) and a red toast slides in: ⚠️ Error: API Key not configured.
Streaming Disconnection (Chat): If the chat stream drops, the AI's incomplete text bubble flashes a red border, and a small "Retry ↻" button appears next to the bubble.
Empty States: Every table or gallery MUST have a beautiful empty state incorporating a faded, oversized SVG illustration (e.g., an empty folder or a sleeping robot) and a call to action button in the center (e.g., "Start Generating").
use this gradio styled updatec