<p align="center">
  <img src="https://img.shields.io/badge/license-GPL--3.0-545ded" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-80848e" alt="Platform">
  <img src="https://img.shields.io/badge/stack-Python%20%2B%20JS-545ded" alt="Stack">
</p>

---

# Foto Kita Blur

A privacy-focused desktop camera application. Automatically blur your camera feed when you give a peace (V-sign) gesture.

---

> [!CAUTION]
> This app uses your camera in real time. The video feed is processed locally and is never sent to any server. No data leaves your machine.

---

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Blur** | Real-time hand gesture detection triggers camera blur |
| **Privacy First** | Camera starts in muted mode (LED off) |
| **Virtual Camera** | Works with Zoom, Google Meet, OBS, Discord, and any app that supports virtual cameras |
| **Gesture Detection** | Peace sign (V-sign) toggles blur on and off |
| **Local Processing** | All video processing happens on your machine — zero network calls |
| **Borderless UI** | Clean, minimal, unobtrusive interface |
| **Cross Platform** | Works on Windows, macOS, and Linux |

---

## Quick Start

**Step 1:** Run `setup.ps1` to install dependencies and configure the environment.

**Step 2:** Launch the app:
```
run.bat
```

**Step 3:** Give a peace sign (V-sign) to the camera. The blur effect toggles on. Give it again to toggle off.

---

## How It Works

```
Camera → MediaPipe Hand Tracking → Gesture Detection → Blur Filter → Virtual Camera Output
```

1. **MediaPipe** detects hand landmarks in each frame at 60+ FPS
2. When a peace sign (index + middle finger extended, others folded) is detected, the blur state toggles
3. The camera feed passes through a real-time blur filter when enabled
4. The processed feed is output to a virtual camera device that any app can use

The entire pipeline runs locally. No video data is ever transmitted over the network.

---

## Requirements

- Python 3.8+
- Node.js 16+
- Webcam
- Windows, macOS, or Linux

For Windows users, the `setup.ps1` script handles all dependency installation automatically.

---

## FAQ

**Q: Does this app send my video anywhere?**
A: No. All processing is done locally on your machine. The app makes zero network connections.

**Q: Why use a peace sign to toggle?**
A: It is a natural, intentional gesture that is unlikely to happen by accident, unlike smiling or blinking which can trigger false positives.

**Q: Can I use this with Zoom or Google Meet?**
A: Yes. The app outputs a virtual camera device that appears as a camera option in any video calling app.

**Q: The gesture is not being detected. What do I do?**
A: Ensure your hand is clearly visible, well-lit, and facing the camera directly. The peace sign requires index and middle fingers extended with the ring and pinky fingers folded.

**Q: Does it work with multiple cameras?**
A: Yes. You can select which camera to use in the app settings.

**Q: How do I exit the app?**
A: Press `Ctrl+C` in the terminal, or close the app window.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Module not found` | Dependencies not installed | Run `setup.ps1` first |
| `Camera not detected` | No webcam or driver issue | Check your camera with another app |
| Blur is laggy | Low FPS | Reduce camera resolution in settings |
| Gesture not recognized | Poor lighting or hand position | Ensure good lighting and face the camera directly |
| Virtual camera not showing in Zoom | Driver not installed | Restart your video calling app after starting Foto Kita Blur |

---

## Credits

Created by [norvramis](https://github.com/norvramis).

---

## License

GPL-3.0. See [LICENSE](LICENSE).

<details>
<summary>Full license text</summary>

```
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007
...
```

</details>

---

**AI Assistance.** This project was developed with the assistance of AI (LLMs) to structure the code and automate the setup process.
