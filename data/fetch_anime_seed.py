import json
import time
import urllib.request
import urllib.error

def fetch_top_anime(pages=20):
    anime_list = []
    print(f"Starting fetch of top {pages * 25} anime from Jikan API...")

    for page in range(1, pages + 1):
        url = f"https://api.jikan.moe/v4/top/anime?page={page}"
        print(f"Fetching page {page}/{pages}...")
        
        retries = 3
        data = None
        while retries > 0:
            try:
                # Add user-agent to prevent blocks
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req) as response:
                    data = json.loads(response.read().decode())
                break
            except urllib.error.HTTPError as e:
                if e.code == 429: # Rate limit
                    print("Rate limit hit, sleeping for 4 seconds...")
                    time.sleep(4)
                else:
                    print(f"HTTP Error {e.code} on page {page}, retrying...")
                    time.sleep(2)
                retries -= 1
            except Exception as e:
                print(f"Error: {e}, retrying...")
                time.sleep(2)
                retries -= 1

        if not data or 'data' not in data:
            print(f"Failed to fetch page {page} after retries.")
            continue

        for item in data['data']:
            # Combine genres, themes, and demographics into a single genres string
            genres_list = []
            for g in item.get('genres', []):
                genres_list.append(g.get('name'))
            for t in item.get('themes', []):
                genres_list.append(t.get('name'))
            for d in item.get('demographics', []):
                genres_list.append(d.get('name'))
            
            genres_str = ", ".join(filter(None, genres_list))
            
            # Get studio
            studio_list = [s.get('name') for s in item.get('studios', [])]
            studio_str = ", ".join(studio_list) if studio_list else "Unknown Studio"
            
            # Extract year
            year = item.get('year')
            if not year and item.get('aired') and item['aired'].get('prop') and item['aired']['prop'].get('from'):
                year = item['aired']['prop']['from'].get('year')
            if not year:
                year = 2000 # Fallback
                
            anime_entry = {
                "id": item.get('mal_id'),
                "title": item.get('title_english') or item.get('title') or "Unknown Title",
                "synopsis": item.get('synopsis') or "No synopsis available.",
                "genres": genres_str,
                "studio": studio_str,
                "releaseYear": int(year),
                "episodes": int(item.get('episodes') or 0),
                "rating": item.get('rating') or "PG-13",
                "score": float(item.get('score') or 0.0),
                "popularity": int(item.get('popularity') or 0),
                "imageUrl": item.get('images', {}).get('jpg', {}).get('large_image_url') or item.get('images', {}).get('jpg', {}).get('image_url') or "",
                "status": item.get('status') or "Finished Airing"
            }
            anime_list.append(anime_entry)

        # Sleep to comply with Jikan's rate limit of 3 requests per second
        time.sleep(2)

    output_path = "anime_seed.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(anime_list, f, indent=2, ensure_ascii=False)
    print(f"Scraped {len(anime_list)} anime entries and saved to {output_path}.")

if __name__ == "__main__":
    fetch_top_anime(20) # Scrapes 20 pages * 25 = 500 anime
