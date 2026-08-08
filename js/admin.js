// 4D'S World - Admin Portal Logic

document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

function initAdmin() {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('admin-login-form');
    const logoutBtn = document.getElementById('admin-logout-btn');
    
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');
    
    const productsTableBody = document.querySelector('#admin-products-table tbody');
    const ordersTableBody = document.querySelector('#admin-orders-table tbody');
    
    // Modal fields
    const modalOverlay = document.getElementById('product-modal-overlay');
    const openAddModalBtn = document.getElementById('btn-open-add-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const crudForm = document.getElementById('product-crud-form');
    const modalTitle = document.getElementById('modal-form-title');
    
    const formAction = document.getElementById('form-action');
    const formProdId = document.getElementById('form-prod-id');
    const formProdName = document.getElementById('form-prod-name');
    const formProdCategory = document.getElementById('form-prod-category');
    const formProdBadge = document.getElementById('form-prod-badge');
    const formProdPrice = document.getElementById('form-prod-price');
    const formProdWprice = document.getElementById('form-prod-wprice');
    const formProdWqty = document.getElementById('form-prod-wqty');
    const formProdSizes = document.getElementById('form-prod-sizes');
    const formProdColors = document.getElementById('form-prod-colors');
    const formProdImage = document.getElementById('form-prod-image');
    const formProdDesc = document.getElementById('form-prod-desc');

    // Local cached products list for easy lookup during Edit edits
    let adminProducts = [];

    // Check if session cookie is already active (try calling orders API)
    fetchOrdersAndRender(true); // silent check

    // Tab Navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('admin-pass').value;

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ password })
                });
                const data = await res.json();

                if (data.success) {
                    showDashboard();
                    showToast('Authenticated successfully', 'success');
                } else {
                    showToast(data.error || 'Invalid credentials', 'error');
                }
            } catch (err) {
                showToast('Authentication failed', 'error');
            }
        });
    }

    // Logout Click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            hideDashboard();
            showToast('Logged out successfully', 'info');
        });
    }

    // Modal Control
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', () => {
            // Setup form for ADD mode
            crudForm.reset();
            formAction.value = 'add';
            formProdId.readOnly = false;
            modalTitle.textContent = 'Add New Product';
            modalOverlay.classList.add('active');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });
    }

    // Product Form CRUD Submit
    if (crudForm) {
        crudForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                action: formAction.value,
                id: formProdId.value.trim(),
                name: formProdName.value.trim(),
                category: formProdCategory.value,
                price: parseFloat(formProdPrice.value),
                wholesalePrice: parseFloat(formProdWprice.value),
                wholesaleMinQty: parseInt(formProdWqty.value),
                sizes: formProdSizes.value.trim(),
                colors: formProdColors.value.trim(),
                image: formProdImage.value.trim(),
                description: formProdDesc.value.trim(),
                badge: formProdBadge.value.trim()
            };

            try {
                const res = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success) {
                    showToast(data.message, 'success');
                    modalOverlay.classList.remove('active');
                    // Refresh data
                    fetchProductsAndRender();
                } else {
                    showToast(data.error || 'Failed to save product', 'error');
                }
            } catch (err) {
                showToast('Error sending product data', 'error');
            }
        });
    }

    // Switch Dashboard states UI
    function showDashboard() {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        logoutBtn.style.display = 'inline-flex';
        
        fetchProductsAndRender();
        fetchOrdersAndRender();
    }

    function hideDashboard() {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        document.getElementById('admin-pass').value = '';
    }

    // Fetch and Draw Lists
    async function fetchProductsAndRender() {
        try {
            const res = await fetch('/api/products');
            adminProducts = await res.json();
            
            if (!productsTableBody) return;
            
            if (adminProducts.length === 0) {
                productsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No products in shop registry.</td></tr>`;
                return;
            }

            productsTableBody.innerHTML = adminProducts.map(p => `
                <tr>
                    <td><code>${p.id}</code></td>
                    <td><img src="${p.image}" style="width: 40px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                    <td style="font-weight: 600; color: #fff;">${p.name}</td>
                    <td><span style="text-transform: capitalize;">${p.category}</span></td>
                    <td>${formatNaira(p.price)}</td>
                    <td>${formatNaira(p.wholesalePrice)}</td>
                    <td>${p.wholesaleMinQty} pcs</td>
                    <td>
                        <button class="btn btn-secondary" onclick="editProduct('${p.id}')" style="padding: 6px 12px; font-size: 0.78rem; margin-right: 6px;"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-secondary" onclick="deleteProduct('${p.id}')" style="padding: 6px 12px; font-size: 0.78rem; border-color: var(--error); color: var(--error);"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Failed to load products list', err);
        }
    }

    async function fetchOrdersAndRender(silentCheck = false) {
        try {
            const res = await fetch('/api/admin/orders');
            if (res.status === 401) {
                if (!silentCheck) hideDashboard();
                return;
            }
            const orders = await res.json();
            
            if (silentCheck) {
                showDashboard();
                return;
            }

            if (!ordersTableBody) return;

            if (orders.length === 0) {
                ordersTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No customer orders found yet.</td></tr>`;
                return;
            }

            ordersTableBody.innerHTML = orders.map(o => {
                const statusClass = o.status.toLowerCase() === 'paid' ? 'status-badge paid' : 'status-badge pending';
                const dateStr = new Date(o.createdAt).toLocaleString();
                
                // Formatted list of ordered items
                const itemsStr = o.items.map(i => `${i.name} (Qty: ${i.quantity}, Size: ${i.size})`).join('<br>');

                return `
                    <tr>
                        <td><code>${o.reference}</code></td>
                        <td><span class="${statusClass}">${o.status}</span></td>
                        <td>${dateStr}</td>
                        <td>
                            <strong>${o.name}</strong><br>
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">${o.email}</span>
                        </td>
                        <td>${o.phone}</td>
                        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${o.address}</td>
                        <td style="font-size: 0.85rem; line-height: 1.4;">${itemsStr}</td>
                        <td style="font-weight: 700; color: var(--accent-gold);">${formatNaira(o.total)}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error('Failed to load orders list', err);
        }
    }

    // Modal populate helpers (Global access needed since row buttons invoke them dynamically)
    window.editProduct = function(id) {
        const p = adminProducts.find(item => item.id === id);
        if (!p) return;

        formAction.value = 'edit';
        formProdId.value = p.id;
        formProdId.readOnly = true; // Cannot edit code index directly
        
        formProdName.value = p.name;
        formProdCategory.value = p.category;
        formProdPrice.value = p.price;
        formProdWprice.value = p.wholesalePrice;
        formProdWqty.value = p.wholesaleMinQty;
        
        formProdSizes.value = p.sizes.join(',');
        formProdColors.value = p.colors.join(',');
        formProdImage.value = p.image;
        formProdDesc.value = p.description;
        formProdBadge.value = p.badge || '';

        modalTitle.textContent = 'Edit Product Details';
        modalOverlay.classList.add('active');
    };

    window.deleteProduct = async function(id) {
        if (!confirm(`Are you sure you want to delete product code: ${id}?`)) return;

        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ action: 'delete', id: id })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast(data.message, 'success');
                fetchProductsAndRender();
            } else {
                showToast(data.error || 'Failed to delete product', 'error');
            }
        } catch (err) {
            showToast('Error communicating deletion', 'error');
        }
    };
}
