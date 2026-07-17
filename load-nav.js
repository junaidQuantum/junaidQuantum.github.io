// load-nav.js
document.addEventListener('DOMContentLoaded', function() {
    // Get the current page name from the URL
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageName = currentPage.replace('.html', '');

    // Load the navigation
    fetch('/navigation.html')
        .then(response => response.text())
        .then(html => {
            // Insert the navigation at the top of the body
            document.body.insertAdjacentHTML('afterbegin', html);
            
            // Highlight the active page
            document.querySelectorAll('.nav-link').forEach(link => {
                const dataPage = link.getAttribute('data-page');
                if (dataPage === pageName) {
                    link.classList.add('active');
                }
            });

            // Mobile menu toggle
            const menuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            if (menuBtn && mobileMenu) {
                menuBtn.addEventListener('click', function() {
                    mobileMenu.classList.toggle('hidden');
                });
            }

            // Add the CSS that was previously in the style section of each page
            // This ensures the nav styles are always present
            const navStyles = `
                .nav-link {
                    position: relative;
                    color: #94a3b8;
                    transition: color 0.2s;
                    font-weight: 500;
                    text-decoration: none;
                }
                .nav-link:hover {
                    color: #ffffff;
                }
                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: -4px;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: #818cf8;
                    transition: width 0.3s;
                }
                .nav-link:hover::after {
                    width: 100%;
                }
                .nav-link.active {
                    color: #ffffff;
                }
                .nav-link.active::after {
                    width: 100%;
                }
            `;
            const styleElement = document.createElement('style');
            styleElement.textContent = navStyles;
            document.head.appendChild(styleElement);
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
        });
});
