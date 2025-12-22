/**
 * ADVANCED NAVBAR DROPDOWN ENHANCEMENTS
 * Améliorations avancées pour les menus déroulants du navbar
 */

class NavbarDropdownManager {
    constructor() {
        this.dropdownElements = new Map();
        this.isMobile = window.innerWidth < 992;
        this.hoverDelay = 200;
        this.hoverTimer = null;
        
        this.init();
    }

    init() {
        this.setupDropdowns();
        this.setupKeyboardNavigation();
        this.setupResponsiveness();
    }

    /**
     * Configure tous les dropdowns du navbar
     */
    setupDropdowns() {
        const dropdownToggles = document.querySelectorAll('.navbar .dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            const dropdown = toggle.closest('.dropdown');
            const menu = dropdown?.querySelector('.dropdown-menu');
            
            if (!dropdown || !menu) return;

            // Initialiser Bootstrap Dropdown avec les bonnes options
            const bsInstance = new bootstrap.Dropdown(toggle, {
                autoClose: 'inside',
                boundary: 'viewport'
            });

            this.dropdownElements.set(toggle, {
                instance: bsInstance,
                toggle: toggle,
                menu: menu,
                dropdown: dropdown
            });

            // Ajouter des écouteurs d'événements
            if (!this.isMobile) {
                this.setupHoverBehavior(toggle, dropdown);
            }

            // Ajouter les écouteurs de focus pour l'accessibilité
            this.setupAccessibility(toggle, menu);
        });
    }

    /**
     * Configurer le comportement au survol (desktop uniquement)
     */
    setupHoverBehavior(toggle, dropdown) {
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(this.hoverTimer);
            const data = this.dropdownElements.get(toggle);
            if (data) {
                this.hoverTimer = setTimeout(() => {
                    data.instance.show();
                }, this.hoverDelay);
            }
        });

        dropdown.addEventListener('mouseleave', () => {
            clearTimeout(this.hoverTimer);
            const data = this.dropdownElements.get(toggle);
            if (data) {
                this.hoverTimer = setTimeout(() => {
                    data.instance.hide();
                }, 100);
            }
        });

        // Empêcher la fermeture du dropdown lors du survol du menu
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) {
            menu.addEventListener('mouseenter', () => {
                clearTimeout(this.hoverTimer);
            });

            menu.addEventListener('mouseleave', () => {
                const data = this.dropdownElements.get(toggle);
                if (data) {
                    this.hoverTimer = setTimeout(() => {
                        data.instance.hide();
                    }, 100);
                }
            });
        }
    }

    /**
     * Configurer la navigation au clavier pour l'accessibilité
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const menuItems = document.querySelectorAll('.dropdown-menu.show .dropdown-item');
            if (menuItems.length === 0) return;

            const activeElement = document.activeElement;
            const activeItemIndex = Array.from(menuItems).indexOf(activeElement);

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    const nextIndex = activeItemIndex + 1 < menuItems.length ? activeItemIndex + 1 : 0;
                    menuItems[nextIndex]?.focus();
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    const prevIndex = activeItemIndex - 1 >= 0 ? activeItemIndex - 1 : menuItems.length - 1;
                    menuItems[prevIndex]?.focus();
                    break;

                case 'Escape':
                    // Fermer tous les dropdowns ouvert
                    this.dropdownElements.forEach(data => {
                        data.instance.hide();
                    });
                    break;

                case 'Tab':
                    // Laisser le comportement par défaut de Tab
                    break;
            }
        });
    }

    /**
     * Configurer l'accessibilité (aria, focus-visible, etc.)
     */
    setupAccessibility(toggle, menu) {
        // Ajouter les attributs ARIA appropriés
        toggle.setAttribute('aria-haspopup', 'true');
        toggle.setAttribute('aria-expanded', 'false');

        menu.setAttribute('role', 'menu');
        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.setAttribute('role', 'menuitem');
        });

        // Mettre à jour aria-expanded quand le menu change
        toggle.addEventListener('show.bs.dropdown', () => {
            toggle.setAttribute('aria-expanded', 'true');
            this.announceMenuOpen(toggle.textContent.trim());
        });

        toggle.addEventListener('hide.bs.dropdown', () => {
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

    /**
     * Annoncer l'ouverture du menu pour les lecteurs d'écran
     */
    announceMenuOpen(menuName) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Menu ${menuName} ouvert`;
        document.body.appendChild(announcement);
        
        setTimeout(() => announcement.remove(), 1000);
    }

    /**
     * Configurer le comportement responsive
     */
    setupResponsiveness() {
        window.addEventListener('resize', () => {
            const newIsMobile = window.innerWidth < 992;
            
            if (this.isMobile !== newIsMobile) {
                this.isMobile = newIsMobile;
                
                if (this.isMobile) {
                    // Fermer tous les dropdowns ouvert lors du passage en mobile
                    this.dropdownElements.forEach(data => {
                        data.instance.hide();
                    });
                }
            }
        });
    }

    /**
     * Mettre à jour la position du dropdown pour éviter les débordements
     */
    adjustDropdownPosition(menu) {
        const rect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        if (rect.right > viewportWidth) {
            menu.style.left = 'auto';
            menu.style.right = '0';
        }
    }
}

// Initialiser le gestionnaire de dropdowns
document.addEventListener('DOMContentLoaded', () => {
    new NavbarDropdownManager();
});

/**
 * KEYBOARD SHORTCUTS FOR NAVBAR
 * Raccourcis clavier pour le navbar
 */
document.addEventListener('keydown', (e) => {
    // Alt + M pour ouvrir le menu (accessible)
    if (e.altKey && e.key === 'm') {
        e.preventDefault();
        const navToggle = document.querySelector('.navbar-toggler');
        if (navToggle) {
            navToggle.click();
        }
    }
});

/**
 * SMOOTH SCROLL BEHAVIOR
 * Comportement de scroll lisse
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
