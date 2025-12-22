// ===== NAVBAR FUNCTIONALITY =====

document.addEventListener('DOMContentLoaded', function () {
    // ===== BOOTSTRAP 5 DROPDOWN INITIALIZATION =====
    // Ensure all dropdowns are properly initialized
    const dropdownElementList = document.querySelectorAll('.dropdown-toggle');

    // Initialize all dropdowns
    dropdownElementList.forEach(dropdownToggleEl => {
        // Only initialize if not already initialized
        if (!bootstrap.Dropdown.getInstance(dropdownToggleEl)) {
            new bootstrap.Dropdown(dropdownToggleEl, {
                autoClose: true,
                boundary: 'viewport'
            });
        }
    });

    // Add hover functionality for desktop dropdowns
    const navbarDropdowns = document.querySelectorAll('.navbar .dropdown');

    navbarDropdowns.forEach(dropdown => {
        const dropdownToggle = dropdown.querySelector('.dropdown-toggle');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');

        if (dropdownToggle && dropdownMenu) {
            // Show dropdown on hover (desktop only)
            dropdown.addEventListener('mouseenter', function () {
                if (window.innerWidth >= 992) { // Bootstrap lg breakpoint
                    let bsDropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
                    if (!bsDropdown) {
                        bsDropdown = new bootstrap.Dropdown(dropdownToggle);
                    }
                    bsDropdown.show();
                }
            });

            // Hide dropdown on mouse leave (desktop only)
            dropdown.addEventListener('mouseleave', function () {
                if (window.innerWidth >= 992) {
                    const bsDropdown = bootstrap.Dropdown.getInstance(dropdownToggle);
                    if (bsDropdown) {
                        bsDropdown.hide();
                    }
                }
            });
        }
    });

    const navbarMenu = document.getElementById('navbarMenu');
    const navbarMobileToggle = document.getElementById('navbarMobileToggle');

    // Toggle mobile menu
    if (navbarMobileToggle && navbarMenu) {
        navbarMobileToggle.addEventListener('click', function (e) {
            e.stopPropagation();
            navbarMenu.classList.toggle('hidden');
        });
    }

    // Close mobile menu button
    const navbarMobileClose = document.getElementById('navbarMobileClose');
    if (navbarMobileClose && navbarMenu) {
        navbarMobileClose.addEventListener('click', function (e) {
            e.preventDefault();
            navbarMenu.classList.add('hidden');
        });
    }

    // Handle mobile dropdown toggles - Event Delegation
    document.addEventListener('click', function (e) {
        const dropdownButton = e.target.closest('.mobile-dropdown button');

        if (dropdownButton) {
            e.preventDefault();
            e.stopPropagation();

            const dropdown = dropdownButton.closest('.mobile-dropdown');
            const content = dropdown.querySelector('.mobile-dropdown-content');
            const arrow = dropdownButton.querySelector('svg');

            // Close other dropdowns
            document.querySelectorAll('.mobile-dropdown').forEach(other => {
                if (other !== dropdown) {
                    other.querySelector('.mobile-dropdown-content')?.classList.add('hidden');
                    other.querySelector('svg')?.classList.remove('rotate-180');
                }
            });

            // Toggle current
            if (content) {
                content.classList.toggle('hidden');
                if (arrow) arrow.classList.toggle('rotate-180');
            }
        }
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (e) {
        const isClickInsideNav = e.target.closest('nav');
        const isClickInsideMenu = e.target.closest('#navbarMenu');
        const isMobileToggle = e.target.closest('#navbarMobileToggle');

        if (!isClickInsideNav && !isClickInsideMenu && !isMobileToggle && navbarMenu && !navbarMenu.classList.contains('hidden')) {
            navbarMenu.classList.add('hidden');

            // Close all mobile dropdowns
            document.querySelectorAll('.mobile-dropdown').forEach(dropdown => {
                const content = dropdown.querySelector('.mobile-dropdown-content');
                const arrow = dropdown.querySelector('svg');
                if (content) content.classList.add('hidden');
                if (arrow) arrow.classList.remove('rotate-180');
            });
        }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (window.innerWidth >= 1024) {
                // Reset mobile menu on desktop
                if (navbarMenu) {
                    navbarMenu.classList.add('hidden');
                }

                // Close all mobile dropdowns
                const mobileDropdowns = document.querySelectorAll('.mobile-dropdown');
                mobileDropdowns.forEach(dropdown => {
                    const content = dropdown.querySelector('.mobile-dropdown-content');
                    const arrow = dropdown.querySelector('svg');
                    if (content) content.classList.add('hidden');
                    if (arrow) arrow.classList.remove('rotate-180');
                });
            }
        }, 250);
    });
});


// ===== UTILITY FUNCTIONS =====

// Confirmation dialogs for delete actions
document.addEventListener('DOMContentLoaded', function () {
    const deleteButtons = document.querySelectorAll('[data-confirm]');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });
});

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function () {
    const alerts = document.querySelectorAll('.alert');

    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 300);
        }, 5000);
    });
});

// Search functionality with debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Live search (if needed)
const searchInputs = document.querySelectorAll('.search-input');
searchInputs.forEach(input => {
    input.addEventListener('input', debounce(function () {
        // Search logic can be added here if needed
        console.log('Searching for:', this.value);
    }, 300));
});
