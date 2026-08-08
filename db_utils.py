"""
Database utility module for 4DS WORLD.
Handles both SQLite (local development) and PostgreSQL (Render deployment)
transparently based on the DATABASE_URL environment variable.
"""
import os
import json
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'database.db')
IS_POSTGRES = DATABASE_URL.startswith('postgresql://') or DATABASE_URL.startswith('postgres://')


def get_db():
    if IS_POSTGRES:
        return _PostgreSQLConnection(DATABASE_URL)
    else:
        return _SQLiteConnection(DATABASE_URL)


# ---------------------------------------------------------------------------
# PostgreSQL Implementation
# ---------------------------------------------------------------------------

class _PostgreSQLConnection:
    def __init__(self, db_url):
        self.db_url = db_url
        self.conn = None
        self._cursor = None

    def connect(self):
        import psycopg2
        import psycopg2.extras
        self.conn = psycopg2.connect(self.db_url)
        self.conn.autocommit = False
        self._cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return self

    def cursor(self):
        if self.conn is None:
            self.connect()
        return self

    def execute(self, sql, params=None):
        if self.conn is None:
            self.connect()
        converted_sql = sql.replace('?', '%s')
        if params is not None:
            self._cursor.execute(converted_sql, params)
        else:
            self._cursor.execute(converted_sql)
        return self._cursor

    def executemany(self, sql, seq_of_params):
        if self.conn is None:
            self.connect()
        converted_sql = sql.replace('?', '%s')
        self._cursor.executemany(converted_sql, seq_of_params)
        return self._cursor

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        if self._cursor:
            self._cursor.close()
        if self.conn:
            self.conn.close()


# ---------------------------------------------------------------------------
# SQLite Implementation
# ---------------------------------------------------------------------------

class _SQLiteConnection:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None
        self._cursor = None

    def connect(self):
        import sqlite3
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        self._cursor = self.conn.cursor()
        self._cursor.execute('PRAGMA journal_mode=WAL')
        self._cursor.execute('PRAGMA foreign_keys=ON')
        return self

    def cursor(self):
        if self.conn is None:
            self.connect()
        return self

    def execute(self, sql, params=None):
        if self.conn is None:
            self.connect()
        if params is not None:
            self._cursor.execute(sql, params)
        else:
            self._cursor.execute(sql)
        return self._cursor

    def executemany(self, sql, seq_of_params):
        if self.conn is None:
            self.connect()
        self._cursor.executemany(sql, seq_of_params)
        return self._cursor

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        if self._cursor:
            self._cursor.close()
        if self.conn:
            self.conn.close()


# ---------------------------------------------------------------------------
# Database Initialization
# ---------------------------------------------------------------------------

def init_db():
    print(f"Initializing database... (mode: {'PostgreSQL' if IS_POSTGRES else 'SQLite'})")
    conn = get_db()
    cursor = conn.cursor()
    if IS_POSTGRES:
        _init_postgres(conn, cursor)
    else:
        _init_sqlite(conn, cursor)
    conn.close()
    print("Database initialization complete.")


def _init_sqlite(conn, cursor):
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        price REAL NOT NULL, wholesale_price REAL NOT NULL, wholesale_min_qty INTEGER NOT NULL,
        sizes TEXT NOT NULL, colors TEXT NOT NULL, image TEXT NOT NULL,
        description TEXT NOT NULL, rating REAL NOT NULL, badge TEXT,
        in_stock INTEGER NOT NULL DEFAULT 1
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
        address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
        subtotal REAL NOT NULL, delivery REAL NOT NULL, total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending', items_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    _seed_if_empty(conn, cursor)


