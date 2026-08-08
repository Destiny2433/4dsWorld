"""
Database initialization script for 4DS WORLD.
Works with both SQLite (local) and PostgreSQL (Render deployment).
Run this script to create tables and seed initial product data.
"""
import os
from db_utils import init_db, DATABASE_URL

if __name__ == "__main__":
    print(f"Using database: {DATABASE_URL}")
    print(f"Database type: {'PostgreSQL' if DATABASE_URL.startswith('postgresql://') or DATABASE_URL.startswith('postgres://') else 'SQLite'}")
    init_db()
    print("\nDone! Database initialized successfully.")

