// === Admin Panel - Intivelvet ===

// Contraseña del admin (cámbiala por la que quieras)
const ADMIN_PASSWORD = 'intivelvet2026';

let products = JSON.parse(localStorage.getItem('intivelvet_products')) || [];
let editingId = null;
let currentImageData = null;

// === Login ===
function loginAdmin() {
  const password = document.getElementById('adminPassword').value;
  if (password === ADMIN_PASSWORD) {
    document.getElementById('adminLogin').hidden = true;
    document.getElementById('adminPanel').hidden = false;
    sessionStorage.setItem('admin_logged', 'true');
    renderAdminProducts();
  } else {
    document.getElementById('loginError').hidden = false;
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('admin_logged');
  document.getElementById('adminLogin').hidden = false;
  document.getElementById('adminPanel').hidden = true;
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('admin_logged') === 'true') {
    document.getElementById('adminLogin').hidden = true;
    document.getElementById('adminPanel').hidden = false;
    renderAdminProducts();
  }

  // Enter para login
  document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginAdmin();
  });
});

// === Productos ===
function saveProducts() {
  localStorage.setItem('intivelvet_products', JSON.stringify(products));
}

function getNextId() {
  if (products.length === 0) return 1;
  return Math.max(...products.map(p => p.id)) + 1;
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    currentImageData = e.target.result;
    document.getElementById('imagePreview').innerHTML = `<img src="${currentImageData}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

function saveProduct(event) {
  event.preventDefault();

  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const description = document.getElementById('prodDescription').value.trim();
  const price = parseInt(document.getElementById('prodPrice').value);
  const originalPrice = document.getElementById('prodOriginalPrice').value
    ? parseInt(document.getElementById('prodOriginalPrice').value)
    : null;
  const sizes = document.getElementById('prodSizes').value
    .split(',').map(s => s.trim()).filter(s => s);
  const colors = document.getElementById('prodColors').value
    .split(',').map(s => s.trim()).filter(s => s);
  const featured = document.getElementById('prodFeatured').checked;
  const onSale = document.getElementById('prodOnSale').checked;
  const available = document.getElementById('prodAvailable').checked;

  if (editingId) {
    // Editar producto existente
    const index = products.findIndex(p => p.id === editingId);
    if (index !== -1) {
      products[index] = {
        ...products[index],
        name,
        category,
        description,
        price,
        originalPrice,
        sizes,
        colors,
        featured,
        onSale,
        available,
        image: currentImageData || products[index].image
      };
    }
  } else {
    // Nuevo producto
    const newProduct = {
      id: getNextId(),
      name,
      category,
      description,
      price,
      originalPrice,
      image: currentImageData || '',
      sizes,
      colors,
      featured,
      onSale,
      available
    };
    products.push(newProduct);
  }

  saveProducts();
  renderAdminProducts();
  resetForm();
}

function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Editar Producto';
  document.getElementById('prodName').value = product.name;
  document.getElementById('prodCategory').value = product.category;
  document.getElementById('prodDescription').value = product.description || '';
  document.getElementById('prodPrice').value = product.price;
  document.getElementById('prodOriginalPrice').value = product.originalPrice || '';
  document.getElementById('prodSizes').value = (product.sizes || []).join(', ');
  document.getElementById('prodColors').value = (product.colors || []).join(', ');
  document.getElementById('prodFeatured').checked = product.featured;
  document.getElementById('prodOnSale').checked = product.onSale;
  document.getElementById('prodAvailable').checked = product.available !== false;

  currentImageData = product.image || null;
  if (currentImageData && currentImageData.startsWith('data:')) {
    document.getElementById('imagePreview').innerHTML = `<img src="${currentImageData}" alt="Preview">`;
  } else {
    document.getElementById('imagePreview').innerHTML = '';
  }

  // Scroll al formulario
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

function toggleAvailability(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  product.available = !product.available;
  saveProducts();
  renderAdminProducts();
}

function deleteProduct(id) {
  if (!confirm('¿Estás segura de eliminar este producto?')) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderAdminProducts();
}

function resetForm() {
  editingId = null;
  currentImageData = null;
  document.getElementById('formTitle').textContent = 'Agregar Producto';
  document.getElementById('productForm').reset();
  document.getElementById('prodAvailable').checked = true;
  document.getElementById('imagePreview').innerHTML = '';
}

function renderAdminProducts() {
  const container = document.getElementById('adminProducts');
  const countEl = document.getElementById('productCount');
  countEl.textContent = products.length;

  if (products.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No hay productos. Agrega el primero arriba.</p>';
    return;
  }

  container.innerHTML = products.map(product => {
    const thumbHTML = product.image && product.image.startsWith('data:')
      ? `<img src="${product.image}" alt="${product.name}">`
      : '👙';

    return `
      <div class="admin-product-item">
        <div class="admin-product-thumb">${thumbHTML}</div>
        <div class="admin-product-info">
          <h4>${product.name}</h4>
          <p>${product.category} — $${product.price.toLocaleString('es-CO')}</p>
          <span class="product-status ${product.available !== false ? 'status-available' : 'status-unavailable'}">
            ${product.available !== false ? '✓ Disponible' : '✗ No disponible'}
          </span>
        </div>
        <div class="admin-product-actions">
          <button class="btn-edit" onclick="editProduct(${product.id})">Editar</button>
          <button class="btn-toggle" onclick="toggleAvailability(${product.id})">
            ${product.available !== false ? 'Ocultar' : 'Mostrar'}
          </button>
          <button class="btn-delete" onclick="deleteProduct(${product.id})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}
