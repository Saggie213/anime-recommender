import os
import re
import random
import urllib.request
import json

class AnimeChatbot:
    def __init__(self, recommender, search_engine):
        self.recommender = recommender
        self.search_engine = search_engine
        
    def respond(self, message, user_id=None, user_history=None):
        message_lower = message.lower()
        
        # 1. Check for LLM keys (Gemini / OpenAI) for advanced responses
        # If API key is provided, we can dynamically build a context and fetch LLM response
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            response = self._get_gemini_response(message, gemini_api_key, user_history)
            if response:
                return response

        # 2. Local Intelligent NLP Router (Rule-based with DB context)
        
        # Intent: Similar Anime Lookup
        # Matches: "like Naruto", "similar to Attack on Titan", "recommendations for Death Note"
        similar_match = re.search(r'(?:similar to|like|recommendations for|show me something like) ([a-zA-Z0-9\s\-\:]+)', message_lower)
        if similar_match:
            target_name = similar_match.group(1).strip()
            # Try to find the anime in our database
            matched_anime = self._find_anime_by_title(target_name)
            if matched_anime is not None:
                similar_list = self.recommender.get_similar_anime(matched_anime['id'], top_n=3)
                if similar_list:
                    response_text = f"Since you like **{matched_anime['title']}**, here are some recommendations you might enjoy:\n\n"
                    for idx, anime in enumerate(similar_list, 1):
                        response_text += f"{idx}. **{anime['title']}** ({anime['releaseYear']}) - Score: **{anime['score']}/10**\n"
                        response_text += f"   *Genres:* {anime['genres']}\n"
                        # Generate brief reason
                        common = set(anime['genres'].split(", ")).intersection(set(matched_anime['genres'].split(", ")))
                        if common:
                            response_text += f"   *Why:* Both share the themes of {', '.join(list(common)[:2])}.\n"
                    return {
                        "reply": response_text,
                        "anime_list": similar_list
                    }
                else:
                    return {
                        "reply": f"I found **{matched_anime['title']}** in our database, but I couldn't find close matches. Try checking out its genres: {matched_anime['genres']}.",
                        "anime_list": []
                    }
            else:
                # Try fallback semantic search
                sem_results = self.search_engine.search(target_name, top_n=3)
                if sem_results:
                    response_text = f"I couldn't find an exact match for '{target_name}', but here are some titles related to that description:\n\n"
                    for idx, anime in enumerate(sem_results, 1):
                        response_text += f"{idx}. **{anime['title']}** - Score: **{anime['score']}/10**\n"
                        response_text += f"   *Genres:* {anime['genres']}\n"
                    return {
                        "reply": response_text,
                        "anime_list": sem_results
                    }
                return {
                    "reply": f"I couldn't find any anime matching '{target_name}'. Try asking for another title or describe what you are looking for!",
                    "anime_list": []
                }

        # Intent: Genre / Mood Recommendation
        # Matches: "sad romance", "funny comedy", "scifi thriller", "action anime"
        genres_to_check = ['action', 'romance', 'comedy', 'sci-fi', 'thriller', 'sports', 'fantasy', 'horror', 'slice of life', 'isekai', 'adventure', 'drama']
        detected_genres = [g for g in genres_to_check if g in message_lower]
        
        # Mood check
        mood_map = {
            "sad": ["Drama", "Romance", "Slice of Life"],
            "happy": ["Comedy", "Slice of Life"],
            "motivational": ["Sports", "Adventure", "Action"],
            "thrilled": ["Thriller", "Horror", "Mystery"],
            "dark": ["Horror", "Thriller", "Psychological"],
            "cozy": ["Slice of Life", "Comedy"]
        }
        detected_moods = [m for m in mood_map.keys() if m in message_lower]

        if detected_genres or detected_moods:
            target_genres = [g.title() for g in detected_genres]
            for m in detected_moods:
                target_genres.extend(mood_map[m])
            # Eliminate duplicates
            target_genres = list(set(target_genres))

            # Filter anime containing these genres
            filtered_anime = []
            for _, row in self.recommender.anime_df.iterrows():
                anime_genres = [ag.strip().lower() for ag in row['genres'].split(",")]
                matches = any(tg.lower() in anime_genres for tg in target_genres)
                if matches:
                    filtered_anime.append(row)

            if filtered_anime:
                # Sort by score and take top 3
                filtered_anime = sorted(filtered_anime, key=lambda x: x['score'], reverse=True)[:3]
                genre_labels = " / ".join(target_genres)
                response_text = f"Here are some top-tier **{genre_labels}** recommendations based on your request:\n\n"
                
                anime_payload = []
                for idx, row in enumerate(filtered_anime, 1):
                    response_text += f"{idx}. **{row['title']}** ({row['releaseYear']}) - Score: **{row['score']}/10**\n"
                    response_text += f"   *Genres:* {row['genres']}\n"
                    response_text += f"   *Synopsis:* {row['synopsis'][:120]}...\n\n"
                    anime_payload.append({
                        "id": int(row['id']),
                        "title": row['title'],
                        "genres": row['genres'],
                        "studio": row['studio'],
                        "score": float(row['score']),
                        "imageUrl": row['imageUrl']
                    })
                return {
                    "reply": response_text,
                    "anime_list": anime_payload
                }

        # Intent: General recommendations
        if "recommend" in message_lower or "suggest" in message_lower or "what should i watch" in message_lower:
            recs = self.recommender.get_hybrid_recommendations(user_id=user_id, user_history=user_history, top_n=3)
            if recs:
                response_text = "Based on your preferences, watch history, and trending status, I recommend these titles for you:\n\n"
                for idx, anime in enumerate(recs, 1):
                    response_text += f"{idx}. **{anime['title']}** ({anime['releaseYear']}) - Match Score: **{int(anime['final_score']*100)}%**\n"
                    response_text += f"   *Genres:* {anime['genres']}\n"
                    response_text += f"   *Why:* {self.recommender.explain_recommendation(user_history, anime['id'])}\n\n"
                return {
                    "reply": response_text,
                    "anime_list": recs
                }
            
        # Default fallback response
        greetings = ["hi", "hello", "hey", "greetings", "yo"]
        if any(msg in message_lower.split() for msg in greetings):
            return {
                "reply": "Hello! I am your AI Anime Assistant. 🌸\n\nI can help you with:\n"
                         "- Recommending anime based on your taste (just ask 'Recommend some anime for me')\n"
                         "- Finding anime similar to your favorites ('Show me anime like Attack on Titan')\n"
                         "- Filtering by genre or mood ('I feel sad, suggest a romance')\n"
                         "- Semantic searches ('Do you know a thriller with mind games?')",
                "anime_list": []
            }

        # Use semantic search as a catch-all for query matching
        sem_results = self.search_engine.search(message, top_n=3)
        if sem_results:
            response_text = f"I've searched our catalog for \"{message}\" and found these potential matches:\n\n"
            for idx, anime in enumerate(sem_results, 1):
                response_text += f"{idx}. **{anime['title']}** - Score: **{anime['score']}/10**\n"
                response_text += f"   *Synopsis:* {anime['genres']}\n\n"
            return {
                "reply": response_text,
                "anime_list": sem_results
            }

        return {
            "reply": "I'm not sure how to answer that request. Try asking about a specific genre, mood, or search for titles like 'Recommend me anime similar to Naruto'.",
            "anime_list": []
        }

    def _find_anime_by_title(self, query):
        query_clean = re.sub(r'[^a-zA-Z0-9]', '', query.lower())
        best_match = None
        best_score = 0
        
        for _, row in self.recommender.anime_df.iterrows():
            title_clean = re.sub(r'[^a-zA-Z0-9]', '', row['title'].lower())
            
            # Exact matches
            if query_clean == title_clean:
                return row
            
            # Prefix/Substring scoring
            if query_clean in title_clean:
                score = len(query_clean) / len(title_clean)
                if score > best_score:
                    best_score = score
                    best_match = row
                    
        if best_score > 0.5:
            return best_match
        return None

    def _get_gemini_response(self, message, api_key, user_history):
        # We can construct a call to Gemini API using a standard POST request
        # Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        # Build context from anime database
        top_10 = self.recommender.anime_df.sort_values(by='score', ascending=False).head(15)
        catalog_str = ""
        for _, row in top_10.iterrows():
            catalog_str += f"- Title: {row['title']} | Genres: {row['genres']} | Studio: {row['studio']} | Rating: {row['score']} | Synopsis: {row['synopsis'][:100]}...\n"

        history_str = ""
        if user_history:
            history_str = "User's watch history / ratings:\n"
            for item in user_history:
                # Resolve title
                r = self.recommender.anime_df[self.recommender.anime_df['id'] == int(item['anime_id'])]
                t = r.iloc[0]['title'] if not r.empty else f"ID {item['anime_id']}"
                history_str += f"- {t}: rated {item.get('rating') or 'unrated'}/10\n"

        system_instruction = (
            "You are a friendly, expert Anime Recommendation Chatbot. "
            "Suggest highly relevant anime using the database catalog listed below. "
            "Keep recommendations concise and give short reasons why you suggested each title based on the user's input. "
            f"\n\nHere is a list of top titles in our database catalog:\n{catalog_str}"
            f"\n\n{history_str}"
        )
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"System prompt: {system_instruction}\n\nUser message: {message}"}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 400,
                "temperature": 0.7
            }
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode())
                
            reply = res_data['candidates'][0]['content']['parts'][0]['text']
            
            # Try to extract mentioned anime IDs from catalog to return dynamic metadata
            mentioned_anime = []
            for _, row in self.recommender.anime_df.iterrows():
                # Simple title check in reply text
                if row['title'].lower() in reply.lower():
                    mentioned_anime.append({
                        "id": int(row['id']),
                        "title": row['title'],
                        "genres": row['genres'],
                        "studio": row['studio'],
                        "score": float(row['score']),
                        "imageUrl": row['imageUrl']
                    })
                    if len(mentioned_anime) >= 3:
                        break
                        
            return {
                "reply": reply,
                "anime_list": mentioned_anime
            }
        except Exception as e:
            print(f"Gemini API Call failed: {e}. Falling back to local NLP logic.")
            return None
