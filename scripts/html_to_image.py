import os
from PIL import Image, ImageDraw, ImageFont
import glob

def create_mockup_image(title, description, filename, primary_color=(51, 0, 153)):
    """Create a simple placeholder image with text for a mockup"""
    width, height = 1200, 800
    
    # Create a new image with a gradient background
    img = Image.new('RGB', (width, height), color=(12, 14, 19))
    draw = ImageDraw.Draw(img)
    
    # Draw a header bar
    draw.rectangle([(0, 0), (width, 60)], fill=(26, 27, 35))
    
    # Draw app name in the header
    try:
        # Try to load a font, fall back to default if not available
        font_large = ImageFont.truetype("Arial", 28)
        font_medium = ImageFont.truetype("Arial", 24)
        font_small = ImageFont.truetype("Arial", 18)
    except IOError:
        # Use default font if custom font fails
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Draw app name
    draw.text((20, 15), "IndieShots", fill=(255, 255, 255), font=font_large)
    
    # Draw beta badge
    badge_width = 50
    badge_height = 24
    draw.rounded_rectangle(
        [(150, 18), (150 + badge_width, 18 + badge_height)],
        radius=12,
        fill=primary_color
    )
    draw.text((155, 20), "BETA", fill=(255, 255, 255), font=ImageFont.load_default())
    
    # Draw page title
    title_y = 120
    draw.text((width//2, title_y), title, fill=(255, 255, 255), font=font_large, anchor="mm")
    
    # Draw a content area
    content_margin = 100
    content_width = width - (content_margin * 2)
    content_height = 500
    content_y = title_y + 80
    
    draw.rounded_rectangle(
        [(content_margin, content_y), 
         (content_margin + content_width, content_y + content_height)],
        radius=8,
        fill=(26, 27, 35),
        outline=(42, 43, 54)
    )
    
    # Add description text
    desc_y = content_y + 30
    draw.text((width//2, desc_y), description, fill=(160, 160, 176), font=font_medium, anchor="mm")
    
    # Add IndieShots logo/text in center
    logo_y = content_y + (content_height // 2)
    draw.text((width//2, logo_y), f"{title} View", fill=primary_color, font=font_large, anchor="mm")
    
    # Add notation that this is a mockup
    mockup_text = "HTML/CSS Mockup - See HTML files for interactive version"
    draw.text((width//2, height - 50), mockup_text, fill=(160, 160, 176), font=font_small, anchor="mm")
    
    # Create directory if it doesn't exist
    os.makedirs("screenshots/images", exist_ok=True)
    
    # Save the image
    output_path = f"screenshots/images/{filename}.png"
    img.save(output_path)
    print(f"Created mockup image: {output_path}")
    return output_path

def main():
    # Create mockup images for each page
    pages = [
        {
            "title": "Home Page",
            "description": "Landing page with hero section, features, and pricing",
            "filename": "01_Home"
        },
        {
            "title": "Dashboard",
            "description": "User dashboard showing scripts and usage statistics",
            "filename": "02_Dashboard"
        },
        {
            "title": "Upload Page",
            "description": "Page for uploading screenplays via file or text input",
            "filename": "03_Upload"
        },
        {
            "title": "Column Selection",
            "description": "Enhanced interface for selecting script elements to extract",
            "filename": "04_Columns"
        },
        {
            "title": "Parse Page",
            "description": "Script processing with real-time feedback",
            "filename": "05_Parse"
        },
        {
            "title": "Review Page",
            "description": "Results page with download options",
            "filename": "06_Review"
        },
        {
            "title": "Feedback Page",
            "description": "Interface for rating and providing feedback",
            "filename": "07_Feedback"
        },
        {
            "title": "404 Not Found",
            "description": "Error page for non-existent routes",
            "filename": "08_NotFound"
        },
    ]
    
    for page in pages:
        create_mockup_image(
            page["title"],
            page["description"],
            page["filename"]
        )
    
    print("All mockup images created successfully!")

if __name__ == "__main__":
    main()