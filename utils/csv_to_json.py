#!/usr/bin/env python3
"""
Convert boardgames_ranks.csv to separate JSON files for base games and expansions.

This script reads the CSV file and creates two JSON files:
- base.json: All games where is_expansion = 0 (base games)
- expansions.json: All games where is_expansion = 1 (expansions)

Each JSON file contains only the id and name fields.

Usage:
    python utils/csv_to_json.py

Run from the project root directory.
"""

import csv
import json
from pathlib import Path


def convert_csv_to_json():
    # Get the project root (parent of utils folder)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    data_dir = project_root / "data"

    csv_file = data_dir / "boardgames_ranks.csv"
    base_json = data_dir / "base.json"
    expansions_json = data_dir / "expansions.json"

    base_games = []
    expansions = []

    print(f"Reading from: {csv_file}")

    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            game = {"id": int(row["id"]), "name": row["name"]}
            if row["is_expansion"] == "0":
                base_games.append(game)
            elif row["is_expansion"] == "1":
                expansions.append(game)

    with open(base_json, "w", encoding="utf-8") as f:
        json.dump(base_games, f, separators=(",", ":"), ensure_ascii=False)

    with open(expansions_json, "w", encoding="utf-8") as f:
        json.dump(expansions, f, separators=(",", ":"), ensure_ascii=False)

    print(f"Base games: {len(base_games)} -> {base_json}")
    print(f"Expansions: {len(expansions)} -> {expansions_json}")


if __name__ == "__main__":
    convert_csv_to_json()

