// app.js

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVMIQNA9TnNxqymzyuHSeZ-E4zLbx7WVs",
  authDomain: "er-stock-37346.firebaseapp.com",
  databaseURL: "https://er-stock-37346-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "er-stock-37346",
  storageBucket: "er-stock-37346.firebasestorage.app",
  messagingSenderId: "442972982745",
  appId: "1:442972982745:web:b7d7e8ebdc9e7eef151dc8",
  measurementId: "G-34XVE0N8Z0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global State
let erItems = [];
let erTransactions = [];
let currentItemImage = null;

function previewAndProcessImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.getElementById('image-canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;
                const max_size = 200;
                if (width > height) {
                    if (width > max_size) {
                        height *= max_size / width;
                        width = max_size;
                    }
                } else {
                    if (height > max_size) {
                        width *= max_size / height;
                        height = max_size;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                currentItemImage = canvas.toDataURL('image/jpeg', 0.7);
                const preview = document.getElementById('image-preview');
                const placeholder = document.getElementById('image-placeholder');
                preview.src = currentItemImage;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Authentication Data
const admins = {
    'admin1': 'Stock#1',
    'admin2': 'Stock#2',
    'admin3': 'Stock#3',
    'admin4': 'Stock#4',
    'admin5': 'Stock#5'
};

function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const error = document.getElementById('login-error');
    
    if (admins[user] && admins[user] === pass) {
        localStorage.setItem('er_logged_in', 'true');
        localStorage.setItem('er_user', user);
        toggleModal('login-screen', false);
        checkSession();
        
        // Redirect to the page they wanted if possible
        const target = localStorage.getItem('login_redirect') || 'dashboard';
        showPage(target);
        localStorage.removeItem('login_redirect');
    } else {
        error.classList.remove('opacity-0');
        setTimeout(() => error.classList.add('opacity-0'), 3000);
    }
}

function logout() {
    localStorage.removeItem('er_logged_in');
    localStorage.removeItem('er_user');
    location.reload();
}

function checkSession() {
    const isLoggedIn = (localStorage.getItem('er_logged_in') === 'true');
    const user = localStorage.getItem('er_user');
    const authElements = document.querySelectorAll('.auth-only');
    
    authElements.forEach(el => {
        el.classList.toggle('hidden', !isLoggedIn);
    });

    if (isLoggedIn && user) {
        // Update tags
        const nameTag = document.getElementById('user-name-tag');
        const avatarTag = document.getElementById('user-avatar-tag');
        const mobileTag = document.getElementById('mobile-user-tag');
        
        if (nameTag) nameTag.innerText = user.toUpperCase();
        if (avatarTag) avatarTag.innerText = user[0].toUpperCase() + user.slice(-1);
        if (mobileTag) mobileTag.innerText = user[0].toUpperCase() + user.slice(-1);
    }

    // Update UI elements based on login
    const logoutBtn = document.querySelector('button.bg-rose-500\\/10');
    if(logoutBtn) {
        logoutBtn.onclick = logout;
        const textSpan = logoutBtn.querySelector('span');
        if (textSpan) textSpan.innerText = isLoggedIn ? 'ออกจากระบบ' : 'Staff Login';
        if(!isLoggedIn) {
            logoutBtn.onclick = () => toggleModal('login-screen', true);
        }
    }
}

function initDatabase() {
// Sync Items
db.ref("items").on("value", (snapshot) => {
    erItems = [];
    snapshot.forEach((childSnapshot) => {
        erItems.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    renderDashboard();
    renderInventory();
    updateDatalists();
});

// Sync Transactions (Limit to last 50)
db.ref("transactions").orderByChild("timestamp").limitToLast(50).on("value", (snapshot) => {
    erTransactions = [];
    snapshot.forEach((childSnapshot) => {
        erTransactions.unshift({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    renderDashboard();
    renderTransactions();
});
}

function getItems() {
    return erItems;
}

function getTransactions() {
    return erTransactions;
}

function addTransaction(type, item, qty) {
    db.ref("transactions").push({
        type: type, // 'IN' or 'OUT'
        name: item.name,
        qty: parseInt(qty),
        unit: item.unit,
        date: new Date().toLocaleString('th-TH'),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        user: 'Duty Nurse'
    });
}

// --- UI Rendering ---

function getStatusBadge(qty, minStock) {
    const limit = minStock || 20;
    if (qty <= limit) {
        return `<span class="px-2 py-1 bg-medical_warn/10 text-medical_warn text-[10px] font-black rounded-lg border border-medical_warn/20 badge-pulse">LOW STOCK</span>`;
    }
    return `<span class="px-2 py-1 bg-medical_green/10 text-medical_green text-[10px] font-black rounded-lg border border-medical_green/20">IN STOCK</span>`;
}

let currentInventoryFilter = 'All Items';

function setInventoryFilter(category, btnElement) {
    currentInventoryFilter = category;
    
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(b => {
        b.className = "filter-btn px-5 py-2 bg-white rounded-full text-xs font-bold text-slate-500 border border-slate-200 hover:text-slate-700 transition";
    });
    
    if(btnElement) {
        btnElement.className = "filter-btn px-5 py-2 bg-blue-600 rounded-full text-xs font-bold text-white shadow-lg border border-blue-500 transition";
    }
    
    renderInventory();
}

function renderInventory() {
    let items = getItems();
    const tbody = document.querySelector('#page-inventory tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const searchInput = document.getElementById('inventory-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (currentInventoryFilter !== 'All Items') {
        items = items.filter(item => item.category === currentInventoryFilter);
    }
    
    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm) || item.barcode.includes(searchTerm));
    }
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-500 font-bold">ไม่พบรายการที่ค้นหา</td></tr>`;
        return;
    }

    items.forEach(item => {
        const icon = item.category === 'Medicine' ? 'pill' : 'droplet';
        const imageHTML = item.imageData 
            ? `<img src="${item.imageData}" class="w-10 h-10 rounded-xl object-cover border border-slate-200">`
            : `<div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-500/50 transition">
                <i data-lucide="${icon}" class="w-5 h-5 text-slate-500 group-hover:text-blue-500"></i>
               </div>`;

        const statusHTML = getStatusBadge(item.qty, item.minStock);
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors group';
        tr.innerHTML = `
            <td>
                <div class="flex items-center gap-4">
                    ${imageHTML}
                    <div>
                        <p class="font-bold text-slate-800">${item.name}</p>
                        <p class="text-[10px] text-slate-500 font-bold tracking-tight">${item.barcode}</p>
                    </div>
                </div>
            </td>
            <td><span class="text-slate-500 text-xs font-bold">${item.category}</span></td>
            <td><span class="text-slate-500 text-xs font-bold"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1"></i> ${item.location}</span></td>
            <td><div class="flex items-baseline gap-1"><span class="text-xl font-black">${item.qty.toLocaleString()}</span><span class="text-[10px] text-slate-500 font-bold">${item.unit}</span></div></td>
            <td>${statusHTML}</td>
            <td class="text-right whitespace-nowrap">
                <button onclick="updateStock('${item.id}', 1)" class="p-2 hover:text-emerald-400 transition" title="Add 1"><i data-lucide="plus-circle" class="w-5 h-5"></i></button>
                <button onclick="updateStock('${item.id}', -1)" class="p-2 hover:text-rose-400 transition" title="Remove 1"><i data-lucide="minus-circle" class="w-5 h-5"></i></button>
                <button onclick="deleteItem('${item.id}')" class="p-2 hover:text-rose-600 transition" title="Delete Item"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function renderDashboard() {
    const items = getItems();
    const transactions = getTransactions();
    
    // Update Stats
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const lowStockCount = items.filter(item => item.qty <= 20).length;
    
    // Check for expiring items (within 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const expiringCount = items.filter(item => {
        if (!item.expiryDate || item.expiryDate === '-') return false;
        const expDate = new Date(item.expiryDate);
        return expDate <= thirtyDaysFromNow && expDate >= today;
    }).length;

    const totalTransactions = transactions.length;

    // Update UI elements by ID
    const statTotal = document.getElementById('stat-total');
    const statLow = document.getElementById('stat-low');
    const statExp = document.getElementById('stat-expiring');
    const statUsage = document.getElementById('stat-usage');

    if (statTotal) statTotal.innerText = totalItems.toLocaleString();
    if (statLow) statLow.innerText = lowStockCount;
    if (statExp) statExp.innerText = expiringCount;
    if (statUsage) statUsage.innerText = totalTransactions.toLocaleString();

    // Top 5 FIFO Items
    const fifoTbody = document.getElementById('dashboard-fifo-table');
    if (fifoTbody) {
        fifoTbody.innerHTML = '';
        // Sort criteria: low stock <= 20 first, then by expiryDate
        let sortedItems = [...items].sort((a, b) => {
            if (a.qty <= 20 && b.qty > 20) return -1;
            if (b.qty <= 20 && a.qty > 20) return 1;
            
            let textA = a.expiryDate || '9999-99-99';
            let textB = b.expiryDate || '9999-99-99';
            return textA.localeCompare(textB);
        }).slice(0, 5);

        if (sortedItems.length === 0) {
            fifoTbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-500">ไม่มีรายการเวชภัณฑ์</td></tr>`;
        }

        sortedItems.forEach(item => {
            const icon = item.category === 'Medicine' ? 'pill' : 'droplet';
            const imgHTML = item.imageData 
                ? `<img src="${item.imageData}" class="w-8 h-8 rounded-lg object-cover">`
                : `<div class="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center"><i data-lucide="${icon}" class="w-4 h-4 text-blue-500"></i></div>`;

            const limit = item.minStock || 20;
            const isLowStock = item.qty <= limit;
            const expDate = item.expiryDate && item.expiryDate !== '-' ? 
                new Date(item.expiryDate).toLocaleDateString('th-TH') : '-';
            
            const expBadgeClass = isLowStock 
                ? "bg-medical_red/10 text-medical_red border-medical_red/20" 
                : "bg-medical_warn/10 text-medical_warn border-medical_warn/20";

            let qtyBadge = `<p class="text-[10px] ${isLowStock ? 'text-medical_red' : 'text-slate-500'} font-bold">คงเหลือ: ${item.qty} ${item.unit}</p>`;

            fifoTbody.innerHTML += `
                <tr class="hover:bg-slate-50 group transition-colors border-b border-slate-100 last:border-0">
                    <td class="py-4 px-4">
                        <div class="flex items-center gap-3">
                            ${imgHTML}
                            <div>
                                <p class="font-bold text-slate-800">${item.name}</p>
                                ${qtyBadge}
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-4 text-center text-slate-500 font-bold text-xs">${item.batch || '-'}</td>
                    <td class="py-4 px-4 text-center"><span class="px-2 py-1 ${expBadgeClass} text-[10px] font-black rounded-lg border uppercase tracking-tighter">${expDate}</span></td>
                    <td class="py-4 px-4 text-center">
                        <button onclick="showPage('scanner')" class="p-2 bg-white text-slate-500 hover:text-blue-500 rounded-lg border border-slate-200 transition" title="สแกนเบิกจ่าย"><i data-lucide="scan" class="w-4 h-4"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    // Recent Log
    const logContainer = document.querySelector('#page-dashboard .space-y-6.relative.border-l');
    if (logContainer) {
        logContainer.innerHTML = '';
        const recent = transactions.slice(0, 5); // top 5
        if(recent.length === 0) {
            logContainer.innerHTML = '<p class="text-sm text-slate-500 italic">ไม่มีประวัติรายการ</p>';
        }
        recent.forEach(t => {
            const isOut = t.type === 'OUT';
            const colorClass = isOut ? 'bg-medical_red ring-medical_red/20' : 'bg-emerald-500 ring-emerald-500/20';
            const typeText = isOut ? 'เบิกออก' : 'รับเข้า';
            const sign = isOut ? '-' : '+';
            
            const itemHTML = `
                <div class="relative">
                    <div class="absolute -left-[30px] top-1 w-2 h-2 rounded-full ${colorClass.split(' ')[0]} ring-4 ${colorClass.split(' ')[1]}"></div>
                    <p class="text-xs font-bold">${t.user} ${typeText} (${sign}${t.qty})</p>
                    <p class="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-tight">${t.name} • ${t.date}</p>
                </div>
            `;
            logContainer.innerHTML += itemHTML;
        });
    }
}

function renderTransactions() {
    const page = document.getElementById('page-transactions');
    if (!page) return;
    
    const transactions = getTransactions();
    
    let html = `
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-200 mb-8">
            <div>
                <h2 class="text-3xl font-bold font-display">Transaction History</h2>
                <p class="text-slate-500 text-xs">ประวัติการเบิก-จ่าย เวชภัณฑ์ทั้งหมด</p>
            </div>
            <button onclick="clearTransactions()" class="px-4 py-2 bg-rose-600/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-600/30 transition">Clear History</button>
        </div>
        <div class="space-y-4">
    `;
    
    if (transactions.length === 0) {
        html += `<p class="text-center text-slate-500 py-10">ไม่มีประวัติการทำรายการ</p>`;
    }

    transactions.forEach(t => {
        const isOut = t.type === 'OUT';
        const color = isOut ? 'text-medical_red bg-medical_red/10' : 'text-emerald-500 bg-emerald-500/10';
        const icon = isOut ? 'arrow-up-right' : 'arrow-down-left';
        const sign = isOut ? '-' : '+';
        
        html += `
             <div class="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}">
                   <i data-lucide="${icon}" class="w-6 h-6"></i>
                </div>
                <div class="flex-1">
                   <div class="flex justify-between">
                      <h4 class="font-bold text-slate-800">${t.name}</h4>
                      <span class="text-lg font-bold ${isOut ? 'text-medical_red' : 'text-emerald-400'}">${sign}${t.qty} <span class="text-[10px] text-slate-500 font-bold">${t.unit}</span></span>
                   </div>
                   <div class="flex items-center gap-4 mt-1">
                      <p class="text-[11px] text-slate-500 font-medium tracking-tight">${t.user}</p>
                      <p class="text-[11px] text-slate-500 font-medium tracking-tight">${t.date}</p>
                   </div>
                </div>
             </div>
        `;
    });
    
    html += `</div>`;
    page.innerHTML = html;
    lucide.createIcons();
}

function updateStock(id, diff) {
    const item = erItems.find(i => i.id === id);
    if (item) {
        const newQty = item.qty + diff;
        
        if (newQty < 0) {
            alert("ไม่สามารถตัดสต็อกได้ สินค้าคงเหลือไม่เพียงพอ!");
            return;
        }
        
        db.ref("items/" + id).update({
            qty: newQty
        });
        
        // Record Transaction
        const type = diff < 0 ? 'OUT' : 'IN';
        addTransaction(type, item, Math.abs(diff));
    }
}

function deleteItem(id) {
    if(confirm("แน่ใจหรือไม่ที่จะลบรายการนี้?")) {
        db.ref("items/" + id).remove();
    }
}

function clearTransactions() {
    if(confirm("ยืนยันการล้างประวัติทั้งหมด? (ข้อมูลบน Realtime DB จะถูกลบถาวร)")) {
        db.ref("transactions").remove();
    }
}

function resetDatabase() {
    if(confirm("⚠️ คำเตือน: คุณกำลังจะลบข้อมูลทั้งหมด (รายการเวชภัณฑ์และประวัติการเบิกจ่าย) ข้อมูลจะถูกลบถาวรจาก Realtime DB ยืนยันหรือไม่?")) {
        db.ref("items").remove();
        db.ref("transactions").remove();
        alert("✅ รีเซ็ตฐานข้อมูลเรียบร้อยแล้ว");
    }
}

// Replace the Add Item Modal handler
function createNewItem() {
    const name = document.getElementById('add-name-input').value;
    const category = document.getElementById('add-category-input').value;
    const unit = document.getElementById('add-unit-input').value;
    const barcode = document.getElementById('add-barcode-input').value;
    const location = document.getElementById('add-location-input').value;
    const qty = parseInt(document.getElementById('add-qty-input').value) || 0;
    const minStock = parseInt(document.getElementById('add-min-input').value) || 20;
    const maxStock = parseInt(document.getElementById('add-max-input').value) || 1000;
    const receivedDate = document.getElementById('add-received-input').value;
    const expiryDate = document.getElementById('add-expiry-input').value;
    
    if(!name || !unit) {
        alert("กรุณากรอกชื่อเวชภัณฑ์และหน่วยนับ");
        return;
    }
    
    const newItem = {
        name,
        category: category || 'ทั่วไป',
        qty, minStock, maxStock, unit,
        imageData: currentItemImage,
        barcode: barcode || Date.now().toString().slice(-8),
        location: location || 'ไม่ได้ระบุ',
        batch: '-',
        receivedDate: receivedDate || '-',
        expiryDate: expiryDate || '-',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    db.ref("items").push(newItem);
    toggleModal('add-item-modal', false);
    
    // Reset inputs
    currentItemImage = null;
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('image-placeholder').classList.remove('hidden');
}

// --- Scanner Integration functions ---
let currentScannedItem = null;

function handleScanSuccessUI(code) {
    stopScanner();
    document.getElementById('scanner-overlay').classList.add('opacity-0');
    document.getElementById('scanner-container').classList.add('hidden');
    const wrapper = document.getElementById('scanner-wrapper');
    if (wrapper) wrapper.classList.add('hidden');
    
    const header = document.getElementById('scanner-header');
    if (header) header.classList.add('hidden');
    
    const pageScanner = document.getElementById('page-scanner');
    if (pageScanner) {
        pageScanner.classList.remove('py-10');
        pageScanner.classList.add('pb-10', 'pt-0');
    }
    
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const items = getItems();
    const foundItem = items.find(i => i.barcode === code.trim());
    
    const resultDiv = document.getElementById('scan-result');
    resultDiv.classList.remove('hidden');
    
    if (foundItem) {
        currentScannedItem = foundItem;
        document.getElementById('result-name').innerText = foundItem.name;
        document.getElementById('result-code').innerText = `${foundItem.barcode} (คงเหลือ: ${foundItem.qty} ${foundItem.unit})`;
        document.getElementById('result-name').classList.remove('text-rose-400');
    } else {
        currentScannedItem = null;
        document.getElementById('result-name').innerText = "ไม่พบรายการในระบบ";
        document.getElementById('result-name').classList.add('text-rose-400');
        document.getElementById('result-code').innerText = `Barcode: ${code}`;
    }
    
    lucide.createIcons();
}

function processScanAction(type) {
    if (!currentScannedItem) return;
    
    // Quick prompt for quantity
    const qtyStr = prompt(`จำนวนที่ต้องการ${type === 'IN' ? 'รับเข้า' : 'เบิกออก'} (${currentScannedItem.name}):`, "1");
    if (qtyStr !== null) {
        const qtyToProcess = parseInt(qtyStr);
        if(!isNaN(qtyToProcess) && qtyToProcess > 0) {
            const diff = type === 'IN' ? qtyToProcess : -qtyToProcess;
            updateStock(currentScannedItem.id, diff);
            alert(`✅ บันทึกรายการสำเร็จ!`);
            resetScanner();
        } else {
            alert("❌ จำนวนไม่ถูกต้อง");
        }
    }
}

// Override existing HTML button actions
document.addEventListener('DOMContentLoaded', () => {
    initDatabase();
    checkSession();
    
    // Bind Add Item Button
    const createBtn = document.querySelector('#add-item-modal button.bg-blue-600');
    if(createBtn) {
        createBtn.onclick = createNewItem;
    }
    
    // Bind Scanner Action Buttons
    const scanActionBtns = document.querySelectorAll('#scan-result button.group');
    if(scanActionBtns.length >= 2) {
        scanActionBtns[0].onclick = () => processScanAction('IN');
        scanActionBtns[1].onclick = () => processScanAction('OUT');
    }
    
    renderDashboard();
    renderInventory();
    renderTransactions();
    updateDatalists();
});

// --- System Variables ---
let html5QrCode = null;

function updateThaiDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const today = new Date().toLocaleDateString('th-TH', options);
    const statusDate = document.getElementById('current-date-th');
    if (statusDate) statusDate.innerText = today;
}
updateThaiDate();

// Router
function showPage(pageId) {
    const isLoggedIn = (localStorage.getItem('er_logged_in') === 'true');
    const publicPages = ['dashboard'];
    
    // Protection: If not public and not logged in, show login modal
    if (!publicPages.includes(pageId) && !isLoggedIn) {
        localStorage.setItem('login_redirect', pageId);
        toggleModal('login-screen', true);
        return;
    }

    const pages = ['dashboard', 'inventory', 'scanner', 'settings', 'transactions'];
    pages.forEach(p => {
        const el = document.getElementById('page-' + p);
        if(el) el.classList.add('hidden');
        const nav = document.getElementById('nav-' + p);
        if (nav) nav.classList.remove('active');
    });

    const currPageEl = document.getElementById('page-' + pageId);
    if(currPageEl) currPageEl.classList.remove('hidden');
    const activeNav = document.getElementById('nav-' + pageId);
    if (activeNav) activeNav.classList.add('active');

    const bottomIcons = {
        'dashboard': 'btn-dash-m',
        'inventory': 'btn-inv-m',
        'scanner': 'btn-scan-m',
        'transactions': 'btn-trans-m',
        'settings': 'btn-set-m'
    };
    Object.values(bottomIcons).forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.classList.remove('active');
            el.classList.add('text-slate-500');
        }
    });
    const activeBottom = document.getElementById(bottomIcons[pageId]);
    if (activeBottom) {
        activeBottom.classList.add('active');
        activeBottom.classList.remove('text-slate-500');
        if (pageId !== 'scanner') activeBottom.classList.add('text-blue-500');
    }

    if (pageId !== 'scanner' && html5QrCode && html5QrCode.isScanning) {
        stopScanner();
    }
    
    if (pageId === 'inventory') renderInventory();
    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'transactions') renderTransactions();
    
    lucide.createIcons();
}

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        if (modalId === 'add-item-modal') {
            const dateInput = document.getElementById('add-receiving-input') || document.getElementById('add-received-input');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.value = today;
            }
        }
    } else {
        modal.classList.add('hidden');
    }
}

// Scanner Logic
function startScanner() {
    document.getElementById('scanner-placeholder').classList.add('opacity-0');
    setTimeout(() => {
        document.getElementById('scanner-placeholder').classList.add('hidden');
        document.getElementById('scanner-overlay').classList.remove('opacity-0');
        
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 300, height: 150 } };

        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                let cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[devices.length - 1].id;
                html5QrCode.start(
                    cameraId,
                    config,
                    (decodedText) => handleScanSuccessUI(decodedText),
                    (errorMessage) => { }
                ).catch(err => {
                    alert("Error opening camera: " + err);
                    resetScanner();
                });
            } else {
                alert("No camera devices found.");
                resetScanner();
            }
        }).catch(err => {
            alert("Camera strictly blocked. Please try opening in Safari/Chrome via HTTPS.");
            resetScanner();
        });
    }, 300);
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode = null;
        }).catch(err => console.log(err));
    }
}

function resetScanner() {
    stopScanner();
    document.getElementById('scan-result').classList.add('hidden');
    document.getElementById('scanner-container').classList.remove('hidden');
    document.getElementById('scanner-placeholder').classList.remove('hidden');
    document.getElementById('scanner-placeholder').classList.remove('opacity-0');
    document.getElementById('scanner-overlay').classList.add('opacity-0');
    const wrapper = document.getElementById('scanner-wrapper');
    if (wrapper) wrapper.classList.remove('hidden');
    
    const pageScanner = document.getElementById('page-scanner');
    if (pageScanner) {
        pageScanner.classList.remove('pb-10', 'pt-0');
        pageScanner.classList.add('py-10');
    }
    
    const header = document.getElementById('scanner-header');
    if (header) header.classList.remove('hidden');
}

// Holiday Logic
function addHoliday() {
    const input = document.getElementById('holiday-input');
    if (input.value) {
        const list = document.getElementById('holiday-list');
        const span = document.createElement('span');
        span.className = "bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 flex items-center gap-2 animate__animated animate__fadeIn";
        span.innerHTML = input.value + ' <i data-lucide="x" class="w-3 h-3 hover:text-rose-500 cursor-pointer" onclick="this.parentElement.remove()"></i>';
        list.appendChild(span);
        lucide.createIcons();
        input.value = '';
    }
}

lucide.createIcons();

// Modal Scanner Logic
let modalHtml5QrCode = null;

function startModalScanner() {
    const container = document.getElementById('modal-scanner-container');
    if(container) container.classList.remove('hidden');
    
    modalHtml5QrCode = new Html5Qrcode("modal-reader");
    const config = { fps: 15, qrbox: { width: 250, height: 100 } };

    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            let cameraId = devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[devices.length - 1].id;
            modalHtml5QrCode.start(
                cameraId,
                config,
                (decodedText) => {
                    const input = document.getElementById('add-barcode-input');
                    if (input) input.value = decodedText.trim();
                    stopModalScanner();
                },
                (errorMessage) => { }
            ).catch(err => {
                alert("Error opening camera: " + err);
                stopModalScanner();
            });
        } else {
            alert("No camera found.");
            stopModalScanner();
        }
    }).catch(err => {
        alert("Camera access blocked. Please ensure you are on HTTPS.");
        stopModalScanner();
    });
}

function stopModalScanner() {
    if (modalHtml5QrCode) {
        modalHtml5QrCode.stop().then(() => {
            modalHtml5QrCode = null;
            const container = document.getElementById('modal-scanner-container');
            if(container) container.classList.add('hidden');
        }).catch(err => console.log(err));
    } else {
        const container = document.getElementById('modal-scanner-container');
        if(container) container.classList.add('hidden');
    }
}

// Frequency-based Dynamic Datalist Logic
function updateDatalists() {
    const items = getItems();
    const catFreq = {};
    const unitFreq = {};
    
    items.forEach(item => {
        if(item.category) catFreq[item.category] = (catFreq[item.category] || 0) + 1;
        if(item.unit) unitFreq[item.unit] = (unitFreq[item.unit] || 0) + 1;
    });
    
    const catSorted = Object.keys(catFreq).sort((a,b) => catFreq[b] - catFreq[a]);
    const unitSorted = Object.keys(unitFreq).sort((a,b) => unitFreq[b] - unitFreq[a]);
    
    const catDatalist = document.getElementById('category-list');
    if(catDatalist) {
        catDatalist.innerHTML = '';
        if(catSorted.length === 0) {
           catSorted.push('Medicine', 'Consumable', 'Equipment');
        }
        catSorted.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            catDatalist.appendChild(opt);
        });
    }
    
    const unitDatalist = document.getElementById('unit-list');
    if(unitDatalist) {
        unitDatalist.innerHTML = '';
        if(unitSorted.length === 0) {
           unitSorted.push('เม็ด', 'ขวด', 'หลอด', 'ชิ้น');
        }
        unitSorted.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            unitDatalist.appendChild(opt);
        });
    }
}

function exportToPDF() {
    const items = getItems();
    const dateStr = new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    // Create a temporary container for PDF content
    const element = document.createElement('div');
    element.className = "p-10 bg-white font-sans text-slate-800";
    element.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px;">รายงานสรุปคลังเวชภัณฑ์ (ER Stock Report)</h1>
            <p style="font-size: 14px; color: #64748b;">หน่วยงานห้องฉุกเฉิน (Emergency Room Unit)</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">ข้อมูล ณ วันที่: ${dateStr}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 11px;">รายการ</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 11px;">คงเหลือ</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">หน่วย</th>
                    <th style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 11px;">หมดอายุ</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 10px; font-weight: bold;">${item.name}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: right; font-size: 11px; font-weight: 800; color: ${item.qty <= (item.minStock || 20) ? '#e11d48' : '#1e293b'}">${item.qty}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 10px;">${item.unit}</td>
                        <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center; font-size: 10px; color: #64748b;">${item.expiryDate || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const opt = {
        margin: 0.5,
        filename: `ER_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function updateThaiDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const today = new Date().toLocaleDateString('th-TH', options);
    const statusDate = document.getElementById('current-date-th');
    if (statusDate) statusDate.innerText = today;
}
updateThaiDate();
