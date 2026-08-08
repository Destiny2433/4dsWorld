// 4D'S World - Admin Portal Logic

// Mobile Detection & Setup
var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
var isTablet = /iPad|Android(?!.*Mobi)|PlayBook|Silk/.test(navigator.userAgent);

// Set viewport meta tag for mobile
if (isMobile || isTablet) {
    document.documentElement.style.fontSize = window.innerWidth < 480 ? '14px' : '16px';
}

// Handle window resize for responsive adjustments
window.addEventListener('resize', function() {
    var width = window.innerWidth;
    if (width < 768) {
        document.body.style.overflowX = 'hidden';
    }
});

document.addEventListener('DOMContentLoaded', function() {
    setupMobileEnhancements();
    setupSidebar();
    setupLiveClock();
    initAdmin();
});

function setupMobileEnhancements() {
    // Close modals on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal) activeModal.classList.remove('active');
            closeSidebar();
        }
    });

    // Add touch event handling for better mobile UX
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('.admin-nav-item')) {
            e.target.closest('.admin-nav-item').style.transform = 'scale(0.97)';
        }
    }, false);

    document.addEventListener('touchend', function(e) {
        if (e.target.closest('.admin-nav-item')) {
            e.target.closest('.admin-nav-item').style.transform = 'scale(1)';
        }
    }, false);

    // Prevent zoom on input focus on iOS
    document.addEventListener('touchstart', function(e) {
        if (e.target.matches('input, textarea, select')) {
            e.target.style.fontSize = '16px';
        }
    }, false);
}

// ===== SIDEBAR (mobile off-canvas + desktop collapse) =====
function setupSidebar() {
    var sidebar = document.getElementById('admin-sidebar');
    var main = document.getElementById('admin-main');
    var menuToggle = document.getElementById('btn-menu-toggle');
    var backdrop = document.getElementById('sidebar-backdrop');
    var collapseBtn = document.getElementById('sidebar-collapse-btn');

    if (!sidebar || !main) return;

    window.openSidebar = function() {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    };
    window.closeSidebar = function() {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('show');
        document.body.style.overflow = '';
    };

    if (menuToggle) menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    });

    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    // Collapse/expand on desktop
    if (collapseBtn) collapseBtn.addEventListener('click', function() {
        var collapsed = sidebar.classList.toggle('collapsed');
        main.classList.toggle('sidebar-collapsed', collapsed);
        var icon = collapseBtn.querySelector('i');
        if (icon) icon.className = collapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    });

    // Close sidebar when a nav item is clicked on mobile
    var navItems = sidebar.querySelectorAll('.admin-nav-item');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener('click', function() {
            if (window.innerWidth <= 768) closeSidebar();
        });
    }
}

// ===== LIVE CLOCK =====
function setupLiveClock() {
    var dateEl = document.getElementById('topbar-date');
    var timeEl = document.getElementById('topbar-time');
    if (!dateEl || !timeEl) return;

    function update() {
        var now = new Date();
        var options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(undefined, options);
        timeEl.textContent = now.toLocaleTimeString();
    }
    update();
    setInterval(update, 1000);
}

