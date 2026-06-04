// === Admin Panel - Intivelvet con Firebase ===

const ADMIN_PASSWORD = 'intivelvet2026';
const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

let products = [];
let editingId = null;
let currentImageData = null;
let colorRows = [];

// === Login ===
function loginAdmin() {
  const password = document.getElementById('adminPassword').value;
  if (password === ADMIN_PASSWORD) {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    sessionStorage.setItem('admin_logged', 'true');
    loadAdminProducts();
  } else {
    document.getElementById('loginError').hidden = false;
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('admin_logged');
  document.getElementById('adminLogin').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
}

// Verificar sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('admin_logged') === 'true') {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAdminProducts();
  }

  document.getElementById('adminPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginAdmin();
  });
});

// === Cargar productos desde Firebase ===
async function loadAdminProducts() {
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAdminProducts();
  } catch (error) {
    console.error('Error cargando productos:', error);
    document.getElementById('adminProducts').innerHTML = '<p style="color:red;">Error al cargar productos. Verifica la conexión.</p>';
  }
}

// === Colores y Talles ===
function addColorRow(color, sizes) {
  const id = Date.now() + Math.random();
  colorRows.push({ id, color: color || '', sizes: sizes || [] });
  renderColorSizesGrid();
}

function removeColorRow(id) {
  colorRows = colorRows.filter(r => r.id !== id);
  renderColorSizesGrid();
}

function renderColorSizesGrid() {
  const grid = document.getElementById('colorSizesGrid');
  if (colorRows.length === 0) {
    grid.innerHTML = '<p style="color:#999;font-size:0.85rem;">No hay colores agregados.</p>';
    return;
  }

  grid.innerHTML = colorRows.map(row => {
    const sizesCheckboxes = AVAILABLE_SIZES.map(size => {
      const checked = row.sizes.includes(size) ? 'checked' : '';
      return '<label class="size-check"><input type="checkbox" value="' + size + '" ' + checked + ' onchange="updateRowSize(' + row.id + ', \'' + size + '\', this.checked)"> ' + size + '</label>';
    }).join('');

    return '<div class="color-row">' +
      '<div class="color-row-header">' +
      '<input type="text" class="color-input" value="' + row.color + '" placeholder="Nombre del color" onchange="updateRowColor(' + row.id + ', this.value)">' +
      '<button type="button" class="btn-delete btn-sm" onclick="removeColorRow(' + row.id + ')">✕</button>' +
      '</div>' +
      '<div class="size-checks">' + sizesCheckboxes + '</div>' +
      '</div>';
  }).join('');
}

function updateRowColor(id, value) {
  const row = colorRows.find(r => r.id === id);
  if (row) row.color = value.trim();
}

function updateRowSize(id, size, checked) {
  const row = colorRows.find(r => r.id === id);
  if (!row) return;
  if (checked && !row.sizes.includes(size)) {
    row.sizes.push(size);
  } else if (!checked) {
    row.sizes = row.sizes.filter(s => s !== size);
  }
}

function getColorSizesData() {
  return colorRows
    .filter(r => r.color)
    .map(r => ({ color: r.color, sizes: r.sizes }));
}

function loadColorSizesData(variants) {
  colorRows = [];
  if (variants && variants.length > 0) {
    variants.forEach(v => {
      colorRows.push({ id: Date.now() + Math.random(), color: v.color, sizes: v.sizes || [] });
    });
  }
  renderColorSizesGrid();
}

// === Comprimir imagen ===
function compressImage(file, maxWidth = 600, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  compressImage(file).then(compressed => {
    currentImageData = compressed;
    document.getElementById('imagePreview').innerHTML = `<img src="${currentImageData}" alt="Preview">`;
  });
}

// === Guardar producto en Firebase ===
async function saveProduct(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const productData = {
    name: document.getElementById('prodName').value.trim(),
    category: document.getElementById('prodCategory').value,
    description: document.getElementById('prodDescription').value.trim(),
    price: parseInt(document.getElementById('prodPrice').value),
    originalPrice: document.getElementById('prodOriginalPrice').value
      ? parseInt(document.getElementById('prodOriginalPrice').value)
      : null,
    variants: getColorSizesData(),
    featured: document.getElementById('prodFeatured').checked,
    onSale: document.getElementById('prodOnSale').checked,
    available: document.getElementById('prodAvailable').checked
  };

  try {
    if (editingId) {
      // Editar producto existente
      const updateData = { ...productData };
      if (currentImageData) {
        updateData.image = currentImageData;
      }
      await db.collection('products').doc(editingId).update(updateData);
    } else {
      // Nuevo producto
      productData.image = currentImageData || '';
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(productData);
    }

    await loadAdminProducts();
    resetForm();
    alert(editingId ? 'Producto actualizado' : 'Producto agregado');
  } catch (error) {
    console.error('Error guardando producto:', error);
    alert('Error al guardar. Intenta de nuevo.');
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Guardar Producto';
}

// === Editar producto ===
async function editProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editingId = id;
  document.getElementById('formTitle').textContent = 'Editar Producto';
  document.getElementById('prodName').value = product.name;
  document.getElementById('prodCategory').value = product.category;
  document.getElementById('prodDescription').value = product.description || '';
  document.getElementById('prodPrice').value = product.price;
  document.getElementById('prodOriginalPrice').value = product.originalPrice || '';
  document.getElementById('prodFeatured').checked = product.featured;
  document.getElementById('prodOnSale').checked = product.onSale;
  document.getElementById('prodAvailable').checked = product.available !== false;

  // Cargar variantes de color/talle
  loadColorSizesData(product.variants || []);

  currentImageData = null;
  if (product.image) {
    document.getElementById('imagePreview').innerHTML = `<img src="${product.image}" alt="Preview">`;
  } else {
    document.getElementById('imagePreview').innerHTML = '';
  }

  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth' });
}

// === Cambiar disponibilidad ===
async function toggleAvailability(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  try {
    await db.collection('products').doc(id).update({
      available: !product.available
    });
    await loadAdminProducts();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al actualizar disponibilidad.');
  }
}

// === Eliminar producto ===
async function deleteProduct(id) {
  if (!confirm('¿Estás segura de eliminar este producto? No se puede deshacer.')) return;

  try {
    await db.collection('products').doc(id).delete();
    await loadAdminProducts();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar producto.');
  }
}

// === Reset formulario ===
function resetForm() {
  editingId = null;
  currentImageData = null;
  colorRows = [];
  document.getElementById('formTitle').textContent = 'Agregar Producto';
  document.getElementById('productForm').reset();
  document.getElementById('prodAvailable').checked = true;
  document.getElementById('imagePreview').innerHTML = '';
  renderColorSizesGrid();
}

// === Renderizar lista de productos ===
function renderAdminProducts() {
  const container = document.getElementById('adminProducts');
  const countEl = document.getElementById('productCount');
  countEl.textContent = products.length;

  if (products.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No hay productos. Agrega el primero arriba.</p>';
    return;
  }

  container.innerHTML = products.map(product => {
    const thumbHTML = product.image
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
          <button class="btn-edit" onclick="editProduct('${product.id}')">Editar</button>
          <button class="btn-toggle" onclick="toggleAvailability('${product.id}')">
            ${product.available !== false ? 'Ocultar' : 'Mostrar'}
          </button>
          <button class="btn-delete" onclick="deleteProduct('${product.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}
