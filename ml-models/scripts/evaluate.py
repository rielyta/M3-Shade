import json
import joblib
import colorsys
import numpy as np
import pandas as pd
from pathlib import Path
from collections import Counter
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, cohen_kappa_score
)
from sklearn.model_selection import cross_val_score, StratifiedKFold

DATA_DIR   = Path(__file__).resolve().parent.parent / 'data'
MODELS_DIR = Path(__file__).resolve().parent.parent / 'models'

PROCESSED_CSV = DATA_DIR   / 'shades_processed.csv'
MODEL_PATH    = MODELS_DIR / 'knn_shade_matcher.pkl'
SCALER_PATH   = MODELS_DIR / 'scaler.pkl'
METADATA_PATH = MODELS_DIR / 'model_metadata.json'
EVAL_PATH     = MODELS_DIR / 'evaluation_report.json'
CM_PATH       = MODELS_DIR / 'confusion_matrix.txt'

FEATURE_COLS = ['R', 'G', 'B', 'H', 'S', 'L',
                'rb_diff', 'gb_diff', 'rg_diff', 'luminance']

def compute_metrics_manual(y_true, y_pred, labels):
    metrics = {}
    total   = len(y_true)
    tp_all  = 0

    for cls in labels:
        tp = sum(1 for a, p in zip(y_true, y_pred) if a == cls and p == cls)
        fp = sum(1 for a, p in zip(y_true, y_pred) if a != cls and p == cls)
        fn = sum(1 for a, p in zip(y_true, y_pred) if a == cls and p != cls)

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1        = (2 * precision * recall / (precision + recall)
                     if (precision + recall) > 0 else 0.0)
        support   = sum(1 for a in y_true if a == cls)
        tp_all   += tp

        metrics[cls] = {
            "TP": tp, "FP": fp, "FN": fn,
            "precision": round(precision, 4),
            "recall":    round(recall, 4),
            "f1_score":  round(f1, 4),
            "support":   support,
        }

    macro_p  = sum(v["precision"] for v in metrics.values()) / len(labels)
    macro_r  = sum(v["recall"]    for v in metrics.values()) / len(labels)
    macro_f1 = sum(v["f1_score"]  for v in metrics.values()) / len(labels)

    weighted_p  = sum(v["precision"] * v["support"] for v in metrics.values()) / total
    weighted_r  = sum(v["recall"]    * v["support"] for v in metrics.values()) / total
    weighted_f1 = sum(v["f1_score"]  * v["support"] for v in metrics.values()) / total

    metrics["macro avg"]    = {"precision": round(macro_p,  4), "recall": round(macro_r,  4), "f1_score": round(macro_f1, 4)}
    metrics["weighted avg"] = {"precision": round(weighted_p,  4), "recall": round(weighted_r,  4), "f1_score": round(weighted_f1, 4)}
    metrics["accuracy"]     = round(tp_all / total, 4)
    return metrics

def print_metrics_manual(metrics, labels):
    print("\n  Perhitungan Manual (subCPMK231)")
    print(f"  {'Kelas':<12} {'TP':>5} {'FP':>5} {'FN':>5} {'Precision':>10} {'Recall':>9} {'F1-Score':>10} {'Support':>8}")
    print("  " + "-" * 72)
    for cls in labels:
        m = metrics[cls]
        print(f"  {cls:<12} {m['TP']:>5} {m['FP']:>5} {m['FN']:>5} "
              f"{m['precision']:>10.4f} {m['recall']:>9.4f} {m['f1_score']:>10.4f} {m['support']:>8}")
    print("  " + "-" * 72)
    for avg in ["macro avg", "weighted avg"]:
        m = metrics[avg]
        print(f"  {avg:<12} {'':>5} {'':>5} {'':>5} "
              f"{m['precision']:>10.4f} {m['recall']:>9.4f} {m['f1_score']:>10.4f}")
    print(f"\n  Accuracy (manual): {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)")

def rgb_to_hsl(r, g, b):
    r_, g_, b_ = r/255, g/255, b/255
    h, l, s = colorsys.rgb_to_hls(r_, g_, b_)
    return round(h*360, 1), round(s, 3), round(l*100, 1)

