"""
Database utility module for 4DS WORLD.
Primary database: Google Cloud Firestore (Firebase).
MongoDB has been removed entirely.
"""
import os
from dotenv import load_dotenv

load_dotenv()

FIREBASE_CREDENTIAL_PATH = os.environ.get(
    'FIREBASE_CREDENTIAL_PATH',
    'destiny-c7cd4-firebase-adminsdk-ad232-3fdac99d15.json'
)

_firestore_client = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore as fs
except ImportError:
    firebase_admin = None
    credentials = None
    fs = None


def init_db():
    """Initialize Firestore connection."""
    global _firestore_client
    if _firestore_client is not None:
        return True
    if firebase_admin is None:
        print('firebase-admin package is not installed.')
        return False
    if not os.path.exists(FIREBASE_CREDENTIAL_PATH):
        print(f'Firebase credentials not found at: {FIREBASE_CREDENTIAL_PATH}')
        return False
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIAL_PATH)
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred)
        _firestore_client = fs.client()
        print('Firestore initialized successfully.')
        return True
    except Exception as ex:
        print(f'Failed to initialize Firestore: {ex}')
        return False


def db_is_available():
    global _firestore_client
    if _firestore_client is not None:
        return True
    return init_db()


class FirestoreCollection:
    """Wrapper around a Firestore collection with MongoDB-like API."""

    def __init__(self, name):
        self._name = name

    @property
    def _col(self):
        global _firestore_client
        if _firestore_client is None:
            raise RuntimeError('Firestore is not initialized.')
        return _firestore_client.collection(self._name)

    def _to_doc(self, snap):
        """Convert a Firestore snapshot to a plain dict."""
        data = snap.to_dict() or {}
        # Ensure id field is set
        if not data.get('id'):
            data['id'] = snap.id
        # Remove internal Firestore _id if present
        data.pop('_id', None)
        return data

    def _matches(self, data, query):
        """Python-side filtering to avoid Firestore index requirements."""
        if not query:
            return True
        for key, value in query.items():
            if key == '$and' and isinstance(value, list):
                if not all(self._matches(data, cond) for cond in value):
                    return False
            elif isinstance(value, dict):
                doc_val = data.get(key)
                for op, val in value.items():
                    if op == '$ne' and doc_val == val:
                        return False
                    elif op == '$gt' and not (doc_val is not None and doc_val > val):
                        return False
                    elif op == '$gte' and not (doc_val is not None and doc_val >= val):
                        return False
                    elif op == '$lt' and not (doc_val is not None and doc_val < val):
                        return False
                    elif op == '$lte' and not (doc_val is not None and doc_val <= val):
                        return False
                    elif op == '$in' and doc_val not in val:
                        return False
            else:
                if data.get(key) != value:
                    return False
        return True

    def find(self, query=None, projection=None):
        results = []
        for snap in self._col.stream():
            data = self._to_doc(snap)
            if self._matches(data, query):
                results.append(data)
        return results

    def find_one(self, query=None, projection=None):
        # Fast path: look up by id directly
        if query and 'id' in query and isinstance(query['id'], str) and len(query) == 1:
            doc = self._col.document(query['id']).get()
            if doc.exists:
                return self._to_doc(doc)
            return None
        results = self.find(query, projection)
        return results[0] if results else None

    def insert_one(self, doc):
        doc_id = str(doc.get('id') or os.urandom(8).hex())
        doc['id'] = doc_id
        doc.pop('_id', None)
        self._col.document(doc_id).set(doc)
        return type('Result', (), {'inserted_id': doc_id})()

    def update_one(self, query, update):
        existing = self.find_one(query)
        if not existing:
            return type('Result', (), {'matched_count': 0, 'modified_count': 0})()
        doc_ref = self._col.document(str(existing['id']))
        payload = update.get('$set', update)
        doc_ref.update(payload)
        return type('Result', (), {'matched_count': 1, 'modified_count': 1})()

    def delete_one(self, query):
        existing = self.find_one(query)
        if not existing:
            return type('Result', (), {'deleted_count': 0})()
        self._col.document(str(existing['id'])).delete()
        return type('Result', (), {'deleted_count': 1})()

    def replace_one(self, query, replacement, upsert=False):
        existing = self.find_one(query)
        if existing:
            doc_ref = self._col.document(str(existing['id']))
            replacement['id'] = existing['id']
            replacement.pop('_id', None)
            doc_ref.set(replacement)
            return type('Result', (), {'matched_count': 1, 'modified_count': 1, 'upserted_id': None})()
        elif upsert:
            return self.insert_one(replacement)
        return type('Result', (), {'matched_count': 0, 'modified_count': 0, 'upserted_id': None})()


class LazyCollection:
    """Lazily initializes Firestore on first access."""
    def __init__(self, name):
        self._name = name
        self._col = None

    def _get(self):
        if self._col is None:
            if not db_is_available():
                raise RuntimeError('Firestore is unavailable. Check your credentials file.')
            self._col = FirestoreCollection(self._name)
        return self._col

    def __getattr__(self, item):
        return getattr(self._get(), item)

    def __iter__(self):
        return iter(self._get().find())


# Public collection handles
products_col = LazyCollection('products')
orders_col = LazyCollection('orders')
messages_col = LazyCollection('contact_messages')
subscriptions_col = LazyCollection('push_subscriptions')
