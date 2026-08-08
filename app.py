import os
import json
import hmac
import hashlib
import requests
from flask import Flask, request, jsonify, session, send_from_directory, redirect, url_for
from dotenv import load_dotenv
from db_utils import get_db

# Load Environment configs
load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'default_4ds_secret_key_change_me')

PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'tessy123')

# Security headers middleware
@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # CORS setup (Allow same-origin and safe local scripts)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
# --- STATIC ROUTING HANDLERS ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/shop.html')
@app.route('/shop')
def shop():
    return app.send_static_file('shop.html')

@app.route('/product.html')
@app.route('/product')
def product():
    return app.send_static_file('product.html')

@app.route('/cart.html')
@app.route('/cart')
def cart():
    return app.send_static_file('cart.html')

@app.route('/checkout.html')
@app.route('/checkout')
def checkout():
    return app.send_static_file('checkout.html')

@app.route('/about.html')
@app.route('/about')
def about():
    return app.send_static_file('about.html')

@app.route('/contact.html')
@app.route('/contact')
def contact():
    return app.send_static_file('contact.html')

@app.route('/admin.html')
@app.route('/admin')
def admin():
    return app.send_static_file('admin.html')


# --- PRODUCTS APIS ---
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE in_stock = 1')
    rows = cursor.fetchall()
    
    products_list = []
    for r in rows:
        products_list.append({
            'id': r['id'],
            'name': r['name'],
            'category': r['category'],
            'price': r['price'],
            'wholesalePrice': r['wholesale_price'],
            'wholesaleMinQty': r['wholesale_min_qty'],
            'sizes': r['sizes'].split(',') if r['sizes'] else [],
            'colors': r['colors'].split(',') if r['colors'] else [],
            'image': r['image'],
            'description': r['description'],
            'rating': r['rating'],
            'badge': r['badge'],
            'inStock': bool(r['in_stock'])
        })
    conn.close()
    return jsonify(products_list)

@app.route('/api/products/<id>', methods=['GET'])
def get_product(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE id = ?', (id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Product not found'}), 404
        
    product_detail = {
        'id': row['id'],
        'name': row['name'],
        'category': row['category'],
        'price': row['price'],
        'wholesalePrice': row['wholesale_price'],
        'wholesaleMinQty': row['wholesale_min_qty'],
        'sizes': row['sizes'].split(',') if row['sizes'] else [],
        'colors': row['colors'].split(',') if row['colors'] else [],
        'image': row['image'],
        'description': row['description'],
        'rating': row['rating'],
        'badge': row['badge'],
        'inStock': bool(row['in_stock'])
    }
    return jsonify(product_detail)


# --- PAYSTACK SECURE CHECKOUT APIS ---
@app.route('/api/orders/create', methods=['POST'])
def create_order():
    data = request.json
    if not data:
        return jsonify({'error': 'Missing checkout data'}), 400

    email = data.get('email')
    name = data.get('name')
    phone = data.get('phone')
    address = data.get('address')
    city = data.get('city')
    state = data.get('state')
    items = data.get('items', []) # Cart items list
    pricing_mode = data.get('pricingMode', 'retail')

    if not all([email, name, phone, address, city, state, items]):
        return jsonify({'error': 'All checkout details must be filled'}), 400

    # Server-side verification of price totals to prevent client tamper hacking
    conn = get_db()
    cursor = conn.cursor()
    
    subtotal = 0.0
    for item in items:
        # Fetch real catalog details directly from secure database
        cursor.execute('SELECT price, wholesale_price, wholesale_min_qty FROM products WHERE id = ?', (item['id'],))
        prod = cursor.fetchone()
        if not prod:
            conn.close()
            return jsonify({'error': f"Product {item['name']} no longer exists"}), 400
            
        qty = int(item['quantity'])
        # Apply wholesale calculations strictly
        is_wholesale = (pricing_mode == 'wholesale') or (qty >= prod['wholesale_min_qty'])
        unit_price = prod['wholesale_price'] if is_wholesale else prod['price']
        subtotal += unit_price * qty

    # Calculate delivery fee
    delivery = 2500.0 if subtotal < 150000.0 else 0.0
    total = subtotal + delivery
    total_kobo = int(total * 100) # Paystack expects subunits

    order_ref = '4DS-' + os.urandom(4).hex().upper()

    try:
        # Initialize with Paystack server-to-server API
        headers = {
            'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }
        payload = {
            'email': email,
            'amount': total_kobo,
            'reference': order_ref,
            'currency': 'NGN',
            'metadata': {
                'custom_fields': [
                    {'display_name': 'Name', 'variable_name': 'name', 'value': name},
                    {'display_name': 'Phone', 'variable_name': 'phone', 'value': phone},
                    {'display_name': 'Address', 'variable_name': 'address', 'value': f"{address}, {city}, {state}"}
                ]
            }
        }
        paystack_res = requests.post('https://api.paystack.co/transaction/initialize', json=payload, headers=headers)
        res_data = paystack_res.json()

        if not res_data.get('status'):
            conn.close()
            return jsonify({'error': 'Paystack initialization failed', 'details': res_data.get('message')}), 400

        access_code = res_data['data']['access_code']

        # Save order as "Pending" inside SQLite using parameterized bindings
        cursor.execute('''
            INSERT INTO orders (reference, email, name, phone, address, city, state, subtotal, delivery, total, status, items_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        ''', (order_ref, email, name, phone, address, city, state, subtotal, delivery, total, json.dumps(items)))
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'reference': order_ref,
            'access_code': access_code
        })

    except Exception as e:
        if 'conn' in locals(): conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders/verify', methods=['POST'])
