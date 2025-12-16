# PWA Icons

This directory contains icons for the Progressive Web App.

## Required Sizes

- 72x72 (iOS)
- 96x96 (Android)
- 128x128 (Android)
- 144x144 (Windows)
- 152x152 (iOS)
- 192x192 (Android, Chrome)
- 384x384 (Android)
- 512x512 (Android, Splash screens)

## Generating Icons

You can use online tools to generate these icons from a single source image:

1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/

Or use ImageMagick locally:

```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux

# Generate all sizes from a source image
convert source.png -resize 72x72 icon-72x72.png
convert source.png -resize 96x96 icon-96x96.png
convert source.png -resize 128x128 icon-128x128.png
convert source.png -resize 144x144 icon-144x144.png
convert source.png -resize 152x152 icon-152x152.png
convert source.png -resize 192x192 icon-192x192.png
convert source.png -resize 384x384 icon-384x384.png
convert source.png -resize 512x512 icon-512x512.png
```

## Design Guidelines

- Use a simple, recognizable design
- Ensure good contrast for visibility
- Consider using the MCard logo or a card icon
- Make it work on both light and dark backgrounds
- Test on actual devices

## Current Status

⚠️ **Placeholder icons needed** - Replace with actual branded icons before production deployment.