def build_features(df):
    df = df.copy()
    df['rb_diff']   = df['R'] - df['B']
    df['gb_diff']   = df['G'] - df['B']
    df['rg_diff']   = df['R'] - df['G']
    df['luminance'] = 0.299*df['R'] + 0.587*df['G'] + 0.114*df['B']
    return df[FEATURE_COLS].values, df['undertone'].values

def load_all():
    print("[INFO] Loading model dan dataset...")
    knn    = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    df     = pd.read_csv(PROCESSED_CSV)

    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    print(f"[OK]   Model    : KNN K={knn.n_neighbors}, metric={knn.metric}")
    print(f"[OK]   Dataset  : {len(df)} rows, {df['brand'].nunique()} brands")
    return knn, scaler, df, metadata

def evaluate_full(knn, scaler, df):
    print("\n[INFO] Evaluasi pada full dataset...")
    X, y     = build_features(df)
    X_scaled = scaler.transform(X)

    y_pred = knn.predict(X_scaled)
    acc    = accuracy_score(y, y_pred)
    kappa  = cohen_kappa_score(y, y_pred)
    cm     = confusion_matrix(y, y_pred, labels=['Cool','Neutral','Warm'])
    report = classification_report(y, y_pred, output_dict=True)

    print(f"  Full Accuracy  : {acc:.4f} ({acc*100:.2f}%)")
    print(f"  Cohen's Kappa  : {kappa:.4f}  ({'Substantial' if kappa>0.6 else 'Moderate' if kappa>0.4 else 'Fair'})")
    print(f"\n  Classification Report (full):")
    print(classification_report(y, y_pred))

    manual_metrics = compute_metrics_manual(y, y_pred, ['Cool', 'Neutral', 'Warm'])
    print_metrics_manual(manual_metrics, ['Cool', 'Neutral', 'Warm'])

    return acc, kappa, cm, report, y_pred, manual_metrics

def cross_validate(knn, scaler, df, cv=10):
    print(f"[INFO] {cv}-Fold Stratified Cross Validation...")
    X, y     = build_features(df)
    X_scaled = scaler.transform(X)

    skf    = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
    scores = cross_val_score(knn, X_scaled, y, cv=skf, scoring='accuracy')

    print(f"  CV Scores : {[round(s,4) for s in scores]}")
    print(f"  Mean      : {scores.mean():.4f} +/- {scores.std():.4f}")
    print(f"  Min/Max   : {scores.min():.4f} / {scores.max():.4f}")
    return scores

def analyze_per_brand(knn, scaler, df):
    print("\n[INFO] Analisis akurasi per brand...")
    X, y     = build_features(df)
    X_scaled = scaler.transform(X)
    y_pred   = knn.predict(X_scaled)
    df       = df.copy()
    df['pred']    = y_pred
    df['correct'] = (df['pred'] == df['undertone'])

    brand_acc = df.groupby('brand')['correct'].agg(['sum','count'])
    brand_acc['accuracy'] = brand_acc['sum'] / brand_acc['count']
    brand_acc = brand_acc.sort_values('accuracy', ascending=False)

    print(f"\n  {'Brand':<30} {'Correct':>7} {'Total':>6} {'Accuracy':>9}")
    print(f"  {'-'*56}")
    for brand, row in brand_acc.iterrows():
        bar = '#' * int(row['accuracy'] * 10)
        print(f"  {brand:<30} {int(row['sum']):>7} {int(row['count']):>6} {row['accuracy']:>8.1%}  {bar}")
    return brand_acc

def analyze_per_skintone(knn, scaler, df):
    print("\n[INFO] Analisis akurasi per skin tone...")
    X, y     = build_features(df)
    X_scaled = scaler.transform(X)
    y_pred   = knn.predict(X_scaled)
    df       = df.copy()
    df['pred']    = y_pred
    df['correct'] = (df['pred'] == df['undertone'])

    ORDER  = ['Very Fair','Fair','Light Medium','Medium','Tan','Deep','Very Deep']
    st_acc = df.groupby('skinTone')['correct'].agg(['sum','count'])
    st_acc['accuracy'] = st_acc['sum'] / st_acc['count']
    st_acc = st_acc.reindex([s for s in ORDER if s in st_acc.index])

    print(f"\n  {'Skin Tone':<15} {'Correct':>7} {'Total':>6} {'Accuracy':>9}")
    print(f"  {'-'*42}")
    for st, row in st_acc.iterrows():
        bar = '#' * int(row['accuracy'] * 10)
        print(f"  {st:<15} {int(row['sum']):>7} {int(row['count']):>6} {row['accuracy']:>8.1%}  {bar}")
    return st_acc

