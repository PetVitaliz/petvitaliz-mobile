import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import PrivateBottomNav from '../../components/PrivateBottomNav';
import PrivateHeader from '../../components/PrivateHeader';
import Toast from '../../components/Toast';
import { theme } from '../../theme/privateTheme';
import { IconMC } from '../../components/AppIcon';

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  holder: string;
  holderCpf?: string; // CPF do titular, 000.000.000-00
  expiry: string; // MM/AA
  isMain: boolean;
};

interface PrivatePaymentMethodsScreenProps {
  onBack?: () => void;
  onNavigateToHome?: () => void;
  onNavigateToExplore?: () => void;
  onNavigateToPlans?: () => void;
  onNavigateToBenefits?: () => void;
  onNavigateToProfile?: () => void;
  cards: SavedCard[];
  onCardsChange: (cards: SavedCard[]) => void;
  hasActivePlan: boolean; // regra N9
  userName?: string; // nome do cadastro da conta, usado para preencher o "Nome no cartão"
  userCpf?: string; // CPF do cadastro da conta, usado para preencher o "CPF do titular"
}

// Nome como sai impresso no cartão: maiúsculo e sem acento ("José Araújo" -> "JOSE ARAUJO")
const toCardName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

const maskCpf = (text: string) => {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

// Confere os dígitos verificadores do CPF
const isCpfValid = (value: string) => {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
};

const C = theme.colors;
const F = theme.fonts;

const detectBrand = (digits: string) => {
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(digits)) return 'Elo';
  return 'Cartão';
};

const maskCard = (text: string) =>
  text
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

const maskExpiry = (text: string) => {
  const d = text.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};

const isExpiryValid = (value: string) => {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
};

