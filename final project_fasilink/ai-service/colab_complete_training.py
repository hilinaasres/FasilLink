# ============================================================================
# FasilLink AI Recommendation System - Google Colab Training Notebook
# ============================================================================
# This script trains the AI recommendation system using your CSV and images
# Run this DIRECTLY in Google Colab - it handles file uploads automatically
# ============================================================================

import pandas as pd
import numpy as np
import json
import os
import pickle
from datetime import datetime
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
import zipfile
import io

# Machine Learning imports
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import precision_score, recall_score, f1_score
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# GOOGLE COLAB FILE UPLOAD HANDLER
# ============================================================================

def upload_files_colab():
    """Upload CSV and images ZIP in Google Colab"""
    try:
        from google.colab import files
        print("\n" + "="*70)
        print("📤 GOOGLE COLAB FILE UPLOAD")
        print("="*70)
        
        print("\n1️⃣  SELECT YOUR CSV FILE (gonder_ai_train.csv)")
        print("   Click 'Choose Files' and select your CSV")
        csv_files = files.upload()
        csv_file = list(csv_files.keys())[0]
        
        print(f"\n✅ Uploaded CSV: {csv_file}")
        
        print("\n2️⃣  SELECT YOUR IMAGES ZIP FILE (images.zip)")
        print("   Click 'Choose Files' and select your images.zip")
        zip_files = files.upload()
        zip_file = list(zip_files.keys())[0]
        
        print(f"\n✅ Uploaded ZIP: {zip_file}")
        
        return csv_file, zip_file
    except ImportError:
        print("⚠️  Not running in Google Colab!")
        print("   For local testing, ensure files are in current directory")
        return 'gonder_ai_train.csv', 'images.zip'

# ============================================================================
# STEP 1: DATA LOADING & PREPROCESSING
# ============================================================================

class DataProcessor:
    """Handles CSV loading, cleaning, and feature engineering"""
    
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.df = None
        self.scaler = MinMaxScaler()
        
    def load_data(self):
        """Load CSV and perform initial validation"""
        print(f"\n📂 Loading data from: {self.csv_path}")
        
        try:
            self.df = pd.read_csv(self.csv_path)
            print(f"✅ Loaded {len(self.df)} items")
            print(f"\n📋 Dataset Info:")
            print(f"   Columns: {list(self.df.columns)}")
            print(f"   Shape: {self.df.shape}")
            print(f"\n📊 Sample data:")
            print(self.df.head(2).to_string())
            return self.df
        except FileNotFoundError:
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        except Exception as e:
            raise Exception(f"Error loading CSV: {str(e)}")
    
    def clean_data(self):
        """Clean and validate data"""
        print("\n🧹 Cleaning data...")
        
        # Handle missing values
        self.df['description'] = self.df['description'].fillna('')
        self.df['title'] = self.df['title'].fillna('No Title')
        self.df['category'] = self.df['category'].fillna('Other')
        self.df['location'] = self.df['location'].fillna('Unknown')
        self.df['avg_rating'] = self.df['avg_rating'].fillna(3.0)
        self.df['total_views'] = self.df['total_views'].fillna(0)
        self.df['total_favorites'] = self.df['total_favorites'].fillna(0)
        self.df['status'] = self.df['status'].fillna('active')
        
        # Remove inactive items
        initial_count = len(self.df)
        self.df = self.df[self.df['status'] == 'active']
        removed = initial_count - len(self.df)
        
        # Ensure numeric columns
        for col in ['avg_rating', 'total_views', 'total_favorites', 'price']:
            if col in self.df.columns:
                self.df[col] = pd.to_numeric(self.df[col], errors='coerce').fillna(0)
        
        print(f"✅ Cleaned {len(self.df)} active items (removed {removed} inactive)")
        
        return self.df
    
    def create_features(self):
        """Engineer features for recommendation"""
        print("\n⚙️  Engineering features...")
        
        # Text features
        self.df['text_content'] = (
            self.df['title'].astype(str) + " " + 
            self.df['description'].astype(str) + " " +
            self.df['category'].astype(str) + " " +
            self.df['location'].astype(str)
        )
        
        # Normalize numerical features to 0-1
        self.df['rating_norm'] = self.scaler.fit_transform(self.df[['avg_rating']])
        self.df['views_norm'] = self.scaler.fit_transform(self.df[['total_views']])
        self.df['favorites_norm'] = self.scaler.fit_transform(self.df[['total_favorites']])
        
        # Popularity score (0-1)
        # 40% rating + 35% views + 25% favorites
        self.df['popularity_score'] = (
            0.40 * self.df['rating_norm'] +
            0.35 * self.df['views_norm'] +
            0.25 * self.df['favorites_norm']
        )
        
        print("✅ Features engineered:")
        print(f"   • Text embeddings ready")
        print(f"   • Popularity score range: {self.df['popularity_score'].min():.3f} - {self.df['popularity_score'].max():.3f}")
        print(f"   • Rating range: {self.df['avg_rating'].min():.1f} - {self.df['avg_rating'].max():.1f}")
        print(f"   • Views range: {self.df['total_views'].min():.0f} - {self.df['total_views'].max():.0f}")
        
        return self.df


