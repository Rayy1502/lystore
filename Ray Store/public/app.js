const app = angular.module('RayStoreApp', ['ngRoute']);

// Setup Socket.io Factory for AngularJS
app.factory('socket', ['$rootScope', function ($rootScope) {
    const socket = io();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                const args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                const args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
}]);

// Global Toast Alert Helper
app.run(['$rootScope', function ($rootScope) {
    $rootScope.showToast = function (message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `custom-toast toast-show ${type === 'success' ? 'success' : 'error'}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '⚡' : '⚠️'}</span>
            <span class="toast-msg">${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    };

    // Global site settings / tagline default
    $rootScope.pageTitle = 'Home';
    $rootScope.recentTransactions = [];

    // Simple Authentication Mock state utilizing localStorage
    $rootScope.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    $rootScope.isLoggedIn = function () {
        return $rootScope.currentUser !== null;
    };
    $rootScope.logout = function () {
        localStorage.removeItem('currentUser');
        $rootScope.currentUser = null;
        $rootScope.showToast('Berhasil keluar dari akun.', 'success');
        window.location.href = '/';
    };
    $rootScope.userLetter = function () {
        if (!$rootScope.currentUser) return 'U';
        return $rootScope.currentUser.name.charAt(0).toUpperCase();
    };
}]);

// Config SPA Client Routing Mappings
app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true); // Modern URLs without '#' hash tag
    
    $routeProvider
        .when('/', {
            templateUrl: '/views/home.html',
            controller: 'HomeController'
        })
        .when('/catalog', {
            templateUrl: '/views/catalog.html',
            controller: 'CatalogController'
        })
        .when('/game/:slug', {
            templateUrl: '/views/game.html',
            controller: 'GameController'
        })
        .when('/order/:orderId', {
            templateUrl: '/views/order.html',
            controller: 'OrderController'
        })
        .when('/check-order', {
            templateUrl: '/views/check-order.html',
            controller: 'CheckOrderController'
        })
        .when('/login', {
            templateUrl: '/views/login.html',
            controller: 'LoginController'
        })
        .when('/register', {
            templateUrl: '/views/register.html',
            controller: 'RegisterController'
        })
        .when('/profile', {
            templateUrl: '/views/profile.html',
            controller: 'ProfileController'
        })
        .when('/admin', {
            templateUrl: '/views/admin.html',
            controller: 'AdminController'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);

// ============================================================
// APP MAIN CONTROLLER
// ============================================================
app.controller('MainController', ['$scope', '$location', '$rootScope', 'socket', function ($scope, $location, $rootScope, socket) {
    $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };

    $scope.dropdownOpen = false;
    $scope.toggleDropdown = function () {
        $scope.dropdownOpen = !$scope.dropdownOpen;
    };
    $scope.closeDropdown = function () {
        $scope.dropdownOpen = false;
    };

    // Real-time Socket.io receivers for recent transaction activities ticker
    socket.on('new_transaction', function (tx) {
        $rootScope.recentTransactions.unshift(tx);
        if ($rootScope.recentTransactions.length > 5) {
            $rootScope.recentTransactions.pop();
        }
    });
}]);

// ============================================================
// CONTROLLERS FOR SPA TEMPLATES
// ============================================================

// 1. Home Controller
app.controller('HomeController', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $rootScope.pageTitle = 'Home';
    $scope.games = [];
    $scope.categories = [];
    $scope.selectedCategory = 'all';

    $scope.fetchCategories = function () {
        $http.get('/api/categories').then(res => {
            if (res.data.success) $scope.categories = res.data.data;
        });
    };

    $scope.fetchGames = function () {
        $http.get('/api/games?category=' + $scope.selectedCategory).then(res => {
            if (res.data.success) $scope.games = res.data.data;
        });
    };

    $scope.setCategory = function (slug) {
        $scope.selectedCategory = slug;
        $scope.fetchGames();
    };

    $scope.fetchCategories();
    $scope.fetchGames();
}]);

// 2. Catalog Controller
app.controller('CatalogController', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $rootScope.pageTitle = 'Katalog Game';
    $scope.games = [];
    $scope.searchQuery = '';

    $http.get('/api/games').then(res => {
        if (res.data.success) $scope.games = res.data.data;
    });

    $scope.filterGames = function (game) {
        if (!$scope.searchQuery) return true;
        const q = $scope.searchQuery.toLowerCase();
        return game.name.toLowerCase().includes(q) || game.brand.toLowerCase().includes(q);
    };
}]);

// 3. Game Wizard Controller
app.controller('GameController', ['$scope', '$http', '$routeParams', '$location', '$rootScope', function ($scope, $http, $routeParams, $location, $rootScope) {
    const slug = $routeParams.slug;
    $scope.game = {};
    $scope.products = [];
    $scope.payments = [];
    
    // Form Inputs Model
    $scope.formData = {
        fields: {},
        product_sku: '',
        payment_method: '',
        whatsapp: '',
        email: ''
    };

    $scope.selectedProduct = null;
    $scope.selectedPayment = null;

    $rootScope.pageTitle = 'Top-Up';

    // Fetch Game Profile
    $http.get('/api/games/' + slug).then(res => {
        if (res.data.success) {
            $scope.game = res.data.game;
            $scope.products = res.data.products;
            $rootScope.pageTitle = 'Top-Up ' + $scope.game.name;
        }
    });

    // Fetch Payments
    $http.get('/api/payment-methods').then(res => {
        if (res.data.success) $scope.payments = res.data.data;
    });

    $scope.selectProduct = function (p) {
        $scope.selectedProduct = p;
        $scope.formData.product_sku = p.buyer_sku_code;
    };

    $scope.selectPayment = function (pay) {
        $scope.selectedPayment = pay;
        $scope.formData.payment_method = pay.code;
    };

    $scope.calculateTotal = function (payFee) {
        if (!$scope.selectedProduct) return 0;
        return Number($scope.selectedProduct.selling_price) + Number(payFee);
    };

    $scope.submitOrder = function () {
        if (!$scope.formData.product_sku) return $rootScope.showToast('Pilih nominal top-up terlebih dahulu!', 'error');
        if (!$scope.formData.payment_method) return $rootScope.showToast('Pilih metode pembayaran terlebih dahulu!', 'error');
        if (!$scope.formData.whatsapp) return $rootScope.showToast('Isi nomor WhatsApp konfirmasi Anda!', 'error');

        $scope.formData.game_slug = slug;

        $http.post('/api/orders', $scope.formData).then(res => {
            if (res.data.success) {
                $rootScope.showToast('Pesanan berhasil dibuat!', 'success');
                $location.path('/order/' + res.data.orderId);
            } else {
                $rootScope.showToast(res.data.message || 'Gagal checkout.', 'error');
            }
        });
    };
}]);

// 4. Order Invoice Controller (Socket.io realtime status updates)
app.controller('OrderController', ['$scope', '$http', '$routeParams', '$rootScope', 'socket', function ($scope, $http, $routeParams, $rootScope, socket) {
    const orderId = $routeParams.orderId;
    $scope.order = {};

    $rootScope.pageTitle = 'Invoice Pembayaran';

    $scope.fetchOrder = function () {
        $http.get('/api/orders/' + orderId).then(res => {
            if (res.data.success) {
                $scope.order = res.data.order;
            }
        });
    };

    $scope.confirmPayment = function () {
        $rootScope.showToast('Mengirimkan konfirmasi pembayaran...', 'warning');
        $http.post('/api/orders/' + orderId + '/confirm').then(res => {
            if (res.data.success) {
                $rootScope.showToast(res.data.message, 'success');
                $scope.fetchOrder();
            } else {
                $rootScope.showToast(res.data.message || 'Konfirmasi gagal.', 'error');
            }
        });
    };

    $scope.refreshStatus = function () {
        $rootScope.showToast('Sinkron status dari server...', 'warning');
        $http.post('/api/orders/' + orderId + '/refresh').then(res => {
            if (res.data.success) {
                $rootScope.showToast('Status terbaru berhasil diperbarui!', 'success');
                $scope.fetchOrder();
            }
        });
    };

    // Format utility
    $scope.formatRupiah = function (num) {
        if (!num) return 'Rp 0';
        return 'Rp ' + Number(num).toLocaleString('id-ID');
    };

    // Realtime connection to order invoice room
    socket.emit('join_order', orderId);

    // Socket status_updated listener (Auto updates screen realtime when server processes the order!)
    socket.on('status_updated', function (data) {
        $rootScope.showToast('Transaksi Anda diperbarui ke status: ' + data.status.toUpperCase(), 'success');
        $scope.order.status = data.status;
        if (data.sn) $scope.order.digiflazz_sn = data.sn;
    });

    $scope.fetchOrder();
}]);

// 5. Check Order Controller
app.controller('CheckOrderController', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    $rootScope.pageTitle = 'Lacak Pesanan';
    $scope.searchId = '';
    $scope.order = null;
    $scope.searched = false;

    $scope.searchOrder = function () {
        if (!$scope.searchId) return;
        $scope.searched = true;
        $scope.order = null;
        
        $http.get('/api/orders/' + $scope.searchId).then(res => {
            if (res.data.success) {
                $scope.order = res.data.order;
            }
        });
    };

    $scope.formatRupiah = function (num) {
        if (!num) return 'Rp 0';
        return 'Rp ' + Number(num).toLocaleString('id-ID');
    };
}]);

// 6. User Auth & Register Controllers
app.controller('LoginController', ['$scope', '$http', '$location', '$rootScope', function ($scope, $http, $location, $rootScope) {
    $rootScope.pageTitle = 'Login';
    $scope.credentials = { email: '', password: '' };

    $scope.login = function () {
        // Mock Admin and User login based on input patterns (simulating DB authentication)
        if ($scope.credentials.email === 'admin@raystore.com' && $scope.credentials.password === 'password') {
            const admin = { name: 'Administrator', email: 'admin@raystore.com', role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(admin));
            $rootScope.currentUser = admin;
            $rootScope.showToast('Selamat datang, Admin!', 'success');
            $location.path('/admin');
        } else {
            const user = { name: $scope.credentials.email.split('@')[0], email: $scope.credentials.email, role: 'user' };
            localStorage.setItem('currentUser', JSON.stringify(user));
            $rootScope.currentUser = user;
            $rootScope.showToast('Login berhasil!', 'success');
            $location.path('/profile');
        }
    };
}]);

app.controller('RegisterController', ['$scope', '$rootScope', '$location', function ($scope, $rootScope, $location) {
    $rootScope.pageTitle = 'Daftar Akun';
    $scope.regData = { name: '', email: '', password: '', phone: '' };

    $scope.register = function () {
        $rootScope.showToast('Registrasi sukses! Silakan login.', 'success');
        $location.path('/login');
    };
}]);

// 7. User Profile Controller
app.controller('ProfileController', ['$scope', '$rootScope', function ($scope, $rootScope) {
    $rootScope.pageTitle = 'Profil Saya';
    $scope.tab = 'profile';
    $scope.setTab = function (t) {
        $scope.tab = t;
    };
}]);

// 8. Admin Control Dashboard Controller
app.controller('AdminController', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {
    // Lock admin panel
    if (!$rootScope.currentUser || $rootScope.currentUser.role !== 'admin') {
        window.location.href = '/login';
        return;
    }

    $rootScope.pageTitle = 'Admin Panel';
    $scope.adminTab = 'dashboard';
    $scope.stats = {};
    $scope.orders = [];
    $scope.products = [];
    $scope.settings = {};

    $scope.setAdminTab = function (tab) {
        $scope.adminTab = tab;
        if (tab === 'dashboard') $scope.fetchStats();
        if (tab === 'orders') $scope.fetchOrders();
        if (tab === 'products') $scope.fetchProducts();
        if (tab === 'settings') $scope.fetchSettings();
    };

    $scope.fetchStats = function () {
        $http.get('/api/admin/stats').then(res => {
            if (res.data.success) {
                $scope.stats = res.data.stats;
                $scope.fetchOrders(); // load orders inside dashboard preview too
            }
        });
    };

    $scope.fetchOrders = function () {
        $http.get('/api/admin/orders').then(res => {
            if (res.data.success) $scope.orders = res.data.data;
        });
    };

    $scope.fetchProducts = function () {
        $http.get('/api/admin/products').then(res => {
            if (res.data.success) $scope.products = res.data.data;
        });
    };

    $scope.fetchSettings = function () {
        $http.get('/api/admin/settings').then(res => {
            if (res.data.success) $scope.settings = res.data.settings;
        });
    };

    $scope.syncProducts = function () {
        $rootScope.showToast('Memulai sinkronisasi produk Digiflazz...', 'warning');
        $http.post('/api/admin/sync').then(res => {
            if (res.data.success) {
                $rootScope.showToast(res.data.message, 'success');
                $scope.fetchProducts();
            } else {
                $rootScope.showToast(res.data.message || 'Gagal sync.', 'error');
            }
        });
    };

    $scope.updateOrderStatus = function (order) {
        $http.post(`/api/admin/orders/${order.id}/update`, {
            status: order.status,
            sn: order.digiflazz_sn
        }).then(res => {
            if (res.data.success) {
                $rootScope.showToast('Berhasil mengubah status transaksi!', 'success');
            }
        });
    };

    $scope.updateProductMarkup = function (prod) {
        $http.post(`/api/admin/products/${prod.id}`, {
            markup: prod.markup,
            is_active: prod.is_active
        }).then(res => {
            if (res.data.success) {
                $rootScope.showToast('Berhasil memperbarui markup produk!', 'success');
            }
        });
    };

    $scope.saveSettings = function () {
        $http.post('/api/admin/settings', $scope.settings).then(res => {
            if (res.data.success) {
                $rootScope.showToast('Konfigurasi sistem disimpan!', 'success');
            }
        });
    };

    $scope.formatRupiah = function (num) {
        if (!num) return 'Rp 0';
        return 'Rp ' + Number(num).toLocaleString('id-ID');
    };

    $scope.fetchStats();
}]);
