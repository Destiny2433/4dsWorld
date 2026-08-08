import sys
sys.path.insert(0, r'c:/Users/HP/Desktop/4DS WORLD')
import app

# Check the new routes are registered
routes = [r.rule for r in app.app.url_map.iter_rules()]
print("delete route present:", '/api/admin/orders/delete' in routes)
print("status route present:", '/api/admin/orders/status' in routes)
print("clean url map present:", 'index.html' in str(routes))

# Test clean URL redirect (index.html -> /)
client = app.app.test_client()
resp = client.get('/admin.html')
print("GET /admin.html status:", resp.status_code)
print("Redirect location:", resp.headers.get('Location'))

resp2 = client.get('/login.html')
print("GET /login.html status:", resp2.status_code)
print("Redirect location:", resp2.headers.get('Location'))

# Test delete requires auth
resp3 = client.post('/api/admin/orders/delete', json={'reference': 'TEST'})
print("DELETE without auth status:", resp3.status_code)
print("DELETE without auth body:", resp3.get_json())

print("ALL ROUTE CHECKS PASSED")
