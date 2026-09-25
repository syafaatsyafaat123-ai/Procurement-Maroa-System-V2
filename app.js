/**
 * Maroa PMS - Main Application Controller & Single-Page Router
 * PT. MAROA TUNGGA ABADI
 */

const App = {
    currentRoute: 'dashboard',

    async init() {
        console.log('🚀 Initializing Maroa Procurement Management System (PMS)...');
        
        // Initialize Tracking search bar listener
        if (window.Tracking) Tracking.init();

        // Check authentication
        const isAuthenticated = await Auth.init();
        if (isAuthenticated) {
            this.handleHashChange();
        }

        // Setup Hash listener for SPA Routing
        window.addEventListener('hashchange', () => this.handleHashChange());
    },

    handleHashChange() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        this.navigate(hash);
    },

    navigate(routeName) {
        this.currentRoute = routeName;
        
        // Hide all views
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.add('hidden');
        });

        // Show target view
        const targetView = document.getElementById(`view-${routeName}`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        // Update sidebar active states
        document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
            if (btn.dataset.route === routeName) {
                btn.className = 'sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600/20 text-cyan-400 border border-cyan-500/30 transition';
            } else {
                btn.className = 'sidebar-nav-item flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition';
            }
        });

        // Load route-specific module data
        if (routeName === 'dashboard' && window.Dashboard) {
            Dashboard.load();
        } else if (routeName === 'quotations' && window.Quotations) {
            Quotations.load();
        } else if (routeName === 'purchase-orders' && window.PurchaseOrders) {
            PurchaseOrders.load();
        } else if (routeName === 'bast' && window.BASTModule) {
            BASTModule.load();
        } else if (routeName === 'products' && window.Products) {
            Products.load();
        } else if (routeName === 'companies' && window.Companies) {
            Companies.load();
        } else if (routeName === 'tracking' && window.Tracking) {
            Tracking.loadLifecycle();
        } else if (routeName === 'audit' && window.AuditModule) {
            AuditModule.load();
        }
    },

    refreshCurrentView() {
        this.navigate(this.currentRoute);
    }
};

window.App = App;

// Bootstrap on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
