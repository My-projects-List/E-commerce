/**
 * Mobile API client — mirrors frontend/lib/api.ts but uses AsyncStorage for tokens.
 * Calls the same Spring Cloud Gateway at :8080.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type {
  ApiResponse, AuthTokens, LoginRequest, RegisterRequest, UserProfile,
  Product, ProductSummary, ProductFilters, Cart, AddToCartRequest,
  Order, CheckoutRequest, Review, ReviewRequest, PageResponse,
} from '../../shared/types';

const BASE_URL = (Constants.expoConfig?.extra?.API_URL as string) ?? 'http://localhost:8080';
const TOKEN_KEY  = '@shopnow/access_token';
const REFRESH_KEY = '@shopnow/refresh_token';

export const tokenStorage = {
  getAccess:  () => AsyncStorage.getItem(TOKEN_KEY),
  getRefresh: () => AsyncStorage.getItem(REFRESH_KEY),
  setTokens:  (a: string, r: string) => Promise.all([AsyncStorage.setItem(TOKEN_KEY, a), AsyncStorage.setItem(REFRESH_KEY, r)]),
  clear:      () => Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(REFRESH_KEY)]),
};

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: `${BASE_URL}/api`, timeout: 15_000 });

  client.interceptors.request.use(async (cfg) => {
    const token = await tokenStorage.getAccess();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });

  client.interceptors.response.use(
    (r) => r,
    async (err) => {
      const original = err.config as AxiosRequestConfig & { _retry?: boolean };
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        try {
          const refreshToken = await tokenStorage.getRefresh();
          const { data } = await axios.post<ApiResponse<AuthTokens>>(
            `${BASE_URL}/api/users/refresh-token`, { refreshToken },
          );
          await tokenStorage.setTokens(data.data.accessToken, data.data.refreshToken);
          original.headers = { ...original.headers, Authorization: `Bearer ${data.data.accessToken}` };
          return client(original);
        } catch {
          await tokenStorage.clear();
          // Navigation to login is handled by the auth store listener
        }
      }
      return Promise.reject(err);
    },
  );

  return client;
}

const http = createClient();
const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>) => p.then((r) => r.data.data);

export const authApi = {
  login:        (b: LoginRequest)    => unwrap<AuthTokens>(http.post('/users/login', b)),
  register:     (b: RegisterRequest) => unwrap<AuthTokens>(http.post('/users/register', b)),
  logout:       () => http.post('/users/logout').catch(() => {}),
};

export const productApi = {
  list:         (f: ProductFilters = {}) => unwrap<PageResponse<ProductSummary>>(http.get('/products', { params: f })),
  getById:      (id: string) => unwrap<Product>(http.get(`/products/${id}`)),
  getReviews:   (id: string, page = 0) =>
                  unwrap<PageResponse<Review>>(http.get(`/products/${id}/reviews`, { params: { page, size: 10 } })),
  submitReview: (id: string, b: ReviewRequest) => unwrap<Review>(http.post(`/products/${id}/reviews`, b)),
  search:       (query: string, page = 0) =>
                  unwrap<PageResponse<ProductSummary>>(http.get('/search', { params: { q: query, page, size: 20 } })),
};

export const cartApi = {
  get:            () => unwrap<Cart>(http.get('/cart')),
  addItem:        (b: AddToCartRequest) => unwrap<Cart>(http.post('/cart/add', b)),
  updateQuantity: (productId: string, quantity: number) =>
                    unwrap<Cart>(http.patch(`/cart/items/${productId}`, { quantity })),
  removeItem:     (productId: string) => unwrap<Cart>(http.delete(`/cart/remove/${productId}`)),
  clear:          () => unwrap<void>(http.delete('/cart')),
};

export const orderApi = {
  checkout: (b: CheckoutRequest) => unwrap<Order>(http.post('/orders/checkout', b)),
  getById:  (id: string) => unwrap<Order>(http.get(`/orders/${id}`)),
  list:     (page = 0) => unwrap<PageResponse<Order>>(http.get('/orders', { params: { page, size: 10 } })),
  cancel:   (id: string) => unwrap<Order>(http.put(`/orders/cancel/${id}`)),
};

export const userApi = {
  getProfile:    () => unwrap<UserProfile>(http.get('/users/profile')),
  updateProfile: (b: Partial<UserProfile>) => unwrap<UserProfile>(http.put('/users/profile', b)),
};
