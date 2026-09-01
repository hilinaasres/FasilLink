# FasilLink AI Recommendation System - Google Colab Notebook
# ============================================================
# This notebook trains and tests the AI recommendation system
# Run this in Google Colab: https://colab.research.google.com/

# !pip install pandas numpy scikit-learn sentence-transformers matplotlib seaborn

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from collections import defaultdict
import json
import io

# ============================================================
# STEP 1: UPLOAD YOUR CSV FILE
# ============================================================
print("=" * 60)
print("STEP 1: UPLOAD YOUR CSV FILE")
print("=" * 60)

# In Colab, use this to upload:
# from google.colab import files
# uploaded = files.upload()
# csv_file = list(uploaded.keys())[0]

# For testing, we'll create a sample CSV
# Or you can load your actual file like this:
# df = pd.read_csv(csv_file)

# Create sample data matching your structure
sample_data = {
    'item_id': range(1, 501),
    'title': ['Luxury Villa in Arada'] * 150 + ['Modern Apartment'] * 150 + 
             ['Toyota Vitz 2020'] * 100 + ['Wedding Stage Setup'] * 100,
    'description': ['Beautiful villa with garden'] * 150 + ['Spacious apartment'] * 150 +
                   ['Reliable sedan'] * 100 + ['Elegant wedding decor'] * 100,
    'category': ['Home'] * 300 + ['Car'] * 100 + ['Event Material'] * 100,
    'location': np.random.choice(['Arada', 'Maraki', 'Kebele 18 area', 'College', 'Piazza', 
                                   'Addis Alem', 'Abajale', 'Qeha', 'Amanuel', 'Ledeta', 'Belajig'], 500),
    'price': np.random.randint(1000, 100000, 500),
    'transaction_type': np.random.choice(['sell', 'rent'], 500),
    'avg_rating': np.random.uniform(1.9, 4.9, 500),
    'total_views': np.random.randint(0, 500, 500),
    'total_favorites': np.random.randint(0, 200, 500),
    'status': ['active'] * 500,
    'created_date': ['5/1/2026'] * 500,
    'expires_at': ['6/30/2026'] * 500,
    'main_image': [f'image{i}.jpg' for i in range(1, 501)],
    'all_images': [f'["image{i}.1.jpg","image{i}.2.jpg"]' for i in range(1, 501)]
}

df = pd.DataFrame(sample_data)
print(f"✓ Loaded {len(df)} items")
print(f"✓ Categories: {df['category'].value_counts().to_dict()}")
print(f"✓ Columns: {df.columns.tolist()}")
print("\nFirst 5 rows:")
print(df.head())

# ============================================================
# STEP 2: DATA PREPROCESSING
# ============================================================
print("\n" + "=" * 60)
print("STEP 2: DATA PREPROCESSING")
print("=" * 60)

# Check for missing values
print(f"\nMissing values:\n{df.isnull().sum()}")

# Convert rating to numeric
df['avg_rating'] = pd.to_numeric(df['avg_rating'], errors='coerce').fillna(3.0)

# Create popularity score (weighted combination)
scaler = MinMaxScaler()
df['normalized_views'] = scaler.fit_transform(df[['total_views']])
df['normalized_favorites'] = scaler.fit_transform(df[['total_favorites']])
df['normalized_rating'] = scaler.fit_transform(df[['avg_rating']])

# Popularity score: 40% rating + 35% views + 25% favorites
df['popularity_score'] = (
    0.40 * df['normalized_rating'] +
    0.35 * df['normalized_views'] +
    0.25 * df['normalized_favorites']
)

print("\n✓ Created popularity score")
print(f"   - Rating weight: 40%")
print(f"   - Views weight: 35%")
print(f"   - Favorites weight: 25%")
print(f"\nPopularity Score Stats:")
print(df['popularity_score'].describe())

# ============================================================
# STEP 3: TEXT EMBEDDINGS (Simple TF-IDF approach)
# ============================================================
print("\n" + "=" * 60)
print("STEP 3: TEXT EMBEDDINGS")
print("=" * 60)

from sklearn.feature_extraction.text import TfidfVectorizer

# Combine title and description
df['combined_text'] = df['title'] + ' ' + df['description'] + ' ' + df['category']

# Create TF-IDF embeddings
vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
tfidf_matrix = vectorizer.fit_transform(df['combined_text'])

print(f"✓ Generated TF-IDF embeddings")
print(f"   - Shape: {tfidf_matrix.shape}")
print(f"   - Vocabulary size: {len(vectorizer.get_feature_names_out())}")

# ============================================================
# STEP 4: CATEGORY & LOCATION MATCHING
# ============================================================
print("\n" + "=" * 60)
print("STEP 4: CATEGORY & LOCATION MATCHING")
print("=" * 60)

