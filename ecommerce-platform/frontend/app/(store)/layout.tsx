import { Navbar } from '@/components/store/Navbar';
import { CartSidebar } from '@/components/store/CartSidebar';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CartSidebar />
      <main className="flex-1 container py-6">{children}</main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ShopNow. All rights reserved.
      </footer>
    </div>
  );
}
