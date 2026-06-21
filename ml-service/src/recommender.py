import os
import json
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD

class AnimeRecommender:
    def __init__(self):
        self.anime_df = None
        self.ratings_df = None
        self.tfidf_matrix = None
        self.cosine_sim = None
        self.svd_model = None
        self.user_item_matrix = None
        self.predicted_ratings_df = None
        self.user_means = None
        
        # Paths
        self.data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
        self.anime_path = os.path.join(self.data_dir, "anime_seed.json")
        self.ratings_path = os.path.join(self.data_dir, "mock_ratings.csv")

    def load_data(self):
        print("Loading recommender dataset...")
        if not os.path.exists(self.anime_path):
            raise FileNotFoundError(f"Anime seed file not found at: {self.anime_path}")
            
        with open(self.anime_path, "r", encoding="utf-8") as f:
            anime_data = json.load(f)
            
        self.anime_df = pd.DataFrame(anime_data)
        print(f"Loaded {len(self.anime_df)} anime titles.")

        if os.path.exists(self.ratings_path):
            self.ratings_df = pd.read_csv(self.ratings_path)
            print(f"Loaded {len(self.ratings_df)} user ratings.")
        else:
            print("Ratings file not found. Collaborative filtering will be unavailable until ratings are generated.")
            self.ratings_df = pd.DataFrame(columns=["user_id", "anime_id", "rating"])

    def train(self):
        if self.anime_df is None or len(self.anime_df) == 0:
            self.load_data()
            
        self._train_content_filtering()
        self._train_collaborative_filtering()
        print("Recommender training complete!")

    def _train_content_filtering(self):
        print("Training Content-Based Filtering Model...")
        # Create metadata soup: combine genres, synopsis, studio, rating
        self.anime_df['metadata_soup'] = (
            self.anime_df['genres'].fillna('') + ' ' +
            self.anime_df['synopsis'].fillna('') + ' ' +
            self.anime_df['studio'].fillna('') + ' ' +
            self.anime_df['rating'].fillna('')
        )
        
        # Calculate TF-IDF
        self.tfidf = TfidfVectorizer(stop_words='english', min_df=2)
        self.tfidf_matrix = self.tfidf.fit_transform(self.anime_df['metadata_soup'])
        self.cosine_sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)
        print("Content similarity matrix computed.")

    def _train_collaborative_filtering(self):
        if self.ratings_df is None or len(self.ratings_df) == 0:
            print("Skipping collaborative filtering training (no ratings).")
            return

        print("Training Collaborative Filtering (SVD) Model...")
        # Build pivot table user-item
        # Rows: user_id, Columns: anime_id, Values: rating
        self.user_item_matrix = self.ratings_df.pivot(index='user_id', columns='anime_id', values='rating')
        
        # Fill missing ratings with user average rating
        self.user_means = self.user_item_matrix.mean(axis=1)
        # Handle case where user has no ratings
        self.user_means = self.user_means.fillna(5.0)
        
        # Subtract user mean to normalize (center ratings around 0)
        normalized_matrix = self.user_item_matrix.sub(self.user_means, axis=0).fillna(0)
        
        # SVD decomposition
        n_components = min(12, normalized_matrix.shape[1] - 1)
        if n_components < 2:
            print("Too few components for SVD. Skipping Collaborative SVD.")
            return

        self.svd_model = TruncatedSVD(n_components=n_components, random_state=42)
        latent_matrix = self.svd_model.fit_transform(normalized_matrix)
        
        # Reconstruct matrix
        reconstructed = self.svd_model.inverse_transform(latent_matrix)
        reconstructed_df = pd.DataFrame(
            reconstructed,
            index=normalized_matrix.index,
            columns=normalized_matrix.columns
        )
        
        # Add user mean back
        self.predicted_ratings_df = reconstructed_df.add(self.user_means, axis=0)
        print(f"Collaborative matrix SVD trained. Dimensions: {self.predicted_ratings_df.shape}")

    def get_similar_anime(self, anime_id, top_n=10):
        if self.cosine_sim is None:
            self.train()
            
        # Find index of this anime
        idx_series = self.anime_df[self.anime_df['id'] == int(anime_id)]
        if idx_series.empty:
            return []
            
        idx = idx_series.index[0]
        
        # Get pairwise similarity scores
        sim_scores = list(enumerate(self.cosine_sim[idx]))
        
        # Sort by similarity
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        
        # Exclude self (index 0 is self since similarity is 1.0)
        sim_scores = sim_scores[1:top_n+1]
        
        # Get anime details
        similar_list = []
        for index, score in sim_scores:
            anime_row = self.anime_df.iloc[index]
            similar_list.append({
                "id": int(anime_row['id']),
                "title": anime_row['title'],
                "genres": anime_row['genres'],
                "studio": anime_row['studio'],
                "score": float(anime_row['score']),
                "imageUrl": anime_row['imageUrl'],
                "releaseYear": int(anime_row['releaseYear']),
                "similarity_score": float(score)
            })
            
        return similar_list

    def get_hybrid_recommendations(self, user_id=None, user_history=None, top_n=10):
        """
        user_history: list of dicts [{"anime_id": 10, "rating": 9}, ...]
        Returns hybrid recommendations: 40% Content, 40% Collaborative, 20% Popularity
        """
        if self.anime_df is None:
            self.train()

        user_history_ids = set()
        user_ratings_dict = {}
        if user_history:
            for item in user_history:
                aid = int(item["anime_id"])
                user_history_ids.add(aid)
                if "rating" in item and item["rating"] is not None:
                    user_ratings_dict[aid] = float(item["rating"])

        # Compute Content Score
        # Look at anime user rated highly (rating >= 7) and sum their similarity vectors
        content_scores = np.zeros(len(self.anime_df))
        high_rated_anime = [aid for aid, rating in user_ratings_dict.items() if rating >= 7]
        
        if not high_rated_anime and user_history_ids:
            # Fallback if user has items in history but none rated high
            high_rated_anime = list(user_history_ids)

        if high_rated_anime:
            for aid in high_rated_anime:
                idx_series = self.anime_df[self.anime_df['id'] == aid]
                if not idx_series.empty:
                    idx = idx_series.index[0]
                    # Weight content contribution by user rating (centered)
                    weight = user_ratings_dict.get(aid, 8.0) / 10.0
                    content_scores += self.cosine_sim[idx] * weight
            # Normalize content scores
            if content_scores.max() > 0:
                content_scores = content_scores / content_scores.max()
        else:
            # Cold start content preference if user input genres
            content_scores = np.zeros(len(self.anime_df))

        # Compute Collaborative Score
        collaborative_scores = np.zeros(len(self.anime_df))
        has_collaborative = False
        
        if user_id is not None and self.predicted_ratings_df is not None:
            uid = int(user_id)
            if uid in self.predicted_ratings_df.index:
                # Retrieve SVD predictions for this user
                preds = self.predicted_ratings_df.loc[uid]
                for idx, row in self.anime_df.iterrows():
                    aid = int(row['id'])
                    if aid in preds.index:
                        # Normalize predicted rating (1-10) to 0-1 range
                        collaborative_scores[idx] = preds[aid] / 10.0
                has_collaborative = True

        # Fallback collaborative score to content if user has no SVD record
        if not has_collaborative:
            collaborative_scores = content_scores

        # Popularity score (normalized average MAL score)
        max_score = self.anime_df['score'].max() or 10.0
        popularity_scores = self.anime_df['score'].values / max_score

        # Calculate final hybrid score
        hybrid_scores = []
        for idx, row in self.anime_df.iterrows():
            aid = int(row['id'])
            
            # Skip if user already watched/rated it
            if aid in user_history_ids:
                continue
                
            c_score = content_scores[idx]
            cf_score = collaborative_scores[idx]
            p_score = popularity_scores[idx]
            
            # Hybrid formula weights: 40% Content + 40% Collaborative + 20% Popularity
            final_score = (0.4 * c_score) + (0.4 * cf_score) + (0.2 * p_score)
            
            hybrid_scores.append({
                "id": aid,
                "title": row['title'],
                "genres": row['genres'],
                "studio": row['studio'],
                "score": float(row['score']),
                "imageUrl": row['imageUrl'],
                "releaseYear": int(row['releaseYear']),
                "episodes": int(row['episodes']),
                "rating": row['rating'],
                "final_score": float(final_score),
                "content_score": float(c_score),
                "collaborative_score": float(cf_score),
                "popularity_score": float(p_score)
            })

        # Sort recommendations by final score descending
        hybrid_scores = sorted(hybrid_scores, key=lambda x: x['final_score'], reverse=True)
        return hybrid_scores[:top_n]

    def explain_recommendation(self, user_history, anime_id):
        """
        Explain why an anime was recommended to the user.
        """
        if self.anime_df is None:
            self.train()
            
        target_anime_row = self.anime_df[self.anime_df['id'] == int(anime_id)]
        if target_anime_row.empty:
            return "Recommended based on general popularity."
            
        target_anime = target_anime_row.iloc[0]
        target_genres = set([g.strip() for g in target_anime['genres'].split(",") if g.strip()])
        
        # Analyze user history to find matching traits
        if not user_history:
            return f"Recommended because '{target_anime['title']}' is highly rated ({target_anime['score']}/10) and trending."
            
        user_ratings_dict = {int(x["anime_id"]): float(x.get("rating") or 8.0) for x in user_history}
        high_rated_ids = [aid for aid, rating in user_ratings_dict.items() if rating >= 7]
        
        if not high_rated_ids:
            return f"Recommended because it is a top-tier {target_anime['genres']} anime."

        # Find most similar anime from user's history
        best_sim = -1
        best_matched_anime = None
        
        target_idx = target_anime_row.index[0]
        for aid in high_rated_ids:
            hist_row = self.anime_df[self.anime_df['id'] == aid]
            if not hist_row.empty:
                hist_idx = hist_row.index[0]
                sim = self.cosine_sim[target_idx][hist_idx]
                if sim > best_sim:
                    best_sim = sim
                    best_matched_anime = hist_row.iloc[0]

        if best_matched_anime is not None and best_sim > 0.3:
            hist_genres = set([g.strip() for g in best_matched_anime['genres'].split(",") if g.strip()])
            common_genres = target_genres.intersection(hist_genres)
            
            explanation = f"Recommended because you rated '{best_matched_anime['title']}' highly ({int(user_ratings_dict[best_matched_anime['id']])}/10) "
            if common_genres:
                explanation += f"and both share the genres: {', '.join(common_genres)}."
            else:
                explanation += f"and they share a similar premise or visual style."
            return explanation

        # Fallback to genre preference overlap
        all_hist_genres = []
        for aid in high_rated_ids:
            r = self.anime_df[self.anime_df['id'] == aid]
            if not r.empty:
                all_hist_genres.extend([g.strip() for g in r.iloc[0]['genres'].split(",") if g.strip()])
                
        if all_hist_genres:
            genre_counts = pd.Series(all_hist_genres).value_counts()
            favorite_genres = list(genre_counts.index[:2])
            overlap = target_genres.intersection(set(favorite_genres))
            if overlap:
                return f"Recommended because you enjoy {', '.join(overlap)} anime, which match '{target_anime['title']}'."

        return f"Recommended because you enjoy '{target_anime['studio']}' studio titles and highly-rated {target_anime['genres']} series."
