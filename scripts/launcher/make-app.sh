#!/bin/bash
# Assembles Roster.app: an AppleScript applet that runs scripts/launcher/run
# where it is, so changing the launcher needs no rebuild. Moving the project
# does. It's an applet because macOS won't let an app that's only a script
# into Documents, or even ask; an applet it asks about once. Info.plist adds
# to osacompile's own, and the icon is drawn again first if it's missing or
# make-icon.py has changed. Nothing is installed or downloaded.
#
#   scripts/launcher/make-app.sh          # -> ~/Applications/Roster.app
#   scripts/launcher/make-app.sh <dir>    # -> <dir>/Roster.app
set -e
DEST="${1:-$HOME/Applications}"
mkdir -p "$DEST"
APP="$(cd "$DEST" && pwd)/Roster.app"
cd "$(dirname "$0")"
if [ ! -f icon.icns ] || [ make-icon.py -nt icon.icns ]; then ./make-icns.sh; fi

# The launcher's path as an AppleScript string, backslashes and quotes escaped
RUN=$(printf '%s' "$(pwd)/run" | sed 's/[\\"]/\\&/g')

rm -rf "$APP"
osacompile -o "$APP" <<EOF
-- Written by make-app.sh. The launcher is the project's own scripts/launcher/run
try
	do shell script quoted form of "$RUN"
on error errorMessage number status
	-- run shows its own alert and exits 1. Anything else, like the project having moved, shows here
	if status is not 1 then display alert "Roster didn’t start" message errorMessage
end try
EOF
/usr/libexec/PlistBuddy -c "Merge Info.plist" -c "Delete :CFBundleIconName" "$APP/Contents/Info.plist"
rm "$APP/Contents/Resources/Assets.car" # its icon would win over ours
cp icon.icns "$APP/Contents/Resources/applet.icns"
codesign --force --sign - "$APP" # the changes above break osacompile's signature
touch "$APP"                     # so Finder and the Dock notice a rebuilt icon
echo "built $APP — drag it to the Dock"
