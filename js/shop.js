// 4D'S World - Shop Page Catalog Logic

let shopInitialized = false;

function initShop() {
    if (shopInitialized) {
        // Already set up — just re-render with updated products
        renderProductsIfReady();
        return;
    }
    shopInitialized = true;

    const productContainer = document.getElementById('shop-product-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.querySelectorAll('.category-filter');
    const sortSelect = document.getElementById('sort-select');

    let activeFilters = {
        category: 'all',
        search: '',
        minPrice: 0,
        maxPrice: Infinity,
        sort: 'featured'
    };

    // Mobile filter toggle
    const filterBtn = document.getElementById('filter-mobile-btn');
    const sidebarContent = document.getElementById('shop-sidebar-content');
    if (filterBtn && sidebarContent) {
        filterBtn.addEventListener('click', () => {
            sidebarContent.classList.toggle('active');
            const icon = filterBtn.querySelector('i');
            icon.className = sidebarContent.classList.contains('active') ? 'fas fa-times' : 'fas fa-filter';
        });
    }

    // Read URL params
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    if (catParam) {
        activeFilters.category = catParam.toLowerCase();
        categoryFilters.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === catParam.toLowerCase());
        });
    }

    // Event listeners
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            activeFilters.search = e.target.value.trim().toLowerCase();
            renderProductsIfReady();
        });
    }

    categoryFilters.forEach(button => {
        button.addEventListener('click', () => {
            categoryFilters.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilters.category = button.dataset.category;
            renderProductsIfReady();
        });
    });

    if (sortSelect) {
        sortSelect.addEventListener('change', e => {
            activeFilters.sort = e.target.value;
            renderProductsIfReady();
        });
    }

    renderProductsIfReady();

    // Re-render when fresh products arrive from API
    window.addEventListener('productsLoaded', () => renderProductsIfReady());

    function renderProductsIfReady() {
        if (!productContainer) return;

        if (!products || products.length === 0) {
            productContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
                    <div class="skeleton-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px;">
                        ${Array(6).fill(0).map(() => `
                        <div class="skeleton-card" style="background:rgba(255,255,255,0.04);border-radius:16px;overflow:hidden;height:340px;">
                            <div style="height:220px;background:linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
                            <div style="padding:16px;">
                                <div style="height:12px;width:60%;background:rgba(255,255,255,0.07);border-radius:6px;margin-bottom:10px;animation:shimmer 1.5s infinite;"></div>
                                <div style="height:10px;width:80%;background:rgba(255,255,255,0.05);border-radius:6px;animation:shimmer 1.5s infinite;"></div>
                            </div>
                        </div>`).join('')}
                    </div>
                    <p style="color:var(--text-secondary);margin-top:20px;font-size:0.9rem;">Loading products...</p>
                </div>`;
            return;
        }

        let filtered = products.filter(product => {
            if (!product) return false;
            const pCategory = (product.category || '').toLowerCase();
            const pName = (product.name || '').toLowerCase();
            const pDesc = (product.description || '').toLowerCase();
            const pPrice = parseFloat(product.price) || 0;

            if (activeFilters.category !== 'all' && pCategory !== activeFilters.category) return false;
            if (activeFilters.search && !pName.includes(activeFilters.search) && !pDesc.includes(activeFilters.search)) return false;
            if (pPrice < activeFilters.minPrice || pPrice > activeFilters.maxPrice) return false;
            return true;
        });

        if (activeFilters.sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
        else if (activeFilters.sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
        else if (activeFilters.sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);

        if (filtered.length === 0) {
            productContainer.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
                    <i class="fas fa-search" style="font-size:3rem;color:var(--text-muted);margin-bottom:20px;display:block;"></i>
                    <h3>No Products Found</h3>
                    <p style="color:var(--text-secondary);margin-top:10px;">Try adjusting your filters or search terms.</p>
                </div>`;
            return;
        }

        productContainer.innerHTML = filtered.map(product => {
            const badgeHTML = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
            return `
                <div class="product-card glass-panel">
                    <div class="product-image-wrap">
                        ${badgeHTML}
                        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy">
                        <div class="product-actions-overlay">
                            <button class="action-btn" onclick="quickView('${product.id}')" title="Quick View"><i class="fas fa-eye"></i></button>
                            <button class="action-btn" onclick="addToCartDirect('${product.id}')" title="Add to Cart"><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${product.category}</span>
                        <h3 class="product-title"><a href="/product?id=${product.id}">${product.name}</a></h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <span>${product.rating}</span>
                        </div>
                        <div class="product-price-wrap">
                            <span class="product-price">${formatNaira(product.price)}</span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }
}

// Start init as soon as DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Show skeleton immediately, then init
    initShop();
});

// Also trigger initShop when productsLoaded fires before DOMContentLoaded
window.addEventListener('productsLoaded', () => {
    if (document.readyState !== 'loading') initShop();
});

window.addToCartDirect = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    CartManager.addItem(id, 1, product.sizes?.[0] || '', product.colors?.[0] || '');
};

window.quickView = function(id) {
    window.location.href = '/product?id=' + id;
};
