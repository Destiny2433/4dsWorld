// 4D'S World - Single Product Detail Page Logic

document.addEventListener('DOMContentLoaded', () => {
    if (products && products.length > 0) {
        initProductDetail();
    } else {
        window.addEventListener('productsLoaded', initProductDetail);
    }
});

function initProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = '/shop';
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
        window.location.href = '/shop';
        return;
    }

    const pImage = document.getElementById('product-detail-image');
    const pBadge = document.getElementById('product-detail-badge');
    const pCategory = document.getElementById('product-detail-category');
    const pTitle = document.getElementById('product-detail-title');
    const pRating = document.getElementById('product-detail-rating');
    const pPrice = document.getElementById('product-detail-price');
    const pDescription = document.getElementById('product-detail-description');
    
    const sizesContainer = document.getElementById('sizes-selector-wrap');
    const colorsContainer = document.getElementById('colors-selector-wrap');
    const quantityInput = document.getElementById('detail-qty');
    const qtyMinus = document.getElementById('detail-qty-minus');
    const qtyPlus = document.getElementById('detail-qty-plus');
    
    const totalCalcPrice = document.getElementById('total-calculated-price');
    
    const addToCartBtn = document.getElementById('btn-add-to-cart');
    const buyNowBtn = document.getElementById('btn-buy-now');

    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;

    if (pImage) pImage.src = product.image;
    if (pCategory) pCategory.textContent = product.category;
    if (pTitle) pTitle.textContent = product.name;
    if (pDescription) pDescription.textContent = product.description;
    
    if (pBadge) {
        if (product.badge) {
            pBadge.textContent = product.badge;
            pBadge.style.display = 'inline-block';
        } else {
            pBadge.style.display = 'none';
        }
    }

    if (pRating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(product.rating)) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        pRating.innerHTML = stars + ' <span>(' + product.rating + ' / 5 Rating)</span>';
    }

    let selectedSize = product.sizes ? product.sizes[0] : '';
    let selectedColor = product.colors ? product.colors[0] : '';

    if (sizesContainer && product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map((size, idx) => {
            return '<button class="option-pill ' + (idx === 0 ? 'active' : '') + '" data-size="' + size + '">' + size + '</button>';
        }).join('');
        
        sizesContainer.querySelectorAll('.option-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                sizesContainer.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedSize = btn.dataset.size;
            });
        });
    } else if (sizesContainer) {
        var sizeGroup = sizesContainer.closest('.option-group');
        if (sizeGroup) sizeGroup.style.display = 'none';
    }

    if (colorsContainer && product.colors && product.colors.length > 0) {
        colorsContainer.innerHTML = product.colors.map((color, idx) => {
            return '<button class="option-pill ' + (idx === 0 ? 'active' : '') + '" data-color="' + color + '">' + color + '</button>';
        }).join('');

        colorsContainer.querySelectorAll('.option-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                colorsContainer.querySelectorAll('.option-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedColor = btn.dataset.color;
            });
        });
    } else if (colorsContainer) {
        var colorGroup = colorsContainer.closest('.option-group');
        if (colorGroup) colorGroup.style.display = 'none';
    }

    function updateCalculatedPrice() {
        var qty = parseInt(quantityInput.value) || 1;
        var totalPrice = product.price * qty;

        if (pPrice) {
            pPrice.textContent = formatNaira(product.price);
        }
        
        if (totalCalcPrice) {
            totalCalcPrice.textContent = formatNaira(totalPrice);
        }
    }

    if (qtyMinus && quantityInput) {
        qtyMinus.addEventListener('click', () => {
            var val = parseInt(quantityInput.value) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
                updateCalculatedPrice();
            }
        });
    }

    if (qtyPlus && quantityInput) {
        qtyPlus.addEventListener('click', () => {
            var val = parseInt(quantityInput.value) || 1;
            quantityInput.value = val + 1;
            updateCalculatedPrice();
        });
    }

    if (quantityInput) {
        quantityInput.addEventListener('change', () => {
            var val = parseInt(quantityInput.value) || 1;
            if (val < 1) quantityInput.value = 1;
            updateCalculatedPrice();
        });
    }

    updateCalculatedPrice();

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            var qty = parseInt(quantityInput.value) || 1;
            CartManager.addItem(product.id, qty, selectedSize, selectedColor);
        });
    }

    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            var qty = parseInt(quantityInput.value) || 1;
            CartManager.addItem(product.id, qty, selectedSize, selectedColor);
            window.location.href = '/checkout';
        });
    }

    var relatedGrid = document.getElementById('related-products-grid');
    if (relatedGrid) {
        var related = products
            .filter(function(p) { return p.category === product.category && p.id !== product.id; })
            .slice(0, 4);

        if (related.length > 0) {
            relatedGrid.innerHTML = related.map(function(p) {
                var badge = p.badge ? '<div class="product-badge">' + p.badge + '</div>' : '';
                return '<div class="product-card glass-panel">' +
                    '<div class="product-image-wrap">' +
                        badge +
                        '<img src="' + p.image + '" alt="' + p.name + '" class="product-img" loading="lazy">' +
                        '<div class="product-actions-overlay">' +
                            '<button class="action-btn" onclick="quickView(\'' + p.id + '\')" title="View Detail"><i class="fas fa-eye"></i></button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="product-info">' +
                        '<span class="product-category">' + p.category + '</span>' +
                        '<h3 class="product-title"><a href="/product?id=' + p.id + '">' + p.name + '</a></h3>' +
                        '<div class="product-price-wrap">' +
                            '<span class="product-price">' + formatNaira(p.price) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        } else {
            var section = relatedGrid.closest('.section');
            if (section) section.style.display = 'none';
        }
    }
}
