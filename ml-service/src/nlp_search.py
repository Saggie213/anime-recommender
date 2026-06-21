import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class NLPSearchEngine:
    def __init__(self, recommender):
        self.recommender = recommender
        self.use_transformer = False
        self.model = None
        self.embeddings = None
        
    def initialize(self):
        print("Initializing NLP Semantic Search Engine...")
        if self.recommender.anime_df is None or len(self.recommender.anime_df) == 0:
            self.recommender.load_data()
            
        try:
            from sentence_transformers import SentenceTransformer
            print("Attempting to load SentenceTransformer model ('all-MiniLM-L6-v2')...")
            # We use a tiny and efficient model for fast CPU inference
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Precompute embeddings for all synopses
            synopses = self.recommender.anime_df['synopsis'].fillna('No synopsis available.').tolist()
            print("Precomputing sentence embeddings for anime database...")
            self.embeddings = self.model.encode(synopses, show_progress_bar=False)
            self.use_transformer = True
            print("SentenceTransformer loaded and embeddings cached.")
        except Exception as e:
            print(f"SentenceTransformer not loaded ({e}). Semantic search will fall back to TF-IDF query matching.")
            self.use_transformer = False

    def search(self, query, top_n=10):
        if self.recommender.anime_df is None or len(self.recommender.anime_df) == 0:
            self.recommender.train()

        if self.use_transformer and self.model is not None and self.embeddings is not None:
            # Semantic search using Cosine Similarity on Sentence Embeddings
            query_embedding = self.model.encode([query], show_progress_bar=False)
            sims = cosine_similarity(query_embedding, self.embeddings)[0]
        else:
            # Fallback search using TF-IDF
            # We index Title + Genres + Synopsis
            documents = (
                self.recommender.anime_df['title'].fillna('') + " " +
                self.recommender.anime_df['genres'].fillna('') + " " +
                self.recommender.anime_df['synopsis'].fillna('')
            ).tolist()
            
            vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
            tfidf_matrix = vectorizer.fit_transform(documents)
            query_vector = vectorizer.transform([query])
            sims = cosine_similarity(query_vector, tfidf_matrix)[0]

        # Sort indices by similarity descending
        sorted_indices = np.argsort(sims)[::-1]
        
        results = []
        for idx in sorted_indices[:top_n]:
            score = float(sims[idx])
            # If TF-IDF and score is 0, skip
            if not self.use_transformer and score <= 0.0:
                continue
                
            anime_row = self.recommender.anime_df.iloc[idx]
            results.append({
                "id": int(anime_row['id']),
                "title": anime_row['title'],
                "genres": anime_row['genres'],
                "studio": anime_row['studio'],
                "score": float(anime_row['score']),
                "imageUrl": anime_row['imageUrl'],
                "releaseYear": int(anime_row['releaseYear']),
                "episodes": int(anime_row['episodes']),
                "rating": anime_row['rating'],
                "match_score": score
            })
            
        return results