function initAdmin() {
    var authScreen = document.getElementById('auth-screen');
    var dashboardLayout = document.getElementById('dashboard-layout');
    var loginForm = document.getElementById('admin-login-form');
    var logoutBtn = document.getElementById('admin-logout-btn');
    
    var navItems = document.querySelectorAll('.admin-nav-item[data-tab]');
    var tabPanes = document.querySelectorAll('.tab-pane');
    var tabTitle = document.getElementById('current-tab-title');
    
    var productsTableBody = document.querySelector('#admin-products-table tbody');
    var ordersTableBody = document.querySelector('#admin-orders-table tbody');
    var messagesTableBody = document.querySelector('#admin-messages-table tbody');
    
    var productModal = document.getElementById('product-modal');
    var openAddModalBtn = document.getElementById('btn-open-add-modal');
    var closeModalBtn = document.getElementById('btn-close-modal');
    var cancelModalBtn = document.getElementById('btn-cancel-modal');
    var crudForm = document.getElementById('product-crud-form');

    var formAction = document.getElementById('form-action');
    var formProdId = document.getElementById('form-prod-id');
    var formProdName = document.getElementById('form-prod-name');
    var formProdCategory = document.getElementById('form-prod-category');
    var formProdSizes = document.getElementById('form-prod-sizes');
    var formProdColors = document.getElementById('form-prod-colors');
    var formProdPrice = document.getElementById('form-prod-price');
    var formProdWprice = document.getElementById('form-prod-wprice');
    var formProdWqty = document.getElementById('form-prod-wqty');
    var formProdImage = document.getElementById('form-prod-image');
    var formProdImageUrl = document.getElementById('form-prod-image-url');
    var imagePreview = document.getElementById('image-preview');
    var formProdDesc = document.getElementById('form-prod-desc');
    var formProdBadge = document.getElementById('form-prod-badge');

    var adminProducts = [];
    var adminOrders = [];
    var uploadedImageUrl = '';

    // --- SIZE DROPDOWN OPTIONS BY CATEGORY ---
    var sizeOptions = {
        clothes: ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        shoes: ['', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
        bags: ['', 'Standard', 'Small', 'Medium', 'Large'],
        accessories: ['', 'Standard', 'One Size']
    };

    var colorOptions = {
        clothes: ['', 'Red', 'Black', 'White', 'Blue', 'Green', 'Yellow', 'Pink', 'Brown', 'Grey'],
        shoes: ['', 'Black', 'White', 'Brown', 'Navy', 'Red', 'Grey'],
        bags: ['', 'Black', 'Brown', 'Tan', 'White', 'Olive', 'Navy'],
        accessories: ['', 'Gold', 'Silver', 'Black', 'Brown', 'Rose Gold']
    };

    function updateSizesDropdown() {
        var category = formProdCategory.value;
        var options = sizeOptions[category] || [''];
        var html = '';
        for (var i = 0; i < options.length; i++) {
            html += '<option value="' + options[i] + '">' + (options[i] || 'Select size') + '</option>';
        }
        formProdSizes.innerHTML = html;
        document.getElementById('sizes-field-group').style.display = options.length > 1 ? 'block' : 'none';
    }

    function updateColorDropdown() {
        var category = formProdCategory.value;
        var options = colorOptions[category] || [''];
        var html = '';
        for (var i = 0; i < options.length; i++) {
            html += '<option value="' + options[i] + '">' + (options[i] || 'Select color') + '</option>';
        }
        formProdColors.innerHTML = html;
    }

    if (formProdCategory) {
        formProdCategory.addEventListener('change', function() {
            updateSizesDropdown();
            updateColorDropdown();
        });
        updateSizesDropdown();
        updateColorDropdown();
    }

    // --- IMAGE UPLOAD PREVIEW ---
    if (formProdImage) {
        formProdImage.addEventListener('change', async function(e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function(ev) {
                imagePreview.src = ev.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);

            var formData = new FormData();
            formData.append('file', file);

            try {
                var res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                var data = await res.json();
                if (data.success) {
                    uploadedImageUrl = data.url;
                    formProdImageUrl.value = data.url;
                } else {
                    alert('Upload failed: ' + data.error);
                }
            } catch (err) {
                alert('Upload failed. Check server connection.');
            }
        });
    }

    // --- AUTHENTICATION ---
    checkAuth();

    async function checkAuth() {
        try {
            var res = await fetch('/api/admin/orders');
            if (res.ok) showDashboard();
        } catch (e) {}
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var password = document.getElementById('admin-pass').value;
            var res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ password: password })
            });
            var data = await res.json();
            if (data.success) {
                showDashboard();
            } else {
                showNotification('Login Failed', 'Invalid Security Password', 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            await fetch('/api/admin/logout', { method: 'POST' });
            location.reload();
        });
    }

