// app.js - File untuk integrasi frontend dengan backend API
const API_BASE_URL = 'http://localhost:3000';

// ========== UTILITY FUNCTIONS ==========
function showLoading(show) {
    const loadingElement = document.getElementById('loading-indicator') || createLoadingIndicator();
    loadingElement.style.display = show ? 'flex' : 'none';
}

function createLoadingIndicator() {
    const loading = document.createElement('div');
    loading.id = 'loading-indicator';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 1.2rem;
    `;
    loading.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 10px;"></i>
            <p>Memuat data...</p>
        </div>
    `;
    document.body.appendChild(loading);
    return loading;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : type === 'danger' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times' : 'info'}-circle"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== API FUNCTIONS ==========

// Load semua data dari API
async function loadDataFromAPI() {
    try {
        showLoading(true);
        
        const [kelasRes, penggunaRes, materiRes, tugasRes, kuisRes, forumRes, statsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/kelas`),
            fetch(`${API_BASE_URL}/api/pengguna`),
            fetch(`${API_BASE_URL}/api/materi`),
            fetch(`${API_BASE_URL}/api/tugas`),
            fetch(`${API_BASE_URL}/api/kuis`),
            fetch(`${API_BASE_URL}/api/forum`),
            fetch(`${API_BASE_URL}/api/dashboard/stats`)
        ]);

        // Check jika response ok
        const responses = [kelasRes, penggunaRes, materiRes, tugasRes, kuisRes, forumRes, statsRes];
        for (let res of responses) {
            if (!res.ok) {
                throw new Error(`Gagal memuat data dari server: ${res.status}`);
            }
        }

        // Parse semua response
        const [kelasData, penggunaData, materiData, tugasData, kuisData, forumData, statsData] = await Promise.all([
            kelasRes.json(),
            penggunaRes.json(),
            materiRes.json(),
            tugasRes.json(),
            kuisRes.json(),
            forumRes.json(),
            statsRes.json()
        ]);

        // Update data global
        kelas = kelasData.data || [];
        pengguna = penggunaData.data || [];
        materi = materiData.data || [];
        tugas = tugasData.data || [];
        kuis = kuisData.data || [];
        forum_diskusi = forumData.data || [];
        
        // Update UI
        updateDashboardStats(statsData.data);
        renderKelasList();
        renderPenggunaTable();
        renderMateriTable();
        renderTugasTable();
        renderKuisTable();
        renderForumTable();
        
        showNotification('Data berhasil dimuat!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Gagal memuat data: ' + error.message, 'danger');
        // Fallback ke data sample jika API error
        initializeSampleData();
    } finally {
        showLoading(false);
    }
}

// ========== KELAS API FUNCTIONS ==========
async function saveKelasToAPI(kelasData, imageFile = null, isEdit = false) {
    try {
        showLoading(true);
        
        const formData = new FormData();
        formData.append('nama_kelas', kelasData.nama_kelas);
        formData.append('deskripsi', kelasData.deskripsi);
        formData.append('id_guru', kelasData.id_guru);
        
        if (imageFile) {
            formData.append('gambar', imageFile);
        }
        
        let url = `${API_BASE_URL}/api/kelas`;
        let method = 'POST';
        
        if (isEdit && kelasData.id) {
            url = `${API_BASE_URL}/api/kelas/${kelasData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan kelas');
        }
        
        const result = await response.json();
        showNotification(`Kelas berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
        return result;
    } catch (error) {
        console.error('Error saving kelas:', error);
        showNotification('Gagal menyimpan kelas: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteKelasFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/kelas/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus kelas');
        }
        
        showNotification('Kelas berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting kelas:', error);
        showNotification('Gagal menghapus kelas: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== PENGGUNA API FUNCTIONS ==========
async function savePenggunaToAPI(penggunaData, avatarFile = null, isEdit = false) {
    try {
        showLoading(true);
        
        const formData = new FormData();
        formData.append('nama_lengkap', penggunaData.nama_lengkap);
        formData.append('email', penggunaData.email);
        formData.append('peran', penggunaData.peran);
        
        // Hanya kirim password jika tidak edit atau password diisi
        if (!isEdit || penggunaData.password) {
            formData.append('password', penggunaData.password || 'defaultpassword');
        }
        
        if (avatarFile) {
            formData.append('foto_profil', avatarFile);
        }
        
        let url = `${API_BASE_URL}/api/pengguna`;
        let method = 'POST';
        
        if (isEdit && penggunaData.id) {
            url = `${API_BASE_URL}/api/pengguna/${penggunaData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan pengguna');
        }
        
        showNotification(`Pengguna berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error saving pengguna:', error);
        showNotification('Gagal menyimpan pengguna: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deletePenggunaFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/pengguna/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus pengguna');
        }
        
        showNotification('Pengguna berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting pengguna:', error);
        showNotification('Gagal menghapus pengguna: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== MATERI API FUNCTIONS ==========
async function saveMateriToAPI(materiData, file = null, isEdit = false) {
    try {
        showLoading(true);
        
        const formData = new FormData();
        formData.append('id_kelas', materiData.id_kelas);
        formData.append('judul', materiData.judul);
        formData.append('deskripsi', materiData.deskripsi);
        
        if (file) {
            formData.append('tautan_file', file);
        }
        
        let url = `${API_BASE_URL}/api/materi`;
        let method = 'POST';
        
        if (isEdit && materiData.id) {
            url = `${API_BASE_URL}/api/materi/${materiData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan materi');
        }
        
        showNotification(`Materi berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error saving materi:', error);
        showNotification('Gagal menyimpan materi: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteMateriFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/materi/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus materi');
        }
        
        showNotification('Materi berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting materi:', error);
        showNotification('Gagal menghapus materi: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== TUGAS API FUNCTIONS ==========
async function saveTugasToAPI(tugasData, file = null, isEdit = false) {
    try {
        showLoading(true);
        
        const formData = new FormData();
        formData.append('id_kelas', tugasData.id_kelas);
        formData.append('judul', tugasData.judul);
        formData.append('deskripsi', tugasData.deskripsi);
        formData.append('batas_waktu', tugasData.batas_waktu);
        
        if (file) {
            formData.append('tautan_file', file);
        }
        
        let url = `${API_BASE_URL}/api/tugas`;
        let method = 'POST';
        
        if (isEdit && tugasData.id) {
            url = `${API_BASE_URL}/api/tugas/${tugasData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan tugas');
        }
        
        showNotification(`Tugas berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error saving tugas:', error);
        showNotification('Gagal menyimpan tugas: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteTugasFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/tugas/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus tugas');
        }
        
        showNotification('Tugas berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting tugas:', error);
        showNotification('Gagal menghapus tugas: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== KUIS API FUNCTIONS ==========
async function saveKuisToAPI(kuisData, isEdit = false) {
    try {
        showLoading(true);
        
        let url = `${API_BASE_URL}/api/kuis`;
        let method = 'POST';
        
        if (isEdit && kuisData.id) {
            url = `${API_BASE_URL}/api/kuis/${kuisData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(kuisData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan kuis');
        }
        
        showNotification(`Kuis berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error saving kuis:', error);
        showNotification('Gagal menyimpan kuis: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteKuisFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/kuis/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus kuis');
        }
        
        showNotification('Kuis berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting kuis:', error);
        showNotification('Gagal menghapus kuis: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== FORUM API FUNCTIONS ==========
async function saveForumToAPI(forumData, isEdit = false) {
    try {
        showLoading(true);
        
        let url = `${API_BASE_URL}/api/forum`;
        let method = 'POST';
        
        if (isEdit && forumData.id) {
            url = `${API_BASE_URL}/api/forum/${forumData.id}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(forumData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan diskusi');
        }
        
        showNotification(`Diskusi berhasil ${isEdit ? 'diupdate' : 'disimpan'}!`, 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error saving forum:', error);
        showNotification('Gagal menyimpan diskusi: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

async function deleteForumFromAPI(id) {
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/api/forum/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus diskusi');
        }
        
        showNotification('Diskusi berhasil dihapus!', 'success');
        await loadDataFromAPI();
    } catch (error) {
        console.error('Error deleting forum:', error);
        showNotification('Gagal menghapus diskusi: ' + error.message, 'danger');
        throw error;
    } finally {
        showLoading(false);
    }
}

// ========== MODIFIED FUNCTIONS ==========

// Ganti semua fungsi save dengan versi API
async function saveKelas() {
    const form = document.getElementById('kelas-form');
    const formData = new FormData(form);
    const imageFile = document.getElementById('kelas-image-upload').files[0];
    
    const kelasData = {
        nama_kelas: formData.get('nama_kelas'),
        deskripsi: formData.get('deskripsi'),
        id_guru: formData.get('id_guru')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        kelasData.id = currentEditingItem.id;
    }
    
    try {
        await saveKelasToAPI(kelasData, imageFile, !!currentEditingItem);
        closeKelasModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

async function savePengguna() {
    const form = document.getElementById('pengguna-form');
    const formData = new FormData(form);
    const avatarFile = document.getElementById('pengguna-avatar-upload').files[0];
    
    const penggunaData = {
        nama_lengkap: formData.get('nama_lengkap'),
        email: formData.get('email'),
        peran: formData.get('peran'),
        password: formData.get('password')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        penggunaData.id = currentEditingItem.id;
    }
    
    try {
        await savePenggunaToAPI(penggunaData, avatarFile, !!currentEditingItem);
        closePenggunaModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

async function saveMateri() {
    const form = document.getElementById('materi-form');
    const formData = new FormData(form);
    const fileInput = document.getElementById('materi-file-upload');
    
    const materiData = {
        id_kelas: formData.get('id_kelas'),
        judul: formData.get('judul'),
        deskripsi: formData.get('deskripsi')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        materiData.id = currentEditingItem.id;
    }
    
    try {
        const file = fileInput.files.length > 0 ? fileInput.files[0] : null;
        await saveMateriToAPI(materiData, file, !!currentEditingItem);
        closeMateriModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

async function saveTugas() {
    const form = document.getElementById('tugas-form');
    const formData = new FormData(form);
    const fileInput = document.getElementById('tugas-file-upload');
    
    const tugasData = {
        id_kelas: formData.get('id_kelas'),
        judul: formData.get('judul'),
        deskripsi: formData.get('deskripsi'),
        batas_waktu: formData.get('batas_waktu')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        tugasData.id = currentEditingItem.id;
    }
    
    try {
        const file = fileInput.files.length > 0 ? fileInput.files[0] : null;
        await saveTugasToAPI(tugasData, file, !!currentEditingItem);
        closeTugasModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

async function saveKuis() {
    const form = document.getElementById('kuis-form');
    const formData = new FormData(form);
    
    const kuisData = {
        id_kelas: formData.get('id_kelas'),
        judul: formData.get('judul'),
        waktu_mulai: formData.get('waktu_mulai'),
        waktu_selesai: formData.get('waktu_selesai')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        kuisData.id = currentEditingItem.id;
    }
    
    try {
        await saveKuisToAPI(kuisData, !!currentEditingItem);
        closeKuisModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

async function saveForum() {
    const form = document.getElementById('forum-form');
    const formData = new FormData(form);
    
    const forumData = {
        id_kelas: formData.get('id_kelas'),
        id_pengguna: formData.get('id_pengguna'),
        isi: formData.get('isi')
    };
    
    // Jika edit, tambahkan ID
    if (currentEditingItem) {
        forumData.id = currentEditingItem.id;
    }
    
    try {
        await saveForumToAPI(forumData, !!currentEditingItem);
        closeForumModal();
    } catch (error) {
        // Error sudah ditangani di fungsi API
    }
}

// Ganti fungsi deleteItem dengan versi API
async function deleteItem(type, id) {
    try {
        switch(type) {
            case 'kelas':
                await deleteKelasFromAPI(id);
                break;
            case 'pengguna':
                await deletePenggunaFromAPI(id);
                break;
            case 'materi':
                await deleteMateriFromAPI(id);
                break;
            case 'tugas':
                await deleteTugasFromAPI(id);
                break;
            case 'kuis':
                await deleteKuisFromAPI(id);
                break;
            case 'forum':  
                await deleteForumFromAPI(id);
                break;
            default:
                showNotification(`Fitur hapus untuk ${type} belum diimplementasi`, 'warning');
        }
    } catch (error) {
        console.error('Error in deleteItem:', error);
        showNotification('Gagal menghapus: ' + error.message, 'danger');
    }
}

// Initialize dengan data real dari API
document.addEventListener('DOMContentLoaded', function() {
    createLoadingIndicator();
    loadDataFromAPI();
});