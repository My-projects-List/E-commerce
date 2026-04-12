'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Search, User, Heart, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore, useCartStore, useUIStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export function Navbar() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore();
  const { cart, openCart } = useCartStore();
  const { searchQuery, setSearchQuery } = useUIStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const cartCount = cart?.itemCount ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/products?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-primary shrink-0">
          ShopNow
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-lg border bg-muted pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link href="/products" className="px-3 py-2 rounded-md hover:bg-accent transition-colors">Products</Link>
          {isAdmin && (
            <Link href="/admin" className="px-3 py-2 rounded-md hover:bg-accent text-primary transition-colors">Admin</Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Wishlist */}
          {isAuthenticated && (
            <Link href="/profile/wishlist" className="p-2 rounded-md hover:bg-accent">
              <Heart className="h-5 w-5" />
            </Link>
          )}

          {/* Cart */}
          <button onClick={openCart} className="relative p-2 rounded-md hover:bg-accent">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* User menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-sm"
              >
                <User className="h-5 w-5" />
                <span className="hidden md:block">{user?.name?.split(' ')[0]}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover shadow-md py-1">
                  <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent">
                    <User className="h-4 w-4" /> My Profile
                  </Link>
                  <Link href="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent">
                    My Orders
                  </Link>
                  <hr className="my-1" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent text-destructive">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">
              <Search className="h-4 w-4" />
            </button>
          </form>
          <Link href="/products" className="block py-2 text-sm font-medium">Products</Link>
          {isAdmin && <Link href="/admin" className="block py-2 text-sm font-medium text-primary">Admin Panel</Link>}
          {isAuthenticated ? (
            <>
              <Link href="/profile" className="block py-2 text-sm">My Profile</Link>
              <Link href="/orders" className="block py-2 text-sm">My Orders</Link>
              <button onClick={handleLogout} className="block py-2 text-sm text-destructive">Log out</button>
            </>
          ) : (
            <Link href="/auth/login" className="block py-2 text-sm font-medium text-primary">Sign In</Link>
          )}
        </div>
      )}
    </header>
  );
}
