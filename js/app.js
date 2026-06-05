// === Intivelvet - Catálogo Digital con Firebase ===

const CONFIG = {
  whatsappNumber: '543388527384',
  freeShippingMin: 150000,
  shippingOptions: [
    { id: 'local', name: 'Envío Local Gratis', price: 0 },
    { id: 'nacional', name: 'Envío Nacional (2-5 días)', price: 25000 },
    { id: 'recoger', name: 'Recoger en tienda', price: 0 }
  ]
};

let products = [];
let cart = JSON.parse(localStorage.getItem('intivelvet_cart')) || [];

// === Inicialización ===
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderFeatured();
  renderSales();
  renderCatalog();
  updateCartUI();
  initEvents();
});

// === Cargar Productos desde Firebase ===
async function loadProducts() {
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error cargando productos:', error);
    products = [];
  }
}

// === Renderizar Productos ===
function createProductCard(product) {
  if (!product.available) return '';

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const imageHTML = product.image
    ? `<img src="${product.image}" alt="${product.name}">`
    : `<span class="placeholder-icon">👙</span>`;

  // Generar opciones de color/talle basado en variants
  let variantsHTML = '';
  if (product.variants && product.variants.length > 0) {
    // Filtrar colores que tengan al menos un talle con stock
    const availableVariants = product.variants.filter(v => 
      v.sizes && v.sizes.some(s => (typeof s === 'string') || s.stock > 0)
    );
    
    if (availableVariants.length > 0) {
      const colorsOptions = availableVariants.map(v => {
        const hasStock = v.sizes && v.sizes.some(s => (typeof s === 'string') || s.stock > 0);
        return `<option value="${v.color}" ${!hasStock ? 'disabled' : ''}>${v.color}${!hasStock ? ' (Agotado)' : ''}</option>`;
      }).join('');

      const firstSizes = availableVariants[0].sizes || [];
      const sizesOptions = firstSizes.map(s => {
        const size = typeof s === 'string' ? s : s.size;
        const stock = typeof s === 'string' ? 1 : s.stock;
        if (stock <= 0) {
          return `<option value="${size}" disabled>⚊ ${size} (Agotado)</option>`;
        }
        return `<option value="${size}">${size}</option>`;
      }).join('');

      variantsHTML = `
        <div class="product-options">
          <label>Color:</label>
          <select class="option-select" id="color-${product.id}" onchange="updateSizesForColor('${product.id}')">
            ${colorsOptions}
          </select>
        </div>
        <div class="product-options">
          <label>Talle:</label>
          <select class="option-select" id="size-${product.id}">
            ${sizesOptions}
          </select>
        </div>
      `;
    }
  }

  return `
    <article class="product-card">
      <div class="product-image" onclick="showImageModal('${product.id}')">
        ${imageHTML}
        ${product.onSale ? '<span class="badge badge-sale">-' + discount + '%</span>' : ''}
        ${product.featured && !product.onSale ? '<span class="badge badge-featured">Destacado</span>' : ''}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="category">${product.category}</p>
        <p class="product-description">${product.description || ''}</p>
        <div class="product-pricing">
          <span class="price">${formatPrice(product.price)}</span>
          ${product.originalPrice ? '<span class="original-price">' + formatPrice(product.originalPrice) + '</span>' : ''}
        </div>
        ${variantsHTML}
        <div class="product-actions">
          <button class="btn btn-cart" onclick="addToCart('${product.id}')" aria-label="Agregar ${product.name} al carrito">
            Agregar
          </button>
          <button class="btn btn-whatsapp" onclick="orderByWhatsApp('${product.id}')" aria-label="Pedir ${product.name} por WhatsApp">
            WhatsApp
          </button>
        </div>
      </div>
    </article>
  `;
}

// Actualizar talles cuando se cambia el color
function updateSizesForColor(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.variants) return;

  const colorEl = document.getElementById(`color-${productId}`);
  const sizeEl = document.getElementById(`size-${productId}`);
  if (!colorEl || !sizeEl) return;

  const selectedColor = colorEl.value;
  const variant = product.variants.find(v => v.color === selectedColor);
  const sizes = variant ? variant.sizes : [];

  sizeEl.innerHTML = sizes.map(s => {
    const size = typeof s === 'string' ? s : s.size;
    const stock = typeof s === 'string' ? 1 : s.stock;
    if (stock <= 0) {
      return `<option value="${size}" disabled>⚊ ${size} (Agotado)</option>`;
    }
    return `<option value="${size}">${size}</option>`;
  }).join('');
}

