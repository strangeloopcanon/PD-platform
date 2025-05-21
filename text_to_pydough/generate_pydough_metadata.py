import sqlite3
import json
import os
import argparse

# LLM-specific imports
try:
    import llm
except ImportError:
    print("LLM libraries not found. Please install with: pip install llm llm-gemini")
    llm = None

LLM_MODEL_NAME = "gemini-2.5-pro-preview-05-06"

TEMP_DIR = "temp_depmap"
SCHEMA_JSON = os.path.join(TEMP_DIR, "depmap_schema.json")
SCHEMA_MD = os.path.join(TEMP_DIR, "depmap_schema.md")
DB_PATH = "text_to_pydough/data/DepMap.db"

# Utility: SQLite type to PyDough type
def sqlite_to_pydough_type(sqlite_type):
    t = (sqlite_type or "").upper()
    if "INT" in t:
        return "int64"
    elif any(x in t for x in ["CHAR", "TEXT", "CLOB"]):
        return "string"
    elif any(x in t for x in ["REAL", "FLOAT", "DOUBLE"]):
        return "float64"
    elif any(x in t for x in ["DECIMAL", "NUMERIC"]):
        return "float64"
    elif "BOOL" in t:
        return "bool"
    elif t == "DATE":
        return "date"
    elif "DATETIME" in t or "TIMESTAMP" in t:
        return "timestamp"
    elif "BLOB" in t:
        return "string"
    return "string"

# Helper: Find composite PK or unique index
def get_composite_pk_or_unique(conn, table):
    cursor = conn.cursor()
    # 1. Check for composite PK
    cursor.execute(f"PRAGMA table_info('{table}')")
    pk_cols = [row[1] for row in cursor.fetchall() if row[5] > 0]
    if len(pk_cols) > 1:
        return pk_cols
    # 2. Check for composite unique index
    cursor.execute(f"PRAGMA index_list('{table}')")
    for idx in cursor.fetchall():
        is_unique = idx[2]  # 1 if unique
        idx_name = idx[1]
        if is_unique:
            cursor.execute(f"PRAGMA index_info('{idx_name}')")
            unique_cols = [row[2] for row in cursor.fetchall()]
            if len(unique_cols) > 1:
                return unique_cols
    return None  # No composite unique key found

# Helper: Check if a column is unique in the table
def is_column_unique(conn, table, column):
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT COUNT(DISTINCT {column}), COUNT(*) FROM {table}")
        distinct_count, total_count = cursor.fetchone()
        return distinct_count == total_count
    except Exception as e:
        print(f"Warning: Could not check uniqueness for {column} in {table}: {e}")
        return False

def generate_schema(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    if not tables:
        raise Exception(f"No tables found in {db_path}")
    graph_name = os.path.splitext(os.path.basename(db_path))[0]
    schema = {graph_name: {}}
    for table in tables:
        cursor.execute(f"PRAGMA table_info('{table}')")
        columns = cursor.fetchall()  # (cid, name, type, notnull, dflt_value, pk)
        properties = {}
        for col in columns:
            col_name, col_type = col[1], col[2]
            properties[col_name] = {
                "type": "table_column",
                "column_name": col_name,
                "data_type": sqlite_to_pydough_type(col_type)
            }
        # Find composite PK or unique index
        composite_key = get_composite_pk_or_unique(conn, table)
        if composite_key:
            unique_properties = composite_key
        else:
            # Fallback: all PK columns, or first column, or placeholder
            pk_cols = [col[1] for col in columns if col[5] > 0]
            if pk_cols:
                unique_properties = pk_cols
            elif columns:
                first_col = columns[0][1]
                # Check if first column is unique
                if is_column_unique(conn, table, first_col):
                    unique_properties = [first_col]
                elif len(columns) > 1:
                    unique_properties = [columns[0][1], columns[1][1]]
                else:
                    unique_properties = [first_col]
            else:
                unique_properties = ["_placeholder_id_"]
        # Manual override could go here if needed in the future
        collection_name = table if table != graph_name else f"{table}Entries"
        schema[graph_name][collection_name] = {
            "type": "simple_table",
            "table_path": f"main.{table}",
            "properties": properties,
            "unique_properties": unique_properties
        }
    conn.close()
    return schema

def save_json_schema(schema, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(schema, f, indent=2)
    print(f"Saved JSON schema to {path}")

def generate_markdown_with_llm(schema_json_path, output_md_path):
    if not llm:
        print("LLM not available. Cannot generate markdown.")
        return
    with open(schema_json_path) as f:
        schema_json = f.read()
    prompt = f"""
You are an expert data documentation assistant. Given the following JSON schema for a SQLite database, write a comprehensive Markdown documentation file for it, suitable for use by data scientists and LLMs. Your documentation should include:
- A summary of the database and its collections (tables)
- For each collection: a description, a table of columns with types and a clear, concise description for each column
- The unique_properties for each collection, and an explanation of what makes them unique
- Any notes about primary keys or lack thereof

Here is the JSON schema:

```json
{schema_json}
```

Write only the Markdown documentation, no extra commentary.
"""
    print("Sending schema to Gemini 2.5 Pro for Markdown generation...")
    model = llm.get_model(LLM_MODEL_NAME)
    response = model.prompt(prompt, temperature=0.2).text()
    with open(output_md_path, "w") as f:
        f.write(response)
    print(f"Saved Markdown documentation to {output_md_path}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_PATH, help="Path to SQLite DB (default: DepMap.db)")
    args = parser.parse_args()
    db_path = args.db
    db_filename_no_ext = os.path.splitext(os.path.basename(db_path))[0]
    outdir = os.path.dirname(db_path) or "."
    # Ensure output directory exists (it should, as it's same as input .db file's dir)
    os.makedirs(outdir, exist_ok=True) 

    # Use simpler naming convention: basename.json and basename.md
    schema_json_path = os.path.join(outdir, f"{db_filename_no_ext.lower()}.json")
    schema_md_path = os.path.join(outdir, f"{db_filename_no_ext.lower()}.md")
    
    schema = generate_schema(db_path)
    save_json_schema(schema, schema_json_path)
    generate_markdown_with_llm(schema_json_path, schema_md_path)

if __name__ == "__main__":
    main()