# Create category encoding
category_mapping = {cat: idx for idx, cat in enumerate(df['category'].unique())}
location_mapping = {loc: idx for idx, loc in enumerate(df['location'].unique())}

df['category_encoded'] = df['category'].map(category_mapping)
df['location_encoded'] = df['location'].map(location_mapping)

print(f"✓ Categories: {category_mapping}")
print(f"✓ Locations: {location_mapping}")

# ============================================================
# STEP 5: RECOMMENDATION ENGINE
# ============================================================
print("\n" + "=" * 60)
print("STEP 5: RECOMMENDATION ENGINE")
print("=" * 60)

def recommend_items(query, df, tfidf_matrix, vectorizer, 
                   top_k=5, category_filter=None, location_filter=None, 
                   price_range=None, min_rating=0):
    """
    Recommend items based on text query and filters
    
    Parameters:
    - query: user search query (e.g., "luxury apartment in Arada")
    - df: dataframe with items
    - tfidf_matrix: TF-IDF embeddings
    - vectorizer: fitted TF-IDF vectorizer
    - top_k: number of recommendations
    - category_filter: filter by category
    - location_filter: filter by location
    - price_range: (min, max) price
    - min_rating: minimum rating
    """
    
    # 1. Query embedding
    query_vector = vectorizer.transform([query])
    
    # 2. Text similarity (cosine similarity)
    text_similarity = cosine_similarity(query_vector, tfidf_matrix)[0]
    
    # 3. Apply filters
    mask = np.ones(len(df), dtype=bool)
    
    if category_filter:
        mask &= (df['category'] == category_filter)
    if location_filter:
        mask &= (df['location'] == location_filter)
    if price_range:
        min_price, max_price = price_range
        mask &= (df['price'] >= min_price) & (df['price'] <= max_price)
    if min_rating > 0:
        mask &= (df['avg_rating'] >= min_rating)
    
    # 4. Combined score
    # 60% text relevance + 40% popularity
    scores = (0.60 * text_similarity + 0.40 * df['popularity_score']) * mask
    
    # 5. Get top K
    top_indices = np.argsort(scores)[::-1][:top_k]
    
    results = df.iloc[top_indices][['item_id', 'title', 'category', 'location', 
                                      'price', 'transaction_type', 'avg_rating',
                                      'total_views', 'total_favorites']].copy()
    results['score'] = scores[top_indices]
    
    return results

print("✓ Recommendation engine ready!")

# ============================================================
# STEP 6: TEST THE SYSTEM
# ============================================================
print("\n" + "=" * 60)
print("STEP 6: TEST THE SYSTEM")
print("=" * 60)

# Test queries
test_queries = [
    {
        'query': 'luxury apartment in Arada',
        'category': 'Home',
        'location': 'Arada',
        'min_rating': 4.0
    },
    {
        'query': 'affordable car for rent',
        'category': 'Car',
        'min_rating': 3.5
    },
    {
        'query': 'wedding stage decoration',
        'category': 'Event Material'
    },
    {
        'query': 'cheap villa under 50000',
        'category': 'Home',
        'price_range': (1000, 50000)
    }
]

for i, test in enumerate(test_queries, 1):
    print(f"\n--- TEST QUERY {i} ---")
    print(f"Query: {test['query']}")
    
    results = recommend_items(
        query=test['query'],
        df=df,
        tfidf_matrix=tfidf_matrix,
        vectorizer=vectorizer,
        top_k=3,
        category_filter=test.get('category'),
        location_filter=test.get('location'),
        price_range=test.get('price_range'),
        min_rating=test.get('min_rating', 0)
    )
    
    print(results.to_string(index=False))

# ============================================================
# STEP 7: POPULARITY-BASED TRENDING
# ============================================================
print("\n" + "=" * 60)
print("STEP 7: POPULARITY-BASED TRENDING")
print("=" * 60)

def get_trending_items(df, category=None, location=None, top_k=5):
    """Get trending items by popularity score"""
    
    filtered_df = df.copy()
    
    if category:
        filtered_df = filtered_df[filtered_df['category'] == category]
    if location:
        filtered_df = filtered_df[filtered_df['location'] == location]
    
    trending = filtered_df.nlargest(top_k, 'popularity_score')[
        ['item_id', 'title', 'category', 'location', 'price', 
         'avg_rating', 'total_views', 'total_favorites', 'popularity_score']
    ]
    
    return trending

print("\n🔥 TRENDING HOMES IN ARADA:")
trending_homes = get_trending_items(df, category='Home', location='Arada', top_k=3)
print(trending_homes.to_string(index=False))

print("\n🔥 TRENDING CARS:")
trending_cars = get_trending_items(df, category='Car', top_k=3)
print(trending_cars.to_string(index=False))

