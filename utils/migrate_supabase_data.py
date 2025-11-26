#!/usr/bin/env python3
"""
Migrate data from Supabase CSV exports to BoardTally JSON format.

This script reads CSV exports from the old Supabase database and converts them
to the JSON format used by BoardTally.
"""

import csv
import json
import os
import random
import secrets
from datetime import datetime

# Base62 characters for ID generation
BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

# Preset colors from AddPlayer.tsx
PRESET_COLORS = [
    '#ef4444',  # red
    '#f97316',  # orange
    '#eab308',  # yellow
    '#22c55e',  # green
    '#14b8a6',  # teal
    '#3b82f6',  # blue
    '#8b5cf6',  # violet
    '#ec4899',  # pink
    '#6366f1',  # indigo
    '#06b6d4',  # cyan
    '#92400e',  # brown
    '#1f2937',  # dark gray / black
    '#64748b',  # slate
    '#84cc16',  # lime
]

def generate_base62_id():
    """Generate a random 64-bit ID as a Base62 string."""
    # Generate 8 random bytes (64 bits)
    random_bytes = secrets.token_bytes(8)
    num = int.from_bytes(random_bytes, byteorder='big')
    
    if num == 0:
        return '0'
    
    result = ''
    base = len(BASE62_CHARS)
    while num > 0:
        result = BASE62_CHARS[num % base] + result
        num //= base
    
    return result

def read_csv(filepath):
    """Read a CSV file and return a list of dictionaries."""
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def parse_date(date_str):
    """Parse a date string and return YYYY-MM-DD format."""
    if not date_str:
        return None
    
    # Handle various date formats
    try:
        # Format: "2025-01-15 22:33:41.110092+00" or "2025-01-15 00:00:00+00"
        dt = datetime.fromisoformat(date_str.replace('+00', '+00:00'))
        return dt.strftime('%Y-%m-%d')
    except ValueError:
        try:
            # Try just the date part
            dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            print(f"Warning: Could not parse date: {date_str}")
            return date_str[:10] if len(date_str) >= 10 else date_str

def parse_score(score_str):
    """Parse a score string, returning None for empty/null scores."""
    if not score_str or score_str.strip() == '':
        return None
    try:
        # Handle decimal scores like "43.00"
        score = float(score_str)
        # If it's a whole number, return as int
        if score == int(score):
            return int(score)
        return score
    except ValueError:
        return None

