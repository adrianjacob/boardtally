import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

admin.initializeApp();

const storage = admin.storage();
// const db = admin.firestore(); // Available if needed for database operations

/**
 * Fetch a game thumbnail from BoardGameGeek and store it in Firebase Storage.
 * Called when adding a new game that doesn't have a thumbnail yet.
 */
export const fetchGameThumbnail = functions.https.onCall(async (data, context) => {
  const { gameId, gameName } = data;

  if (!gameId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "gameId is required"
    );
  }

  const bucket = storage.bucket();
  const filePath = `game-images/${gameId}.jpg`;
  const file = bucket.file(filePath);

  // Check if image already exists
  const [exists] = await file.exists();
  if (exists) {
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "2030-01-01",
    });
    return { url, cached: true };
  }

  console.log(`Fetching thumbnail for ${gameName} (ID: ${gameId})...`);

  // Fetch the BGG game page to get og:image
  const pageUrl = `https://boardgamegeek.com/boardgame/${gameId}`;
  const pageResponse = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!pageResponse.ok) {
    throw new functions.https.HttpsError(
      "not-found",
      `Failed to fetch BGG page: ${pageResponse.status}`
    );
  }

  const html = await pageResponse.text();

  // Extract og:image URL
  const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (!match) {
    // Try alternate format
    const altMatch = html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/);
    if (!altMatch) {
      throw new functions.https.HttpsError(
        "not-found",
        "Could not find thumbnail on BGG page"
      );
    }
  }

  const thumbnailUrl = match ? match[1] : "";

  // Download the image
  const imageResponse = await fetch(thumbnailUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!imageResponse.ok) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to download image: ${imageResponse.status}`
    );
  }

  const imageBuffer = await imageResponse.buffer();

  // Upload to Firebase Storage
  await file.save(imageBuffer, {
    metadata: {
      contentType: "image/jpeg",
      metadata: {
        gameId: String(gameId),
        gameName: gameName || "Unknown",
      },
    },
  });

  // Make the file publicly readable
  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

  console.log(`Saved thumbnail for ${gameName} to ${publicUrl}`);

  return { url: publicUrl, cached: false };
});

/**
 * Firestore trigger: When a new score is added, check if we need to fetch the game thumbnail.
 */
export const onScoreCreated = functions.firestore
  .document("scores/{scoreId}")
  .onCreate(async (snap, context) => {
    const score = snap.data();
    const { gameId, gameName } = score;

    // Check if we already have the thumbnail
    const bucket = storage.bucket();
    const file = bucket.file(`game-images/${gameId}.jpg`);
    const [exists] = await file.exists();

    if (exists) {
      console.log(`Thumbnail already exists for ${gameName}`);
      return null;
    }

    // Fetch the thumbnail
    console.log(`New game detected: ${gameName}. Fetching thumbnail...`);

    try {
      const pageUrl = `https://boardgamegeek.com/boardgame/${gameId}`;
      const pageResponse = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!pageResponse.ok) {
        console.error(`Failed to fetch BGG page: ${pageResponse.status}`);
        return null;
      }

      const html = await pageResponse.text();
      const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);

      if (!match) {
        console.error("Could not find og:image on BGG page");
        return null;
      }

      const thumbnailUrl = match[1];
      const imageResponse = await fetch(thumbnailUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!imageResponse.ok) {
        console.error(`Failed to download image: ${imageResponse.status}`);
        return null;
      }

      const imageBuffer = await imageResponse.buffer();

      await file.save(imageBuffer, {
        metadata: {
          contentType: "image/jpeg",
          metadata: {
            gameId: String(gameId),
            gameName: gameName || "Unknown",
          },
        },
      });

      await file.makePublic();

      console.log(`Successfully saved thumbnail for ${gameName}`);
      return null;
    } catch (error) {
      console.error(`Error fetching thumbnail for ${gameName}:`, error);
      return null;
    }
  });

