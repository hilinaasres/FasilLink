import os
import csv
import pickle
import numpy as np
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Load pretrained sentence transformer model ──────────────────────────────
print("Loading pretrained sentence transformer model...")
MODEL = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded!")

# ── Load training CSV data ───────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), 'fasillink_data.csv')
try:
    with open(CSV_PATH, newline="", encoding="utf-8") as csv_file:
        TRAIN_ROWS = list(csv.DictReader(csv_file))
    print(f"Loaded {len(TRAIN_ROWS)} training rows from CSV.")
except Exception as e:
    TRAIN_ROWS = []
    print(f"Warning: Could not load CSV: {e}")

# ── DB connection ────────────────────────────────────────────────────────────
def get_db():
    return psycopg2.connect(
        os.getenv('DATABASE_URL'),
        cursor_factory=psycopg2.extras.RealDictCursor
    )

def format_item(item):
    return {
        "id":               item["id"],
        "title":            item.get("title", ""),
        "description":      item.get("description", ""),
        "price":            float(item["price"]) if item.get("price") else None,
        "location":         item.get("location", ""),
        "subcity":          item.get("subcity", ""),
        "kebele":           item.get("kebele", ""),
        "transaction_type": str(item.get("transaction_type", "")),
        "featured":         item.get("featured", False),
        "premium":          item.get("premium", False),
        "category":         item.get("category", ""),
        "image_url":        item.get("image_url", ""),
        "avg_rating":       float(item.get("avg_rating") or 0.0),
        "rating_count":     int(item.get("rating_count") or 0),
        "rating":           float(item.get("avg_rating") or 0.0),
        "contact_phone":    item.get("contact_phone", ""),
        "created_at":       str(item["created_at"]) if item.get("created_at") else None,
    }

def normalize_int_list(raw):
    if not raw:
        return []
    ids = []
    for value in raw:
        try:
            n = int(value)
            if n > 0:
                ids.append(n)
        except (TypeError, ValueError):
            continue
    return ids

def fetch_all_active_items(cur, limit=200):
    cur.execute("""
        SELECT
            i.id, i.title, i.description, i.price,
            i.location, i.subcity, i.kebele,
            i.transaction_type, i.featured, i.premium,
            i.contact_phone, i.created_at,
            c.name AS category,
            m.media_url AS image_url,
            COALESCE(r.avg_rating, 0) AS avg_rating,
            COALESCE(r.rating_count, 0) AS rating_count,
            COALESCE(fav.favorite_count, 0) AS favorite_count,
            COALESCE(msg.chat_count, 0) AS chat_count
        FROM items i
        LEFT JOIN categories c ON c.id = i.category_id
        LEFT JOIN LATERAL (
            SELECT media_url FROM media WHERE item_id = i.id ORDER BY id ASC LIMIT 1
        ) m ON true
        LEFT JOIN (
            SELECT item_id, AVG(rating)::numeric(10,4) AS avg_rating, COUNT(*) AS rating_count
            FROM ratings GROUP BY item_id
        ) r ON r.item_id = i.id
        LEFT JOIN (
            SELECT item_id, COUNT(*) AS favorite_count
            FROM user_favorites GROUP BY item_id
        ) fav ON fav.item_id = i.id
        LEFT JOIN (
            SELECT item_id, COUNT(*) AS chat_count
            FROM messages WHERE item_id IS NOT NULL GROUP BY item_id
        ) msg ON msg.item_id = i.id
        WHERE i.status = 'active'
        ORDER BY i.created_at DESC
        LIMIT %s
    """, (limit,))
    return [dict(r) for r in cur.fetchall()]

def build_item_text(item):
    """Build a rich text representation of an item for embedding."""
    parts = [
        str(item.get("title", "")),
        str(item.get("description", "")),
        str(item.get("category", "")),
        str(item.get("location", "")),
        str(item.get("subcity", "")),
        str(item.get("transaction_type", "")),
    ]
    price = item.get("price")
    if price:
        parts.append(f"price {price} ETB")
    return " ".join(p for p in parts if p and p != "None")


def cosine_similarity_matrix(left, right):
    left = np.atleast_2d(left).astype(float)
    right = np.atleast_2d(right).astype(float)

    left_norms = np.linalg.norm(left, axis=1, keepdims=True)
    right_norms = np.linalg.norm(right, axis=1, keepdims=True)

    left_norms[left_norms == 0] = 1.0
    right_norms[right_norms == 0] = 1.0

    return (left @ right.T) / (left_norms * right_norms.T)

