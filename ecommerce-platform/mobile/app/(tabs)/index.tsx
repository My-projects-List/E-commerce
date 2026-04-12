import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { productApi } from '@/lib/api';

const CATEGORIES = [
  { id: 'electronics', name: 'Electronics', emoji: '📱' },
  { id: 'clothing',    name: 'Clothing',    emoji: '👕' },
  { id: 'home',        name: 'Home',        emoji: '🏡' },
  { id: 'sports',      name: 'Sports',      emoji: '⚽' },
  { id: 'books',       name: 'Books',       emoji: '📚' },
];

export default function HomeScreen() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => productApi.list({ sort: 'averageRating,desc', size: 12 }),
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={s.hero}>
        <Text style={s.heroTitle}>Welcome to ShopNow</Text>
        <Text style={s.heroSub}>Discover amazing products</Text>
        <Pressable style={s.heroBtn} onPress={() => router.push('/(tabs)/search')}>
          <Text style={s.heroBtnText}>Shop Now →</Text>
        </Pressable>
      </View>

      {/* Categories */}
      <Text style={s.sectionTitle}>Browse Categories</Text>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable style={s.catCard} onPress={() => router.push(`/(tabs)/search?categoryId=${item.id}`)}>
            <Text style={s.catEmoji}>{item.emoji}</Text>
            <Text style={s.catName}>{item.name}</Text>
          </Pressable>
        )}
      />

      {/* Featured */}
      <Text style={s.sectionTitle}>Top Rated</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#3b82f6" />
      ) : (
        <FlatList
          numColumns={2}
          scrollEnabled={false}
          data={data?.content ?? []}
          keyExtractor={(i) => i.productId}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <Pressable style={s.productCard} onPress={() => router.push(`/product/${item.productId}`)}>
              <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }}
                style={s.productImage} contentFit="cover" />
              <View style={s.productInfo}>
                <Text style={s.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.productRating}>⭐ {item.averageRating.toFixed(1)}</Text>
                <Text style={s.productPrice}>${item.price.toFixed(2)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  hero:         { margin: 16, borderRadius: 16, backgroundColor: '#3b82f6', padding: 20, gap: 8 },
  heroTitle:    { color: '#fff', fontSize: 22, fontWeight: '700' },
  heroSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  heroBtn:      { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 4 },
  heroBtnText:  { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  catCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', width: 80, borderWidth: 1, borderColor: '#e5e7eb' },
  catEmoji:     { fontSize: 24, marginBottom: 4 },
  catName:      { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  productCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  productImage: { width: '100%', height: 140 },
  productInfo:  { padding: 10, gap: 3 },
  productName:  { fontSize: 13, fontWeight: '500', color: '#111827' },
  productRating:{ fontSize: 12, color: '#6b7280' },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
});
