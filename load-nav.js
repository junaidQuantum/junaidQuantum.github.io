// load-nav.js
document.addEventListener('DOMContentLoaded', function() {
    // ---- Load Navigation ----
    fetch('navigation.html')
        .then(response => {
            if (!response.ok) throw new Error('Navigation not found');
            return response.text();
        })
        .then(html => {
            document.getElementById('nav-placeholder').innerHTML = html;
            highlightActivePage();
            setupMobileMenu();
        })
        .catch(() => {
            // Fallback navigation
            document.getElementById('nav-placeholder').innerHTML = `
            <nav class="fixed top-0 w-full z-50 bg-[#0b1120]/90 backdrop-blur-md border-b border-white/5">
                <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="index.html" class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">QN</div>
                        <span class="text-white font-semibold text-lg tracking-tight">Quantum Nexus Lab</span>
                    </a>
                    <div class="hidden md:flex items-center gap-8 text-sm" id="nav-links">
                        <a href="index.html" class="nav-link" data-page="index">Home</a>
                        <a href="members.html" class="nav-link" data-page="members">Members</a>
                        <a href="publications.html" class="nav-link" data-page="publications">Publications</a>
                        <a href="research.html" class="nav-link" data-page="research">Research</a>
                        <a href="projects.html" class="nav-link" data-page="projects">Projects</a>
                        <a href="contact.html" class="nav-link" data-page="contact">Contact</a>
                    </div>
                    <div class="md:hidden text-white text-2xl cursor-pointer" id="mobile-menu-btn">☰</div>
                </div>
                <div id="mobile-menu" class="md:hidden hidden bg-[#0b1120]/95 backdrop-blur-md border-t border-white/5 px-6 py-4">
                    <div class="flex flex-col gap-3 text-sm">
                        <a href="index.html" class="nav-link text-white" data-page="index">Home</a>
                        <a href="members.html" class="nav-link text-white" data-page="members">Members</a>
                        <a href="publications.html" class="nav-link text-white" data-page="publications">Publications</a>
                        <a href="research.html" class="nav-link text-white" data-page="research">Research</a>
                        <a href="projects.html" class="nav-link text-white" data-page="projects">Projects</a>
                        <a href="contact.html" class="nav-link text-white" data-page="contact">Contact</a>
                    </div>
                </div>
            </nav>`;
            highlightActivePage();
            setupMobileMenu();
        });

    // ---- Load Footer ----
    fetch('footer.html')
        .then(response => {
            if (!response.ok) throw new Error('Footer not found');
            return response.text();
        })
        .then(html => {
            document.getElementById('footer-placeholder').innerHTML = html;
        })
        .catch(() => {
            document.getElementById('footer-placeholder').innerHTML = `
            <footer class="bg-[#0b1120] text-slate-400 mt-16 py-10 px-6">
                <div class="max-w-6xl mx-auto text-center text-sm">
                    <p class="text-slate-300 font-medium">Quantum Nexus Lab</p>
                    <p class="text-sm text-slate-500">The nexus of quantum information sciences</p>
                    <div class="flex justify-center gap-6 mt-4 text-xs text-slate-500">
                        <span>© 2026</span>
                        <span>KFUPM</span>
                        <span>Department of Electrical Engineering</span>
                    </div>
                </div>
            </footer>`;
        });

    // ---- Helper Functions ----
    function highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const pageName = currentPage.replace('.html', '');
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });
    }

    function setupMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', function() {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
});