def get_content_based_recommendations(seed_items, all_items, exclude_ids=set(), top_n=10):
    """Use sentence transformer to find similar items based on content."""
    if not seed_items or not all_items:
        return []

    # Build texts
    seed_texts = [build_item_text(i) for i in seed_items]
    all_texts  = [build_item_text(i) for i in all_items]

    # Embed
    seed_embeddings = MODEL.encode(seed_texts, show_progress_bar=False)
    all_embeddings  = MODEL.encode(all_texts,  show_progress_bar=False)

    # Average seed embedding
    avg_seed = np.mean(seed_embeddings, axis=0, keepdims=True)

    # Cosine similarity
    sims = cosine_similarity_matrix(avg_seed, all_embeddings)[0]

    # Score = content similarity + popularity bonus
    pop_scores = np.array([
        0.4 * (float(i.get("avg_rating") or 0) / 5.0) +
        0.3 * min(float(i.get("favorite_count") or 0) / 20.0, 1) +
        0.2 * min(float(i.get("chat_count") or 0) / 10.0, 1) +
        0.1 * (1 if i.get("featured") else 0)
        for i in all_items
    ])
    if pop_scores.max() > 0:
        pop_norm = pop_scores / pop_scores.max()
    else:
        pop_norm = pop_scores

    final_scores = 0.65 * sims + 0.35 * pop_norm

    # Rank and exclude seed/already-seen ids
    ranked = sorted(enumerate(final_scores), key=lambda x: x[1], reverse=True)
    results = []
    for idx, score in ranked:
        item = all_items[idx]
        if item["id"] not in exclude_ids:
            results.append(item)
        if len(results) >= top_n:
            break

    return results

def get_user_interaction_ids(cur, user_id):
    ids = set()
    cur.execute("""
        SELECT DISTINCT item_id FROM user_favorites
        WHERE user_id = %s AND item_id IS NOT NULL
    """, (user_id,))
    for row in cur.fetchall():
        if row.get('item_id'):
            ids.add(int(row['item_id']))

    cur.execute("""
        SELECT DISTINCT item_id FROM messages
        WHERE (sender_id = %s OR receiver_id = %s) AND item_id IS NOT NULL
    """, (user_id, user_id))
    for row in cur.fetchall():
        if row.get('item_id'):
            ids.add(int(row['item_id']))

    cur.execute("""
        SELECT DISTINCT item_id FROM ratings
        WHERE user_id = %s AND item_id IS NOT NULL
    """, (user_id,))
    for row in cur.fetchall():
        if row.get('item_id'):
            ids.add(int(row['item_id']))

    return list(ids)