// === Modal de Imagen ===
function showImageModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || !product.image) return;

  const modal = document.getElementById('imageModal');
  modal.innerHTML = `
    <div class="image-modal-content">
      <button class="image-modal-close" onclick="closeImageModal()">&times;</button>
      <img src="${product.image}" alt="${product.name}">
      <div class="image-modal-info">
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <p class="image-modal-price">${formatPrice(product.price)}</p>
        <div class="image-modal-buttons">
          <button class="btn btn-cart" onclick="addToCart('${product.id}'); closeImageModal();">Agregar al carrito</button>
          <button class="btn btn-whatsapp" onclick="orderByWhatsApp('${product.id}'); closeImageModal();">Pedir por WhatsApp</button>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
  document.body.style.overflow = '';
}

function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;
  const featured = products.filter(p => p.featured && p.available);
  if (featured.length === 0) {
    grid.innerHTML = '<p class="loading-text">Próximamente productos destacados</p>';
  } else {
    grid.innerHTML = featured.map(createProductCard).join('');
  }
}

function renderSales() {
  const grid = document.getElementById('salesGrid');
  if (!grid) return;
  const sales = products.filter(p => p.onSale && p.available);
  if (sales.length === 0) {
    grid.innerHTML = '<p class="loading-text">Próximamente ofertas especiales</p>';
  } else {
    grid.innerHTML = sales.map(createProductCard).join('');
  }
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;
  const noResults = document.getElementById('noResults');
  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noResults) noResults.hidden = false;
  } else {
    grid.innerHTML = filtered.map(createProductCard).join('');
    if (noResults) noResults.hidden = true;
  }
}

// === Filtros ===
function getFilteredProducts() {
  const category = document.getElementById('filterCategory')?.value || 'all';
  const priceRange = document.getElementById('filterPrice')?.value || 'all';
  const sort = document.getElementById('filterSort')?.value || 'default';

  let filtered = products.filter(p => p.available);

  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number);
    filtered = filtered.filter(p => p.price >= min && p.price <= max);
  }

  switch (sort) {
    case 'price-asc':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  return filtered;
}

// === Carrito ===
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const sizeEl = document.getElementById(`size-${productId}`);
  const colorEl = document.getElementById(`color-${productId}`);
  const size = sizeEl ? sizeEl.value : '';
  const color = colorEl ? colorEl.value : '';

  const cartKey = `${productId}_${size}_${color}`;
  const existing = cart.find(item => item.cartKey === cartKey);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, cartKey, size, color, qty: 1 });
  }

  saveCart();
  updateCartUI();
  openCart();
}

function removeFromCart(cartKey) {
  cart = cart.filter(item => item.cartKey !== cartKey);
  saveCart();
  updateCartUI();
}

function updateQty(cartKey, delta) {
  const item = cart.find(i => i.cartKey === cartKey);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(cartKey);
    return;
  }

  saveCart();
  updateCartUI();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('intivelvet_cart', JSON.stringify(cart));
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.id);
    return total + (product ? product.price * item.qty : 0);
  }, 0);
}

function updateCartUI() {
  const countEl = document.getElementById('cartCount');
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const emptyEl = document.getElementById('cartEmpty');
  const totalEl = document.getElementById('cartTotal');

  if (!countEl) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  countEl.textContent = totalItems;

  if (cart.length === 0) {
    itemsEl.innerHTML = '';
    footerEl.hidden = true;
    emptyEl.hidden = false;
  } else {
    emptyEl.hidden = true;
    footerEl.hidden = false;
    totalEl.textContent = formatPrice(getCartTotal());

    itemsEl.innerHTML = cart.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) return '';
      const optionsText = [item.size, item.color].filter(Boolean).join(' - ');
      return `
        <div class="cart-item">
          <div class="cart-item-image">
            ${product.image ? '<img src="' + product.image + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">' : '👙'}
          </div>
          <div class="cart-item-details">
            <h4>${product.name}</h4>
            ${optionsText ? '<span class="cart-item-options">' + optionsText + '</span>' : ''}
            <span class="cart-item-price">${formatPrice(product.price)}</span>
            <div class="cart-item-qty">
              <button onclick="updateQty('${item.cartKey}', -1)" aria-label="Reducir cantidad">−</button>
              <span>${item.qty}</span>
              <button onclick="updateQty('${item.cartKey}', 1)" aria-label="Aumentar cantidad">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.cartKey}')">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// === Carrito UI ===
