// 4D'S World - Dynamic Products Catalog Loader

let products = [];

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        // Dispatch event that products are now populated
        window.dispatchEvent(new CustomEvent('productsLoaded', { detail: products }));
        return products;
    } catch (err) {
        console.error('Error fetching database products:', err);
        return [];
    }
}

// Kick off immediately
const productsLoaderPromise = loadProducts();

// Helper to get product by ID
function getProductById(id) {
    return products.find(p => p.id === id);
}
