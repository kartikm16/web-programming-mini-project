/**
 * FarmConnect — Farmer Dashboard Logic (Firebase Backend Integrated)
 */

let currentFarmer = null;
let allProducts = [];
let allOrders = [];
let orderFilter = 'all';
let deleteTarget = null;
let editingProductId = null;

const PLACEHOLDERS = {
    vegetables: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600',
    fruits:     'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&q=80&w=600',
    grains:     'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600',
    dairy:      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600',
    spices:     'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600',
    organic:    'https://images.unsplash.com/photo-1500937386664-56d1dfef3844?auto=format&fit=crop&q=80&w=600',
    default:    'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=600'
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (!currentFarmer) return;

    setTodayDate();
    initNav();
    initSidebar();
    initProductForm();
    initOrderFilters();
    initConfirmModal();
    initDarkMode();
    initQuickActions();
    initProfileSave();

    loadDashboardData();
});

async function checkAuth() {
    try {
        const res = await fetch('/api/user');
        const user = await res.json();
        if (!user || user.role !== 'farmer') {
            window.location.href = 'farmer-login.html';
        } else {
            currentFarmer = user;
            populateFarmerInfo();
            populateProfile();
        }
    } catch (err) {
        window.location.href = 'farmer-login.html';
    }
}

async function loadDashboardData() {
    await Promise.all([
        fetchAnalytics(),
        fetchProducts(),
        fetchOrders()
    ]);
}

async function fetchAnalytics() {
    try {
        const res = await fetch('/api/farmer/analytics');
        const data = await res.json();
        setText('stat-products', data.activeProducts);
        setText('stat-pending', data.totalOrders); 
        setText('stat-earnings', `₹${data.totalRevenue.toLocaleString('en-IN')}`);
    } catch (err) {
        console.error('Error fetching analytics:', err);
    }
}

async function fetchProducts() {
    try {
        const res = await fetch('/api/farmer/products');
        allProducts = await res.json();
        renderProducts();
        setText('stat-products', allProducts.length);
        setText('products-badge', allProducts.length);
    } catch (err) {
        console.error('Error fetching products:', err);
    }
}

async function fetchOrders() {
    try {
        const res = await fetch('/api/farmer/orders');
        allOrders = await res.json();
        renderOrders();
        renderOverview(); 

        const pendingList = allOrders.filter(o => o.status.toLowerCase() === 'pending');
        setText('stat-pending', pendingList.length);
        setText('orders-badge', pendingList.length);
        
        const acceptedList = allOrders.filter(o => o.status.toLowerCase() === 'accepted');
        setText('stat-accepted', acceptedList.length);

        if (pendingList.length > 0) {
            const dot = document.getElementById('notif-dot');
            if (dot) dot.classList.add('show');
        }
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

function populateFarmerInfo() {
    const initial = currentFarmer.name ? currentFarmer.name[0].toUpperCase() : 'F';
    const firstName = currentFarmer.name ? currentFarmer.name.split(' ')[0] : 'Farmer';

    setText('sb-avatar', initial);
    setText('sb-name', currentFarmer.name);
    setText('tb-avatar', initial);
    setText('tb-name', firstName);
    setText('welcome-msg', `Welcome back, ${firstName}! 👋`);
}

function setTodayDate() {
    const el = document.getElementById('today-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function initNav() {
    document.querySelectorAll('[data-section]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const section = el.getAttribute('data-section');
            switchSection(section);
        });
    });
}

function switchSection(name) {
    document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.snav-item').forEach(n => n.classList.remove('active'));

    const sec = document.getElementById(`section-${name}`);
    if (sec) sec.classList.add('active');

    const nav = document.getElementById(`nav-${name}`);
    if (nav) nav.classList.add('active');

    if (name === 'overview') loadDashboardData();
    if (name === 'products') fetchProducts();
    if (name === 'orders') fetchOrders();

    closeSidebar();
}

function initSidebar() {
    const menuBtn = document.getElementById('topbar-menu-btn');
    const closeBtn = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');
    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}
function openSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.add('open');
    if (ov) ov.classList.add('show');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
    document.body.style.overflow = '';
}

