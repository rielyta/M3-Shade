import json
import colorsys
import pandas as pd
from pathlib import Path
from collections import Counter

ROOT_DIR    = Path(__file__).resolve().parents[2]
DATA_DIR    = Path(__file__).resolve().parent.parent / 'data'
BACKEND_DIR = ROOT_DIR / 'backend' / 'data'

DATA_DIR.mkdir(parents=True, exist_ok=True)
BACKEND_DIR.mkdir(parents=True, exist_ok=True)

INPUT_CSV = DATA_DIR / 'foundation_shade.csv'

def rgb_to_hsl(r, g, b):
    r_, g_, b_ = r/255, g/255, b/255
    h, l, s = colorsys.rgb_to_hls(r_, g_, b_)
    return round(h*360, 1), round(s, 3), round(l*100, 1)

def classify_undertone(r, g, b):
    rb_diff = r - b
    gb_diff = g - b
    rg_diff = r - g
    if rb_diff > 80 and gb_diff > 40:
        return 'Warm'
    if rb_diff < 55 and rg_diff > 20:
        return 'Cool'
    return 'Neutral'

def classify_skin_tone(lum):
    if lum > 200: return 'Very Fair'
    if lum > 170: return 'Fair'
    if lum > 140: return 'Light Medium'
    if lum > 110: return 'Medium'
    if lum > 80:  return 'Tan'
    if lum > 55:  return 'Deep'
    return 'Very Deep'

def classify_fitzpatrick(lum):
    if lum > 210: return 'I'
    if lum > 175: return 'II'
    if lum > 140: return 'III'
    if lum > 105: return 'IV'
    if lum > 70:  return 'V'
    return 'VI'

BRAND_POPULARITY = {
    'Fenty': 95, 'MAC': 90, 'NARS': 88, 'Estee Lauder': 87,
    'Lancome': 86, 'Dior': 85, 'Make Up For Ever': 84,
    'Bobbi Brown': 83, 'bareMinerals': 82, "L'Oreal": 80,
    'Maybelline': 79, 'Shiseido': 78, 'Revlon': 75,
    'Covergirl': 74, 'About Face': 70, 'Black Opal': 70,
}

def preprocess(csv_path=None):
    path = Path(csv_path) if csv_path else INPUT_CSV
    print(f"\n[INFO] Membaca dataset: {path}")
    df = pd.read_csv(path)

    print(f"[INFO] Raw rows   : {len(df)}")
    print(f"[INFO] Columns    : {list(df.columns)}")

    df = df.dropna(subset=['brand_name', 'product_name', 'shade_name', 'hex', 'red', 'green', 'blue'])
    df = df[df['hex'].str.match(r'^#?[0-9A-Fa-f]{6}$', na=False)]
    df = df.drop_duplicates(subset=['brand_name', 'product_name', 'shade_name'])
    print(f"[INFO] After clean: {len(df)} rows")
    print(f"[INFO] Brands     : {df['brand_name'].nunique()} brand")

    records = []
    for i, row in df.iterrows():
        r = int(row['red'])
        g = int(row['green'])
        b = int(row['blue'])

        if not (0 <= r <= 255 and 0 <= g <= 255 and 0 <= b <= 255):
            continue

        hex_clean   = '#' + str(row['hex']).lstrip('#').upper()
        h, s, l     = rgb_to_hsl(r, g, b)
        lum         = 0.299*r + 0.587*g + 0.114*b
        undertone   = classify_undertone(r, g, b)
        skin_tone   = classify_skin_tone(lum)
        fitzpatrick = classify_fitzpatrick(lum)
        brand       = str(row['brand_name']).strip()
        popularity  = BRAND_POPULARITY.get(brand, 50)

        records.append({
            'id':          str(len(records)+1).zfill(4),
            'brand':       brand,
            'product':     str(row['product_name']).strip(),
            'shade':       str(row['shade_name']).strip(),
            'hex':         hex_clean,
            'H':           h,
            'S':           s,
            'L':           l,
            'R':           r,
            'G':           g,
            'B':           b,
            'undertone':   undertone,
            'skinTone':    skin_tone,
            'fitzpatrick': fitzpatrick,
            'popularity':  popularity,
        })

    df_out = pd.DataFrame(records)

    processed_csv = DATA_DIR / 'shades_processed.csv'
    df_out.to_csv(processed_csv, index=False)
    print(f"[OK]   CSV tersimpan  : {processed_csv}")

    json_path = BACKEND_DIR / 'foundation-shades.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"[OK]   JSON tersimpan : {json_path}")

    undertone_dist = dict(sorted(Counter(r['undertone'] for r in records).items()))
    skintone_dist  = Counter(r['skinTone'] for r in records).most_common()

    SEP = '-' * 45
    print(f"\n{SEP}")
    print(f"  Total produk  : {len(records)}")
    print(f"  Jumlah brand  : {df_out['brand'].nunique()}")
    print(f"  Undertone     : {undertone_dist}")
    print(f"\n  SkinTone dist.:")
    for label, count in skintone_dist:
        bar = '#' * (count // 50)
        print(f"    {label:<15} {count:>4}  {bar}")
    print(f"{SEP}\n")

    with open(json_path, 'r', encoding='utf-8') as fv:
        check = json.load(fv)
    assert len(check) == len(records)
    required = {'id','brand','product','shade','hex','undertone','skinTone','fitzpatrick','popularity'}
    missing  = required - set(check[0].keys())
    assert not missing, f"Field hilang: {missing}"
    print(f"[OK]   Validasi JSON  : {len(check)} records, semua field lengkap")

    return df_out, records

if __name__ == '__main__':
    print("=" * 45)
    print("  M3-Shade Data Preprocessing Pipeline")
    print("  Dataset: foundation_shade.csv (9845 shades)")
    print("=" * 45)

    if not INPUT_CSV.exists():
        print(f"[ERROR] File tidak ditemukan: {INPUT_CSV}")
        print("  Pastikan foundation_shade.csv ada di ml-models/data/")
        raise SystemExit(1)

    preprocess()
    print("[DONE] Preprocessing selesai!")