import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from PIL import Image

def take_app_screenshots():
    # Create output directory
    output_dir = "screenshots/app_images"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Setup Chrome WebDriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Base URL when running the application
    base_url = "http://localhost:5000"
    
    # List of pages to screenshot
    pages = [
        {"route": "/", "name": "home", "wait_for": "body"},
        {"route": "/dashboard", "name": "dashboard", "wait_for": ".dashboard"},
        {"route": "/upload", "name": "upload", "wait_for": ".upload-container"},
        {"route": "/columns", "name": "columns", "wait_for": ".column-selector"},
        {"route": "/parse", "name": "parse", "wait_for": ".parse-container"},
        {"route": "/review", "name": "review", "wait_for": ".review-container"},
        {"route": "/feedback", "name": "feedback", "wait_for": ".feedback-container"},
        {"route": "/nonexistent-route", "name": "not_found", "wait_for": "body"},
    ]
    
    for page in pages:
        try:
            url = f"{base_url}{page['route']}"
            print(f"Taking screenshot of {page['name']} at {url}...")
            
            # Navigate to the page
            driver.get(url)
            
            # Wait for the specific element to be present
            try:
                WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, page["wait_for"]))
                )
            except:
                print(f"Warning: Timeout waiting for element '{page['wait_for']}' on {page['name']}")
            
            # Wait additional time for any animations
            time.sleep(1)
            
            # Take screenshot
            screenshot_path = f"{output_dir}/{page['name']}.png"
            driver.save_screenshot(screenshot_path)
            
            # Optimize the image
            img = Image.open(screenshot_path)
            img.save(screenshot_path, optimize=True, quality=90)
            
            print(f"✓ App screenshot saved to {screenshot_path}")
            
        except Exception as e:
            print(f"Error taking screenshot of {page['name']}: {str(e)}")
    
    # Close the browser
    driver.quit()
    print("All app screenshots completed!")

if __name__ == "__main__":
    take_app_screenshots()