def _init_postgres(conn, cursor):
    cursor.execute('''CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        price DOUBLE PRECISION NOT NULL, wholesale_price DOUBLE PRECISION NOT NULL,
        wholesale_min_qty INTEGER NOT NULL, sizes TEXT NOT NULL, colors TEXT NOT NULL,
        image TEXT NOT NULL, description TEXT NOT NULL, rating DOUBLE PRECISION NOT NULL,
        badge TEXT, in_stock INTEGER NOT NULL DEFAULT 1
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
        address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL,
        subtotal DOUBLE PRECISION NOT NULL, delivery DOUBLE PRECISION NOT NULL,
        total DOUBLE PRECISION NOT NULL, status TEXT NOT NULL DEFAULT 'Pending',
        items_json TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL,
        email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    _seed_if_empty(conn, cursor)


def _seed_if_empty(conn, cursor):
    cursor.execute('SELECT COUNT(*) as count FROM products')
    row = cursor.fetchone()
    count = row['count'] if row else 0
    if count > 0:
        print("Database already contains product records. Skipping insertion.")
        return
    print("Database is empty. Populating with initial catalog...")
    default_products = [
        ("c1", "Elegant Ankara Gown", "clothes", 25000, 18000, 5, "S,M,L,XL", "Multicolor,Red/Yellow,Blue/Gold", "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&auto=format&fit=crop&q=60", "A beautifully tailored traditional African Ankara print gown. Perfect for weddings, formal events, and cultural celebrations.", 4.8, "Best Seller", 1),
        ("c2", "Modern Slim-Fit Suit", "clothes", 45000, 35000, 3, "M,L,XL,XXL", "Navy Blue,Charcoal Black,Classic Grey", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=60", "Sharp and sophisticated two-piece suit designed for the modern gentleman.", 4.9, "Premium", 1),
        ("c3", "Unisex Designer Hoodie", "clothes", 15000, 10000, 10, "S,M,L,XL", "Black,Sage Green,Oatmeal", "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format&fit=crop&q=60", "Comfortable heavyweight fleece hoodie featuring custom 4D'S World streetwear design.", 4.6, "New", 1),
        ("c4", "Floral Summer Dress", "clothes", 18000, 13000, 5, "XS,S,M,L", "Sage Floral,Rose Pink,Lemon Yellow", "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=60", "Lightweight flowing summer dress with adjustable straps.", 4.7, "Trending", 1),
        ("c5", "Casual Denim Jacket", "clothes", 22000, 16000, 5, "S,M,L,XL", "Classic Indigo,Light Wash,Acid Black", "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=60", "Rugged yet stylish denim jacket that works with any outfit.", 4.5, "", 1),
        ("s1", "Classic Leather Brogues", "shoes", 35000, 28000, 4, "40,41,42,43,44,45", "Tan Brown,Deep Mahogany,Midnight Black", "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=60", "Handcrafted genuine leather brogues with intricate wingtip detailing.", 4.8, "Hot Seller", 1),
        ("s2", "Luxury Velvet Stilettos", "shoes", 40000, 32000, 4, "36,37,38,39,40,41", "Emerald Green,Ruby Red,Royal Black", "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=60", "Stunning 4-inch velvet stilettos with comfortable cushioned insole.", 4.9, "Exclusive", 1),
        ("s3", "Urban Streetwear Sneakers", "shoes", 28000, 20000, 6, "39,40,41,42,43,44,45", "White/Gold,Triple Black,Retro Beige", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60", "Ultra-comfy daily sneakers with responsive cushioning.", 4.7, "Popular", 1),
        ("s4", "Comfort Leather Sandals", "shoes", 15000, 11000, 8, "38,39,40,41,42,43,44", "Tan,Dark Chocolate,Black", "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=600&auto=format&fit=crop&q=60", "Genuine leather slip-on slides with anatomical footbed.", 4.4, "", 1),
        ("s5", "Elegant Suede Loafers", "shoes", 30000, 24000, 5, "40,41,42,43,44", "Royal Blue,Beige Suede,Slate Grey", "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=60", "Italian style suede leather slip-on loafers.", 4.6, "New Style", 1),
        ("b1", "Premium Leather Handbag", "bags", 55000, 42000, 3, "Standard", "Tan Leather,Noir Black,Burgundy", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=60", "Exquisite structured calfskin leather handbag with gold-plated hardware.", 4.9, "Luxury", 1),
        ("b2", "Travel Duffel Bag", "bags", 28000, 20000, 5, "Large", "Vintage Brown,Forest Green,Stealth Black", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=60", "Spacious heavy-duty canvas and leather travel duffel.", 4.7, "Travel", 1),
        ("b3", "Designer Crossbody Bag", "bags", 22000, 16000, 6, "Standard", "Blush Pink,Sage,Taupe", "https://images.unsplash.com/photo-1598532187856-3b2363a37b8b?w=600&auto=format&fit=crop&q=60", "Sleek and compact crossbody bag for daily essentials.", 4.5, "Trending", 1),
        ("b4", "Classic Business Briefcase", "bags", 48000, 36000, 3, "Standard", "Classic Black,Espresso Brown", "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&auto=format&fit=crop&q=60", "Professional leather briefcase with padded laptop sleeve.", 4.8, "Executive", 1),
        ("b5", "Urban Canvas Backpack", "bags", 18000, 12000, 8, "Medium", "Charcoal Grey,Olive Drab,Khaki", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=60", "Water-resistant commuter backpack with drawstring main compartment.", 4.6, "", 1),
        ("a1", "Chronograph Gold Watch", "accessories", 65000, 50000, 3, "One Size", "24K Gold,Silver/Gold Dual,Rose Gold", "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=600&auto=format&fit=crop&q=60", "A luxury statement timepiece with Japanese movement.", 5.0, "Elite", 1),
        ("a2", "Italian Leather Belt", "accessories", 12000, 8000, 10, "32,34,36,38,40", "Black,Brown,Tan", "https://images.unsplash.com/photo-1624222247344-550fb8ec5b5d?w=600&auto=format&fit=crop&q=60", "Full-grain vegetable-tanned leather belt from Italy.", 4.7, "", 1),
        ("a3", "Aviator Sunglasses", "accessories", 10000, 6500, 10, "One Size", "Gold/Black Lens,Silver/Blue Mirror,Full Black", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=60", "Classic double-bridge metal frame aviators with polarized UV400 lenses.", 4.5, "Summer Item", 1),
        ("a4", "Minimalist Silver Bracelet", "accessories", 8500, 5500, 12, "Adjustable", "Sterling Silver,18K Gold Plated", "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=60", "Elegant 925 sterling silver cuff bracelet.", 4.6, "", 1),
        ("a5", "Velvet Bow Tie Set", "accessories", 7000, 4500, 15, "Adjustable", "Deep Wine,Classic Black,Emerald", "https://images.unsplash.com/photo-1589756823851-ede1be674188?w=600&auto=format&fit=crop&q=60", "Luxurious velvet bow tie with matching pocket square.", 4.8, "Gift Set", 1),
    ]
    cursor.executemany('''INSERT INTO products (id, name, category, price, wholesale_price, wholesale_min_qty, sizes, colors, image, description, rating, badge, in_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', default_products)
    conn.commit()
    print("Default products inserted successfully!")
