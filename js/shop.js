// 4D'S World - Shop Page Catalog Logic

document.addEventListener('DOMContentLoaded', () => {
    if (products && products.length > 0) {
        initShop();
    } else {
        window.addEventListener('productsLoaded', initShop);
    }
});

function initShop() {
    const productContainer = document.getElementById('shop-product-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.querySelectorAll('.category-filter');
    const sortSelect = document.getElementById('sort-select');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const filterBtn = document.getElementById('filter-mobile-btn');
    const sidebarContent = document.getElementById('shop-sidebar-content');

    let activeFilters = {
        category: 'all',
        search: '',
        minPrice: 0,
        maxPrice: Infinity,
        sort: 'featured'
    };

    // Mobile Sidebar Toggle
    if (filterBtn && sidebarContent) {
        filterBtn.addEventListener('click', () => {
            sidebarContent.classList.toggle('active');
            const icon = filterBtn.querySelector('i');
            icon.className = sidebarContent.classList.contains('active') ? 'fas fa-times' : 'fas fa-filter';
        });
    }

    // Set initial filters from URL parameters if any (e.g. ?category=shoes)
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get('category');
    if (catParam) {
        activeFilters.category = catParam;
        categoryFilters.forEach(btn => {
            if (btn.dataset.category === catParam) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Render initial catalog
    renderProducts();

    // Listen for global pricing mode change events to instantly update displayed prices
    window.addEventListener('pricingModeChanged', () => {
        renderProducts();
    });

    // Search input listener
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            activeFilters.search = e.target.value.trim().toLowerCase();
            renderProducts();
        });
    }

    // Category button filters
    categoryFilters.forEach(button => {
        button.addEventListener('click', () => {
            categoryFilters.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilters.category = button.dataset.category;
            renderProducts();
        });
    });

    // Sorting selector
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeFilters.sort = e.target.value;
            renderProducts();
        });
    }

    // Price range filters
    if (minPriceInput) {
        minPriceInput.addEventListener('input', (e) => {
            activeFilters.minPrice = parseFloat(e.target.value) || 0;
            renderProducts();
        });
    }
    if (maxPriceInput) {
        maxPriceInput.addEventListener('input', (e) => {
            activeFilters.maxPrice = parseFloat(e.target.value) || Infinity;
            renderProducts();
        });
    }

    // Render helper function
    function renderProducts() {
        if (!productContainer) return;

        const pricingMode = getPricingMode(); // retail or wholesale

        // 1. Filter Products
        let filtered = products.filter(product => {
            // Category filter
            if (activeFilters.category !== 'all' && product.category !== activeFilters.category) {
                return false;
            }

            // Search filter
            if (activeFilters.search && !product.name.toLowerCase().includes(activeFilters.search) && !product.description.toLowerCase().includes(activeFilters.search)) {
                return false;
            }

            // Price range filter
            const activePrice = pricingMode === 'wholesale' ? product.wholesalePrice : product.price;
            if (activePrice < activeFilters.minPrice || activePrice > activeFilters.maxPrice) {
                return false;
            }

            return true;
        });

        // 2. Sort Products
        if (activeFilters.sort === 'price-low') {
            filtered.sort((a, b) => {
                const priceA = pricingMode === 'wholesale' ? a.wholesalePrice : a.price;
                const priceB = pricingMode === 'wholesale' ? b.wholesalePrice : b.price;
                return priceA - priceB;
            });
        } else if (activeFilters.sort === 'price-high') {
            filtered.sort((a, b) => {
                const priceA = pricingMode === 'wholesale' ? a.wholesalePrice : a.price;
                const priceB = pricingMode === 'wholesale' ? b.wholesalePrice : b.price;
                return priceB - priceA;
            });
        } else if (activeFilters.sort === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        }

        // 3. Output HTML
        if (filtered.length === 0) {
            productContainer.innerHTML = `
                <div class="no-products-found" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 20px;"></i>
                    <h3>No Products Found</h3>
                    <p style="color: var(--text-secondary); margin-top: 10px;">Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        productContainer.innerHTML = filtered.map(product => {
            const isWholesale = pricingMode === 'wholesale';
            const price = isWholesale ? product.wholesalePrice : product.price;
            const badgeHTML = product.badge ? `<div class="product-badge">${product.badge}</div>` : '';
            
            return `
                <div class="product-card glass-panel">
                    <div class="product-image-wrap">
                        ${badgeHTML}
                        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy">
                        <div class="product-actions-overlay">
                            <button class="action-btn" onclick="quickView('${product.id}')" title="Quick View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="addToCartDirect('${product.id}')" title="Add to Cart">
                                <i class="fas fa-shopping-cart"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${product.category}</span>
                        <h3 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                        <div class="product-rating">
                            <i class="fas fa-star"></i>
                            <span>${product.rating}</span>
                        </div>
                        <div class="product-price-wrap">
                            <span class="product-price">${formatNaira(price)}</span>
                            <span class="wholesale-badge-info">
                                ${isWholesale ? `Wholesale Price (Min ${product.wholesaleMinQty} pcs)` : `Wholesale option: Buy ${product.wholesaleMinQty}+ for ${formatNaira(product.wholesalePrice)} each`}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Global click handler helper definitions for quick action clicks
window.addToCartDirect = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const defaultSize = product.sizes ? product.sizes[0] : '';
    const defaultColor = product.colors ? product.colors[0] : '';
    CartManager.addItem(id, 1, defaultSize, defaultColor);
};

window.quickView = function(id) {
    window.location.href = `product.html?id=${id}`;
};
