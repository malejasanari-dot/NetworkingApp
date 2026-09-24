import { Platform } from 'react-native';

/**
 * Genera estilos de sombra compatibles con iOS, Android y React Native Web.
 * - iOS: usa shadowColor/Offset/Opacity/Radius
 * - Android: usa elevation
 * - Web: usa boxShadow (evita el deprecation warning de RN Web 0.19+)
 *
 * @param elevation  Profundidad visual de la sombra (controla elevation en Android y desplazamiento en Web/iOS)
 * @param opacity    Opacidad de la sombra (default 0.15)
 * @param radius     Radio de desenfoque (default 8)
 */
export const shadowStyle = (
  elevation = 4,
  opacity = 0.15,
  radius = 8,
) =>
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    web: {
      boxShadow: `0px ${elevation / 2}px ${radius}px rgba(0,0,0,${opacity})`,
    },
    default: {},
  }) as object;
