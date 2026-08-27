import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()  # reads the .env file into environment variables

conn_str = (
    f"DRIVER={{{os.environ['DB_DRIVER']}}};"
    f"SERVER={os.environ['DB_SERVER']};"
    f"DATABASE={os.environ['DB_NAME']};"
    f"UID={os.environ['DB_USER']};"
    f"PWD={os.environ['DB_PASS']};"
)

try:
    conn = pyodbc.connect(conn_str, timeout=5)
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION;")
    row = cursor.fetchone()
    print("✅ Connected successfully!")
    print(row[0])
    conn.close()
except Exception as e:
    print("❌ Connection failed:")
    print(e)
