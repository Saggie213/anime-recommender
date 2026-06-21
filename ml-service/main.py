import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our custom ML models
from src.recommender import AnimeRecommender
from src.nlp_search import NLPSearchEngine
from src.chatbot import AnimeChatbot

load_dotenv()

app = FastAPI(
    title="Anime Recommendation System ML Service",
    description="Python FastAPI Service for Content, Collaborative, Hybrid recommendations and semantic NLP queries.",
    version="1.0.0"
)

# Enable CORS for communication with Express backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for engines
recommender = AnimeRecommender()
search_engine = NLPSearchEngine(recommender)
chatbot = AnimeChatbot(recommender, search_engine)

@app.on_event("startup")
def startup_event():
    print("Initializing recommendation models and indexes...")
    try:
        recommender.train()
        search_engine.initialize()
        print("ML Service successfully initialized.")
    except Exception as e:
        print(f"Error during startup initialization: {e}")
        print("Model training failed. Please ensure d:/python/anime-recommender/data/anime_seed.json exists.")

# Pydantic schemas
class RatingInput(BaseModel):
    anime_id: int
    rating: Optional[float] = None

class HybridRecommendRequest(BaseModel):
    user_id: Optional[int] = None
    user_history: Optional[List[RatingInput]] = None
    top_n: Optional[int] = 10

class SemanticSearchRequest(BaseModel):
    query: str
    top_n: Optional[int] = 10

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[int] = None
    user_history: Optional[List[RatingInput]] = None

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "anime_count": len(recommender.anime_df) if recommender.anime_df is not None else 0,
        "ratings_count": len(recommender.ratings_df) if recommender.ratings_df is not None else 0,
        "transformer_active": search_engine.use_transformer
    }

@app.post("/recommend/hybrid")
def get_hybrid_recommendations(request: HybridRecommendRequest):
    try:
        history = []
        if request.user_history:
            history = [{"anime_id": h.anime_id, "rating": h.rating} for h in request.user_history]
            
        recs = recommender.get_hybrid_recommendations(
            user_id=request.user_id,
            user_history=history,
            top_n=request.top_n
        )
        return {"recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recommend/similar")
def get_similar_anime(anime_id: int = Query(..., description="ID of the anime"), top_n: int = Query(10, description="Number of results")):
    try:
        similar = recommender.get_similar_anime(anime_id=anime_id, top_n=top_n)
        return {"similar": similar}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/semantic")
def search_semantic(request: SemanticSearchRequest):
    try:
        results = search_engine.search(query=request.query, top_n=request.top_n)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def chat_response(request: ChatRequest):
    try:
        history = []
        if request.user_history:
            history = [{"anime_id": h.anime_id, "rating": h.rating} for h in request.user_history]
            
        res = chatbot.respond(
            message=request.message,
            user_id=request.user_id,
            user_history=history
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
def retrain_models():
    """
    Force models to reload data files and retrain (e.g. after database seeding/updates)
    """
    try:
        recommender.load_data()
        recommender.train()
        search_engine.initialize()
        return {
            "status": "success",
            "message": "Models successfully retrained",
            "anime_count": len(recommender.anime_df),
            "ratings_count": len(recommender.ratings_df)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explain/{anime_id}")
def explain_recommendation(anime_id: int, user_id: Optional[int] = None):
    # For explainability, we can fetch explanation for a given anime
    # In a full setup, the caller passes user history. If not passed, we return general details
    try:
        # Express backend handles loading user list and calling explain endpoint.
        # Here we just implement the explanation fetcher
        # If user_history is not provided, we can fetch ratings for user_id from ratings_df
        history = []
        if user_id is not None and recommender.ratings_df is not None:
            user_ratings = recommender.ratings_df[recommender.ratings_df['user_id'] == int(user_id)]
            for _, r in user_ratings.iterrows():
                history.append({"anime_id": int(r['anime_id']), "rating": float(r['rating'])})
                
        explanation = recommender.explain_recommendation(user_history=history, anime_id=anime_id)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