function renderOverview() {
    const container = document.getElementById('ov-recent-orders');
    if (!container) return;
    const recent = [...allOrders].reverse().slice(0, 5);
    if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state-sm"><i class="ri-inbox-2-line"></i><span>No orders yet</span></div>`;
    } else {
        container.innerHTML = recent.map(o => `
            <div class="ov-order-item">
                <div>
                    <div class="oi-product">${o.items ? o.items.map(i => i.name).join(', ') : 'Order'}</div>
                    <div class="oi-farmer">${new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
                </div>
                <div class="oi-qty">₹${o.totalAmount}</div>
                <span class="order-status-badge ${o.status}">${o.status}</span>
            </div>`).join('');
    }
}

function initProductForm() {
    const openBtn = document.getElementById('open-add-product-btn');
    const closeBtn = document.getElementById('apf-close');
    const cancelBtn = document.getElementById('apf-cancel');
    const form = document.getElementById('add-product-form');
    const wrap = document.getElementById('add-product-form-wrap');

    const showForm = () => { wrap.style.display = 'block'; wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const hideForm = () => {
        wrap.style.display = 'none';
        form.reset();
        document.getElementById('image-preview-container').style.display = 'none';
        document.getElementById('image-preview').src = '';
        editingProductId = null;
        setText('apf-title', 'Add New Product');
        setText('apf-btn-label', 'Save Product');
    };

    // Image Preview Logic
    const fileInput = document.getElementById('productImageFile');
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-image-btn');
    const urlInput = document.getElementById('productImage');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewContainer.style.display = 'block';
                urlInput.value = ''; // Clear URL input if file is selected
            };
            reader.readAsDataURL(file);
        }
    });

    removeBtn.addEventListener('click', () => {
        fileInput.value = '';
        previewImg.src = '';
        previewContainer.style.display = 'none';
    });

    urlInput.addEventListener('input', () => {
        if (urlInput.value.trim()) {
            fileInput.value = '';
            previewImg.src = '';
            previewContainer.style.display = 'none';
        }
    });

    if (openBtn) openBtn.addEventListener('click', showForm);
    if (closeBtn) closeBtn.addEventListener('click', hideForm);
    if (cancelBtn) cancelBtn.addEventListener('click', hideForm);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateProductForm()) return;

            const name = document.getElementById('productName').value.trim();
            const category = document.getElementById('productCategory').value;
            const price = parseFloat(document.getElementById('productPrice').value);
            const qty = parseFloat(document.getElementById('productQty').value);
            const organic = document.getElementById('productOrganic').checked;
            
            let image = document.getElementById('productImage').value.trim();
            const file = document.getElementById('productImageFile').files[0];

            try {
                const submitBtn = document.getElementById('apf-submit');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';

                // If a file is selected, upload it first
                if (file) {
                    const formData = new FormData();
                    formData.append('image', file);
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        image = uploadData.url;
                    } else {
                        throw new Error('Image upload failed');
                    }
                }

                if (!image) {
                    image = PLACEHOLDERS[category] || PLACEHOLDERS.default;
                }

                const productData = {
                    id: editingProductId,
                    name, category, price, qty, image, isOrganic: organic
                };

                const res = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                
                if (res.ok) {
                    showToast(editingProductId ? 'Product updated successfully!' : 'Product added successfully!');
                    await fetchProducts();
                    hideForm();
                }
            } catch (err) {
                console.error('Error saving product:', err);
                showToast(err.message || 'Error saving product');
            } finally {
                const submitBtn = document.getElementById('apf-submit');
                submitBtn.disabled = false;
                submitBtn.innerHTML = editingProductId ? '<i class="ri-check-line"></i> Update Product' : '<i class="ri-check-line"></i> Save Product';
            }
        });
    }
}

function validateProductForm() {
    let valid = true;
    const clear = id => { const g = document.getElementById(id); if (g) g.classList.remove('error'); };
    const err = id => { const g = document.getElementById(id); if (g) g.classList.add('error'); valid = false; };

    clear('fg-pname'); clear('fg-pcat'); clear('fg-pprice'); clear('fg-pqty');
    if (!document.getElementById('productName').value.trim()) err('fg-pname');
    if (!document.getElementById('productCategory').value) err('fg-pcat');
    const price = parseFloat(document.getElementById('productPrice').value);
    if (isNaN(price) || price <= 0) err('fg-pprice');
    const qty = parseFloat(document.getElementById('productQty').value);
    if (isNaN(qty) || qty < 0) err('fg-pqty');
    return valid;
}

