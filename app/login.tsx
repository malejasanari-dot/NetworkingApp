import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useThemeColor } from '../hooks/use-theme-color';

const PRIVACY_POLICY_URL = 'https://crn.lhh.com/#/public/privacypolicypg/193';

export default function LoginScreen() {
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  const handleOpenPrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      toast.error('No se pudo abrir la Política de Privacidad.');
    }
  };

  const handleLogin = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error('Por favor ingresa tu correo y contraseña/cédula.');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Debes autorizar el tratamiento de tus datos personales para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await login(trimmedEmail, trimmedPassword);
      if (error) {
        toast.error('Correo o contraseña incorrectos.');
      }
    } catch {
      toast.error('Correo o contraseña incorrectos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Identity with LHH Logo */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/lhh-logo.png')}
              style={styles.lhhLogo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: primaryColor }]}>NetworkingApp 2.0</Text>
            <Text style={[styles.subtitle, { color: secondaryText }]}>
              Ingresa tus credenciales para acceder
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: cardColor, borderColor }]}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Correo electrónico</Text>
              <View style={[styles.inputWrapper, { borderColor }]}>
                <Ionicons name="mail-outline" size={20} color={secondaryText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={secondaryText}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Password / Cédula Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>Contraseña / Cédula</Text>
              <View style={[styles.inputWrapper, { borderColor }]}>
                <Ionicons name="lock-closed-outline" size={20} color={secondaryText} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  placeholder="Ingresa tu cédula"
                  placeholderTextColor={secondaryText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={secondaryText}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sección de Autorización de Tratamiento de Datos Personales */}
            <View style={[styles.termsContainer, { borderColor, backgroundColor: backgroundColor + '40' }]}>
              <Text style={[styles.termsTitle, { color: primaryColor }]}>
                Autorización para el tratamiento de datos personales
              </Text>

              <Text style={[styles.termsText, { color: secondaryText }]}>
                Al registrarte y utilizar esta aplicación, autorizas el tratamiento de los datos personales que suministres, incluyendo información de identificación, contacto, perfil profesional y la información que decidas registrar dentro de la plataforma.
              </Text>

              <Text style={[styles.termsText, { color: secondaryText }]}>
                Los datos serán tratados para permitir el funcionamiento de la aplicación, administrar tu cuenta, gestionar tus contactos y empresas, generar recordatorios y proporcionar las funcionalidades que hayas solicitado.
              </Text>

              <Text style={[styles.termsText, { color: secondaryText }]}>
                Puedes consultar nuestra Política de Privacidad y conocer los derechos que te corresponden como titular de los datos, así como los mecanismos disponibles para ejercerlos.
              </Text>

              {/* Botón Ver Política de Privacidad */}
              <TouchableOpacity
                style={[styles.policyButton, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '0A' }]}
                onPress={handleOpenPrivacyPolicy}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={16} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={[styles.policyButtonText, { color: primaryColor }]}>
                  Ver Política de Privacidad
                </Text>
              </TouchableOpacity>

              {/* Checkbox de Autorización */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={acceptedTerms ? primaryColor : secondaryText}
                  style={styles.checkboxIcon}
                />
                <Text style={[styles.checkboxLabel, { color: textColor }]}>
                  Autorizo el tratamiento de mis datos personales
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: primaryColor },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  lhhLogo: {
    width: 165,
    height: 75,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  termsContainer: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  policyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  policyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkboxIcon: {
    marginRight: 10,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