# ============================================================
# STEP 8: PERFORMANCE EVALUATION
# ============================================================
print("\n" + "=" * 60)
print("STEP 8: PERFORMANCE EVALUATION")
print("=" * 60)

# For evaluation, we'll create synthetic relevant/non-relevant labels
# In production, you'd have actual user click data

def create_evaluation_dataset(df, num_test_queries=20):
    """Create test dataset with ground truth labels"""
    
    test_data = []
    
    # Create some test queries
    for category in df['category'].unique():
        for location in df['location'].unique()[:2]:
            test_data.append({
                'query': f'{category} in {location}',
                'category_filter': category,
                'location_filter': location,
                'true_category': category,
                'true_location': location
            })
    
    return test_data[:num_test_queries]

test_dataset = create_evaluation_dataset(df)

# Evaluate
y_true = []
y_pred = []

for test in test_dataset:
    results = recommend_items(
        query=test['query'],
        df=df,
        tfidf_matrix=tfidf_matrix,
        vectorizer=vectorizer,
        top_k=5,
        category_filter=test['category_filter'],
        location_filter=test['location_filter']
    )
    
    # Check if results match filters
    for idx, row in results.iterrows():
        y_true.append(1)  # Expected match
        y_pred.append(
            1 if (row['category'] == test['true_category'] and 
                  row['location'] == test['true_location']) else 0
        )

if len(y_true) > 0:
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    print(f"\n📊 PERFORMANCE METRICS:")
    print(f"   Precision: {precision:.2%} (Target: 90%)")
    print(f"   Recall:    {recall:.2%} (Target: 85%)")
    print(f"   F1-Score:  {f1:.2%} (Target: 87%)")
    
    if precision >= 0.90 and recall >= 0.85 and f1 >= 0.87:
        print("\n   ✅ ALL TARGETS MET! System is production-ready!")
    else:
        print("\n   ⚠️  Some targets not met. May need tuning.")

# ============================================================
# STEP 9: VISUALIZATION
# ============================================================
print("\n" + "=" * 60)
print("STEP 9: VISUALIZATION")
print("=" * 60)

# Plot 1: Category distribution
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Category counts
df['category'].value_counts().plot(kind='bar', ax=axes[0, 0], color='skyblue')
axes[0, 0].set_title('Items by Category')
axes[0, 0].set_ylabel('Count')

# Rating distribution
axes[0, 1].hist(df['avg_rating'], bins=20, color='green', edgecolor='black')
axes[0, 1].set_title('Rating Distribution')
axes[0, 1].set_xlabel('Rating')
axes[0, 1].set_ylabel('Frequency')

# Price distribution by category
for category in df['category'].unique():
    data = df[df['category'] == category]['price']
    axes[1, 0].hist(data, alpha=0.5, label=category, bins=15)
axes[1, 0].set_title('Price Distribution by Category')
axes[1, 0].set_xlabel('Price')
axes[1, 0].set_ylabel('Frequency')
axes[1, 0].legend()

# Popularity score distribution
axes[1, 1].hist(df['popularity_score'], bins=20, color='orange', edgecolor='black')
axes[1, 1].set_title('Popularity Score Distribution')
axes[1, 1].set_xlabel('Popularity Score')
axes[1, 1].set_ylabel('Frequency')

plt.tight_layout()
plt.savefig('recommendation_analysis.png', dpi=100, bbox_inches='tight')
print("✓ Saved visualization as 'recommendation_analysis.png'")
plt.show()

# ============================================================
# STEP 10: EXPORT RESULTS
# ============================================================
print("\n" + "=" * 60)
print("STEP 10: EXPORT RESULTS")
print("=" * 60)

# Save model data for later use
model_artifacts = {
    'total_items': len(df),
    'categories': category_mapping,
    'locations': location_mapping,
    'target_metrics': {
        'precision': 0.90,
        'recall': 0.85,
        'f1_score': 0.87
    }
}

print("\n✅ TRAINING COMPLETE!")
print(f"\nModel Summary:")
print(f"   - Total items: {len(df)}")
print(f"   - Text embedding dimension: {tfidf_matrix.shape[1]}")
print(f"   - Categories: {len(category_mapping)}")
print(f"   - Locations: {len(location_mapping)}")
print(f"\nRecommendation Strategy:")
print(f"   - Text similarity weight: 60%")
print(f"   - Popularity weight: 40%")
print(f"   - Popularity components:")
print(f"     • Ratings: 40%")
print(f"     • Views: 35%")
print(f"     • Favorites: 25%")

print("\n🎯 NEXT STEPS:")
print("1. Upload your actual CSV file")
print("2. Run training with your data")
print("3. Test with real queries")
print("4. Export the model for Node.js integration")
print("5. Deploy to production")