def print_confusion_matrix(cm, labels=['Cool','Neutral','Warm']):
    lines  = []
    col_w  = 10
    lines.append(f"\n  Confusion Matrix (baris=actual, kolom=predicted):\n")
    lines.append("  " + " "*10 + "".join(f"{l:>{col_w}}" for l in labels))
    lines.append("  " + "-" * (10 + col_w * len(labels)))
    for i, label in enumerate(labels):
        row = "  " + f"{label:<10}" + "".join(f"{cm[i,j]:>{col_w}}" for j in range(len(labels)))
        lines.append(row)
    result = "\n".join(lines)
    print(result)

    with open(CM_PATH, 'w', encoding='utf-8') as f:
        f.write(result)
    print(f"\n[OK]   Confusion matrix tersimpan: {CM_PATH}")
    return result

def save_report(metadata, full_acc, kappa, cm, report, cv_scores, brand_acc, st_acc, manual_metrics):
    report_data = {
        "model_info": {
            "type":     metadata.get("model_type"),
            "k":        metadata.get("optimal_k"),
            "metric":   metadata.get("metric"),
            "weights":  metadata.get("weights"),
            "features": metadata.get("features"),
            "dataset":  "foundation_shade.csv (9845 shades)",
        },
        "evaluation": {
            "full_dataset_accuracy": round(float(full_acc), 4),
            "cohen_kappa":           round(float(kappa), 4),
            "cv_10fold_mean":        round(float(cv_scores.mean()), 4),
            "cv_10fold_std":         round(float(cv_scores.std()), 4),
            "cv_10fold_scores":      [round(float(s), 4) for s in cv_scores],
        },
        "classification_report": {
            cls: {m: round(v, 4) for m, v in metrics.items()}
            for cls, metrics in report.items()
            if isinstance(metrics, dict)
        },
        "metrics_manual": {
            cls: {k: v for k, v in m.items()}
            for cls, m in manual_metrics.items()
            if isinstance(m, dict)
        },
        "confusion_matrix": {
            "labels": ["Cool", "Neutral", "Warm"],
            "matrix": cm.tolist()
        },
        "per_brand_accuracy": {
            brand: round(float(row['accuracy']), 4)
            for brand, row in brand_acc.iterrows()
        },
        "per_skintone_accuracy": {
            st: round(float(row['accuracy']), 4)
            for st, row in st_acc.iterrows()
        }
    }

    with open(EVAL_PATH, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print(f"[OK]   Evaluation report: {EVAL_PATH}")

if __name__ == '__main__':
    SEP = '=' * 50
    print(SEP)
    print("  M3-Shade KNN Evaluation")
    print("  Dataset: foundation_shade.csv (9845 shades)")
    print(SEP)

    knn, scaler, df, metadata = load_all()

    full_acc, kappa, cm, report, y_pred, manual_metrics = evaluate_full(knn, scaler, df)
    cv_scores = cross_validate(knn, scaler, df, cv=10)
    brand_acc = analyze_per_brand(knn, scaler, df)
    st_acc    = analyze_per_skintone(knn, scaler, df)
    print_confusion_matrix(cm)

    save_report(metadata, full_acc, kappa, cm, report, cv_scores, brand_acc, st_acc, manual_metrics)

    print(f"\n{SEP}")
    print(f"  RINGKASAN")
    print(f"  Algoritma  : K-Nearest Neighbors")
    print(f"  Dataset    : foundation_shade.csv, {len(df)} shades, {df['brand'].nunique()} brand")
    print(f"  Accuracy   : {full_acc*100:.2f}% (full dataset)")
    print(f"  CV 10-Fold : {cv_scores.mean()*100:.2f}% +/- {cv_scores.std()*100:.2f}%")
    print(f"  Kappa      : {kappa:.4f}")
    print(f"  Metrik per Kelas (Manual):")
    for cls in ['Cool', 'Neutral', 'Warm']:
        m = manual_metrics[cls]
        print(f"    {cls:<8}: P={m['precision']:.4f}  R={m['recall']:.4f}  F1={m['f1_score']:.4f}")
    wf1 = manual_metrics['weighted avg']['f1_score']
    print(f"  Weighted F1: {wf1:.4f}")
    print(SEP)