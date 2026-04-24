// ======================  IMPORTANT  ======================
// REPLACE THIS URL WITH YOUR DEPLOYED APPS SCRIPT WEB APP URL
const scriptURL = "https://script.google.com/macros/s/AKfycbw6wDo6n8xsHBuQxUs6B2ceLsY5lx-o9jWdvgS2AVmPv0nXOW7tLD87UagDExecRDo6BQ/exec";
// ========================================================

(function () {
    const form = document.getElementById('volunteerForm');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const fileInput = document.getElementById('profilePhoto');
    const fileNameSpan = document.getElementById('fileNameDisplay');
    const previewArea = document.getElementById('previewArea');
    const previewImg = document.getElementById('previewImg');
    const previewName = document.getElementById('previewName');
    const clearPhotoBtn = document.getElementById('clearPhotoBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    // Theme Toggle Logic
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }

    function showToast(text, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let iconClass = 'fa-info-circle';
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-exclamation-circle';

        toast.innerHTML = `
                    <i class="fas ${iconClass} toast-icon"></i>
                    <div>${text}</div>
                `;

        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400); // Wait for transition
        }, 5000);
    }

    function resetFilePreview() {
        fileInput.value = '';
        fileNameSpan.textContent = 'No file selected';
        previewArea.style.display = 'none';
        previewImg.src = '';
        previewName.textContent = '';
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Only image files allowed', 'error');
            resetFilePreview();
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Max 5MB allowed', 'error');
            resetFilePreview();
            return;
        }

        fileNameSpan.textContent = file.name;
        previewName.textContent = file.name;
        const url = URL.createObjectURL(file);
        previewImg.src = url;
        previewArea.style.display = 'flex';
    });

    clearPhotoBtn.addEventListener('click', resetFilePreview);

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve({
                    name: file.name,
                    type: file.type,
                    data: base64
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function submitForm(data) {
        if (data.file) {
            data.file = JSON.stringify(data.file);
        }
        const body = new URLSearchParams(data).toString();
        return fetch(scriptURL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');

        try {
            const data = {
                fullName: form.fullName.value.trim(),
                idNumber: form.idNumber.value.trim(),
                mobile: form.mobile.value.trim(),
                bloodGroup: form.bloodGroup.value,
                additionalInfo: form.additionalInfo.value.trim()
            };

            if (!data.fullName || !data.idNumber || !data.mobile || !data.bloodGroup) {
                throw new Error('Please fill all required fields');
            }

            if (!/^\d{10}$/.test(data.idNumber)) {
                throw new Error('ID Number must be exactly 10 digits');
            }

            if (fileInput.files.length === 0) {
                throw new Error('Profile Photo is required');
            }

            if (fileInput.files.length > 0) {
                data.file = await fileToBase64(fileInput.files[0]);
            }

            const response = await submitForm(data);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status})`);
            }

            const result = await response.json();
            if (result && result.status === 'success') {
                showToast('Registration successful! Thank you for volunteering.', 'success');
                form.reset();
                resetFilePreview();
            } else {
                throw new Error(result?.message || 'Unexpected server response');
            }
        } catch (err) {
            console.error('Submission error:', err);
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
        }
    });

    cancelBtn.addEventListener('click', () => {
        form.reset();
        resetFilePreview();
        showToast('Form cleared', 'info');
    });
})();