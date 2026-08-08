// 4D'S World - Dynamic Products Catalog Loader
// Uses sessionStorage cache for instant subsequent loads

let products = [];

async function loadProducts() {
    // 1. Serve from sessionStorage cache instantly
    const cached = sessionStorage.getItem('4ds_products');
    if (cached) {
        try {
            products = JSON.parse(cached);
            if (products.length > 0) {
                window.dispatchEvent(new CustomEvent('productsLoaded', { detail: products }));
            }
        } catch (e) { products = []; }
    }

    // 2. Always fetch fresh from API in background
    try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('API error ' + res.status);
        const fresh = await res.json();
        if (Array.isArray(fresh) && fresh.length > 0) {
            products = fresh;
            sessionStorage.setItem('4ds_products', JSON.stringify(products));
            window.dispatchEvent(new CustomEvent('productsLoaded', { detail: products }));
        }
    } catch (err) {
        console.error('Error fetching products:', err);
        // If cache was loaded above, still works. If not, show empty.
        if (products.length === 0) {
            window.dispatchEvent(new CustomEvent('productsLoaded', { detail: [] }));
        }
    }
}

// Kick off immediately (before DOMContentLoaded)
loadProducts();

// Helper to get product by ID
function getProductById(id) {
    return products.find(p => p.id === id);
}