function renderProducts() {
    const grid = document.getElementById('farmer-products-grid');
    if (!grid) return;

    if (allProducts.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="ri-store-2-line"></i>
                <h3>No products yet</h3>
                <p>Add your first product to start selling in the marketplace.</p>
                <button class="btn-primary" onclick="document.getElementById('add-product-form-wrap').style.display = 'block'"><i class="ri-add-line"></i> Add First Product</button>
            </div>`;
        return;
    }

    grid.innerHTML = allProducts.map(p => `
        <div class="prod-card" data-id="${p.id}">
            <div class="prod-card-img">
                <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='${PLACEHOLDERS.default}'">
                ${p.isOrganic ? `<span class="prod-organic-badge">🌿 Organic</span>` : ''}
                <span class="prod-cat-badge">${p.category}</span>
            </div>
            <div class="prod-card-body">
                <div class="prod-card-name">${p.name}</div>
                <div class="prod-card-price">₹${p.price} <span>per kg</span></div>
                <div class="prod-card-qty"><i class="ri-scales-line"></i> ${p.qty || 0} kg available</div>
            </div>
            <div class="prod-card-actions">
                <button class="prod-edit-btn" onclick="editProduct('${p.id}')"><i class="ri-edit-line"></i> Edit</button>
                <button class="prod-delete-btn" onclick="confirmDelete('${p.id}')"><i class="ri-delete-bin-line"></i> Delete</button>
            </div>
        </div>`).join('');
}

window.editProduct = (id) => {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    editingProductId = id;

    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productQty').value = product.qty || 0;
    document.getElementById('productImage').value = product.image && !product.image.startsWith('/public/uploads/') ? product.image : '';
    document.getElementById('productOrganic').checked = product.isOrganic || false;

    // Handle preview for uploaded images
    if (product.image && product.image.startsWith('/public/uploads/')) {
        const previewContainer = document.getElementById('image-preview-container');
        const previewImg = document.getElementById('image-preview');
        previewImg.src = product.image;
        previewContainer.style.display = 'block';
    } else {
        document.getElementById('image-preview-container').style.display = 'none';
        document.getElementById('image-preview').src = '';
    }

    setText('apf-title', 'Edit Product');
    setText('apf-btn-label', 'Update Product');

    const wrap = document.getElementById('add-product-form-wrap');
    if (wrap) {
        wrap.style.display = 'block';
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.confirmDelete = (id) => {
    deleteTarget = id;
    const overlay = document.getElementById('confirm-overlay');
    if (overlay) overlay.classList.add('show');
};

function initConfirmModal() {
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmCancel) confirmCancel.addEventListener('click', () => {
        document.getElementById('confirm-overlay').classList.remove('show');
        deleteTarget = null;
    });
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTarget) return;
        showToast('Delete functionality triggered for ID: ' + deleteTarget);
        document.getElementById('confirm-overlay').classList.remove('show');
        deleteTarget = null;
    });
}

function initOrderFilters() {
    document.querySelectorAll('.of-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.of-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            orderFilter = btn.getAttribute('data-filter');
            renderOrders();
        });
    });
}

function renderOrders() {
    const list = document.getElementById('orders-list');
    if (!list) return;

    const filtered = orderFilter === 'all' ? allOrders : allOrders.filter(o => o.status.toLowerCase() === orderFilter.toLowerCase());
    const sorted = [...filtered].reverse();

    if (sorted.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="ri-inbox-2-line"></i>
                <h3>No orders ${orderFilter !== 'all' ? `with status "${orderFilter}"` : 'received'}</h3>
                <p>When customers buy your items, they'll appear here.</p>
            </div>`;
        return;
    }

    list.innerHTML = sorted.map(o => {
        let actionButtons = '';
        // Use case-insensitive check to be safe
        const s = o.status.toLowerCase();

        if (s === 'pending') {
            actionButtons = `
                <button class="order-action-btn btn-accept" onclick="updateOrderStatus('${o.id}', 'Accepted')"><i class="ri-check-line"></i> Accept</button>
                <button class="order-action-btn btn-reject" onclick="updateOrderStatus('${o.id}', 'Rejected')"><i class="ri-close-line"></i> Reject</button>
            `;
        }

        return `
        <div class="order-card" data-id="${o.id}">
            <div class="order-card-header">
                <span class="order-card-id"># Order ${String(o.id).slice(-6)}</span>
                <span class="order-status-badge ${o.status}">${o.status}</span>
            </div>
            <div class="order-card-body">
                <div class="order-field"><label>Products</label><div class="val product">${o.items ? o.items.map(i => `${i.name} (x${i.quantity})`).join(', ') : 'Order'}</div></div>
                <div class="order-field"><label>Total Amount</label><div class="val">₹${o.totalAmount}</div></div>
                <div class="order-field"><label>Date</label><div class="val">${new Date(o.createdAt).toLocaleString('en-IN')}</div></div>
            </div>
            ${actionButtons ? `<div class="order-card-footer"><div class="order-actions">${actionButtons}</div></div>` : ''}
        </div>`;
    }).join('');
}

