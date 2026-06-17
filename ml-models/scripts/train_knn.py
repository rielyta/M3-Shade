import json
import joblib
import colorsys
import numpy as np
import pandas as pd
from pathlib import Path
from collections import Counter
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score

ROOT_DIR    = Path(__file__).resolve().parents[2]
DATA_DIR    = Path(__file__).resolve().parent.parent / 'data'
MODELS_DIR  = Path(__file__).resolve().parent.parent / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

PROCESSED_CSV = DATA_DIR   / 'shades_processed.csv'
MODEL_PATH    = MODELS_DIR / 'knn_shade_matcher.pkl'
SCALER_PATH   = MODELS_DIR / 'scaler.pkl'
METADATA_PATH = MODELS_DIR / 'model_metadata.json'

FEATURE_COLS = ['R', 'G', 'B', 'H', 'S', 'L',
                'rb_diff', 'gb_diff', 'rg_diff', 'luminance']

def load_data():
    if not PROCESSED_CSV.exists():
        raise FileNotFoundError(
            f"File tidak ditemukan: {PROCESSED_CSV}\n"
            "Jalankan data_preprocessing.py terlebih dahulu."
        )
    df = pd.read_csv(PROCESSED_CSV)
    print(f"[INFO] Dataset loaded : {len(df)} rows")
    print(f"[INFO] Brands         : {df['brand'].nunique()}")
    print(f"[INFO] Kolom          : {list(df.columns)}")
    return df

def prepare_features(df):
    df = df.copy()
    df['rb_diff']   = df['R'] - df['B']
    df['gb_diff']   = df['G'] - df['B']
    df['rg_diff']   = df['R'] - df['G']
    df['luminance'] = 0.299*df['R'] + 0.587*df['G'] + 0.114*df['B']

    X = df[FEATURE_COLS].values
    y = df['undertone'].values

    print(f"[INFO] Features       : {FEATURE_COLS}")
    print(f"[INFO] Target dist.   : {dict(Counter(y))}")
    return X, y, df

def find_optimal_k(X_train, y_train, k_range=range(1, 21)):
    print("\n[INFO] Mencari optimal K...")
    scores = {}
    for k in k_range:
        knn = KNeighborsClassifier(n_neighbors=k, metric='euclidean')
        cv  = cross_val_score(knn, X_train, y_train, cv=5, scoring='accuracy')
        scores[k] = cv.mean()
        print(f"  K={k:2d}  CV Accuracy: {cv.mean():.4f} +/- {cv.std():.4f}")

    best_k = max(scores, key=scores.get)
    print(f"\n[OK]   Optimal K = {best_k}  (accuracy={scores[best_k]:.4f})")
    return best_k, scores

def train_model(X, y, df_full):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[INFO] Train size     : {len(X_train)}")
    print(f"[INFO] Test size      : {len(X_test)}")

    scaler         = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    best_k, k_scores = find_optimal_k(X_train_scaled, y_train)

    print(f"\n[INFO] Training KNN (K={best_k})...")
    knn = KNeighborsClassifier(n_neighbors=best_k, metric='euclidean', weights='distance')
    knn.fit(X_train_scaled, y_train)

    y_pred = knn.predict(X_test_scaled)
    acc    = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    print(f"\n[OK]   Test Accuracy  : {acc:.4f} ({acc*100:.2f}%)")
    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred))

    joblib.dump(knn,    MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"[OK]   Model tersimpan : {MODEL_PATH}")
    print(f"[OK]   Scaler tersimpan: {SCALER_PATH}")

    metadata = {
        "model_type":    "KNeighborsClassifier",
        "optimal_k":     int(best_k),
        "metric":        "euclidean",
        "weights":       "distance",
        "features":      FEATURE_COLS,
        "target":        "undertone",
        "classes":       list(knn.classes_),
        "train_size":    int(len(X_train)),
        "test_size":     int(len(X_test)),
        "test_accuracy": round(float(acc), 4),
        "cv_k_scores":   {str(k): round(v, 4) for k, v in k_scores.items()},
        "classification_report": {
            cls: {m: round(v, 4) for m, v in metrics.items()}
            for cls, metrics in report.items()
            if isinstance(metrics, dict)
        },
        "dataset_info": {
            "source":        "foundation_shade.csv",
            "total_records": int(len(df_full)),
            "brands":        int(df_full['brand'].nunique()),
            "undertone_dist": {k: int(v) for k, v in Counter(df_full['undertone']).items()},
            "skintone_dist":  {k: int(v) for k, v in Counter(df_full['skinTone']).items()},
        }
    }

    with open(METADATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"[OK]   Metadata        : {METADATA_PATH}")

    return knn, scaler, best_k, acc

def quick_test(knn, scaler):
    print("\n[INFO] Quick test prediksi:")

    test_colors = [
        {"name": "Fair Neutral (#E8D5C0)",  "R": 232, "G": 213, "B": 192, "expected": "Neutral"},
        {"name": "Warm Gold (#D99358)",     "R": 217, "G": 147, "B":  88, "expected": "Warm"},
        {"name": "Fair Cool (#F5DDD0)",     "R": 245, "G": 221, "B": 208, "expected": "Cool"},
        {"name": "Deep Warm (#7A4020)",     "R": 122, "G":  64, "B":  32, "expected": "Warm"},
        {"name": "Deep Cool (#895852)",     "R": 137, "G":  88, "B":  82, "expected": "Cool"},
    ]

    correct = 0
    for c in test_colors:
        r, g, b = c['R'], c['G'], c['B']
        r_, g_, b_ = r/255, g/255, b/255
        h, l, s = colorsys.rgb_to_hls(r_, g_, b_)
        h, s, l = round(h*360, 1), round(s, 3), round(l*100, 1)
        rb, gb, rg = r-b, g-b, r-g
        lum = 0.299*r + 0.587*g + 0.114*b

        feat   = np.array([[r, g, b, h, s, l, rb, gb, rg, lum]])
        scaled = scaler.transform(feat)
        pred   = knn.predict(scaled)[0]
        proba  = {cls: round(float(p), 3) for cls, p in zip(knn.classes_, knn.predict_proba(scaled)[0])}
        match  = "OK" if pred == c['expected'] else "FAIL"
        correct += (pred == c['expected'])

        print(f"  {c['name']}")
        print(f"    Expected: {c['expected']:8}  Prediksi: {pred:8}  [{match}]")
        print(f"    Confidence: {proba}")

    print(f"\n  Quick test: {correct}/{len(test_colors)} ({correct/len(test_colors)*100:.0f}%)")

if __name__ == '__main__':
    SEP = '=' * 45
    print(SEP)
    print("  M3-Shade KNN Training Pipeline")
    print("  Dataset: foundation_shade.csv (9845 shades)")
    print(SEP)

    df = load_data()
    X, y, df_full = prepare_features(df)
    knn, scaler, best_k, acc = train_model(X, y, df_full)
    quick_test(knn, scaler)

    print(f"\n{SEP}")
    print(f"  SELESAI - Model KNN (K={best_k})")
    print(f"  Accuracy : {acc*100:.2f}%")
    print(f"  Simpan di: ml-models/models/")
    print(SEP)