// ==========================================================================
// RAY STORE - CLIENT SIDE JAVASCRIPT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Hamburger Menu
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const navbarMenu = document.getElementById('navbarMenu');

    if (hamburgerBtn && navbarMenu) {
        hamburgerBtn.addEventListener('click', () => {
            navbarMenu.classList.toggle('show');
            hamburgerBtn.classList.toggle('active');
        });
    }

    // 2. User dropdown menu
    const userDropdownBtn = document.getElementById('userDropdownBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');

    if (userDropdownBtn && userDropdownMenu) {
        userDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!userDropdownBtn.contains(e.target)) {
                userDropdownMenu.classList.remove('show');
            }
        });
    }

    // 3. Header Glassmorphism scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(11, 11, 20, 0.95)';
                navbar.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            } else {
                navbar.style.background = 'rgba(11, 11, 20, 0.85)';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // 4. Live Search Games
    const gameSearchInput = document.getElementById('gameSearchInput');
    const gameCards = document.querySelectorAll('.game-card');

    if (gameSearchInput && gameCards.length > 0) {
        gameSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            gameCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const desc = card.querySelector('p') ? card.querySelector('p').textContent.toLowerCase() : '';
                
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});

// ==========================================================================
// TOAST SYSTEM HELPERS
// ==========================================================================
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '⚡';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>${icon}</span>
            <span>${message}</span>
        </div>
        <button style="margin-left: 15px; cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ==========================================================================
// DYNAMIC CLIPBOARD COPY HELPER
// ==========================================================================
function copyToClipboard(elementId, successMsg = 'Teks berhasil disalin!') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const textToCopy = element.innerText || element.textContent || element.value;

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast(successMsg, 'success');
        })
        .catch(err => {
            console.error('Gagal menyalin: ', err);
            showToast('Gagal menyalin teks.', 'error');
        });
}
