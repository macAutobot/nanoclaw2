#!/bin/sh
# Patch baileys to fix 405 Connection Failure
# WhatsApp now requires Platform.MACOS instead of Platform.WEB for device pairing
# See: https://github.com/WhiskeySockets/Baileys/pull/2365

BAILEYS_FILE="node_modules/@whiskeysockets/baileys/lib/Utils/validate-connection.js"

if [ -f "$BAILEYS_FILE" ]; then
  if grep -q "Platform.WEB" "$BAILEYS_FILE"; then
    sed -i 's/Platform\.WEB/Platform.MACOS/g' "$BAILEYS_FILE" 2>/dev/null || sed -i '' 's/Platform\.WEB/Platform.MACOS/g' "$BAILEYS_FILE"
    echo "✓ Patched baileys: Platform.WEB → Platform.MACOS"
  else
    echo "✓ baileys already patched (Platform.MACOS)"
  fi
else
  echo "⚠ baileys not found at $BAILEYS_FILE"
fi