def main():
    # Paths to CSV files
    downloads_dir = os.path.expanduser('~/Downloads')
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    profiles_file = os.path.join(downloads_dir, 'profiles_rows.csv')
    games_file = os.path.join(downloads_dir, 'games_rows.csv')
    game_scores_file = os.path.join(downloads_dir, 'game_scores_rows.csv')
    score_participants_file = os.path.join(downloads_dir, 'score_participants_rows.csv')
    expansions_file = os.path.join(downloads_dir, 'expansions_rows.csv')
    session_expansions_file = os.path.join(downloads_dir, 'session_expansions_rows.csv')
    
    print("Reading CSV files...")
    
    # Read all CSV data
    profiles = read_csv(profiles_file)
    games = read_csv(games_file)
    game_scores = read_csv(game_scores_file)
    score_participants = read_csv(score_participants_file)
    expansions = read_csv(expansions_file)
    session_expansions = read_csv(session_expansions_file)
    
    print(f"  - {len(profiles)} profiles")
    print(f"  - {len(games)} games")
    print(f"  - {len(game_scores)} game scores")
    print(f"  - {len(score_participants)} score participants")
    print(f"  - {len(expansions)} expansions")
    print(f"  - {len(session_expansions)} session expansions")
    
    # Create mappings
    print("\nCreating mappings...")
    
    # Map old profile UUID -> new Base62 ID
    profile_id_map = {}
    for profile in profiles:
        profile_id_map[profile['id']] = generate_base62_id()
    
    # Map game internal ID -> { bgg_id, name }
    game_map = {}
    for game in games:
        game_map[game['id']] = {
            'bgg_id': int(game['bgg_id']),
            'name': game['name']
        }
    
    # Map expansion internal ID -> { bgg_id, name }
    expansion_map = {}
    for exp in expansions:
        expansion_map[exp['id']] = {
            'bgg_id': int(exp['bgg_id']),
            'name': exp['name']
        }
    
    # Map score_id -> list of expansion { id, name }
    score_expansions_map = {}
    for se in session_expansions:
        score_id = se['score_id']
        exp_id = se['expansion_id']
        if exp_id in expansion_map:
            exp_info = expansion_map[exp_id]
            if score_id not in score_expansions_map:
                score_expansions_map[score_id] = []
            score_expansions_map[score_id].append({
                'id': exp_info['bgg_id'],
                'name': exp_info['name']
            })
    
    # Map score_id -> list of participants
    score_participants_map = {}
    for sp in score_participants:
        score_id = sp['score_id']
        if score_id not in score_participants_map:
            score_participants_map[score_id] = []
        score_participants_map[score_id].append({
            'player_id': sp['player_id'],
            'score': parse_score(sp['score']),
            'winner': sp['winner'].lower() == 'true'
        })
    
    # Generate players.json
    print("\nGenerating players.json...")
    shuffled_colors = PRESET_COLORS.copy()
    random.shuffle(shuffled_colors)
    
    players_json = []
    for i, profile in enumerate(profiles):
        old_id = profile['id']
        new_id = profile_id_map[old_id]
        color = shuffled_colors[i % len(shuffled_colors)]
        
        players_json.append({
            'id': new_id,
            'name': profile['username'],
            'color': color
        })
        print(f"  {profile['username']}: {old_id[:8]}... -> {new_id}")
    
    # Generate scores.json
    print("\nGenerating scores.json...")
    scores_json = []
    skipped_scores = 0
    
    for gs in game_scores:
        score_id = gs['id']
        game_id = gs['game_id']
        
        # Skip if game not found
        if game_id not in game_map:
            print(f"  Warning: Game ID {game_id} not found, skipping score {score_id[:8]}...")
            skipped_scores += 1
            continue
        
        game_info = game_map[game_id]
        
        # Get participants for this score
        participants = score_participants_map.get(score_id, [])
        if not participants:
            print(f"  Warning: No participants for score {score_id[:8]}..., skipping")
            skipped_scores += 1
            continue
        
        # Map participants to new player IDs
        players_list = []
        valid_score = True
        for p in participants:
            if p['player_id'] not in profile_id_map:
                print(f"  Warning: Player {p['player_id'][:8]}... not found, skipping score {score_id[:8]}...")
                valid_score = False
                break
            
            players_list.append({
                'playerId': profile_id_map[p['player_id']],
                'score': p['score'],
                'isWinner': p['winner']
            })
        
        if not valid_score:
            skipped_scores += 1
            continue
        
        # Get expansions for this score
        expansions_list = score_expansions_map.get(score_id, [])
        
        # Parse date
        played_at = parse_date(gs['played_at'])
        
        scores_json.append({
            'id': generate_base62_id(),
            'date': played_at,
            'gameId': game_info['bgg_id'],
            'gameName': game_info['name'],
            'expansions': expansions_list,
            'players': players_list
        })
    
    # Sort scores by date (most recent first)
    scores_json.sort(key=lambda x: x['date'] if x['date'] else '', reverse=True)
    
    print(f"  Generated {len(scores_json)} scores ({skipped_scores} skipped)")
    
    # Write output files
    print("\nWriting output files...")
    
    players_output = os.path.join(data_dir, 'players.json')
    scores_output = os.path.join(data_dir, 'scores.json')
    
    with open(players_output, 'w', encoding='utf-8') as f:
        json.dump(players_json, f, separators=(',', ':'), ensure_ascii=False)
    print(f"  Wrote {players_output}")
    
    with open(scores_output, 'w', encoding='utf-8') as f:
        json.dump(scores_json, f, separators=(',', ':'), ensure_ascii=False)
    print(f"  Wrote {scores_output}")
    
    # Print summary
    print("\n" + "="*50)
    print("Migration Summary")
    print("="*50)
    print(f"Players: {len(players_json)}")
    print(f"Scores: {len(scores_json)}")
    print(f"Scores with expansions: {sum(1 for s in scores_json if s['expansions'])}")
    print(f"Scores skipped: {skipped_scores}")
    
    # Count unique games played
    unique_games = set(s['gameId'] for s in scores_json)
    print(f"Unique games played: {len(unique_games)}")
    
    # Print player mapping for reference
    print("\nPlayer ID Mapping:")
    for profile in profiles:
        old_id = profile['id']
        new_id = profile_id_map[old_id]
        print(f"  {profile['username']:20} {old_id} -> {new_id}")

if __name__ == '__main__':
    main()