export default function PrivatePaymentMethodsScreen({
  onBack,
  onNavigateToHome,
  onNavigateToPlans,
  onNavigateToBenefits,
  onNavigateToProfile,
  cards,
  onCardsChange,
  hasActivePlan,
  userName = '',
  userCpf = '',
}: PrivatePaymentMethodsScreenProps) {
  const accountHolder = toCardName(userName);
  const accountCpf = maskCpf(userCpf);
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [menuCard, setMenuCard] = useState<SavedCard | null>(null);
  const [deleteCard, setDeleteCard] = useState<SavedCard | null>(null);
  const [toast, setToast] = useState('');

  // Formulário
  const [number, setNumber] = useState('');
  const [holder, setHolder] = useState(accountHolder);
  const [holderCpf, setHolderCpf] = useState(accountCpf);
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [makeMain, setMakeMain] = useState(cards.length === 0);

  const mainCard = cards.find((card) => card.isMain) ?? cards[0] ?? null;
  const otherCards = cards.filter((card) => card.id !== mainCard?.id);

  const resetForm = () => {
    setNumber('');
    setHolder(accountHolder);
    setHolderCpf(accountCpf);
    setExpiry('');
    setCvv('');
    setMakeMain(cards.length === 0);
  };

  const addCard = () => {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13) {
      Alert.alert('Número incompleto', 'Confira o número do cartão.');
      return;
    }
    if (!holder.trim()) {
      Alert.alert('Nome obrigatório', 'Digite o nome como está no cartão.');
      return;
    }
    if (!isCpfValid(holderCpf)) {
      Alert.alert('CPF inválido', 'Confira o CPF do titular do cartão.');
      return;
    }
    if (!isExpiryValid(expiry)) {
      Alert.alert('Validade inválida', 'Use o formato MM/AA e uma data futura.');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert('CVV incompleto', 'Digite os 3 ou 4 números do verso.');
      return;
    }
    const isMain = makeMain || cards.length === 0;
    const newCard: SavedCard = {
      id: `card-${Date.now()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
      holder: holder.trim().toUpperCase(),
      holderCpf,
      expiry,
      isMain,
    };
    onCardsChange([...cards.map((card) => (isMain ? { ...card, isMain: false } : card)), newCard]);
    resetForm();
    setMode('list');
    setToast('Cartão adicionado');
  };

  const setAsMain = (card: SavedCard) => {
    onCardsChange(cards.map((item) => ({ ...item, isMain: item.id === card.id })));
    setMenuCard(null);
    setToast(`${card.brand} final ${card.last4} agora é o principal`);
  };

  // Regra N9: sempre existe um cartão principal e o único não sai com plano ativo.
  const requestDelete = (card: SavedCard) => {
    setMenuCard(null);
    if (cards.length === 1 && hasActivePlan) {
      Alert.alert(
        'Não é possível excluir',
        'Este é o único cartão e você tem um plano ativo. Adicione outro cartão antes de excluir este.',
      );
      return;
    }
    setDeleteCard(card);
  };

  const confirmDelete = () => {
    if (!deleteCard) return;
    const remaining = cards.filter((card) => card.id !== deleteCard.id);
    if (deleteCard.isMain && remaining.length > 0) remaining[0] = { ...remaining[0], isMain: true };
    onCardsChange(remaining);
    setDeleteCard(null);
    setToast('Cartão excluído');
  };

  const previewDigits = number.replace(/\D/g, '');

  return (
    <SafeAreaView style={styles.container}>
      <PrivateHeader
        title={mode === 'add' ? 'Adicionar cartão' : 'Formas de pagamento'}
        onBack={() => {
          if (mode === 'add') {
            resetForm();
            setMode('list');
          } else {
            onBack?.();
          }
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {mode === 'list' && (
            <>
              {mainCard ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setMenuCard(mainCard)}>
                  <CardVisual card={mainCard} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.listCard, styles.emptyCard]}>
                  <View style={styles.emptyIcon}>
                    <Feather name="credit-card" size={24} color={C.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhum cartão salvo</Text>
                  <Text style={styles.emptyText}>Adicione um cartão para pagar seus planos.</Text>
                </View>
              )}

              {otherCards.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Outros cartões</Text>
                  <View style={styles.listCard}>
                    {otherCards.map((card, index) => (
                      <TouchableOpacity
                        key={card.id}
                        style={[styles.row, index < otherCards.length - 1 && styles.divider]}
                        onPress={() => setMenuCard(card)}
                        activeOpacity={0.75}
                      >
                        <Feather name="credit-card" size={18} color={C.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>
                            {card.brand} •••• {card.last4}
                          </Text>
                          <Text style={styles.rowNote}>Validade {card.expiry}</Text>
                        </View>
                        <Feather name="more-vertical" size={18} color={C.muted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.addCard} onPress={() => { resetForm(); setMode('add'); }} activeOpacity={0.8}>
                <Feather name="plus" size={17} color={C.primary} />
                <Text style={styles.addText}>Adicionar cartão</Text>
              </TouchableOpacity>

              <View style={styles.note}>
                <Feather name="info" size={14} color={C.muted} />
                <Text style={styles.noteText}>
                  O cartão principal é usado nas próximas cobranças. O único cartão não pode ser excluído enquanto houver plano ativo.
                </Text>
              </View>
            </>
          )}

          {mode === 'add' && (
            <>
              <CardVisual
                card={{
                  id: 'preview',
                  brand: previewDigits ? detectBrand(previewDigits) : 'Cartão',
                  last4: previewDigits.slice(-4).padStart(4, '•'),
                  holder: holder.trim().toUpperCase() || 'NOME NO CARTÃO',
                  expiry: expiry || 'MM/AA',
                  isMain: makeMain,
                }}
              />

              <View style={[styles.listCard, styles.form]}>
                <Text style={styles.label}>Número do cartão</Text>
                <TextInput
                  style={styles.input}
                  value={number}
                  onChangeText={(text) => setNumber(maskCard(text))}
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor="#9AA6B8"
                  keyboardType="number-pad"
                  maxLength={19}
                />
                <Text style={styles.label}>Nome no cartão</Text>
                <TextInput
                  style={styles.input}
                  value={holder}
                  onChangeText={setHolder}
                  placeholder="Como está impresso"
                  placeholderTextColor="#9AA6B8"
                  autoCapitalize="characters"
                />
                <Text style={styles.label}>CPF do titular</Text>
                <TextInput
                  style={styles.input}
                  value={holderCpf}
                  onChangeText={(text) => setHolderCpf(maskCpf(text))}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#9AA6B8"
                  keyboardType="number-pad"
                  maxLength={14}
                />
                {((!!accountHolder && holder === accountHolder) || (!!accountCpf && holderCpf === accountCpf)) && (
                  <Text style={styles.prefillHint}>
                    Nome e CPF vieram do cadastro da sua conta. Se o cartão for de outra pessoa, troque pelos dados do titular.
                  </Text>
                )}
                <View style={styles.twoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Validade</Text>
                    <TextInput
                      style={styles.input}
                      value={expiry}
                      onChangeText={(text) => setExpiry(maskExpiry(text))}
                      placeholder="MM/AA"
                      placeholderTextColor="#9AA6B8"
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      value={cvv}
                      onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor="#9AA6B8"
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={4}
                    />
                  </View>
                </View>
                {cards.length > 0 && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Usar como cartão principal</Text>
                    <Switch
                      value={makeMain}
                      onValueChange={setMakeMain}
                      trackColor={{ false: '#CBD5E1', true: C.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={addCard} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Adicionar cartão</Text>
              </TouchableOpacity>
              <View style={styles.secureRow}>
                <Feather name="lock" size={12} color={C.muted} />
                <Text style={styles.secureText}>Guardamos só os 4 últimos números do cartão.</Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Menu do cartão */}
      <Modal visible={!!menuCard} transparent animationType="slide" onRequestClose={() => setMenuCard(null)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setMenuCard(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {menuCard?.brand} •••• {menuCard?.last4}
            </Text>
            {!menuCard?.isMain && (
              <TouchableOpacity style={styles.sheetRow} onPress={() => menuCard && setAsMain(menuCard)}>
                <Feather name="star" size={18} color={C.primary} />
                <Text style={styles.sheetRowText}>Tornar principal</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sheetRow} onPress={() => menuCard && requestDelete(menuCard)}>
              <Feather name="trash-2" size={18} color={C.danger} />
              <Text style={[styles.sheetRowText, { color: C.danger }]}>Excluir cartão</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Confirmar exclusão (E1) */}
      <Modal visible={!!deleteCard} transparent animationType="fade" onRequestClose={() => setDeleteCard(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Feather name="trash-2" size={22} color={C.danger} />
            </View>
            <Text style={styles.dialogTitle}>Excluir este cartão?</Text>
            <Text style={styles.dialogText}>
              {deleteCard?.brand} •••• {deleteCard?.last4} · validade {deleteCard?.expiry}
            </Text>
            <TouchableOpacity style={styles.dangerButton} onPress={confirmDelete}>
              <Text style={styles.dangerButtonText}>Excluir cartão</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textButton} onPress={() => setDeleteCard(null)}>
              <Text style={styles.linkText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast message={toast} onHide={() => setToast('')} />

      {mode === 'list' && (
        <PrivateBottomNav
          currentRoute="PrivateProfile"
          onNavigateToHome={onNavigateToHome}
          onNavigateToPlans={onNavigateToPlans}
          onNavigateToBenefits={onNavigateToBenefits}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}
    </SafeAreaView>
  );
}

// Desenho do cartão no azul da marca.
function CardVisual({ card }: { card: SavedCard }) {
  return (
    <View style={styles.cardVisual}>
      <View style={styles.cardCircle} />
      <View style={styles.cardTop}>
        <Text style={styles.cardBrand}>{card.brand.toUpperCase()}</Text>
        {card.isMain && (
          <View style={styles.mainBadge}>
            <Text style={styles.mainBadgeText}>Principal</Text>
          </View>
        )}
      </View>
      <IconMC name="integrated-circuit-chip" size={30} color={C.brandYellow} style={{ marginTop: 10 }} />
      <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.cardHolder} numberOfLines={1}>{card.holder}</Text>
        <Text style={styles.cardExpiry}>{card.expiry}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scrollContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 130 },
  sectionTitle: { fontSize: 15, fontFamily: F.bold, color: C.navy, marginTop: 20, marginBottom: 9 },

  cardVisual: { backgroundColor: C.primary, borderRadius: 18, padding: 16, overflow: 'hidden', minHeight: 170 },
  cardCircle: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#2148AA',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { fontSize: 15, fontFamily: F.bold, color: '#FFFFFF', letterSpacing: 1 },
  mainBadge: { backgroundColor: C.brandYellow, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 2 },
  mainBadgeText: { fontSize: 10, fontFamily: F.bold, color: C.navy },
  cardNumber: { fontSize: 18, fontFamily: F.semibold, color: '#FFFFFF', letterSpacing: 2, marginTop: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  cardHolder: { flex: 1, fontSize: 12, fontFamily: F.medium, color: '#C9D6EE' },
  cardExpiry: { fontSize: 12, fontFamily: F.medium, color: '#C9D6EE' },

  listCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  divider: { borderBottomWidth: 1, borderBottomColor: C.divider },
  rowTitle: { fontSize: 14, fontFamily: F.bold, color: C.navy },
  rowNote: { fontSize: 11, fontFamily: F.regular, color: C.muted, marginTop: 1 },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontFamily: F.bold, color: C.navy, marginTop: 10 },
  emptyText: { fontSize: 12, fontFamily: F.regular, color: C.muted, marginTop: 4, textAlign: 'center' },

  addCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9D3E3',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  addText: { fontSize: 14, fontFamily: F.bold, color: C.primary },
  note: { flexDirection: 'row', gap: 7, marginTop: 14 },
  noteText: { flex: 1, fontSize: 11, fontFamily: F.regular, color: C.muted, lineHeight: 16 },

  form: { paddingVertical: 14, marginTop: 14 },
  label: { fontSize: 13, fontFamily: F.bold, color: C.navy, marginBottom: 7 },
  prefillHint: { fontSize: 11, fontFamily: F.regular, color: C.muted, marginTop: -8, marginBottom: 12 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: F.medium,
    color: C.navy,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  twoCols: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchText: { fontSize: 13, fontFamily: F.semibold, color: C.navy },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  secureText: { fontSize: 11, fontFamily: F.regular, color: C.muted },

  primaryButton: {
    minHeight: 48,
    borderRadius: theme.radius.button,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: F.bold },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D5DCE7', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontFamily: F.bold, color: C.navy, marginBottom: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  sheetRowText: { fontSize: 14, fontFamily: F.semibold, color: C.navy },

  dialogOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignSelf: 'stretch', alignItems: 'center' },
  dialogIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center' },
  dialogTitle: { fontSize: 17, fontFamily: F.bold, color: C.navy, marginTop: 12 },
  dialogText: { fontSize: 13, fontFamily: F.regular, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
  dangerButton: {
    alignSelf: 'stretch',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  dangerButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: F.bold },
  textButton: { alignItems: 'center', paddingVertical: 12 },
  linkText: { fontSize: 14, fontFamily: F.bold, color: C.primary },
});