function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// === WhatsApp ===
function orderByWhatsApp(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const sizeEl = document.getElementById(`size-${productId}`);
  const colorEl = document.getElementById(`color-${productId}`);
  const size = sizeEl ? sizeEl.value : '';
  const color = colorEl ? colorEl.value : '';

  let message = `Hola Intivelvet 💕\n\nMe interesa:\n` +
    `📌 *${product.name}*\n` +
    `💰 Precio: ${formatPrice(product.price)}\n`;
  if (size) message += `📏 Talle: ${size}\n`;
  if (color) message += `🎨 Color: ${color}\n`;
  message += `\n¿Tienen disponibilidad? Gracias.`;

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function checkoutByWhatsApp() {
  if (cart.length === 0) return;
  showShippingModal();
}

function showShippingModal() {
  const total = getCartTotal();
  const modal = document.getElementById('shippingModal');
  const optionsHTML = CONFIG.shippingOptions.map(opt => {
    const priceText = opt.price === 0 ? 'Gratis' : formatPrice(opt.price);
    return `
      <label class="shipping-option">
        <input type="radio" name="shipping" value="${opt.id}" ${opt.id === 'local' ? 'checked' : ''}>
        <span class="shipping-option-info">
          <strong>${opt.name}</strong>
          <span>${priceText}</span>
        </span>
      </label>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Selecciona tipo de envío</h3>
        <button class="modal-close" onclick="closeShippingModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="shipping-options">${optionsHTML}</div>
        <div class="shipping-total">
          <p>Subtotal: <strong>${formatPrice(total)}</strong></p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary btn-block" onclick="sendOrderWhatsApp()">Enviar Pedido por WhatsApp</button>
      </div>
    </div>
  `;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeShippingModal() {
  document.getElementById('shippingModal').classList.remove('active');
  document.body.style.overflow = '';
}

function sendOrderWhatsApp() {
  const selectedShipping = document.querySelector('input[name="shipping"]:checked');
  if (!selectedShipping) return;

  const shippingOption = CONFIG.shippingOptions.find(o => o.id === selectedShipping.value);
  const subtotal = getCartTotal();
  const shippingCost = shippingOption.price;
  const total = subtotal + shippingCost;

  let message = `Hola Intivelvet 💕\n\nQuiero hacer un pedido:\n\n`;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      let line = `• ${product.name}`;
      if (item.size) line += ` (Talle: ${item.size})`;
      if (item.color) line += ` (Color: ${item.color})`;
      line += ` x${item.qty} — ${formatPrice(product.price * item.qty)}`;
      message += line + '\n';
    }
  });

  message += `\n📦 Envío: ${shippingOption.name}`;
  if (shippingCost > 0) message += ` (${formatPrice(shippingCost)})`;
  message += `\n💰 *Total: ${formatPrice(total)}*\n`;
  message += `\n¿Cómo procedo con el pago? Gracias.`;

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');

  closeShippingModal();
  closeCart();
}

// === Utilidades ===
function formatPrice(amount) {
  return '$' + amount.toLocaleString('es-CO');
}

// === Eventos ===
function initEvents() {
  const filterCat = document.getElementById('filterCategory');
  const filterPrice = document.getElementById('filterPrice');
  const filterSort = document.getElementById('filterSort');
  if (filterCat) filterCat.addEventListener('change', renderCatalog);
  if (filterPrice) filterPrice.addEventListener('change', renderCatalog);
  if (filterSort) filterSort.addEventListener('change', renderCatalog);

  const cartBtn = document.getElementById('cartBtn');
  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const clearCartBtn = document.getElementById('clearCartBtn');
  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutByWhatsApp);
  if (clearCartBtn) clearCartBtn.addEventListener('click', clearCart);

  const menuToggle = document.getElementById('menuToggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.querySelector('.nav').classList.toggle('active');
    });
  }

  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelector('.nav').classList.remove('active');
    });
  });
}
