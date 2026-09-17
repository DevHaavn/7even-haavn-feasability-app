#!/bin/sh
# Print a HAAVN BLACK brochure to PDF.
#   scripts/brochure/print.sh solum HAAVN-BLACK-SOLUM
# The page source is public/haavn-brochures/<home>/index.html (A4 landscape,
# one .pg per sheet). Images there were made by prep.py; the Blackbutt facade
# by blackbutt.py (both read the architect's files on the Desktop, and expect
# the booklet's embedded images extracted to ./booklet).
set -e
HOME_KEY="$1"; OUT="$2"
DIR="$(cd "$(dirname "$0")/../../public/haavn-brochures" && pwd)"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --run-all-compositor-stages-before-draw --virtual-time-budget=20000 \
  --print-to-pdf="$DIR/$OUT.pdf" "file://$DIR/$HOME_KEY/index.html"
echo "wrote $DIR/$OUT.pdf"
