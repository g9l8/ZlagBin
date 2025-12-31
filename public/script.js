document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
    });
});

document.getElementById('text-password-toggle').addEventListener('change', (e) => {
    document.getElementById('text-password').style.display = e.target.checked ? 'block' : 'none';
});

document.getElementById('file-password-toggle').addEventListener('change', (e) => {
    document.getElementById('file-password').style.display = e.target.checked ? 'block' : 'none';
});
const fileInput = document.getElementById('file-input');
const fileDropZone = document.getElementById('file-drop-zone');
const filePreview = document.getElementById('file-preview');
const fileUploadBtn = document.getElementById('file-upload-btn');
let selectedFile = null;

document.querySelector('.browse-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

fileDropZone.addEventListener('click', () => {
    if (!selectedFile) {
        fileInput.click();
    }
});

fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('drag-over');
});

fileDropZone.addEventListener('dragleave', () => {
    fileDropZone.classList.remove('drag-over');
});

fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

document.querySelector('.remove-file').addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    document.querySelector('.drop-zone-content').style.display = 'block';
    filePreview.style.display = 'none';
    fileUploadBtn.disabled = true;
});

function handleFile(file) {
    selectedFile = file;
    document.querySelector('.drop-zone-content').style.display = 'none';
    filePreview.style.display = 'flex';
    filePreview.querySelector('.file-name').textContent = file.name;
    filePreview.querySelector('.file-size').textContent = formatFileSize(file.size);
    fileUploadBtn.disabled = false;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

document.getElementById('text-upload-btn').addEventListener('click', async () => {
    const content = document.getElementById('text-content').value;
    
    if (!content.trim()) {
        alert('Please enter some text');
        return;
    }
    
    const btn = document.getElementById('text-upload-btn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        const data = {
            content,
            expiry: document.getElementById('text-expiry').value,
            burnAfterRead: document.getElementById('text-burn').checked,
            isMarkdown: document.getElementById('text-markdown').checked,
            password: document.getElementById('text-password-toggle').checked 
                ? document.getElementById('text-password').value 
                : null
        };
        
        const response = await fetch('/api/upload/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result.url);
        } else {
            alert('Upload failed: ' + result.error);
        }
    } catch (error) {
        console.error(error);
        alert('Upload failed: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});

document.getElementById('file-upload-btn').addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Please select a file');
        return;
    }
    
    const btn = document.getElementById('file-upload-btn');
    btn.classList.add('loading');
    btn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('expiry', document.getElementById('file-expiry').value);
        formData.append('burnAfterRead', document.getElementById('file-burn').checked);
        
        if (document.getElementById('file-password-toggle').checked) {
            formData.append('password', document.getElementById('file-password').value);
        }
        
        const response = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result.url);
        } else {
            alert('Upload failed: ' + result.error);
        }
    } catch (error) {
        console.error(error);
        alert('Upload failed: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
});

function showResult(url) {
    document.querySelector('.upload-section').style.display = 'none';
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('result-url').value = url;
}

document.getElementById('copy-btn').addEventListener('click', () => {
    const urlInput = document.getElementById('result-url');
    urlInput.select();
    document.execCommand('copy');
    
    const btn = document.getElementById('copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
});

document.getElementById('new-upload-btn').addEventListener('click', () => {
    document.querySelector('.upload-section').style.display = 'block';
    document.getElementById('result-section').style.display = 'none';
    
    document.getElementById('text-content').value = '';
    document.getElementById('text-markdown').checked = false;
    document.getElementById('text-burn').checked = false;
    document.getElementById('text-expiry').value = '0';
    document.getElementById('text-password-toggle').checked = false;
    document.getElementById('text-password').style.display = 'none';
    document.getElementById('text-password').value = '';
    
    selectedFile = null;
    fileInput.value = '';
    document.querySelector('.drop-zone-content').style.display = 'block';
    filePreview.style.display = 'none';
    fileUploadBtn.disabled = true;
    document.getElementById('file-burn').checked = false;
    document.getElementById('file-expiry').value = '0';
    document.getElementById('file-password-toggle').checked = false;
    document.getElementById('file-password').style.display = 'none';
    document.getElementById('file-password').value = '';
});
