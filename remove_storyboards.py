#!/usr/bin/env python3

# Script to cleanly remove all storyboard-related routes from scenes.ts

import re

def remove_storyboard_routes(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove storyboard-related imports
    content = re.sub(r"import \{ generateStoryboards \} from '\.\./services/imageGenerator';\n", "", content)
    content = re.sub(r"import \{ generateStoryboardBatch \} from '\.\./services/robustImageGenerator';\n", "", content)
    content = re.sub(r"// Import character memory service with fallback\nimport \{ characterMemoryService \} from '\.\./services/characterMemoryService';\n", "", content)
    
    # Remove storyboard storage
    content = re.sub(r"const storyboardsStorage = new Map<string, any\[\]>\(\);\n", "", content)
    
    # Remove debug storyboard access route
    debug_pattern = r"// Debug endpoint to test storyboard access\nrouter\.get\('/debug/storyboard-access/:userId'.*?\}\);\n"
    content = re.sub(debug_pattern, "", content, flags=re.DOTALL)
    
    # Remove all storyboard routes using more precise patterns
    routes_to_remove = [
        r"/\*\*\s*\* POST /api/storyboards/generate.*?\}\);\n",
        r"/\*\*\s*\* GET /api/storyboards/.*?\}\);\n", 
        r"/\*\*\s*\* POST /api/storyboards/recover.*?\}\);\n",
        r"/\*\*\s*\* POST /api/storyboards/regenerate.*?\}\);\n"
    ]
    
    for pattern in routes_to_remove:
        content = re.sub(pattern, "", content, flags=re.DOTALL)
    
    # Clean up any double newlines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("Storyboard routes removed successfully")

if __name__ == "__main__":
    remove_storyboard_routes("server/routes/scenes.ts")