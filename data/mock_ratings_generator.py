import json
import random
import csv
import os

def generate_mock_ratings():
    anime_file = "anime_seed.json"
    if not os.path.exists(anime_file):
        print(f"Error: {anime_file} not found. Please run fetch_anime_seed.py first or ensure the seed file exists.")
        return

    with open(anime_file, "r", encoding="utf-8") as f:
        anime_data = json.load(f)

    if not anime_data:
        print("Error: anime_seed.json is empty.")
        return

    print(f"Loaded {len(anime_data)} anime from seed.")

    # All unique genres
    all_genres = set()
    for item in anime_data:
        genres = [g.strip() for g in item["genres"].split(",") if g.strip()]
        all_genres.update(genres)
    all_genres = list(all_genres)
    print(f"Extracted {len(all_genres)} unique genres.")

    num_users = 100
    ratings = []

    # Let's generate user profiles
    # Each user has 1-3 favorite genres and a preferred score range
    user_profiles = {}
    for user_id in range(1, num_users + 1):
        fav_genres = random.sample(all_genres, k=random.randint(1, 3))
        # Some users are easy raters (7-10), some are harsh (4-9)
        base_high = random.choice([True, False])
        user_profiles[user_id] = {
            "fav_genres": fav_genres,
            "base_high": base_high
        }

    # Generate ratings
    # Let's ensure each user rates 30 to 80 anime
    for user_id, profile in user_profiles.items():
        fav_genres = profile["fav_genres"]
        base_high = profile["base_high"]

        # Number of anime this user will rate
        num_to_rate = random.randint(30, 80)
        
        # We select anime to rate. To make the matrix decomposition interesting,
        # we make users rate their favorite genres with 60% probability, and other genres with 40% probability.
        liked_anime = []
        other_anime = []

        for anime in anime_data:
            anime_genres = [g.strip() for g in anime["genres"].split(",") if g.strip()]
            has_fav_genre = any(g in fav_genres for g in anime_genres)
            if has_fav_genre:
                liked_anime.append(anime)
            else:
                other_anime.append(anime)

        # Select target anime list
        rated_anime = []
        if len(liked_anime) > 0:
            num_fav_rated = min(int(num_to_rate * 0.65), len(liked_anime))
            rated_anime.extend(random.sample(liked_anime, k=num_fav_rated))
        
        num_other_rated = min(num_to_rate - len(rated_anime), len(other_anime))
        if num_other_rated > 0:
            rated_anime.extend(random.sample(other_anime, k=num_other_rated))

        # Assign ratings
        for anime in rated_anime:
            anime_genres = [g.strip() for g in anime["genres"].split(",") if g.strip()]
            has_fav_genre = any(g in fav_genres for g in anime_genres)

            if has_fav_genre:
                # High ratings for favorite genres
                score = random.randint(8, 10) if base_high else random.randint(7, 9)
            else:
                # Standard ratings
                score = random.randint(6, 9) if base_high else random.randint(5, 8)
                # Apply anime's own quality factor (higher score anime generally get better ratings)
                if anime["score"] > 8.5 and random.random() > 0.3:
                    score = min(10, score + 1)
                elif anime["score"] < 7.0 and random.random() > 0.3:
                    score = max(1, score - 2)

            ratings.append({
                "user_id": user_id,
                "anime_id": anime["id"],
                "rating": score
            })

    output_path = "mock_ratings.csv"
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["user_id", "anime_id", "rating"])
        writer.writeheader()
        writer.writerows(ratings)

    print(f"Generated {len(ratings)} mock ratings for {num_users} users and saved to {output_path}.")

if __name__ == "__main__":
    generate_mock_ratings()
