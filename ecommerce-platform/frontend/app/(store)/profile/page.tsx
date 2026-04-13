'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, MapPin, Heart, Package, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { userApi, productApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { Address } from '../../../../shared/types';

type Tab = 'profile' | 'addresses' | 'wishlist';

export default function ProfilePage() {
  const qc = useQueryClient();
  const { user, setProfile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState(user?.phoneNumber ?? '');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ fullName: '', street: '', city: '', state: '', zipCode: '', country: 'US' });

  const { data: profile }    = useQuery({ queryKey: ['profile'], queryFn: userApi.getProfile });
  const { data: addresses }  = useQuery({ queryKey: ['addresses'], queryFn: userApi.getAddresses, enabled: tab === 'addresses' });
  const { data: wishlistIds }= useQuery({ queryKey: ['wishlist'], queryFn: userApi.getWishlist, enabled: tab === 'wishlist' });
  const { data: wishlistProducts } = useQuery({
    queryKey: ['wishlist-products', wishlistIds],
    queryFn: () => productApi.batchFetch(wishlistIds!),
    enabled: !!wishlistIds?.length,
  });

  const updateProfile = useMutation({
    mutationFn: () => userApi.updateProfile({ name: editName, phoneNumber: editPhone }),
    onSuccess: (p) => { setProfile(p); toast.success('Profile updated!'); },
    onError: () => toast.error('Update failed'),
  });

  const addAddress = useMutation({
    mutationFn: () => userApi.addAddress(newAddr),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); setShowAddAddr(false); toast.success('Address added'); },
    onError: () => toast.error('Failed to add address'),
  });

  const deleteAddress = useMutation({
    mutationFn: (id: string) => userApi.deleteAddress(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
  });

  const removeFromWishlist = useMutation({
    mutationFn: (productId: string) => userApi.removeFromWishlist(productId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); qc.invalidateQueries({ queryKey: ['wishlist-products'] }); },
  });

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile',   label: 'Profile',    icon: User },
    { id: 'addresses', label: 'Addresses',  icon: MapPin },
    { id: 'wishlist',  label: 'Wishlist',   icon: Heart },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Account</h1>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border bg-card p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.name}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since {profile?.createdAt ? formatDate(profile.createdAt) : '—'}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <input className="w-full rounded-lg border bg-muted px-3 py-2 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <input className="w-full rounded-lg border bg-muted px-3 py-2 text-sm" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
          </div>
          <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <div className="border-t pt-4">
            <Link href="/orders" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Package className="h-4 w-4" /> View my orders
            </Link>
          </div>
        </div>
      )}

      {/* ── Addresses tab ── */}
      {tab === 'addresses' && (
        <div className="space-y-3">
          {(addresses ?? []).map((addr: Address) => (
            <div key={addr.addressId} className="rounded-xl border bg-card p-4 flex gap-4 items-start">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{addr.fullName} {addr.isDefault && <span className="text-xs text-primary font-medium ml-1">Default</span>}</p>
                <p className="text-sm text-muted-foreground">{addr.street}</p>
                <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} {addr.zipCode}, {addr.country}</p>
              </div>
              <div className="flex gap-2">
                {!addr.isDefault && (
                  <button onClick={() => userApi.setDefaultAddress(addr.addressId).then(() => qc.invalidateQueries({ queryKey: ['addresses'] }))}
                    className="text-xs text-primary hover:underline">Set default</button>
                )}
                <button onClick={() => deleteAddress.mutate(addr.addressId)} className="p-1.5 rounded hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {!showAddAddr ? (
            <button onClick={() => setShowAddAddr(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus className="h-4 w-4" /> Add new address
            </button>
          ) : (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold">New Address</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[['fullName','Full Name'],['street','Street'],['city','City'],['state','State'],['zipCode','ZIP Code'],['country','Country']].map(([k, l]) => (
                  <div key={k} className="space-y-1">
                    <label className="text-xs font-medium">{l}</label>
                    <input className="w-full rounded-lg border bg-muted px-3 py-2 text-sm"
                      value={(newAddr as any)[k]}
                      onChange={(e) => setNewAddr((a) => ({ ...a, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddAddr(false)} className="flex-1 rounded-lg border py-2 text-sm">Cancel</button>
                <button onClick={() => addAddress.mutate()} disabled={addAddress.isPending}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {addAddress.isPending ? 'Adding…' : 'Add Address'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Wishlist tab ── */}
      {tab === 'wishlist' && (
        <div>
          {!wishlistIds?.length ? (
            <div className="text-center py-16 space-y-3">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">Your wishlist is empty</p>
              <Link href="/products" className="text-primary text-sm underline">Browse products</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {(wishlistProducts ?? []).map((p) => (
                <div key={p.productId} className="rounded-xl border bg-card overflow-hidden relative">
                  <button onClick={() => removeFromWishlist.mutate(p.productId)}
                    className="absolute top-2 right-2 z-10 rounded-full bg-background/80 p-1.5 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Link href={`/products/${p.productId}`}>
                    <div className="aspect-square bg-muted" />
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-medium line-clamp-2">{p.name}</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{p.averageRating.toFixed(1)}</span>
                      </div>
                      <p className="font-bold">${p.price.toFixed(2)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
