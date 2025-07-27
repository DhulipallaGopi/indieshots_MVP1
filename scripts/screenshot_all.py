import os
import subprocess
import time
from take_screenshots import take_screenshots
from take_app_screenshots import take_app_screenshots

def main():
    print("===== IndieShots Screenshot Tool =====")
    
    # Create screenshots directory if it doesn't exist
    if not os.path.exists("screenshots"):
        os.makedirs("screenshots")
    
    # Step 1: Take screenshots of HTML mockups
    print("\n=== Taking screenshots of HTML mockups ===")
    take_screenshots()
    
    # Step 2: Attempt to take screenshots of the running application
    print("\n=== Taking screenshots of running application ===")
    try:
        take_app_screenshots()
    except Exception as e:
        print(f"Error taking app screenshots: {str(e)}")
        print("Make sure the application is running on port 5000 before executing this script.")
    
    print("\n===== All screenshots completed! =====")
    print("Screenshots saved to:")
    print("- HTML mockups: screenshots/images/")
    print("- App pages: screenshots/app_images/")

if __name__ == "__main__":
    main()