# ============================================================================
# STEP 2: RECOMMENDATION ENGINE
# ============================================================================

class HybridRecommender:
    """Hybrid recommendation system"""
    
    def __init__(self, df):
        self.df = df.copy()
        self.tfidf = None
        self.tfidf_matrix = None
        self.item_id_to_idx = {item_id: idx for idx, item_id in enumerate(self.df.index)}
        self.idx_to_item_id = {v: k for k, v in self.item_id_to_idx.items()}
        
    def train(self):
        """Train TF-IDF vectorizer"""
        print("\n🧠 Training TF-IDF model...")
        
        self.tfidf = TfidfVectorizer(
            max_features=500,
            stop_words='english',
            min_df=1,
            max_df=0.8,
            ngram_range=(1, 2)
        )
        
        self.tfidf_matrix = self.tfidf.fit_transform(self.df['text_content'].values)
        print(f"✅ TF-IDF matrix trained: {self.tfidf_matrix.shape}")
        
        return self
    
    def get_content_similarity(self, query_text, top_k=50):
        """Get content-based recommendations"""
        query_vec = self.tfidf.transform([query_text])
        similarity_scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        
        top_indices = np.argsort(similarity_scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            results.append({
                'idx': idx,
                'similarity_score': float(similarity_scores[idx])
            })
        
        return results
    
    def apply_filters(self, recommendations_df, category=None, location=None, 
                     price_min=None, price_max=None, rating_min=0):
        """Apply metadata filters"""
        filtered = recommendations_df.copy()
        
        if category:
            filtered = filtered[filtered['category'].str.lower() == category.lower()]
        
        if location:
            filtered = filtered[filtered['location'].str.lower() == location.lower()]
        
        if price_min is not None:
            filtered = filtered[filtered['price'] >= price_min]
        
        if price_max is not None:
            filtered = filtered[filtered['price'] <= price_max]
        
        if rating_min > 0:
            filtered = filtered[filtered['avg_rating'] >= rating_min]
        
        return filtered
    
    def recommend(self, query, category=None, location=None, price_min=None, 
                 price_max=None, rating_min=0, top_k=10):
        """Generate recommendations"""
        # Get content-based recommendations
        content_recs = self.get_content_similarity(query, top_k=top_k*5)
        
        # Convert to DataFrame
        rec_indices = [r['idx'] for r in content_recs]
        rec_df = self.df.iloc[rec_indices].copy()
        rec_df['content_score'] = [r['similarity_score'] for r in content_recs]
        
        # Apply filters
        rec_df = self.apply_filters(
            rec_df, 
            category=category, 
            location=location,
            price_min=price_min, 
            price_max=price_max, 
            rating_min=rating_min
        )
        
        # Hybrid scoring: 70% content + 30% popularity
        rec_df['final_score'] = (
            0.70 * rec_df['content_score'] +
            0.30 * rec_df['popularity_score']
        )
        
        return rec_df.sort_values('final_score', ascending=False).head(top_k)
    
    def get_trending(self, category=None, location=None, top_k=10):
        """Get trending items by popularity"""
        trending = self.df.copy()
        
        if category:
            trending = trending[trending['category'].str.lower() == category.lower()]
        
        if location:
            trending = trending[trending['location'].str.lower() == location.lower()]
        
        return trending.nlargest(top_k, 'popularity_score')
    
    def save_model(self, output_dir='models'):
        """Save trained model"""
        print(f"\n💾 Saving model to {output_dir}...")
        
        Path(output_dir).mkdir(exist_ok=True)
        
        # Save TF-IDF
        with open(f'{output_dir}/tfidf_vectorizer.pkl', 'wb') as f:
            pickle.dump(self.tfidf, f)
        
        # Save metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'total_items': len(self.df),
            'categories': self.df['category'].unique().tolist(),
            'locations': self.df['location'].unique().tolist(),
            'num_tfidf_features': self.tfidf_matrix.shape[1]
        }
        
        with open(f'{output_dir}/metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save processed dataset
        self.df.to_csv(f'{output_dir}/processed_items.csv', index=False)
        
        print(f"✅ Model saved to {output_dir}/")
        return output_dir


# ============================================================================
# STEP 3: EVALUATION METRICS
# ============================================================================

def calculate_metrics(recommended_items, all_items_in_category, top_k=10):
    """Calculate Precision, Recall, F1-Score"""
    
    recommended_set = set(recommended_items.index[:top_k])
    relevant_set = set(all_items_in_category.index)
    
    if len(relevant_set) == 0:
        return {'precision': 0, 'recall': 0, 'f1': 0}
    
    # True positives
    tp = len(recommended_set & relevant_set)
    fp = len(recommended_set - relevant_set)
    fn = len(relevant_set - recommended_set)
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'tp': tp,
        'fp': fp,
        'fn': fn
    }


