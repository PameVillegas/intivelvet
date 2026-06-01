// === Intivelvet - Catálogo Digital ===

// Configuración
const CONFIG = {
  whatsappNumber: '573001234567', // Cambia por tu número real
  currency: 'COP',
  freeShippingMin: 150000
};

// Estado global
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

// === Cargar Productos ===
async function loadProducts() {
  try {
    const response = await fetch('data/products.json');
    products = await response.json();
  } catch (error) {
    console.error('Error cargando productos:', error);
    products = [];
  }
}

// === Renderizar Productos ===
function createProductCard(product) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return `
    <article class="product-card">
      <div class="product-image">
        <span class="placeholder-icon">👙</span>
        ${product.onSale ? '<span class="badge badge-sale">-' + discount + '%</span>' : ''}
        ${product.featured && !product.onSale ? '<span class="badge badge-featured">Destacado</span>' : ''}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="category">${product.category}</p>
        <div class="product-pricing">
          <span class="price">${formatPrice(product.price)}</span>
          ${product.originalPrice ? '<span class="original-price">' + formatPrice(product.originalPrice) + '</span>' : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-cart" onclick="addToCart(${product.id})" aria-label="Agregar ${product.name} al carrito">
            Agregar
          </button>
          <button class="btn btn-whatsapp" onclick="orderByWhatsApp(${product.id})" aria-label="Pedir ${product.name} por WhatsApp">
            WhatsApp
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFeatured() {
  const grid = document.getElementById('featuredGrid');
  const featured = products.filter(p => p.featured);
  grid.innerHTML = featured.map(createProductCard).join('');
}

function renderSales() {
  const grid = document.getElementById('salesGrid');
  const sales = products.filter(p => p.onSale);
  grid.innerHTML = sales.map(createProductCard).join('');
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  const noResults = document.getElementById('noResults');
  const filtered = getFilteredProducts();

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.hidden = false;
  } else {
    grid.innerHTML = filtered.map(createProductCard).join('');
    noResults.hidden = true;
  }
}

// === Filtros ===
function getFilteredProducts() {
  const category = document.getElementById('filterCategory').value;
  const priceRange = document.getElementById('filterPrice').value;
  const sort = document.getElementById('filterSort').value;

  let filtered = [...products];

  // Filtrar por categoría
  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  // Filtrar por precio
  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number);
    filtered = filtered.filter(p => p.price >= min && p.price <= max);
  }

  // Ordenar
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

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }

  saveCart();
  updateCartUI();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartUI();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
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
      return `
        <div class="cart-item">
          <div class="cart-item-image">👙</div>
          <div class="cart-item-details">
            <h4>${product.name}</h4>
            <span class="cart-item-price">${formatPrice(product.price)}</span>
            <div class="cart-item-qty">
              <button onclick="updateQty(${product.id}, -1)" aria-label="Reducir cantidad">−</button>
              <span>${item.qty}</span>
              <button onclick="updateQty(${product.id}, 1)" aria-label="Aumentar cantidad">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${product.id})">Eliminar</button>
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

  const message = `Hola Intivelvet 💕\n\nMe interesa:\n` +
    `📌 *${product.name}*\n` +
    `💰 Precio: ${formatPrice(product.price)}\n\n` +
    `¿Tienen disponibilidad? Gracias.`;

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

function checkoutByWhatsApp() {
  if (cart.length === 0) return;

  let message = `Hola Intivelvet 💕\n\nQuiero hacer un pedido:\n\n`;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    if (product) {
      message += `• ${product.name} x${item.qty} — ${formatPrice(product.price * item.qty)}\n`;
    }
  });

  const total = getCartTotal();
  message += `\n💰 *Total: ${formatPrice(total)}*\n`;

  if (total >= CONFIG.freeShippingMin) {
    message += `🚚 ¡Envío gratis incluido!\n`;
  }

  message += `\n¿Cómo procedo con el pago? Gracias.`;

  const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// === Utilidades ===
function formatPrice(amount) {
  return '$' + amount.toLocaleString('es-CO');
}

// === Eventos ===
function initEvents() {
  // Filtros
  document.getElementById('filterCategory').addEventListener('change', renderCatalog);
  document.getElementById('filterPrice').addEventListener('change', renderCatalog);
  document.getElementById('filterSort').addEventListener('change', renderCatalog);

  // Carrito
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', checkoutByWhatsApp);
  document.getElementById('clearCartBtn').addEventListener('click', clearCart);

  // Menú móvil
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.querySelector('.nav').classList.toggle('active');
  });

  // Cerrar menú al hacer click en un enlace
  document.querySelectorAll('.nav a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelector('.nav').classList.remove('active');
    });
  });
}
