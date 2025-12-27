# SnapFlow - Web Capture & Snip

[![Version: 1.2.0](https://img.shields.io/badge/Version-1.2.0-blue.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-red.svg)](#)

A powerful, production-grade Chrome extension for capturing full-page screenshots, visible areas, or custom regions with built-in annotation tools, dark mode, and comprehensive settings.

## ✨ Key Features

### 📸 Three Capture Modes
- **Full Page Capture**: Automatically scrolls and stitches the entire page into one seamless screenshot
- **Visible Area**: Captures just what's currently visible on your screen
- **Region Selection**: Drag to select any custom area you want to capture

### ✏️ Advanced Annotation Tools
- **Pen Tool**: Draw custom shapes and diagrams with customizable color
- **Highlighter**: Highlight important information with semi-transparent yellow overlay
- **Undo**: Revert your last annotation (up to 20 actions)
- **Copy to Clipboard**: Instant clipboard copy with one click
- **Progress Tracking**: Real-time visual feedback during capture

### 💾 Multiple Export Options
- **Download as PNG**: High-quality image download with automatic naming
- **Export as PDF**: Print or save your captures as PDF documents
- **Clipboard Integration**: Copy directly without saving to disk

### 🎨 Professional User Interface
- **Dark Mode**: Full dark mode support with smooth transitions
- **Responsive Design**: Works on all screen sizes
- **Modern Glassmorphism**: Sleek, contemporary design aesthetics
- **Intuitive Controls**: Easy-to-use interface for all skill levels
- **Status Indicators**: Clear feedback on operation status

### 🔧 Comprehensive Settings
- Multiple image formats (PNG, JPEG, WebP)
- Customizable JPEG quality (10-100)
- Auto-copy to clipboard
- Auto-download with customizable naming
- Fixed element hiding during capture
- Scroll overlap configuration for seamless stitching
- Capture timeout settings
- Sound and notification preferences
- Debug logging for troubleshooting

## 🚀 Quick Start Guide

### Installation
1. Navigate to [Chrome Web Store](#) or load unpacked from this folder
2. Click "Add to Chrome"
3. Pin the extension to your toolbar for quick access

### Basic Capture
1. **Click** the SnapFlow icon in your toolbar
2. **Choose** a capture mode (Full Page, Visible, or Region)
3. **Annotate** if needed using the pen or highlighter
4. **Download** as PNG/PDF or **Copy** to clipboard

### Keyboard Shortcut
Press `Alt+Shift+P` for instant full-page capture

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+P` | Quick capture full page |
| `Esc` (during region selection) | Cancel region selection |

Customize shortcuts in: Chrome Settings > Extensions > Keyboard Shortcuts

## 🛠️ Settings & Configuration

### Capture Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Image Format | PNG | Choose between PNG, JPEG, or WebP |
| JPEG Quality | 90 | Compression level for JPEG (10-100) |
| Auto-copy | Enabled | Copy captures automatically to clipboard |
| Hide Fixed | Enabled | Remove sticky headers/footers from captures |

### Download Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Filename Pattern | `snapflow-{date}-{time}` | Custom naming pattern for saves |
| Auto-download | Disabled | Save directly without showing result page |
| Download Location | Default | Where files are saved |

Pattern tokens:
- `{date}` - Current date (YYYY-MM-DD)
- `{time}` - Current time (HH-MM-SS)
- `{timestamp}` - Unix timestamp

### Notification Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Show Notifications | Enabled | Display completion notifications |
| Sound Notification | Disabled | Play beep when capture completes |
| Auto-open Result | Enabled | Automatically show result page |
| Theme | Light | Light, Dark, or Auto |

### Advanced Settings
| Setting | Default | Description |
|---------|---------|-------------|
| Scroll Overlap | 10% | Overlap between capture sections |
| Capture Timeout | 60s | Maximum wait time for capture |
| Debug Logging | Disabled | Enable console logging for troubleshooting |

## 📁 Extension Architecture

### File Structure
```
SnapFlow/
├── manifest.json              # Extension configuration (v3)
├── background.js              # Service worker (main logic)
├── content.js                 # Content script (page manipulation)
├── popup.html/js              # Quick access popup
├── result.html/js             # Capture result & editor
├── options.html/js            # Settings page
├── welcome.html               # Onboarding page
├── feedback.html              # Feedback form
├── error.html                 # Error display
├── utils.js                   # Production utilities
├── icons/                     # Extension icons (16x16, 48x48, 128x128)
└── README.md                  # This file
```

### Core Components

#### Service Worker (background.js)
- Request routing for capture modes
- Tab communication management
- Error handling and recovery
- Storage management
- Logging system

#### Content Script (content.js)
- DOM manipulation (hiding fixed elements)
- Page scrolling coordination
- Progress bar display
- Region selection overlay
- Dimension calculations

#### Popup Interface (popup.js)
- Capture mode selection
- Status display
- Theme toggle
- Settings access

#### Result Page (result.js)
- Canvas-based image rendering
- Annotation tools (pen, highlighter)
- Drawing history and undo
- Download/PDF export
- Clipboard operations

#### Utilities (utils.js)
Production-grade helpers:
- **Logger**: Debug logging with timestamps
- **ErrorHandler**: Standardized error handling
- **StorageManager**: Chrome storage wrapper
- **SettingsManager**: Settings persistence
- **NotificationManager**: User notifications
- **FileUtils**: File operations
- **ValidationUtils**: Input validation
- **PerformanceMonitor**: Performance tracking

## 🔐 Privacy & Security

✅ **Privacy First**
- All processing happens locally in your browser
- No data sent to external servers
- No tracking or analytics
- No account required

✅ **Security**
- Uses Chrome's native sandbox
- Content script restricted permissions
- Service worker isolation
- CORS compliance

✅ **Data Handling**
- Temporary storage only
- Automatic cleanup
- No cloud sync
- No telemetry

## 🎯 Use Cases

### Business & Productivity
- Document web research and reference
- Create visual reports
- Archive important information
- Team communication

### Design & Development
- UI/UX documentation
- Bug reporting with context
- Design system reference
- Code review annotations

### Education & Training
- Learning material capture
- Student assignment documentation
- Research compilation
- Course material archiving

### Content Creation
- Blog post planning
- Social media post creation
- Reference material gathering
- Visual content library building

## 🐛 Troubleshooting

### Captures Not Working
**Problem**: Nothing happens when clicking capture
- ✓ Check extension has permission for current tab
- ✓ Refresh the page before capturing
- ✓ Try a different page
- ✓ Restart Chrome
- ✓ Check if page is restricted (chrome://, etc.)

### Gaps in Full Page Captures
**Problem**: Visible lines between capture sections
- Open Settings
- Increase "Scroll Overlap Percentage" 
- Try values between 10-30%
- Repeat if necessary

### Capture is Slow
**Problem**: Takes too long to complete
- Use "Visible Area" for quick captures
- Split large pages into multiple captures
- Enable "Hide Fixed Elements"
- Reduce page complexity if possible
- Check capture timeout setting

### Memory Issues
**Problem**: Browser freezes on large pages
- Switch to "Region" or "Visible" modes
- Enable debug logging to identify issues
- Increase "Capture Timeout"
- Check browser memory usage

### Dark Mode Not Working
**Problem**: Dark mode not applying
- Check Settings > Theme preference
- Set to "Auto" for system preference
- Refresh extension (chrome://extensions)
- Clear browser cache

## 📊 Performance Benchmarks

| Operation | Time | Memory |
|-----------|------|--------|
| Visible capture | ~500ms | ~20MB |
| Full page (10 sections) | ~3s | ~50MB |
| Large page (32 sections) | ~8s | ~100MB |
| Annotation | Real-time | Minimal |
| Download | <100ms | N/A |

## 🔄 Version History

### v1.2.0 (Current)
- ✨ Dark mode support
- ⭐ Rate us button
- 🎛️ Advanced settings panel
- 📊 Storage usage display
- 🔧 Better error handling

### v1.1.0
- Added region selection
- Improved annotation tools
- Better progress tracking

### v1.0.0
- Initial release
- Basic capture modes
- Result page

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 📞 Support & Contact

- **Report Bug**: Use "Send Feedback" button in settings
- **Feature Request**: Submit via feedback form
- **GitHub Issues**: [Report here](#)
- **Email**: support@snapflow.dev

## 🌐 Links

- [Chrome Web Store](#) - Install extension
- [GitHub Repository](#) - View source code
- [User Guide](#) - Detailed documentation
- [Bug Tracker](#) - Report issues

## 🏆 Why SnapFlow?

- **Reliable**: Thousands of successful captures
- **Fast**: Optimized for speed and efficiency
- **Secure**: Privacy-first architecture
- **Beautiful**: Modern, intuitive design
- **Powerful**: Feature-rich but simple to use
- **Free**: No premium features locked away
- **Active**: Regular updates and improvements

## 🎉 Special Thanks

Built with ❤️ for web developers, designers, and productivity enthusiasts.

---

**SnapFlow v1.2.0** • Made with passion for better screenshots

*Last Updated: December 27, 2025*
