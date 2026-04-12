import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Search } from 'lucide-react-native';
import { productApi } from '@/lib/api';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => productApi.search(submitted),
    enabled: !!submitted,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Search bar */}
      <View style={s.searchBar}>
        <Search size={18} color="#9ca3af" />
        <TextInput
          style={s.input}
          placeholder="Search products..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmitted(query)}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color="#3b82f6" />}

      {!submitted && !isLoading && (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🔍</Text>
          <Text style={s.emptyText}>Search for products</Text>
        </View>
      )}

      <FlatList
        numColumns={2}
        data={data?.content ?? []}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        ListEmptyComponent={submitted && !isLoading ? (
          <View style={s.empty}><Text style={s.emptyText}>No results for "{submitted}"</Text></View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/product/${item.productId}`)}>
            <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/200' }}
              style={s.img} contentFit="cover" />
            <View style={{ padding: 8, gap: 3 }}>
              <Text style={s.name} numberOfLines={2}>{item.name}</Text>
              <Text style={s.price}>${item.price.toFixed(2)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  input:      { flex: 1, fontSize: 15, color: '#111827' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText:  { fontSize: 15, color: '#6b7280' },
  card:       { flex: 1, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  img:        { width: '100%', height: 130 },
  name:       { fontSize: 13, fontWeight: '500', color: '#111827' },
  price:      { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
});
