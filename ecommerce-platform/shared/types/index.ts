// ============================================================
// Shared TypeScript types — consumed by frontend/ and mobile/
// Mirror Java DTOs from common/src/main/java/com/ecommerce/common/
// ============================================================

// ── API Response Wrapper ─────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page (0-indexed)
  first: boolean;
  last: boolean;
}

// ── Auth ─────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

// ── User ─────────────────────────────────────────────────────
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'VENDOR';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Address {
  addressId: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

export interface AddressRequest {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
  isDefault?: boolean;
}

// ── Products ─────────────────────────────────────────────────
export interface Category {
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parentCategoryId?: string;
  isActive: boolean;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // null if no discount
  discountPercent?: number;
  category: Category;
  inventoryCount: number;
  lowStockThreshold: number;
  inStock: boolean;
  averageRating: number;
  reviewCount: number;
  brand?: string;
  sku: string;
  weightKg?: number;
  imageUrls: string[];
  attributes: Record<string, string>;
  isActive: boolean;
  vendorId?: string;
  createdAt: string;
}

export interface ProductSummary {
  productId: string;
  name: string;
  imageUrl: string; // first image
  price: number;
  originalPrice?: number;
  averageRating: number;
  reviewCount: number;
  brand?: string;
  inStock: boolean;
  categoryName?: string;
}

export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  brand?: string;
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface Review {
  reviewId: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewRequest {
  rating: number;
  comment: string;
}

// ── Cart ─────────────────────────────────────────────────────
export interface CartItem {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
  sku: string;
  inStock: boolean;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  savedForLater: CartItem[];
  subtotal: number;
  itemCount: number;
  couponCode?: string;
  discountAmount?: number;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

// ── Orders ───────────────────────────────────────────────────
export type OrderStatus =
  | 'CREATED'
  | 'CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  orderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  orderId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalPrice: number;
  currency: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  couponCode?: string;
  cancelledReason?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface CheckoutRequest {
  idempotencyKey: string;
  shippingAddressId: string;
  paymentMethodId: string;
  couponCode?: string;
}

// ── Payments ─────────────────────────────────────────────────
export type PaymentStatus = 'INITIATED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failureMessage?: string;
  createdAt: string;
}

export interface ProcessPaymentRequest {
  orderId: string;
  paymentMethodId: string; // Stripe PaymentMethod token
}

// ── Search ───────────────────────────────────────────────────
export interface SearchResult {
  products: ProductSummary[];
  totalHits: number;
  suggestions?: string[];
}

// ── Admin / Reports ──────────────────────────────────────────
export interface SalesReport {
  from: string;
  to: string;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  newUsers: number;
  activeUsers: number;
  totalProducts: number;
  lowStockProducts: number;
}

export interface DiscountRequest {
  productId: string;
  discountPercent: number;
}

// ── Recommendations ──────────────────────────────────────────
export interface Recommendations {
  productIds: string[];
}
