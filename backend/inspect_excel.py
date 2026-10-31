import pandas as pd
import os

file_path = r"C:\Users\hp\Downloads\LISTE BENEFS MSD DTK PIKINE 2026.xlsx"
if os.path.exists(file_path):
    try:
        df = pd.read_excel(file_path, nrows=5)
        print("Columns:", df.columns.tolist())
        print("Data sample:")
        print(df.head())
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
else:
    print(f"File not found: {file_path}")
