#!/bin/bash
# icon.png -> icon.icns, using only what ships with macOS.
set -e
cd "$(dirname "$0")"

[ -f icon.png ] || python3 make-icon.py

rm -rf icon.iconset && mkdir icon.iconset
while read -r px name; do
  [ -z "$px" ] && continue
  sips -z "$px" "$px" icon.png --out "icon.iconset/icon_$name.png" >/dev/null
done <<'SIZES'
16 16x16
32 16x16@2x
32 32x32
64 32x32@2x
128 128x128
256 128x128@2x
256 256x256
512 256x256@2x
512 512x512
1024 512x512@2x
SIZES

iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
echo "wrote icon.icns"
