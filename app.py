import os
import json
import hmac
import hashlib
import base64
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session, send_from_directory, redirect, url_for
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from db_utils import products_col, orders_col, messages_col, subscriptions_col, init_db, db_is_available

# Load Environment configs
load_dotenv()

# --- WEB PUSH / NOTIFICATIONS ---
try:
    from pywebpush import webpush, WebPushException
    HAS_PYWEBPUSH = True
except ImportError:
    HAS_PYWEBPUSH = False
    

def _bytes_to_b64url(data):
    """Convert raw bytes to base64url encoded string (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _get_vapid_keys():
    """Return (private_key, public_key) generated on the fly if not in env."""
    private_key = os.environ.get('VAPID_PRIVATE_KEY', '')
    public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
    if private_key and public_key:
        return private_key, public_key
    # Generate a fresh EC keypair (best-effort)
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.backends import default_backend
        key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        raw_priv = key.private_numbers().private_value.to_bytes(32, 'big')
        pub = key.public_key().public_numbers()
        raw_pub = pub.x.to_bytes(32, 'big') + pub.y.to_bytes(32, 'big')
        return _bytes_to_b64url(raw_priv), _bytes_to_b64url(raw_pub)
    except Exception:
        return '', ''


VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY = _get_vapid_keys()
VAPID_CLAIMS = {"sub": "mailto:destinydomi@gmail.com"}

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', '4ds_world_secret_key_secure_2026')
# Persistent login: keep the admin session alive for 30 days, so once logged in
# on a device the user does not need to log in again until they log out.
app.permanent_session_lifetime = timedelta(days=30)

# User provided keys and credentials
PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '').strip()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'tessy123')
PAYSTACK_VERIFY_URL = os.environ.get('PAYSTACK_VERIFY_URL', 'https://api.paystack.co/transaction/verify/')
PAYSTACK_VERIFY_URL = PAYSTACK_VERIFY_URL.rstrip('/') + '/'

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Security headers for safety
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response


def notify_admins(title, body, tag='admin-notification'):
    """Send a push notification to all subscribed admin browsers."""
    if not HAS_PYWEBPUSH or not (VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY):
        return
    if not db_is_available():
        return
    subs = list(subscriptions_col.find({}))
    if not subs:
        return
    payload = json.dumps({"title": title, "body": body, "tag": tag})
    for sub in subs:
        try:
            endpoint = sub.get('endpoint')
            if not endpoint:
                continue
            keys = sub.get('keys') or {}
            sub_info = {
                "endpoint": endpoint,
                "keys": {
                    "p256dh": keys.get('p256dh', ''),
                    "auth": keys.get('auth', '')
                }
            }
            webpush(
                subscription_info=sub_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except WebPushException as exc:
            # Expired/invalid subscription -> remove it
            endpoint = sub.get('endpoint')
            if exc.response and exc.response.status_code in (404, 410):
                try:
                    subscriptions_col.delete_one({"endpoint": endpoint})
                except Exception:
                    pass
        except Exception as err:
            print(f'Push error: {err}')


@app.route('/api/admin/vapid-key', methods=['GET'])
def admin_vapid_key():
    """Expose the VAPID public key so the browser can subscribe."""
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({'publicKey': VAPID_PUBLIC_KEY})


@app.route('/api/admin/subscribe', methods=['POST'])
def admin_subscribe():
    """Store a push subscription for the admin."""
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    endpoint = data.get('endpoint')
    if not endpoint:
        return jsonify({'error': 'Missing endpoint'}), 400
    endpoint_id = hashlib.sha256(endpoint.encode('utf-8')).hexdigest()
    subscriptions_col.insert_one({
        "id": endpoint_id,
        "endpoint": endpoint,
        "keys": data.get('keys') or {},
        "createdAt": datetime.utcnow().isoformat()
    })
    return jsonify({'success': True})


@app.route('/api/admin/unsubscribe', methods=['POST'])
def admin_unsubscribe():
    """Remove a push subscription."""
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    endpoint = data.get('endpoint')
    if endpoint:
        endpoint_id = hashlib.sha256(endpoint.encode('utf-8')).hexdigest()
        subscriptions_col.delete_one({"id": endpoint_id})
    return jsonify({'success': True})


# --- CLEAN URL ROUTING (Removing .html for security and SEO) ---
# Map static .html files to their clean, auth-aware routes.
_HTML_ROUTE_MAP = {
    'index.html': '/',
    'shop.html': '/shop',
    'product.html': '/product',
    'cart.html': '/cart',
    'checkout.html': '/checkout',
    'about.html': '/about',
    'contact.html': '/contact',
    'login.html': '/admin-login',
    'admin.html': '/admin-portal',
}


@app.before_request
def redirect_html_to_clean():
    """Redirect any .html URL to its clean route so the admin page enforces
    authentication and .html never appears in the URL (SEO + security)."""
    path = request.path.lstrip('/')
    target = _HTML_ROUTE_MAP.get(path)
    if target is not None:
        # Preserve query string
        if request.query_string:
            target += '?' + request.query_string.decode('utf-8')
        return redirect(target)
    return None


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/shop')
def shop():
    return app.send_static_file('shop.html')


@app.route('/product')
def product():
    return app.send_static_file('product.html')


@app.route('/cart')
def cart():
    return app.send_static_file('cart.html')


@app.route('/checkout')
def checkout():
    return app.send_static_file('checkout.html')


@app.route('/about')
def about():
    return app.send_static_file('about.html')


@app.route('/contact')
def contact():
    return app.send_static_file('contact.html')


@app.route('/admin-login')
def admin_login_page():
    """Separate admin login page. If already logged in, go straight to dashboard."""
    if session.get('is_admin'):
        return redirect('/admin-portal')
    return app.send_static_file('login.html')


@app.route('/admin-portal')
def admin():
    """Admin dashboard. Requires login - otherwise redirect to the login page."""
    if not session.get('is_admin'):
        return redirect('/admin-login')
    return app.send_static_file('admin.html')


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# --- PRODUCTS APIS ---
@app.route('/api/products', methods=['GET'])
def get_products():
    if not db_is_available():
        return jsonify([])
    try:
        # Add caching headers to improve performance
        prods = list(products_col.find({}, {"_id": 0}))
        response = jsonify(prods)
        response.headers['Cache-Control'] = 'public, max-age=300'  # Cache for 5 minutes
        return response
    except Exception as e:
        print(f'Error fetching products: {e}')
        return jsonify([])


@app.route('/api/products/<id>', methods=['GET'])
def get_product(id):
    if not db_is_available():
        return jsonify({'error': 'Database unavailable'}), 503
    prod = products_col.find_one({"id": id}, {"_id": 0})
    if not prod:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify(prod)


# --- SECURE CHECKOUT ---
@app.route('/api/orders/create', methods=['POST'])
def create_order():
    if not db_is_available():
        return jsonify({'error': 'Database unavailable. Please try again later.'}), 503
    data = request.json
    if not data:
        return jsonify({'error': 'Missing data'}), 400

    email = data.get('email')
    name = data.get('name')
    phone = data.get('phone')
    address = data.get('address')
    items = data.get('items', [])

    if not all([email, name, phone, address, items]):
        return jsonify({'error': 'All fields are required'}), 400

    subtotal = 0.0
    for item in items:
        prod = products_col.find_one({"id": item['id']})
        if prod:
            subtotal += float(prod.get('price', 0)) * int(item.get('quantity', 1))
        else:
            subtotal += float(item.get('price', 0)) * int(item.get('quantity', 1))

# No shipping fee - free delivery always
    delivery = 0.0
    total = subtotal + delivery
    total_kobo = int(total * 100)
    order_ref = '4DS-' + os.urandom(4).hex().upper()

    # Store order as Pending in database
    created_at = datetime.utcnow().isoformat()
    orders_col.insert_one({
        "reference": order_ref,
        "email": email,
        "name": name,
        "phone": phone,
        "address": f"{address}, {data.get('city','')}, {data.get('state','')}",
        "total": total,
        "status": "Pending",
        "items": items,
        "createdAt": created_at,
        "created_at": created_at
    })

    # Notify admin of a new order
    notify_admins('New Order', f'New order {order_ref} of ₦{total:,.0f} received.',
                  tag='admin-order-notification')

    return jsonify({
        "success": True,
        "reference": order_ref,
        "amount": total_kobo,
        "amount_in_kobo": total_kobo,
        "email": email
    })


@app.route('/api/orders/verify', methods=['POST'])
def verify_order():
    ref = request.json.get('reference') if request.json else None
    if not ref:
        return jsonify({"success": False, "error": "Missing payment reference"}), 400

    if not PAYSTACK_SECRET_KEY:
        # Fallback for local testing / missing secret key
        orders_col.update_one({"reference": ref}, {"$set": {"status": "Paid"}})
        return jsonify({"success": True, "status": "Paid", "note": "Verified locally"})

    headers = {
        'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
        'Content-Type': 'application/json'
    }
    
    try:
        res = requests.get(f"{PAYSTACK_VERIFY_URL}{ref}", headers=headers, timeout=10)
        verification = res.json()
    except Exception as err:
        return jsonify({"success": False, "error": f"Payment verification failed: {err}"}), 502
    
    if res.status_code != 200 or not verification.get('status'):
        orders_col.update_one({"reference": ref}, {"$set": {"status": "Verification Failed"}})
        return jsonify({"success": False, "error": "Unable to verify payment"}), 502

    paystack_data = verification.get('data', {})
    status = paystack_data.get('status')
    if status == 'success':
        orders_col.update_one({"reference": ref}, {"$set": {"status": "Paid", "payment_details": paystack_data}})
        return jsonify({"success": True, "status": "Paid"})

    orders_col.update_one({"reference": ref}, {"$set": {"status": status or "Pending", "payment_details": paystack_data}})
    return jsonify({"success": False, "status": status or "Pending", "error": "Payment not completed"}), 402


# --- ADMIN CRUD & PORTAL APIS ---
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    if request.json and request.json.get('password') == ADMIN_PASSWORD:
        session['is_admin'] = True
        session.permanent = True  # Persistent 30-day session
        return jsonify({'success': True})
    return jsonify({'success': False}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    return jsonify({'success': True})


@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    if not db_is_available():
        return jsonify([])
    orders = list(orders_col.find({}, {'_id': 0}))
    return jsonify(orders)


@app.route('/api/admin/upload', methods=['POST'])
def admin_upload():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filename = f"{os.urandom(8).hex()}_{filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'success': True, 'url': f"/uploads/{filename}"})
    return jsonify({'error': 'File type not allowed'}), 400


@app.route('/api/admin/products', methods=['POST'])
def admin_manage_products():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    if not db_is_available():
        return jsonify({'error': 'Database unavailable. Please try again later.'}), 503
    data = request.json or {}
    action = data.get('action')

    if action == 'delete':
        products_col.delete_one({"id": data.get('id')})
        return jsonify({'success': True})

    # Safe parsing of list/string colors
    raw_colors = data.get('colors', [])
    if isinstance(raw_colors, str):
        colors_list = [c.strip() for c in raw_colors.split(',') if c.strip()]
    elif isinstance(raw_colors, list):
        colors_list = [str(c).strip() for c in raw_colors if str(c).strip()]
    else:
        colors_list = []

    # Safe parsing of list/string sizes
    raw_sizes = data.get('sizes', [])
    if isinstance(raw_sizes, str):
        sizes_list = [s.strip() for s in raw_sizes.split(',') if s.strip()]
    elif isinstance(raw_sizes, list):
        sizes_list = [str(s).strip() for s in raw_sizes if str(s).strip()]
    else:
        sizes_list = []

    prod_id = str(data.get('id') or '').strip()
    if action == 'add' and not prod_id:
        prod_id = f"prod-{os.urandom(4).hex()}"

    prod_data = {
        "id": prod_id,
        "name": str(data.get('name') or ''),
        "category": str(data.get('category') or 'clothes'),
        "price": float(data.get('price') or 0.0),
        "wholesalePrice": float(data.get('wholesalePrice') or 0.0),
        "wholesaleMinQty": int(data.get('wholesaleMinQty') or 0),
        "sizes": sizes_list,
        "colors": colors_list,
        "image": str(data.get('image') or ''),
        "description": str(data.get('description') or ''),
        "rating": float(data.get('rating') or 5.0),
        "badge": str(data.get('badge') or ''),
        "in_stock": 1
    }

    if action == 'add':
        products_col.insert_one(prod_data)
    elif action == 'edit':
        products_col.update_one({"id": prod_id}, {"$set": prod_data})

    return jsonify({'success': True})


@app.route('/api/admin/contact-messages', methods=['GET'])
def admin_get_messages():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    if not db_is_available():
        return jsonify([])
    msgs = list(messages_col.find({}, {"_id": 0}))
    return jsonify(msgs)


@app.route('/api/admin/contact-messages/<id>', methods=['DELETE'])
def admin_delete_msg(id):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 401
    if not db_is_available():
        return jsonify({'error': 'Database unavailable. Please try again later.'}), 503
    messages_col.delete_one({"id": id})
    return jsonify({'success': True})


@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.json or {}
    if not data:
        return jsonify({'error': 'Missing data'}), 400
    data['id'] = os.urandom(4).hex()
    data['createdAt'] = datetime.utcnow().isoformat()
    messages_col.insert_one(data)
    # Notify admin of a new message
    notify_admins('New Message', f'New contact message from {data.get("name", "someone")}.',
                  tag='admin-message-notification')
    return jsonify({'success': True})


if __name__ == '__main__':
    if not init_db():
        print('Warning: Database connection failed. Running app in fallback mode.')
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 9000)))