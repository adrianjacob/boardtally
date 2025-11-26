#!/usr/bin/env python3
"""
Fetch board game thumbnails from Board Game Geek and save locally.

This script:
1. Reads scores.json to find all unique game IDs that have been played
2. Scrapes the BGG game page to get the og:image thumbnail
3. Downloads and saves images to public/game-images/

Usage:
    python utils/fetch_thumbnails.py

Run from the project root directory.
"""

import json
import re
import ssl
import time
import urllib.request
from pathlib import Path

# Create SSL context that doesn't verify certificates (for environments with cert issues)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def get_played_game_ids() -> list[dict]:
    """Get unique games from scores.json."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    scores_file = project_root / "data" / "scores.json"

    with open(scores_file, "r", encoding="utf-8") as f:
        scores = json.load(f)

    # Get unique games (id and name)
    games = {}
    for score in scores:
        game_id = score["gameId"]
        if game_id not in games:
            games[game_id] = score["gameName"]

    return [{"id": gid, "name": name} for gid, name in games.items()]


def fetch_thumbnail_url(game_id: int) -> str | None:
    """Fetch thumbnail URL by scraping the BGG game page for og:image."""
    url = f"https://boardgamegeek.com/boardgame/{game_id}"

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            html = response.read().decode("utf-8")
            
            # Look for og:image meta tag
            match = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html)
            if match:
                return match.group(1)
            
            # Try alternate format
            match = re.search(r'<meta\s+content="([^"]+)"\s+property="og:image"', html)
            if match:
                return match.group(1)
                
    except Exception as e:
        print(f"  Error fetching page: {e}")

    return None


def download_image(url: str, save_path: Path) -> bool:
    """Download image from URL and save to path."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30, context=ssl_context) as response:
            image_data = response.read()
            with open(save_path, "wb") as f:
                f.write(image_data)
            return True
    except Exception as e:
        print(f"  Error downloading image: {e}")
        return False


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    images_dir = project_root / "public" / "game-images"

    # Create images directory if it doesn't exist
    images_dir.mkdir(parents=True, exist_ok=True)

    games = get_played_game_ids()
    print(f"Found {len(games)} unique games in scores.json\n")

    for game in games:
        game_id = game["id"]
        game_name = game["name"]
        
        # Try both jpg and png extensions
        image_path = images_dir / f"{game_id}.jpg"

        # Skip if image already exists
        if image_path.exists():
            print(f"✓ {game_name} (already exists)")
            continue

        print(f"Fetching: {game_name} (ID: {game_id})...")

        # Fetch thumbnail URL from BGG page
        thumbnail_url = fetch_thumbnail_url(game_id)
        if not thumbnail_url:
            print(f"  ✗ No thumbnail found")
            continue

        print(f"  Found: {thumbnail_url[:60]}...")

        # Download the image
        if download_image(thumbnail_url, image_path):
            print(f"  ✓ Saved to {image_path.name}")
        else:
            print(f"  ✗ Failed to download")

        # Be nice to BGG's servers - wait between requests
        time.sleep(2)

    print("\nDone!")


def fetch_single_game(game_id: int, game_name: str = "Unknown"):
    """
    Fetch thumbnail for a single game.
    Call this when adding a new game to scores.
    """
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    images_dir = project_root / "public" / "game-images"
    images_dir.mkdir(parents=True, exist_ok=True)

    image_path = images_dir / f"{game_id}.jpg"

    if image_path.exists():
        print(f"Image already exists for {game_name}")
        return True

    print(f"Fetching thumbnail for {game_name} (ID: {game_id})...")
    thumbnail_url = fetch_thumbnail_url(game_id)

    if thumbnail_url and download_image(thumbnail_url, image_path):
        print(f"✓ Saved {image_path.name}")
        return True

    print(f"✗ Failed to fetch thumbnail")
    return False


if __name__ == "__main__":
    main()

