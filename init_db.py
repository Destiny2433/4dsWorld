"""
Database initialization script for 4DS WORLD.
Works with MongoDB (as configured in db_utils.py).
Run this script to confirm the database connection.
"""
import os
from db_utils import init_db

if __name__ == "__main__":
    print("Initializing 4DS WORLD database connection...")
    init_db()
    print("\nDone! Database connection verified successfully.")
