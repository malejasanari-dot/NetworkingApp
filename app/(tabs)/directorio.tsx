import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ControlledInput } from '../../components/ui/controlled-input';
import { DirectoryCandidateCard } from '../../components/DirectoryCandidateCard';
import {
  fetchDirectory,
  cacheCandidate,
  CandidateDirectoryItem,
  DirectoryPagination,
  DirectoryApiError,
  DirectoryNetworkError,
  DirectoryAuthError,
  DirectoryRateLimitError,
} from '../../services/directoryApi';
import { useThemeColor } from '../../hooks/use-theme-color';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { shadowStyle } from '../../utils/shadow';

const PAGE_LIMIT = 30; // Máximo permitido: 50 por solicitud (cumple estricta regla <= 50)
const DEBOUNCE_DELAY_MS = 350; // Debounce de aproximadamente 350 ms

export default function DirectorioScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accent2 = useThemeColor({}, 'accent2');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Directorio LHH',
    });
  }, [navigation]);

  // Estados de datos y paginación
  const [candidates, setCandidates] = useState<CandidateDirectoryItem[]>([]);
  const [pagination, setPagination] = useState<DirectoryPagination | null>(null);

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para el aviso de conexión real exitosa (D07.1)
  const [showConnectionSuccess, setShowConnectionSuccess] = useState<boolean>(false);
  const hasShownConnectionSuccessRef = useRef<boolean>(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estados de búsqueda
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  // Limpieza de temporizador de auto-cierre al desmontar
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Contador secuencial para prevención estricta de resultados obsoletos (race conditions)
  const latestRequestIdRef = useRef<number>(0);

  // Debounce de ~350ms para el término de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Carga los candidatos del directorio mediante services/directoryApi.ts.
   * Maneja paginación, filtros de búsqueda y descarta resultados de solicitudes obsoletas.
   */
  const loadDirectoryData = useCallback(
    async (pageToLoad: number, isLoadMore = false, isRefresh = false) => {
      const requestId = ++latestRequestIdRef.current;

      if (isLoadMore) {
        setIsFetchingMore(true);
      } else if (isRefresh) {
        setIsRefreshing(true);
        setErrorMessage(null);
      } else {
        setIsLoading(true);
        setErrorMessage(null);
      }

      try {
        const response = await fetchDirectory({
          page: pageToLoad,
          limit: PAGE_LIMIT,
          search: debouncedQuery.trim() || undefined,
        });

        // Prevención de resultados obsoletos: descartar si una solicitud posterior ya inició
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        if (isLoadMore) {
          setCandidates((prev) => [...prev, ...response.data]);
        } else {
          setCandidates(response.data);
        }
        setPagination(response.pagination);
        setErrorMessage(null);

        // Aviso de conexión exitosa: únicamente tras respuesta real exitosa y procesada
        if (!hasShownConnectionSuccessRef.current) {
          hasShownConnectionSuccessRef.current = true;
          setShowConnectionSuccess(true);
          if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
          }
          dismissTimerRef.current = setTimeout(() => {
            setShowConnectionSuccess(false);
          }, 5000);
        }
      } catch (err: any) {
        // Descartar error si pertenece a una solicitud previa
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        // Si la solicitud falla, no mostrar el aviso de éxito
        setShowConnectionSuccess(false);
        hasShownConnectionSuccessRef.current = false;
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }

        let userFriendlyError = 'No se pudo conectar con el servidor del Directorio LHH.';

        if (err instanceof DirectoryAuthError) {
          userFriendlyError = 'Sesión expirada o no autorizada. Por favor inicie sesión nuevamente.';
        } else if (err instanceof DirectoryRateLimitError) {
          userFriendlyError = 'Límite de solicitudes alcanzado. Por favor espere un momento e intente de nuevo.';
        } else if (err instanceof DirectoryNetworkError) {
          userFriendlyError =
            'No se pudo conectar con el servicio del directorio. Verifique su conexión de red o que el servidor local esté activo.';
        } else if (err instanceof DirectoryApiError && err.message) {
          userFriendlyError = err.message;
        } else if (err?.message) {
          userFriendlyError = err.message;
        }

        setErrorMessage(userFriendlyError);

        // Si falló una recarga o primera carga, vaciar candidatos para mostrar estado de error
        if (!isLoadMore) {
          setCandidates([]);
          setPagination(null);
        }
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsFetchingMore(false);
        }
      }
    },
    [debouncedQuery]
  );

  // Disparar carga cuando cambia la búsqueda debounced
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDirectoryData(1, false, false);
  }, [debouncedQuery, loadDirectoryData]);

  // Manejador de pull-to-refresh
  const handleRefresh = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    loadDirectoryData(1, false, true);
  }, [loadDirectoryData]);

  // Manejador de paginación / cargar más
  const handleLoadMore = useCallback(() => {
    if (isLoading || isFetchingMore || isRefreshing) return;
    if (!pagination || !pagination.hasNextPage) return;

    loadDirectoryData(pagination.page + 1, true, false);
  }, [isLoading, isFetchingMore, isRefreshing, pagination, loadDirectoryData]);

  // Limpiar campo de búsqueda de inmediato
  const handleClearSearch = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSearchQuery('');
    setDebouncedQuery('');
    Keyboard.dismiss();
  };

  // Reintentar en caso de fallo
  const handleRetry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    loadDirectoryData(1, false, false);
  };

  const handleCandidatePress = useCallback(
    (candidate: CandidateDirectoryItem) => {
      cacheCandidate(candidate);
      router.push({
        pathname: '/directorio/[id]',
        params: { id: candidate.idSistema },
      });
    },
    [router]
  );

  const renderCandidateItem = useCallback(
    ({ item }: { item: CandidateDirectoryItem }) => (
      <DirectoryCandidateCard
        candidate={item}
        onPress={() => handleCandidatePress(item)}
      />
    ),
    [handleCandidatePress]
  );

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={[styles.footerText, { color: secondaryText }]}>
            Cargando más candidatos...
          </Text>
        </View>
      );
    }

    if (pagination && !pagination.hasNextPage && candidates.length > 0) {
      return (
        <View style={styles.footerFinished}>
          <Text style={[styles.footerFinishedText, { color: secondaryText }]}>
            Fin del directorio · {pagination.total} candidatos
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Sección Superior: Buscador y Contador */}
      <View style={[styles.searchSection, { backgroundColor, borderBottomColor: borderColor }]}>
        <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
          <Ionicons name="search" size={18} color={secondaryText} style={styles.searchIcon} />
          <ControlledInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Buscar por nombre, empresa o cargo..."
            placeholderTextColor={secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectTextOnFocus={false}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar candidatos por nombre, empresa o cargo"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons name="close-circle" size={18} color={secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Aviso de conexión exitosa (D07.1) */}
        {showConnectionSuccess && (
          <View
            style={[
              styles.connectionBanner,
              {
                backgroundColor: isDark ? 'rgba(46, 125, 50, 0.18)' : 'rgba(46, 125, 50, 0.08)',
                borderColor: isDark ? 'rgba(76, 175, 80, 0.40)' : 'rgba(46, 125, 50, 0.25)',
              },
            ]}
          >
            <View style={styles.connectionBannerLeft}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={isDark ? '#81C784' : '#2E7D32'}
                style={styles.connectionIcon}
              />
              <Text
                style={[
                  styles.connectionBannerText,
                  { color: isDark ? '#A5D6A7' : '#1B5E20' },
                ]}
              >
                Conexión con el directorio exitosa
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowConnectionSuccess(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar aviso de conexión"
              style={styles.connectionCloseButton}
            >
              <Ionicons name="close" size={15} color={isDark ? '#81C784' : '#2E7D32'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Barra de estado / total de resultados */}
        <View style={styles.statusRow}>
          {pagination !== null && !isLoading && !errorMessage ? (
            <Text style={[styles.statusText, { color: secondaryText }]}>
              {pagination.total === 1
                ? '1 candidato encontrado'
                : `${pagination.total} candidatos encontrados`}
              {debouncedQuery.trim().length > 0 ? ` para «${debouncedQuery.trim()}»` : ''}
            </Text>
          ) : (
            <Text style={[styles.statusText, { color: secondaryText }]}>
              Directorio oficial LHH
            </Text>
          )}

          {isLoading && !isRefreshing && (
            <View style={styles.miniLoadingRow}>
              <ActivityIndicator size="small" color={primaryColor} />
            </View>
          )}
        </View>
      </View>

      {/* Contenido Principal con manejo de estados */}
      {isLoading && candidates.length === 0 ? (
        // Estado 1: Carga Inicial
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingTitle, { color: primaryColor }]}>
            Consultando Directorio LHH
          </Text>
          <Text style={[styles.loadingSubtitle, { color: secondaryText }]}>
            Buscando candidatos autorizados...
          </Text>
        </View>
      ) : errorMessage && candidates.length === 0 ? (
        // Estado 2: Error con Opción de Reintentar
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.errorIconContainer,
              { backgroundColor: isDark ? 'rgba(255, 88, 108, 0.15)' : 'rgba(234, 30, 128, 0.1)' },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={48} color={accent2} />
          </View>
          <Text style={[styles.errorTitle, { color: textColor }]}>
            No se pudo conectar con el Directorio
          </Text>
          <Text style={[styles.errorDescription, { color: secondaryText }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={handleRetry}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Reintentar consultar el directorio"
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : candidates.length === 0 ? (
        // Estado 3: Resultados Vacíos
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(79, 24, 90, 0.06)' },
            ]}
          >
            <Ionicons name="search-outline" size={46} color={primaryColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            No se encontraron candidatos
          </Text>
          <Text style={[styles.emptySubtitle, { color: secondaryText }]}>
            {debouncedQuery.trim().length > 0
              ? `No hay candidatos que coincidan con «${debouncedQuery.trim()}». Intenta con otro nombre, empresa o cargo.`
              : 'No hay candidatos disponibles en el directorio en este momento.'}
          </Text>
          {debouncedQuery.trim().length > 0 && (
            <TouchableOpacity
              style={[styles.clearSearchActionButton, { borderColor: primaryColor }]}
              onPress={handleClearSearch}
              activeOpacity={0.8}
            >
              <Text style={[styles.clearSearchActionText, { color: primaryColor }]}>
                Limpiar búsqueda
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Estado 4: Lista Paginada de Candidatos
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.idSistema}
          renderItem={renderCandidateItem}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={15}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[primaryColor]}
              tintColor={primaryColor}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    ...shadowStyle(1, 0.03, 2),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
    minHeight: 18,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  miniLoadingRow: {
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 520,
    alignSelf: 'center',
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    ...shadowStyle(2, 0.1, 4),
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 18,
  },
  clearSearchActionButton: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearSearchActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
  },
  footerFinished: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  footerFinishedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    ...shadowStyle(1, 0.02, 2),
  },
  connectionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  connectionIcon: {
    marginRight: 8,
  },
  connectionBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  connectionCloseButton: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