window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        const res = await fetch(`/api/order/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }) // newStatus will be 'Accepted' or 'Rejected'
        });
        
        if (res.ok) {
            showToast(`Order status updated to ${newStatus}`);
            fetchOrders(); // Refresh data
            fetchAnalytics(); // Update counts
        } else {
            showToast("Failed to update status");
        }
    } catch(e) {
        console.error(e);
        showToast("Error updating order");
    }
}

function populateProfile() {
    if (!currentFarmer) return;
    
    // Fetch detailed farmer info if needed, or use currentFarmer if it has everything
    fetch('/api/farmer/profile').then(res => res.json()).then(data => {
        setText('profile-avatar-big', (data.farmName || currentFarmer.name || 'F')[0].toUpperCase());
        setText('profile-display-name', data.farmName || currentFarmer.name);
        setText('profile-display-loc', `<i class="ri-map-pin-line"></i> ${data.location || 'Not set'}`);
        
        setVal('prof-name', currentFarmer.name);
        setVal('prof-farm', data.farmName);
        setVal('prof-phone', data.phone || '');
        setVal('prof-email', currentFarmer.email);
        setVal('prof-location', data.location);
        setVal('prof-experience', data.experience);
        setVal('prof-produce', data.produceType);
        setVal('prof-method', data.farmingMethod);
    });
}

function initProfileSave() {
    const saveBtn = document.getElementById('save-profile-btn');
    if (!saveBtn) return;
    
    saveBtn.addEventListener('click', async () => {
        const profileData = {
            fullName:      document.getElementById('prof-name').value.trim(),
            farmName:      document.getElementById('prof-farm').value.trim(),
            phone:         document.getElementById('prof-phone').value.trim(),
            location:      document.getElementById('prof-location').value.trim(),
            experience:    document.getElementById('prof-experience').value,
            produceType:   document.getElementById('prof-produce').value,
            farmingMethod: document.getElementById('prof-method').value
        };
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
            
            const res = await fetch('/api/farmer/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            
            if (res.ok) {
                showToast("Profile updated successfully!");
                // Refresh local state/UI if needed
                const updated = await res.json();
                setText('profile-display-name', updated.farmName);
                setText('profile-display-loc', `<i class="ri-map-pin-line"></i> ${updated.location}`);
            } else {
                showToast("Failed to save profile.");
            }
        } catch(e) { 
            console.error(e);
            showToast("An error occurred.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Changes';
        }
    });
}

function initDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;
    const saved = localStorage.getItem('fc_dark_mode') === 'true';
    if (saved) { document.body.classList.add('dark-mode'); toggle.checked = true; }
    toggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode', toggle.checked);
        localStorage.setItem('fc_dark_mode', toggle.checked);
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (err) {
            console.error('Logout error:', err);
        }
    });
}

function initQuickActions() {
    document.querySelectorAll('.qa-btn[data-section]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(btn.getAttribute('data-section'));
        });
    });
}

function showToast(msg) {
    const toast = document.getElementById('dash-toast');
    const msgEl = document.getElementById('dash-toast-msg');
    if (msgEl) msgEl.textContent = msg;
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val || ''; }
