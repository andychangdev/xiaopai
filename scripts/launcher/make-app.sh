#!/bin/bash
# Assembles Roster.app: Info.plist, the icon (drawn again first if it's
# missing or make-icon.py has changed), and an executable that runs
# scripts/launcher/run where it is, so changing the launcher needs no
# rebuild. Moving the project does. Nothing is installed or downloaded.
#
#   scripts/launcher/make-app.sh          # -> ~/Applications/Roster.app
#   scripts/launcher/make-app.sh <dir>    # -> <dir>/Roster.app
set -e
DEST="${1:-$HOME/Applications}"
mkdir -p "$DEST"
APP="$(cd "$DEST" && pwd)/Roster.app"
cd "$(dirname "$0")"
if [ ! -f icon.icns ] || [ make-icon.py -nt icon.icns ]; then ./make-icns.sh; fi

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp Info.plist "$APP/Contents/"
cp icon.icns "$APP/Contents/Resources/"
cat >"$APP/Contents/MacOS/run" <<EOF
#!/bin/bash
# Written by make-app.sh. The launcher is the project's own, run where it is
RUN=$(printf %q "$(pwd)/run")
[ -x "\$RUN" ] || exec osascript -e 'display alert "Roster can’t find the project" message "If it has moved, run scripts/launcher/make-app.sh again from its new place."'
exec "\$RUN"
EOF
chmod +x "$APP/Contents/MacOS/run"
touch "$APP" # so Finder and the Dock notice a rebuilt icon
echo "built $APP — drag it to the Dock"
