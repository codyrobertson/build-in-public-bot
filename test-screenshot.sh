#!/bin/bash

echo "Testing Build-in-Public Bot Screenshot Features"
echo "=============================================="

# Test 1: Basic screenshot
echo -e "\n1. Basic JavaScript screenshot:"
echo "bip screenshot test-code.js"

# Test 2: Specific line range
echo -e "\n2. JavaScript with line range (lines 2-11):"
echo "bip screenshot test-code.js --lines 2-11"

# Test 3: Python with line numbers
echo -e "\n3. Python with line numbers:"
echo "bip screenshot test-code.py --line-numbers"

# Test 4: React TypeScript with dark theme
echo -e "\n4. React TypeScript with Dracula theme:"
echo "bip screenshot test-code.tsx --theme dracula"

# Test 5: Custom background color
echo -e "\n5. Custom background color:"
echo "bip screenshot test-code.js --lines 15-20 --bg '#1a1b26'"

# Test 6: Different font and size
echo -e "\n6. Different font and size:"
echo "bip screenshot test-code.py --font Monaco --font-size 16px"

# Test 7: No window controls
echo -e "\n7. No window controls:"
echo "bip screenshot test-code.tsx --lines 10-20 --no-window"

# Test 8: Custom width without line wrap
echo -e "\n8. Custom width without line wrap:"
echo "bip screenshot test-code.js --no-wrap --width 800"

# Test 9: Multiple options combined
echo -e "\n9. Multiple options combined:"
echo "bip screenshot test-code.py --theme nord --line-numbers --font-size 12px --lines 7-17"

# Test 10: List available themes
echo -e "\n10. List available themes:"
echo "bip screenshot test-code.js --list-themes"