function showDashboard() {
        // Guard: auth screen may not exist (login moved to separate login.html)
        if (authScreen) authScreen.style.display = 'none';
        if (dashboardLayout) dashboardLayout.style.display = 'flex';
        // Reset counters before fetching so existing data doesn't trigger false "new" notifications
        lastOrderCount = 0;
        lastMessageCount = 0;
        fetchProducts();
        fetchOrders();
        fetchMessages();
    }

    // --- NAVIGATION ---
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener('click', function() {
            var tabId = this.dataset.tab;
            for (var j = 0; j < navItems.length; j++) navItems[j].classList.remove('active');
            for (var k = 0; k < tabPanes.length; k++) tabPanes[k].classList.remove('active');
            this.classList.add('active');
            document.getElementById('tab-' + tabId).classList.add('active');
            var span = this.querySelector('span');
            tabTitle.textContent = span.textContent;
        });
    }

    // --- DATA FETCHING ---
    async function fetchProducts() {
        var res = await fetch('/api/products');
        adminProducts = await res.json();
        updateStats();
        renderProducts(adminProducts);
    }

    async function fetchOrders() {
        var res = await fetch('/api/admin/orders');
        adminOrders = await res.json();
        updateStats();
        renderOrders(adminOrders);
    }

    async function fetchMessages() {
        var res = await fetch('/api/admin/contact-messages');
        var messages = await res.json();
        renderMessages(messages);
    }

    function animateCount(el, target) {
        if (!el) return;
        var start = parseInt(el.textContent) || 0;
        if (start === target) { el.textContent = target; return; }
        var duration = 600;
        var startTime = null;
        function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function updateStats() {
        animateCount(document.getElementById('stat-total-products'), adminProducts.length);
        animateCount(document.getElementById('stat-clothes'), adminProducts.filter(function(p) { return p.category === 'clothes'; }).length);
        animateCount(document.getElementById('stat-shoes'), adminProducts.filter(function(p) { return p.category === 'shoes'; }).length);
        animateCount(document.getElementById('stat-orders'), adminOrders.length);
    }

    // --- RENDERING (desktop table + mobile cards) ---
    function renderProducts(products) {
        var isMobileView = window.innerWidth <= 768;
        if (isMobileView) {
            var cardHtml = '';
            for (var i = 0; i < products.length; i++) {
                var p = products[i];
                cardHtml +=
                    '<div class="mobile-card">' +
                        '<div class="mobile-card-head">' +
                            '<img src="' + p.image + '" alt="">' +
                            '<div class="mobile-card-title">' +
                                '<div class="prod-name">' + p.name + '</div>' +
                                '<small>ID: ' + p.id + '</small>' +
                            '</div>' +
                        '</div>' +
                        '<div class="mobile-card-body">' +
                            '<div><span>Category</span><strong style="text-transform:capitalize;">' + p.category + '</strong></div>' +
                            '<div><span>Price</span><strong>' + formatNaira(p.price) + '</strong></div>' +
                            '<div><span>Stock</span><strong>' + (p.in_stock ? 'In Stock' : 'Out') + '</strong></div>' +
                        '</div>' +
                        '<div class="mobile-card-actions">' +
                            '<button class="btn btn-secondary btn-sm" onclick="editProduct(\'' + p.id + '\')"><i class="fas fa-edit"></i> Edit</button>' +
                            '<button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + p.id + '\')"><i class="fas fa-trash"></i> Delete</button>' +
                        '</div>' +
                    '</div>';
            }
            productsTableBody.innerHTML = cardHtml || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No products found</p></div></td></tr>';
            return;
        }

        var html = '';
        for (var j = 0; j < products.length; j++) {
            var pd = products[j];
            html += '<tr>' +
                '<td>' +
                    '<div class="prod-cell">' +
                        '<img src="' + pd.image + '" alt="">' +
                        '<div>' +
                            '<div class="prod-name">' + pd.name + '</div>' +
                            '<small>ID: ' + pd.id + '</small>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td><span style="text-transform:capitalize;">' + pd.category + '</span></td>' +
                '<td>' + formatNaira(pd.price) + '</td>' +
                '<td><span class="badge ' + (pd.in_stock ? 'badge-paid' : 'badge-pending') + '">' + (pd.in_stock ? 'In Stock' : 'Out') + '</span></td>' +
                '<td>' +
                    '<button class="btn btn-secondary btn-sm" onclick="editProduct(\'' + pd.id + '\')"><i class="fas fa-edit"></i></button> ' +
                    '<button class="btn btn-danger btn-sm" onclick="deleteProduct(\'' + pd.id + '\')"><i class="fas fa-trash"></i></button>' +
                '</td>' +
            '</tr>';
        }
        productsTableBody.innerHTML = html || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No products found</p></div></td></tr>';
    }

    function renderOrders(orders) {
        var isMobileView = window.innerWidth <= 768;
        if (isMobileView) {
            var cardHtml = '';
            for (var i = 0; i < orders.length; i++) {
                var o = orders[i];
                var badgeClass = o.status.toLowerCase() === 'paid' ? 'badge-paid' : 'badge-pending';
                cardHtml +=
                    '<div class="mobile-card">' +
                        '<div class="mobile-card-head">' +
                            '<i class="fas fa-shopping-bag" style="font-size:1.4rem;color:var(--accent-gold);"></i>' +
                            '<div class="mobile-card-title">' +
                                '<div class="prod-name"><code>' + o.reference + '</code></div>' +
                                '<small>' + o.name + ' &middot; ' + o.email + '</small>' +
                            '</div>' +
                        '</div>' +
                        '<div class="mobile-card-body">' +
                            '<div><span>Total</span><strong>' + formatNaira(o.total) + '</strong></div>' +
                            '<div><span>Status</span><span class="badge ' + badgeClass + '">' + o.status + '</span></div>' +
                            '<div><span>Date</span><strong>' + new Date(o.createdAt).toLocaleDateString() + '</strong></div>' +
                        '</div>' +
                    '</div>';
            }
            ordersTableBody.innerHTML = cardHtml || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No orders</p></div></td></tr>';
            return;
        }

        var html = '';
        for (var j = 0; j < orders.length; j++) {
            var od = orders[j];
            var bClass = od.status.toLowerCase() === 'paid' ? 'badge-paid' : 'badge-pending';
            html += '<tr>' +
                '<td><code>' + od.reference + '</code></td>' +
                '<td><div style="font-weight:600;">' + od.name + '</div><small style="color:var(--text-dim);">' + od.email + '</small></td>' +
                '<td>' + formatNaira(od.total) + '</td>' +
                '<td><span class="badge ' + bClass + '">' + od.status + '</span></td>' +
                '<td>' + new Date(od.createdAt).toLocaleDateString() + '</td>' +
            '</tr>';
        }
        ordersTableBody.innerHTML = html || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No orders</p></div></td></tr>';
    }

    function renderMessages(messages) {
        var isMobileView = window.innerWidth <= 768;
        if (isMobileView) {
            var cardHtml = '';
            for (var i = 0; i < messages.length; i++) {
                var m = messages[i];
                cardHtml +=
                    '<div class="mobile-card">' +
                        '<div class="mobile-card-head">' +
                            '<i class="fas fa-envelope" style="font-size:1.4rem;color:var(--accent-gold);"></i>' +
                            '<div class="mobile-card-title">' +
                                '<div class="prod-name">' + m.name + '</div>' +
                                '<small>' + m.email + '</small>' +
                            '</div>' +
                        '</div>' +
                        '<div class="mobile-card-body">' +
                            '<div><span>Subject</span><strong>' + m.subject + '</strong></div>' +
                            '<div class="full"><span>Message</span><p>' + m.message + '</p></div>' +
                            '<div><span>Date</span><strong>' + new Date(m.createdAt).toLocaleDateString() + '</strong></div>' +
                        '</div>' +
                        '<div class="mobile-card-actions">' +
                            '<button class="btn btn-danger btn-sm" onclick="deleteMessage(\'' + m.id + '\')"><i class="fas fa-trash"></i> Delete</button>' +
                        '</div>' +
                    '</div>';
            }
            messagesTableBody.innerHTML = cardHtml || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No messages</p></div></td></tr>';
            return;
        }

        var html = '';
        for (var j = 0; j < messages.length; j++) {
            var md = messages[j];
            html += '<tr>' +
                '<td>' + new Date(md.createdAt).toLocaleDateString() + '</td>' +
                '<td><div style="font-weight:600;">' + md.name + '</div><small style="color:var(--text-dim);">' + md.email + '</small></td>' +
                '<td>' + md.subject + '</td>' +
                '<td style="max-width:300px;"><small>' + md.message + '</small></td>' +
                '<td><button class="btn btn-danger btn-sm" onclick="deleteMessage(\'' + md.id + '\')"><i class="fas fa-trash"></i></button></td>' +
            '</tr>';
        }
        messagesTableBody.innerHTML = html || '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No messages</p></div></td></tr>';
    }

    // --- SEARCH / FILTER ---
    var productSearch = document.getElementById('product-search');
    var orderSearch = document.getElementById('order-search');
    var filterCategory = document.getElementById('filter-category');

    function applyProductFilter() {
        var query = (productSearch ? productSearch.value : '').toLowerCase();
        var cat = filterCategory ? filterCategory.value : 'all';
        var filtered = adminProducts.filter(function(p) {
            var matchCat = cat === 'all' || p.category === cat;
            var matchQuery = !query || (p.name || '').toLowerCase().indexOf(query) !== -1 || (p.id || '').toLowerCase().indexOf(query) !== -1;
            return matchCat && matchQuery;
        });
        renderProducts(filtered);
    }

    if (productSearch) productSearch.addEventListener('input', applyProductFilter);
    if (filterCategory) filterCategory.addEventListener('change', applyProductFilter);

    if (orderSearch) {
        orderSearch.addEventListener('input', function(e) {
            var query = e.target.value.toLowerCase();
            var filtered = adminOrders.filter(function(o) {
                return (o.reference || '').toLowerCase().indexOf(query) !== -1 ||
                       (o.name || '').toLowerCase().indexOf(query) !== -1 ||
                       (o.email || '').toLowerCase().indexOf(query) !== -1;
            });
            renderOrders(filtered);
        });
    }

    // Re-render on resize to switch between table and card views
    window.addEventListener('resize', function() {
        if (!dashboardLayout.style.display || dashboardLayout.style.display === 'flex') {
            renderProducts(adminProducts);
            renderOrders(adminOrders);
        }
    });

    // --- CRUD ACTIONS ---
    if (openAddModalBtn) {
        openAddModalBtn.addEventListener('click', function() {
            crudForm.reset();
            formAction.value = 'add';
            formProdId.readOnly = false;
            uploadedImageUrl = '';
            imagePreview.style.display = 'none';
            document.getElementById('modal-title').textContent = 'Add New Product';
            updateSizesDropdown();
            updateColorDropdown();
            productModal.classList.add('active');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() { productModal.classList.remove('active'); });
    }
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', function() { productModal.classList.remove('active'); });
    }

    if (crudForm) {
        crudForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            var imageSrc = uploadedImageUrl || formProdImageUrl.value || 'https://via.placeholder.com/400x500?text=No+Image';
            
            var payload = {
                action: formAction.value,
                id: formProdId.value,
                name: formProdName.value,
                category: formProdCategory.value,
                price: parseFloat(formProdPrice.value),
                wholesalePrice: formProdWprice.value ? parseFloat(formProdWprice.value) : null,
                wholesaleMinQty: formProdWqty.value ? parseInt(formProdWqty.value) : null,
                sizes: formProdSizes.value ? [formProdSizes.value] : [],
                colors: formProdColors.value ? [formProdColors.value] : [],
                image: imageSrc,
                description: formProdDesc.value,
                badge: formProdBadge.value || ''
            };

            var res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                productModal.classList.remove('active');
                fetchProducts();
                showNotification('Success', 'Product saved successfully', 'success');
            } else {
                var err = await res.json();
                showNotification('Error', err.error || 'Failed to save product', 'error');
            }
        });
    }

    window.editProduct = function(id) {
        var p = adminProducts.find(function(x) { return x.id === id; });
        if (!p) return;

        formAction.value = 'edit';
        formProdId.value = p.id;
        formProdId.readOnly = true;
        formProdName.value = p.name;
        formProdCategory.value = p.category;
        formProdPrice.value = p.price;
        formProdWprice.value = p.wholesalePrice || '';
        formProdWqty.value = p.wholesaleMinQty || '';
        updateSizesDropdown();
        updateColorDropdown();
        if (p.sizes && p.sizes.length > 0) {
            formProdSizes.value = p.sizes[0];
        }
        if (p.colors && p.colors.length > 0) {
            formProdColors.value = p.colors[0];
        }
        formProdImageUrl.value = p.image;
        if (p.image) {
            imagePreview.src = p.image;
            imagePreview.style.display = 'block';
        }
        formProdDesc.value = p.description;
        formProdBadge.value = p.badge || '';

        document.getElementById('modal-title').textContent = 'Edit Product';
        productModal.classList.add('active');
    };

    window.deleteProduct = async function(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        await fetch('/api/admin/products', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'delete', id: id })
        });
        fetchProducts();
        showNotification('Deleted', 'Product removed', 'info');
    };

    window.deleteMessage = async function(id) {
        if (!confirm('Delete this message?')) return;
        await fetch('/api/admin/contact-messages/' + id, { method: 'DELETE' });
        fetchMessages();
        showNotification('Deleted', 'Message removed', 'info');
    };

    // --- NOTIFICATION SYSTEM ---
    requestNotificationPermission();
    registerServiceWorker();
    setupWebPushSubscription();
    setupNotificationToggle();
    setupNotificationPolling();
    
    async function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (err) {
                console.log('Notification permission denied');
            }
        }
    }

    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered');
            } catch (err) {
                console.log('Service Worker registration failed:', err);
            }
        }
    }

    function setupNotificationToggle() {
        var toggle = document.getElementById('push-toggle');
        if (!toggle) return;
        // Load saved preference
        var saved = localStorage.getItem('4ds_push_enabled');
        if (saved !== null) toggle.checked = saved === 'true';

        toggle.addEventListener('change', async function() {
            if (toggle.checked) {
                await setupWebPushSubscription();
                localStorage.setItem('4ds_push_enabled', 'true');
            } else {
                // Unsubscribe
                try {
                    var swReg = await navigator.serviceWorker.ready;
                    var sub = await swReg.pushManager.getSubscription();
                    if (sub) {
                        await fetch('/api/admin/unsubscribe', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ endpoint: sub.endpoint })
                        });
                        await sub.unsubscribe();
                    }
                } catch (err) {
                    console.log('Unsubscribe error:', err);
                }
                localStorage.setItem('4ds_push_enabled', 'false');
                showNotification('Disabled', 'Push notifications turned off', 'info');
            }
        });
    }

    async function setupWebPushSubscription() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Web Push not supported in this browser');
            return;
        }

        try {
            var keyRes = await fetch('/api/admin/vapid-key');
            if (!keyRes.ok) return;
            
            var keyData = await keyRes.json();
            var publicKey = keyData.publicKey;
            if (!publicKey) return;

            var swReg = await navigator.serviceWorker.ready;
            var subscription = await swReg.pushManager.getSubscription();
            
            if (!subscription) {
                try {
                    subscription = await swReg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicKey)
                    });

                    var subRes = await fetch('/api/admin/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subscription)
                    });

                    if (subRes.ok) {
                        console.log('✅ Web Push subscription successful');
                        var toggle = document.getElementById('push-toggle');
                        if (toggle) toggle.checked = true;
                        showNotification('Push Enabled', 'You will receive notifications for new orders and messages', 'success');
                    }
                } catch (err) {
                    console.log('Failed to subscribe to push:', err);
                }
            } else {
                console.log('✅ Already subscribed to push notifications');
                var toggle2 = document.getElementById('push-toggle');
                if (toggle2) toggle2.checked = true;
            }
        } catch (err) {
            console.log('Web Push setup error:', err);
        }
    }

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    var lastOrderCount = adminOrders.length;
    var lastMessageCount = 0;

    function setupNotificationPolling() {
        setInterval(async function() {
            try {
                var ordersRes = await fetch('/api/admin/orders');
                var orders = await ordersRes.json();
                if (orders.length > lastOrderCount) {
                    var newOrdersCount = orders.length - lastOrderCount;
                    showNotification('New Order' + (newOrdersCount > 1 ? 's' : ''), 
                        newOrdersCount + ' new order' + (newOrdersCount > 1 ? 's' : '') + ' received!', 'success');
                    lastOrderCount = orders.length;
                    fetchOrders();
                }

                var messagesRes = await fetch('/api/admin/contact-messages');
                var messages = messagesRes.ok ? await messagesRes.json() : [];
                if (messages.length > lastMessageCount) {
                    var newMessagesCount = messages.length - lastMessageCount;
                    showNotification('New Message' + (newMessagesCount > 1 ? 's' : ''), 
                        newMessagesCount + ' new message' + (newMessagesCount > 1 ? 's' : '') + ' received!', 'info');
                    lastMessageCount = messages.length;
                    fetchMessages();
                }
            } catch (err) {
                console.log('Polling error:', err);
            }
        }, 30000);
    }
}

function formatNaira(amount) {
    return '₦' + parseFloat(amount).toLocaleString();
}

function showNotification(title, message, type) {
    if (!type) type = 'info';
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: message,
                tag: 'admin-notification',
                requireInteraction: false
            });
        } catch (e) {}
    }

    // In-page notification
    var notificationEl = document.createElement('div');
    notificationEl.className = 'notification ' + type;
    notificationEl.style.zIndex = '3000';
    notificationEl.innerHTML = '<strong>' + title + '</strong><br>' + message;
    document.body.appendChild(notificationEl);

    setTimeout(function() {
        notificationEl.style.animation = 'slideOut 0.3s';
        setTimeout(function() { notificationEl.remove(); }, 300);
    }, 5000);
}
