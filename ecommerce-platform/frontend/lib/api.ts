/**
 * API client for Spring Cloud Gateway at NEXT_PUBLIC_API_URL (default :8080)
 * All responses wrapped in ApiResponse<T> from common module.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  ApiResponse, PageResponse, AuthTokens, LoginRequest, RegisterRequest,
  UserProfile, Address, AddressRequest, Product, ProductSummary, ProductFilters,
  Review, ReviewRequest, Cart, AddToCartRequest, Order, CheckoutRequest,
  Payment, ProcessPaymentRequest, SearchResult, SalesReport, DiscountRequest,
} from '../../shared/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ── Token storage (browser only) ──────────────────────────────
const TOKEN_KEY  = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const tokenStorage = {
  getAccess:  () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),
  setTokens:  (a: string, r: string) => { localStorage.setItem(TOKEN_KEY, a); localStorage.setItem(REFRESH_KEY, r); },
  clear:      () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(REFRESH_KEY); },
};

// ── Axios instance ────────────────────────────────────────────
function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: `${BASE_URL}/api` });

  // Attach JWT
  client.interceptors.request.use((cfg) => {
    const token = tokenStorage.getAccess();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });

  // Auto-refresh on 401
  client.interceptors.response.use(
    (r) => r,
    async (err) => {
      const original = err.config as AxiosRequestConfig & { _retry?: boolean };
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = tokenStorage.getRefresh();
          const { data } = await axios.post<ApiResponse<AuthTokens>>(
            `${BASE_URL}/api/users/refresh-token`,
            { refreshToken },
          );
          tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
          original.headers = { ...original.headers, Authorization: `Bearer ${data.data.accessToken}` };
          return client(original);
        } catch {
          tokenStorage.clear();
          window.location.href = '/auth/login';
        }
      }
      return Promise.reject(err);
    },
  );

  return client;
}

const http = createClient();
const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>) => p.then((r) => r.data.data);

// ── Auth API ──────────────────────────────────────────────────
export const authApi = {
  login:        (b: LoginRequest)    => unwrap<AuthTokens>(http.post('/users/login', b)),
  register:     (b: RegisterRequest) => unwrap<AuthTokens>(http.post('/users/register', b)),
  refreshToken: (refreshToken: string) => unwrap<AuthTokens>(http.post('/users/refresh-token', { refreshToken })),
  logout:       () => http.post('/users/logout').catch(() => {}),
};

// ── User API ─────────────────────────────────────────────────
export const userApi = {
  getProfile:         () => unwrap<UserProfile>(http.get('/users/profile')),
  updateProfile:      (b: Partial<UserProfile>) => unwrap<UserProfile>(http.put('/users/profile', b)),
  changePassword:     (b: { currentPassword: string; newPassword: string }) =>
                        unwrap<void>(http.put('/users/change-password', b)),
  deleteAccount:      () => unwrap<void>(http.delete('/users/account')),
  getAddresses:       () => unwrap<Address[]>(http.get('/users/addresses')),
  addAddress:         (b: AddressRequest) => unwrap<Address>(http.post('/users/addresses', b)),
  updateAddress:      (id: string, b: AddressRequest) => unwrap<Address>(http.put(`/users/addresses/${id}`, b)),
  deleteAddress:      (id: string) => unwrap<void>(http.delete(`/users/addresses/${id}`)),
  setDefaultAddress:  (id: string) => unwrap<void>(http.patch(`/users/addresses/${id}/default`)),
  getWishlist:        () => unwrap<string[]>(http.get('/users/wishlist')),
  addToWishlist:      (productId: string) => unwrap<void>(http.post(`/users/wishlist/${productId}`)),
  removeFromWishlist: (productId: string) => unwrap<void>(http.delete(`/users/wishlist/${productId}`)),
};

// ── Product API ──────────────────────────────────────────────
export const productApi = {
  list:         (f: ProductFilters = {}) => unwrap<PageResponse<ProductSummary>>(http.get('/products', { params: f })),
  getById:      (id: string) => unwrap<Product>(http.get(`/products/${id}`)),
  batchFetch:   (ids: string[]) => unwrap<Product[]>(http.post('/products/batch', { ids })),
  getReviews:   (id: string, page = 0) =>
                  unwrap<PageResponse<Review>>(http.get(`/products/${id}/reviews`, { params: { page, size: 10 } })),
  submitReview: (id: string, b: ReviewRequest) => unwrap<Review>(http.post(`/products/${id}/reviews`, b)),
  search:       (query: string, page = 0) =>
                  unwrap<SearchResult>(http.get('/search', { params: { q: query, page, size: 20 } })),
};

// ── Cart API ─────────────────────────────────────────────────
export const cartApi = {
  get:            () => unwrap<Cart>(http.get('/cart')),
  addItem:        (b: AddToCartRequest) => unwrap<Cart>(http.post('/cart/add', b)),
  updateQuantity: (productId: string, quantity: number) =>
                    unwrap<Cart>(http.patch(`/cart/items/${productId}`, { quantity })),
  removeItem:     (productId: string) => unwrap<Cart>(http.delete(`/cart/remove/${productId}`)),
  clear:          () => unwrap<void>(http.delete('/cart')),
  saveForLater:   (productId: string) => unwrap<Cart>(http.post(`/cart/save-for-later/${productId}`)),
  moveToCart:     (productId: string) => unwrap<Cart>(http.post(`/cart/move-to-cart/${productId}`)),
  applyCoupon:    (couponCode: string) => unwrap<Cart>(http.post('/cart/coupon', { couponCode })),
};

// ── Order API ─────────────────────────────────────────────────
export const orderApi = {
  checkout:  (b: CheckoutRequest) => unwrap<Order>(http.post('/orders/checkout', b)),
  getById:   (id: string) => unwrap<Order>(http.get(`/orders/${id}`)),
  list:      (page = 0) => unwrap<PageResponse<Order>>(http.get('/orders', { params: { page, size: 10 } })),
  cancel:    (id: string) => unwrap<Order>(http.put(`/orders/cancel/${id}`)),
};

// ── Payment API ──────────────────────────────────────────────
export const paymentApi = {
  process: (b: ProcessPaymentRequest) => unwrap<Payment>(http.post('/payments/process', b)),
  refund:  (orderId: string) => unwrap<Payment>(http.post(`/payments/refund/${orderId}`)),
};

// ── Recommendation API ────────────────────────────────────────
export const recommendationApi = {
  forUser:     (limit = 10) => unwrap<string[]>(http.get('/recommendations', { params: { limit } })),
  alsoViewed:  (productId: string, limit = 8) =>
                 unwrap<string[]>(http.get(`/recommendations/also-viewed/${productId}`, { params: { limit } })),
};

// ── Admin API ─────────────────────────────────────────────────
export const adminApi = {
  getReport:      (from: string, to: string) =>
                    unwrap<SalesReport>(http.get('/admin/reports', { params: { from, to } })),
  getDashboard:   () => unwrap<SalesReport>(http.get('/admin/reports/dashboard')),
  applyDiscount:  (b: DiscountRequest) => unwrap<void>(http.post('/admin/manage-discounts', b)),
};
