# ar-qr-tracer

Trace physical QR codes in real life using a camera overlay. Optimized for mobile (iOS/Android) and designed for artists, designers, and anyone needing to accurately place QR codes on physical surfaces.

## Features
- **Real-time QR Generation**: Type text directly in the app to generate a QR code instantly.
- **Precision Anchoring**: The QR code anchors at its **bottom-left corner**, making it perfect for precise physical alignment.
- **Mobile Optimized**: Smooth interface and pinch-to-scale gestures designed for Safari (iOS) and Chrome (Android).
- **Standalone Mode**: No external libraries required for QR generation—runs entirely in your browser.

## How to Use
1. **Open the App**: Visit the [GitHub Pages link](https://ryanraposo.github.io/ar-qr-tracer/) in Safari or Chrome.
2. **Generate**: Type text into the bottom input field.
3. **Align and Scale**: Use a pinch gesture to scale the QR code and drag to position it.
4. **Trace**: Use the low-opacity overlay to trace the QR code onto your surface.

## Development
- **index.html**: Main web application using native Camera API and HTML5 Canvas.
- **qr-generator.js**: A hand-written QR generation algorithm (Version 1, Byte Mode).

---
*Created for precision physical tracing.*
