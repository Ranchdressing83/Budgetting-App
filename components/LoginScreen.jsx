import { useAuth } from '@/components/AuthContext';
import { COLORS } from '@/constants/colors';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const { signIn, signUp, configError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (configError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Firebase setup required</Text>
        <Text style={styles.configError}>{configError}</Text>
        <Text style={styles.helpText}>
          Copy `.env.example` to `.env`, add your Firebase web app config, then restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Personal Budget</Text>
        <Text style={styles.subtitle}>
          Sign in to sync your data across phone and laptop.
        </Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={COLORS.gray}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={COLORS.gray}
          secureTextEntry
          textContentType={isSignUp ? 'newPassword' : 'password'}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => {
            setIsSignUp((current) => !current);
            setError('');
          }}
        >
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Already have an account? Sign in' : 'First time here? Create account'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.pageBackground,
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.tileBackground,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 12,
    backgroundColor: COLORS.offWhite,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 4,
  },
  configError: {
    color: COLORS.error,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  helpText: {
    color: COLORS.darkGray,
    fontSize: 14,
    lineHeight: 20,
  },
});