# ============================================================================
# STEP 4: VISUALIZATION
# ============================================================================

def create_visualizations(df, output_dir='results'):
    """Create analysis visualizations"""
    print("\n📊 Creating visualizations...")
    
    Path(output_dir).mkdir(exist_ok=True)
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Category distribution
    df['category'].value_counts().plot(kind='bar', ax=axes[0, 0], color='skyblue')
    axes[0, 0].set_title('Items by Category', fontsize=12, fontweight='bold')
    axes[0, 0].set_ylabel('Count')
    axes[0, 0].tick_params(axis='x', rotation=45)
    
    # 2. Rating distribution
    axes[0, 1].hist(df['avg_rating'], bins=20, color='green', edgecolor='black', alpha=0.7)
    axes[0, 1].set_title('Rating Distribution', fontsize=12, fontweight='bold')
    axes[0, 1].set_xlabel('Rating (Stars)')
    axes[0, 1].set_ylabel('Frequency')
    
    # 3. Transaction type
    if 'transaction_type' in df.columns:
        df['transaction_type'].value_counts().plot(kind='bar', ax=axes[1, 0], color='coral')
        axes[1, 0].set_title('Sell vs Rent Distribution', fontsize=12, fontweight='bold')
        axes[1, 0].set_ylabel('Count')
        axes[1, 0].tick_params(axis='x', rotation=0)
    
    # 4. Popularity score
    axes[1, 1].hist(df['popularity_score'], bins=20, color='purple', edgecolor='black', alpha=0.7)
    axes[1, 1].set_title('Popularity Score Distribution', fontsize=12, fontweight='bold')
    axes[1, 1].set_xlabel('Popularity Score')
    axes[1, 1].set_ylabel('Frequency')
    
    plt.tight_layout()
    plt.savefig(f'{output_dir}/data_analysis.png', dpi=100, bbox_inches='tight')
    print(f"✅ Saved: {output_dir}/data_analysis.png")
    plt.show()


