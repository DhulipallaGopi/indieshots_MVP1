import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from PIL import Image
import glob

def take_screenshots():
    # Create output directory if it doesn't exist
    output_dir = "screenshots/images"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Setup Chrome WebDriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Find all HTML files in the pages directory
    html_files = glob.glob("screenshots/pages/*.html")
    
    for file_path in html_files:
        try:
            file_name = os.path.basename(file_path)
            page_name = file_name.split('.')[0]
            print(f"Taking screenshot of {page_name}...")
            
            # Create full file URL
            file_url = f"file://{os.path.abspath(file_path)}"
            
            # Navigate to the HTML file
            driver.get(file_url)
            
            # Wait for page to fully load
            time.sleep(2)
            
            # Take screenshot
            screenshot_path = f"{output_dir}/{page_name}.png"
            driver.save_screenshot(screenshot_path)
            
            # Optionally resize or optimize the image
            img = Image.open(screenshot_path)
            img.save(screenshot_path, optimize=True, quality=90)
            
            print(f"✓ Screenshot saved to {screenshot_path}")
            
        except Exception as e:
            print(f"Error taking screenshot of {file_path}: {str(e)}")
    
    # Close the browser
    driver.quit()
    print("All screenshots completed!")

if __name__ == "__main__":
    take_screenshots()