def verify_order():
    data = request.json
    reference = data.get('reference')

    if not reference:
        return jsonify({'error': 'Reference is required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    
    # Check if order is already processed locally
    cursor.execute('SELECT * FROM orders WHERE reference = ?', (reference,))
    order = cursor.fetchone()
    
    if not order:
        conn.close()
        return jsonify({'error': 'Order not found'}), 404

    if order['status'] == 'Paid':
        conn.close()
        return jsonify({
            'success': True,
            'status': 'Paid',
            'orderRef': order['reference'],
            'amount': order['total'],
            'name': order['name'],
            'address': order['address'],
            'city': order['city'],
            'state': order['state']
        })

    # Call Paystack to verify payment status
    try:
        headers = {
            'Authorization': f'Bearer {PAYSTACK_SECRET_KEY}'
        }
        paystack_res = requests.get(f'https://api.paystack.co/transaction/verify/{reference}', headers=headers)
        res_data = paystack_res.json()

        if res_data.get('status') and res_data['data']['status'] == 'success':
            # Check matching totals (in Kobo vs Naira conversion)
            paid_amount_kobo = res_data['data']['amount']
            expected_amount_kobo = int(order['total'] * 100)
            
            if paid_amount_kobo == expected_amount_kobo:
                # Update status in SQLite
                cursor.execute('UPDATE orders SET status = "Paid" WHERE reference = ?', (reference,))
                conn.commit()
                conn.close()
                return jsonify({
                    'success': True,
                    'status': 'Paid',
                    'orderRef': order['reference'],
                    'amount': order['total'],
                    'name': order['name'],
                    'address': order['address'],
                    'city': order['city'],
                    'state': order['state']
                })
            else:
                conn.close()
                return jsonify({'error': 'Payment amount mismatch hacking attempt detected'}), 400
        else:
            conn.close()
            return jsonify({'success': False, 'status': 'Pending/Failed'}), 200

    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500


# --- PAYSTACK WEBHOOK (SHA512 VERIFICATION) ---
@app.route('/api/paystack-webhook', methods=['POST'])
def paystack_webhook():
    paystack_sig = request.headers.get('x-paystack-signature')
    if not paystack_sig:
        return jsonify({'error': 'No signature header found'}), 401

    # Verify signature securely using SHA512 hash
    computed_sig = hmac.new(
        bytes(PAYSTACK_SECRET_KEY, 'utf-8'),
        request.data,
        hashlib.sha512
    ).hexdigest()

    if not hmac.compare_digest(paystack_sig, computed_sig):
        return jsonify({'error': 'Signature verification failed'}), 401

    # Signature matches - safely parse JSON event body
    event = request.json
    if event.get('event') == 'charge.success':
        reference = event['data']['reference']
        paid_amount_kobo = event['data']['amount']
        
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('SELECT total, status FROM orders WHERE reference = ?', (reference,))
        order = cursor.fetchone()
        
        if order and order['status'] != 'Paid':
            expected_amount_kobo = int(order['total'] * 100)
            if paid_amount_kobo == expected_amount_kobo:
                cursor.execute('UPDATE orders SET status = "Paid" WHERE reference = ?', (reference,))
                conn.commit()
                print(f"Webhook transaction successful: {reference}")
            else:
                print(f"Webhook alert: Order {reference} price mismatch")
                
        conn.close()

    return jsonify({'status': 'success'}), 200


# --- ADMIN CRUD & PORTAL APIS ---
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    password = data.get('password')
    
    if password == ADMIN_PASSWORD:
        session['is_admin'] = True
        return jsonify({'success': True, 'message': 'Admin authenticated'})
    return jsonify({'success': False, 'error': 'Invalid admin password'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    return jsonify({'success': True, 'message': 'Logged out'})

@app.route('/api/admin/orders', methods=['GET'])
def admin_get_orders():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized admin session'}), 401
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders ORDER BY created_at DESC')
    rows = cursor.fetchall()
    
    orders_list = []
    for r in rows:
        orders_list.append({
            'id': r['id'],
            'reference': r['reference'],
            'email': r['email'],
            'name': r['name'],
            'phone': r['phone'],
            'address': r['address'],
            'city': r['city'],
            'state': r['state'],
            'subtotal': r['subtotal'],
            'delivery': r['delivery'],
            'total': r['total'],
            'status': r['status'],
            'items': json.loads(r['items_json']),
            'createdAt': r['created_at']
        })
    conn.close()
    return jsonify(orders_list)

@app.route('/api/admin/products', methods=['POST'])
def admin_manage_products():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized admin session'}), 401

    data = request.json
    action = data.get('action') # 'add', 'edit', 'delete'

    conn = get_db()
    cursor = conn.cursor()

    try:
        if action == 'delete':
            prod_id = data.get('id')
            cursor.execute('DELETE FROM products WHERE id = ?', (prod_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product deleted successfully'})

        elif action == 'add':
            prod_id = data.get('id')
            name = data.get('name')
            category = data.get('category')
            price = float(data.get('price', 0))
            wholesale_price = float(data.get('wholesalePrice', 0))
            wholesale_min_qty = int(data.get('wholesaleMinQty', 1))
            sizes = data.get('sizes', '')
            colors = data.get('colors', '')
            image = data.get('image', '')
            description = data.get('description', '')
            badge = data.get('badge', '')
            
            # Simple check if exists
            cursor.execute('SELECT id FROM products WHERE id = ?', (prod_id,))
            if cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Product with this ID code already exists'}), 400

            cursor.execute('''
                INSERT INTO products (id, name, category, price, wholesale_price, wholesale_min_qty, sizes, colors, image, description, rating, badge, in_stock)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 4.5, ?, 1)
            ''', (prod_id, name, category, price, wholesale_price, wholesale_min_qty, sizes, colors, image, description, badge))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product added successfully'})

        elif action == 'edit':
            prod_id = data.get('id')
            name = data.get('name')
            category = data.get('category')
            price = float(data.get('price', 0))
            wholesale_price = float(data.get('wholesalePrice', 0))
            wholesale_min_qty = int(data.get('wholesaleMinQty', 1))
            sizes = data.get('sizes', '')
            colors = data.get('colors', '')
            image = data.get('image', '')
            description = data.get('description', '')
            badge = data.get('badge', '')

            cursor.execute('''
                UPDATE products 
                SET name = ?, category = ?, price = ?, wholesale_price = ?, wholesale_min_qty = ?, sizes = ?, colors = ?, image = ?, description = ?, badge = ?
                WHERE id = ?
            ''', (name, category, price, wholesale_price, wholesale_min_qty, sizes, colors, image, description, badge, prod_id))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Product updated successfully'})
            
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

conn.close()
    return jsonify({'error': 'Invalid action requested'}), 400


# --- CONTACT MESSAGES API ---
@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.json
    if not data:
        return jsonify({'error': 'Missing form data'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not all([name, email, subject, message]):
        return jsonify({'error': 'All fields are required'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
                   (name, email, subject, message))
    conn.commit()
    conn.close()