# ── TRENDING endpoint ─────────────────────────────────────────────────────────
@app.route('/api/trending', methods=['GET'])
def trending():
    category  = request.args.get('category')
    location  = request.args.get('location')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    limit     = request.args.get('limit', default=10, type=int)
    query     = request.args.get('q', '').strip()

    try:
        conn = get_db()
        cur  = conn.cursor()

        # Fetch all active items
        all_items = fetch_all_active_items(cur, limit=200)

        # Apply filters
        filtered = all_items
        if category:
            filtered = [i for i in filtered if category.lower() in str(i.get("category","")).lower()]
        if location:
            filtered = [i for i in filtered if
                location.lower() in str(i.get("location","")).lower() or
                location.lower() in str(i.get("subcity","")).lower()]
        if min_price is not None:
            filtered = [i for i in filtered if i.get("price") and float(i["price"]) >= min_price]
        if max_price is not None:
            filtered = [i for i in filtered if i.get("price") and float(i["price"]) <= max_price]

        # If query provided, use AI similarity
        if query:
            query_item = {"title": query, "description": query, "category": category or "",
                         "location": location or "", "subcity": "", "transaction_type": ""}
            results = get_content_based_recommendations([query_item], filtered, top_n=limit)
        else:
            # Sort by popularity score
            results = sorted(filtered, key=lambda i: (
                0.4 * (float(i.get("avg_rating") or 0) / 5.0) +
                0.3 * min(float(i.get("favorite_count") or 0) / 20.0, 1) +
                0.2 * min(float(i.get("chat_count") or 0) / 10.0, 1) +
                0.1 * (1 if i.get("featured") else 0)
            ), reverse=True)[:limit]

        conn.close()

        parts = []
        if category: parts.append(category)
        if location: parts.append(f"near {location}")
        if max_price: parts.append(f"under {int(max_price):,} ETB")
        message = "Top " + (" ".join(parts) if parts else "trending items") + ", ranked by AI"

        return jsonify({
            "success": True,
            "type": "trending",
            "message": message,
            "count": len(results),
            "items": [format_item(r) for r in results],
            "trending": [format_item(r) for r in results]
        })

    except Exception as e:
        print(f"Trending error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/popular', methods=['GET'])
def popular():
    return trending()


# ── FOR YOU / RECOMMEND endpoint ──────────────────────────────────────────────
@app.route('/api/recommend', methods=['POST'])
def recommend():
    data         = request.get_json(silent=True) or {}
    liked_ids    = normalize_int_list(data.get('liked_ids', []))
    favorite_ids = normalize_int_list(data.get('favorite_ids', []))
    clicked_ids  = normalize_int_list(data.get('clicked_ids', []))
    query        = str(data.get('query', '') or '').strip()
    user_id      = data.get('user_id')
    limit        = min(int(data.get('limit', 10)) if str(data.get('limit', 10)).isdigit() else 10, 20)

    try:
        user_id = int(user_id)
        if user_id <= 0:
            user_id = None
    except (TypeError, ValueError):
        user_id = None

    signal_ids = list(dict.fromkeys(liked_ids + favorite_ids + clicked_ids))

    try:
        conn = get_db()
        cur  = conn.cursor()

        # Get user interaction history from DB
        if user_id:
            db_ids = get_user_interaction_ids(cur, user_id)
            signal_ids = list(dict.fromkeys(signal_ids + db_ids))

        # Fetch all active items
        all_items = fetch_all_active_items(cur, limit=200)
        all_by_id = {i["id"]: i for i in all_items}

        # No signals and no query → return popular
        if not signal_ids and not query:
            results = sorted(all_items, key=lambda i: (
                0.4 * (float(i.get("avg_rating") or 0) / 5.0) +
                0.3 * min(float(i.get("favorite_count") or 0) / 20.0, 1) +
                0.2 * min(float(i.get("chat_count") or 0) / 10.0, 1) +
                0.1 * (1 if i.get("featured") else 0)
            ), reverse=True)[:limit]
            conn.close()
            return jsonify({
                "success": True,
                "type": "popular",
                "message": "Popular listings you may like",
                "count": len(results),
                "items": [format_item(r) for r in results],
                "recommendations": [format_item(r) for r in results]
            })

        # Get seed items (what user interacted with)
        seed_items = [all_by_id[sid] for sid in signal_ids if sid in all_by_id]

        # If query provided, add it as a virtual seed
        if query:
            seed_items.append({
                "title": query, "description": query,
                "category": "", "location": "", "subcity": "",
                "transaction_type": "", "price": None
            })

        # Use AI content-based filtering
        exclude = set(signal_ids)
        results = get_content_based_recommendations(seed_items, all_items, exclude_ids=exclude, top_n=limit)

        conn.close()

        explanation = query or (seed_items[0].get("category") if seed_items else "your activity")
        return jsonify({
            "success": True,
            "type": "personalized",
            "message": f"Because you interacted with {explanation}",
            "count": len(results),
            "items": [format_item(r) for r in results],
            "recommendations": [format_item(r) for r in results]
        })

    except Exception as e:
        print(f"Recommend error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── SEARCH endpoint ───────────────────────────────────────────────────────────
@app.route('/api/search', methods=['GET'])
def search():
    q         = request.args.get('q', '').strip()
    category  = request.args.get('category')
    location  = request.args.get('location')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    limit     = request.args.get('limit', default=10, type=int)

    try:
        conn = get_db()
        cur  = conn.cursor()
        all_items = fetch_all_active_items(cur, limit=300)
        conn.close()

        # Apply hard filters
        filtered = all_items
        if category:
            filtered = [i for i in filtered if category.lower() in str(i.get("category","")).lower()]
        if location:
            filtered = [i for i in filtered if
                location.lower() in str(i.get("location","")).lower() or
                location.lower() in str(i.get("subcity","")).lower()]
        if min_price is not None:
            filtered = [i for i in filtered if i.get("price") and float(i["price"]) >= min_price]
        if max_price is not None:
            filtered = [i for i in filtered if i.get("price") and float(i["price"]) <= max_price]

        # AI semantic search if query provided
        if q:
            query_item = {"title": q, "description": q, "category": category or "",
                         "location": location or "", "subcity": "", "transaction_type": ""}
            results = get_content_based_recommendations([query_item], filtered, top_n=limit)
        else:
            results = filtered[:limit]

        return jsonify({
            "success": True,
            "count": len(results),
            "items": [format_item(r) for r in results]
        })

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── HEALTH endpoint ───────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM items WHERE status = 'active'")
        total = cur.fetchone()['total']
        conn.close()
        return jsonify({"status": "ok", "db": "connected", "active_items": total, "ai": "sentence-transformer"})
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500


@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("SELECT id, name, icon FROM categories WHERE active = true ORDER BY name")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return jsonify({"categories": rows})
    except Exception as e:
        return jsonify({"categories": [], "error": str(e)}), 500


@app.route('/api/locations', methods=['GET'])
def get_locations():
    try:
        conn = get_db()
        cur  = conn.cursor()
        cur.execute("""
            SELECT DISTINCT subcity AS location FROM items
            WHERE subcity IS NOT NULL AND status = 'active' ORDER BY subcity
        """)
        rows = cur.fetchall()
        conn.close()
        return jsonify({"locations": [r['location'] for r in rows]})
    except Exception as e:
        return jsonify({"locations": [], "error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("  FASILLINK SMART AI SERVICE")
    print("  Powered by Sentence Transformers")
    print("=" * 60)
    print("  GET  /api/trending?location=Arada&max_price=5000")
    print("  POST /api/recommend  body: {liked_ids: [1,2,3]}")
    print("  GET  /api/search?q=house&location=Arada")
    print("  GET  /api/health")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)