# ============================================================================
# STEP 5: EXTRACT IMAGES FROM ZIP
# ============================================================================

def extract_images(zip_file_path, output_dir='images'):
    """Extract images from ZIP file"""
    print(f"\n📦 Extracting images from {zip_file_path}...")
    
    Path(output_dir).mkdir(exist_ok=True)
    
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
        
        # Count extracted images
        image_files = list(Path(output_dir).glob('**/*.jpg')) + \
                     list(Path(output_dir).glob('**/*.jpeg')) + \
                     list(Path(output_dir).glob('**/*.png'))
        
        print(f"✅ Extracted {len(image_files)} images to {output_dir}/")
        return output_dir
    except Exception as e:
        print(f"⚠️  Error extracting images: {e}")
        return None


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def main():
    """Complete training pipeline"""
    
    print("\n" + "="*70)
    print("🚀 FASILLINK AI RECOMMENDATION SYSTEM")
    print("   Google Colab Training Pipeline")
    print("="*70)
    
    # ---- STEP 1: Upload files in Colab ----
    print("\n" + "="*70)
    print("STEP 1: FILE UPLOAD")
    print("="*70)
    
    csv_file, zip_file = upload_files_colab()
    
    # ---- STEP 2: Load and preprocess data ----
    print("\n" + "="*70)
    print("STEP 2: DATA PREPROCESSING")
    print("="*70)
    
    processor = DataProcessor(csv_file)
    df = processor.load_data()
    df = processor.clean_data()
    df = processor.create_features()
    
    print(f"\n📊 Dataset Statistics:")
    print(f"   • Total items: {len(df)}")
    print(f"   • Categories: {df['category'].nunique()}")
    print(f"   • Locations: {df['location'].nunique()}")
    
    # ---- STEP 3: Extract images ----
    print("\n" + "="*70)
    print("STEP 3: IMAGE EXTRACTION")
    print("="*70)
    
    extract_images(zip_file)
    
    # ---- STEP 4: Train model ----
    print("\n" + "="*70)
    print("STEP 4: MODEL TRAINING")
    print("="*70)
    
    recommender = HybridRecommender(df)
    recommender.train()
    
    # ---- STEP 5: Test recommendations ----
    print("\n" + "="*70)
    print("STEP 5: TESTING RECOMMENDATIONS")
    print("="*70)
    
    test_queries = [
        {
            'query': 'luxury home in Arada',
            'category': 'Home',
            'location': 'Arada',
            'description': 'Luxury homes in Arada location'
        },
        {
            'query': 'affordable car for rent',
            'category': 'Car',
            'description': 'Rental cars at affordable prices'
        },
        {
            'query': 'wedding event tent',
            'category': 'Event Material',
            'description': 'Event materials for weddings'
        },
        {
            'query': 'Toyota Corolla for sale',
            'category': 'Car',
            'description': 'Toyota Corolla vehicles for sale'
        }
    ]
    
    all_precisions = []
    all_recalls = []
    all_f1s = []
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n📌 TEST QUERY {i}: '{test['query']}'")
        
        # Get recommendations
        recs = recommender.recommend(
            query=test['query'],
            category=test.get('category'),
            location=test.get('location'),
            top_k=5
        )
        
        # Calculate metrics
        category_items = df[df['category'] == test.get('category')] if test.get('category') else df
        metrics = calculate_metrics(recs, category_items, top_k=5)
        
        all_precisions.append(metrics['precision'])
        all_recalls.append(metrics['recall'])
        all_f1s.append(metrics['f1'])
        
        print(f"   Precision: {metrics['precision']:.2%} | Recall: {metrics['recall']:.2%} | F1: {metrics['f1']:.2%}")
        print(f"\n   Top 5 Results:")
        
        for idx, (_, row) in enumerate(recs.iterrows(), 1):
            print(f"   {idx}. {row['title']}")
            print(f"      📍 {row['location']} | ⭐ {row['avg_rating']:.1f} | 💰 {row['price']:,.0f} ETB")
            print(f"      👁️ {row['total_views']:.0f} views | ❤️ {row['total_favorites']:.0f} favorites | 🎯 Score: {row['final_score']:.3f}")
    
    # ---- STEP 6: Trending items ----
    print("\n" + "="*70)
    print("STEP 6: TRENDING ITEMS")
    print("="*70)
    
    for category in df['category'].unique()[:3]:
        print(f"\n🔥 Top Trending {category}:")
        trending = recommender.get_trending(category=category, top_k=3)
        
        for idx, (_, row) in enumerate(trending.iterrows(), 1):
            print(f"   {idx}. {row['title']}")
            print(f"      ⭐ {row['avg_rating']:.1f} | 👁️ {row['total_views']:.0f} views | Score: {row['popularity_score']:.3f}")
    
    # ---- STEP 7: Metrics summary ----
    print("\n" + "="*70)
    print("STEP 7: EVALUATION SUMMARY")
    print("="*70)
    
    avg_precision = np.mean(all_precisions)
    avg_recall = np.mean(all_recalls)
    avg_f1 = np.mean(all_f1s)
    
    print(f"\n📊 AVERAGE METRICS (across {len(test_queries)} test queries):")
    print(f"\n   Precision: {avg_precision:.2%} (Target: 90%)")
    print(f"   Recall:    {avg_recall:.2%} (Target: 85%)")
    print(f"   F1-Score:  {avg_f1:.2%} (Target: 87%)")
    
    if avg_precision >= 0.90 and avg_recall >= 0.85 and avg_f1 >= 0.87:
        print("\n   ✅ ALL TARGETS MET! System is production-ready!")
    else:
        print("\n   ⚠️  Some targets below threshold:")
        if avg_precision < 0.90:
            print(f"      - Precision: {avg_precision:.2%} < 90%")
        if avg_recall < 0.85:
            print(f"      - Recall: {avg_recall:.2%} < 85%")
        if avg_f1 < 0.87:
            print(f"      - F1-Score: {avg_f1:.2%} < 87%")
    
    # ---- STEP 8: Save visualizations ----
    print("\n" + "="*70)
    print("STEP 8: CREATING VISUALIZATIONS")
    print("="*70)
    
    create_visualizations(df, output_dir='results')
    
    # ---- STEP 9: Save model ----
    print("\n" + "="*70)
    print("STEP 9: SAVING MODEL")
    print("="*70)
    
    recommender.save_model(output_dir='fasillink_models')
    
    # ---- FINAL SUMMARY ----
    print("\n" + "="*70)
    print("✅ TRAINING COMPLETE!")
    print("="*70)
    
    print(f"\n📊 FINAL SUMMARY:")
    print(f"   ✓ Loaded: {len(df)} items")
    print(f"   ✓ Categories: {df['category'].nunique()}")
    print(f"   ✓ Locations: {df['location'].nunique()}")
    print(f"   ✓ Precision: {avg_precision:.2%}")
    print(f"   ✓ Recall: {avg_recall:.2%}")
    print(f"   ✓ F1-Score: {avg_f1:.2%}")
    
    print(f"\n📁 SAVED FILES:")
    print(f"   • fasillink_models/tfidf_vectorizer.pkl")
    print(f"   • fasillink_models/metadata.json")
    print(f"   • fasillink_models/processed_items.csv")
    print(f"   • results/data_analysis.png")
    print(f"   • images/ (extracted from ZIP)")
    
    print(f"\n🎯 NEXT STEPS:")
    print(f"   1. Download the saved models")
    print(f"   2. Integrate with Node.js backend")
    print(f"   3. Test with real users")
    print(f"   4. Monitor recommendation quality")
    
    print("\n" + "="*70 + "\n")


if __name__ == '__main__':
    main()
