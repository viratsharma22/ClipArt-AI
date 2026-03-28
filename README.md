# ✨ ClipArt AI

> Transform yourself into stunning AI art in 5 unique styles — built in 20 hours by a first-time React Native developer.

![ClipArt AI](https://img.shields.io/badge/Platform-Android-green) ![React Native](https://img.shields.io/badge/Built%20With-React%20Native-blue) ![AI Powered](https://img.shields.io/badge/Powered%20By-AI-purple)

## 📱 Download APK
[Download Latest APK](https://drive.google.com/file/d/1j1tOXLQcBybrTSD1XUnaa3idsoT9Ik1V/view?usp=drivesdk)

## 🎥 Screen Recording
[Watch Demo](https://drive.google.com/file/d/17b8XWEtB71DulFlH_gF8tWIksRTBgTAx/view?usp=drivesdk)

## ✨ Features
- 📷 Upload photo from Camera or Gallery
- 🎨 Generate 5 art styles in parallel:
  - 🎭 Cartoon (Disney Pixar style)
  - ⛩️ Anime (Studio Ghibli style)
  - 🕹️ Pixel Art (16-bit retro)
  - ✏️ Sketch (pencil drawing)
  - 🎯 Flat Illustration (vector art)
- ✨ Magic loading messages while generating
- 🔄 Compare original vs generated
- 📤 Share your art instantly
- 🔁 Reset and try again

## 🛠️ Tech Stack
- React Native + Expo
- Replicate API (flux-schnell model)
- ClipDrop API
- expo-image-picker
- expo-file-system

## 🚀 Setup Steps
1. Clone the repo
```
git clone https://github.com/viratsharma22/clipart-ai.git
cd clipart-ai
```
2. Install dependencies
```
npm install
```
3. Add your API keys in a .env file:
   - REPLICATE_API_TOKEN=your_token
   - CLIPDROP_API_KEY=your_key
4. Run the app
```
npx expo start
```

## 🧠 Tech Decisions
- **Expo** over bare React Native — faster setup, easier builds
- **flux-schnell** model — fastest and cheapest on Replicate
- **Sequential generation** with 12s delay — handles Replicate rate limits gracefully
- **Magic loading messages** — turns API wait time into a delightful UX moment

## ⚖️ Tradeoffs
- Text-to-image instead of image-to-image due to API credit limits — future upgrade path is clear
- Sequential generation is slower but more reliable than parallel with rate limits
- Expo managed workflow limits some native customization but speeds up development significantly

## 💡 Built By
Virat Sharma — built this entire app in 20 hours with zero prior React Native experience, using AI tools and pure determination.

> Flickd — please hire me, I ship fast 🚀
