import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { C } from '../(tabs)/sensor';
import { Theme } from '../utils/theme';

const T = C;
const { width, height } = Dimensions.get('window');

export function AppScreen({
  children,
  scroll,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const content = <View style={[styles.content, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.background} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={bg.orb1} />
        <View style={bg.orb2} />
        <View style={bg.orb3} />
      </View>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function IconButton({
  name,
  onPress,
  color = T.primary,
  style,
}: {
  name: string;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[styles.iconButton, style]}>
      <FontAwesome5 solid name={name} size={15} color={color} />
    </TouchableOpacity>
  );
}

export function PageHeader({
  title,
  eyebrow,
  onBack,
  right,
  showLogo = true,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showLogo?: boolean;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton name="arrow-left" onPress={onBack} />
      ) : showLogo ? (
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function SoftCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.search}>
      <FontAwesome5 solid name="search" size={14} color={T.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={T.textMuted}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

export function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  iconName,
  secureTextEntry,
  error,
  keyboardType,
  autoCapitalize,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  iconName?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  style?: StyleProp<ViewStyle>;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(!!secureTextEntry);

  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View
        style={[
          styles.appInputContainer,
          isFocused && { borderColor: T.primary, borderWidth: 1.5 },
          !!error && { borderColor: T.danger, borderWidth: 1.5 },
        ]}
      >
        {iconName ? (
          <FontAwesome5
            name={iconName}
            size={15}
            color={isFocused ? T.primary : T.textMuted}
            style={{ marginRight: 10 }}
            solid
          />
        ) : null}
        <TextInput
          style={styles.appInputText}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={T.textMuted}
          secureTextEntry={secureTextEntry ? isSecure : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)} style={{ padding: 4 }}>
            <FontAwesome5
              name={isSecure ? 'eye-slash' : 'eye'}
              size={15}
              color={T.textMuted}
              solid
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

export type CustomAlertProps = {
  visible: boolean;
  type?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function CustomAlertModal({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'Tamam',
  cancelText,
  onConfirm,
  onCancel,
}: CustomAlertProps) {
  if (!visible) return null;

  const iconName =
    type === 'success'
      ? 'check-circle'
      : type === 'danger'
      ? 'exclamation-circle'
      : type === 'warning'
      ? 'exclamation-triangle'
      : 'info-circle';

  const iconColor =
    type === 'success'
      ? T.success
      : type === 'danger'
      ? T.danger
      : type === 'warning'
      ? T.accent
      : T.primary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel || onConfirm}>
      <View style={styles.alertBackdrop}>
        <View style={styles.alertCard}>
          <View style={[styles.alertIconCircle, { backgroundColor: `${iconColor}15` }]}>
            <FontAwesome5 name={iconName} size={28} color={iconColor} solid />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          <View style={styles.alertBtnRow}>
            {cancelText ? (
              <TouchableOpacity
                style={[styles.alertBtn, styles.alertBtnCancel]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.alertBtnCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: iconColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.alertBtnConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionText,
  onAction,
}: {
  icon?: string;
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <SoftCard style={styles.emptyCard}>
      <View style={styles.emptyIconBox}>
        <FontAwesome5 name={icon} size={26} color={T.primary} solid />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {actionText && onAction ? (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.emptyBtnText}>{actionText}</Text>
        </TouchableOpacity>
      ) : null}
    </SoftCard>
  );
}

export function FocusSummaryStrip({
  todayMinutes = 0,
  streakDays = 0,
  coins = 0,
  onPressCoins,
}: {
  todayMinutes?: number;
  streakDays?: number;
  coins?: number;
  onPressCoins?: () => void;
}) {
  return (
    <View style={styles.summaryStrip}>
      <View style={styles.summaryItem}>
        <FontAwesome5 name="clock" size={15} color={T.primary} solid />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.summaryVal}>{todayMinutes} dk</Text>
          <Text style={styles.summarySub}>Bugün</Text>
        </View>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <FontAwesome5 name="fire" size={15} color={T.danger} solid />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.summaryVal}>{streakDays} Gün</Text>
          <Text style={styles.summarySub}>Seri</Text>
        </View>
      </View>
      <View style={styles.summaryDivider} />
      <TouchableOpacity style={styles.summaryItem} onPress={onPressCoins} activeOpacity={0.7}>
        <FontAwesome5 name="coins" size={15} color={T.accent} solid />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.summaryVal}>{coins}</Text>
          <Text style={styles.summarySub}>Coin</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export function DarkSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  scroll: { flexGrow: 1, paddingBottom: 100 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLogo: { width: 36, height: 36, borderRadius: 10 },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  eyebrow: { fontSize: 12, color: T.textMuted, fontWeight: '700', marginBottom: 2 },
  title: { fontSize: 20, fontWeight: '900', color: T.textDark, textAlign: 'center' },
  headerSpacer: { width: 42, height: 42 },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.soft,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    ...Theme.shadows.soft,
  },
  search: {
    height: 54,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Theme.shadows.soft,
  },
  searchInput: { flex: 1, color: T.textDark, fontSize: 15, fontWeight: '500' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: T.textDark, marginBottom: 6 },
  appInputContainer: {
    height: 50,
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appInputText: { flex: 1, color: T.textDark, fontSize: 14, fontWeight: '600' },
  inputErrorText: { color: T.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: T.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...Theme.shadows.medium,
  },
  alertIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertTitle: { fontSize: 18, fontWeight: '900', color: T.textDark, textAlign: 'center', marginBottom: 8 },
  alertMessage: { fontSize: 13, color: T.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  alertBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  alertBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBtnCancel: { backgroundColor: T.background, borderWidth: 1, borderColor: T.border },
  alertBtnCancelText: { color: T.textDark, fontWeight: '800', fontSize: 14 },
  alertBtnConfirmText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  emptyCard: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyIconBox: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: T.softIndigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: T.textDark, textAlign: 'center', marginBottom: 6 },
  emptyMessage: { fontSize: 13, fontWeight: '600', color: T.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { marginTop: 16, backgroundColor: T.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: T.border,
    marginBottom: 16,
    ...Theme.shadows.soft,
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center' },
  summaryVal: { fontSize: 14, fontWeight: '900', color: T.textDark },
  summarySub: { fontSize: 10, fontWeight: '700', color: T.textMuted },
  summaryDivider: { width: 1, height: 26, backgroundColor: T.border },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: T.border,
    ...Theme.shadows.medium,
  },
});

const bg = StyleSheet.create({
  orb1: {
    position: 'absolute',
    top: -height * 0.08,
    right: -width * 0.22,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: T.softIndigo,
    opacity: 0.75,
  },
  orb2: {
    position: 'absolute',
    bottom: -height * 0.06,
    left: -width * 0.28,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: T.lightAmber,
    opacity: 0.58,
  },
  orb3: {
    position: 'absolute',
    top: height * 0.37,
    right: width * 0.08,
    width: width * 0.32,
    height: width * 0.32,
    borderRadius: width * 0.16,
    backgroundColor: T.softInfo,
    opacity: 0.45,
  },
});

export default function Dummy() { return null; }

