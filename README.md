# 🎲 BoardTally

A board game scoring app built with React + Firebase.

**Live**: https://boardtally.web.app

---

## Local Development

### Prerequisites

- Node.js 18+
- PNPM (`npm install -g pnpm`)
- Java (required for Firebase emulators)

### Setup

```bash
# Install dependencies
pnpm install

# Install functions dependencies
cd functions && npm install && cd ..
```

### Run Locally

You need **two terminals**:

**Terminal 1** - Start Firebase emulators:

```bash
pnpm emulators
```

**Terminal 2** - Start dev server:

```bash
pnpm dev
```

Open http://localhost:5173

### Seed Local Data (optional)

If your emulator is empty:

```bash
pnpm seed
```

---

## Deploy to Production

```bash
pnpm deploy
```

This builds the app and deploys to Firebase Hosting.

---

## Other Commands

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Start local dev server       |
| `pnpm build`     | Build for production         |
| `pnpm emulators` | Start Firebase emulators     |
| `pnpm seed`      | Seed emulator with test data |
| `pnpm deploy`    | Build & deploy to production |

### Deploy specific services

```bash
# Deploy only hosting (app code)
npx firebase deploy --only hosting

# Deploy Firestore rules
npx firebase deploy --only firestore:rules

# Deploy Storage rules
npx firebase deploy --only storage

# Deploy Cloud Functions
npx firebase deploy --only functions

# Deploy everything
npx firebase deploy
```

---

## Project Structure

```
boardtally/
├── src/                  # React app source
│   ├── components/       # UI components
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Firebase config
│   ├── pages/            # Page components
│   └── utils/            # Utility functions
├── functions/            # Firebase Cloud Functions
├── data/                 # JSON data files (for seeding)
├── public/game-images/   # Local game thumbnails
└── scripts/              # Build/migration scripts
```

---

## Firebase Console

- **Project**: https://console.firebase.google.com/project/boardtally
- **Firestore**: View/edit database
- **Storage**: View uploaded images
- **Functions**: View logs & deployed functions
- **Hosting**: View deployment history
