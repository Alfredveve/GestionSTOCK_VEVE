/**
 * NAVBAR SIMPLE ET EFFICACE
 * Gestion basique du navbar sans complications
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialiser les dropdowns Bootstrap
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    dropdowns.forEach(dropdown => {
        if (!bootstrap.Dropdown.getInstance(dropdown)) {
            new bootstrap.Dropdown(dropdown, {
                autoClose: 'inside'
            });
        }
    });

    // Hover behavior pour desktop uniquement
    if (window.innerWidth >= 992) {
        setupDesktopDropdowns();
    }

    // Responsive
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 992) {
            setupDesktopDropdowns();
        }
    });
});

function setupDesktopDropdowns() {
    const dropdownToggles = document.querySelectorAll('.navbar .dropdown-toggle');
    
    dropdownToggles.forEach(toggle => {
        const dropdown = toggle.closest('.dropdown');
        const menu = dropdown?.querySelector('.dropdown-menu');
        
        if (!dropdown || !menu) return;

        let hideTimeout;

        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            const instance = bootstrap.Dropdown.getInstance(toggle);
            if (instance) instance.show();
        });

        dropdown.addEventListener('mouseleave', () => {
            hideTimeout = setTimeout(() => {
                const instance = bootstrap.Dropdown.getInstance(toggle);
                if (instance) instance.hide();
            }, 100);
        });
    });
}
