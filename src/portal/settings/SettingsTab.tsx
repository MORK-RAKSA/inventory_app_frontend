import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { KeyRound, Shield, Trash2, User, UserPlus, Usb, Check, RefreshCw, Tag, Package, Plus, X, Sparkles, SlidersHorizontal } from 'lucide-react-native';
import { AppUser } from '../../api';
import { describeRateSource } from '../../exchangeRate';
import { khr } from '../../theme';
import { Press } from '../../motion';
import { P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';

export function SettingsTab({ portal }: { portal: PortalController }) {
  const {
    addConfiguredBaseUnit,
    addConfiguredCategory,
    configuredBaseUnits,
    configuredCategories,
    createUserAction,
    deleteUserAction,
    rateInput,
    removeConfiguredBaseUnit,
    removeConfiguredCategory,
    resetPasswordAction,
    saveExchangeRate,
    savingRate,
    setRateInput,
    currencyMode,
    fetchingLiveRate,
    liveRateQuote,
    fetchLiveExchangeRate,
    toggleCurrencyMode,
    tr,
    usersList,
  } = portal;

  // Master Data Inputs
  const [newBaseUnitText, setNewBaseUnitText] = useState('');
  const [newCategoryText, setNewCategoryText] = useState('');

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [newPassword, setNewPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Forgot / Reset password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  async function handleCreateUser() {
    if (!newUsername.trim() || !newPassword) return;
    setCreatingUser(true);
    const ok = await createUserAction({
      username: newUsername.trim(),
      fullName: newFullName.trim() || newUsername.trim(),
      email: newEmail.trim() || `${newUsername.trim()}@retailflow.local`,
      role: newRole,
      password: newPassword,
    });
    setCreatingUser(false);
    if (ok) {
      setNewUsername('');
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddUser(false);
    }
  }

  async function handleResetPassword() {
    if (!targetResetUser.trim() || !newResetPassword.trim()) return;
    setResettingPassword(true);
    const ok = await resetPasswordAction(targetResetUser.trim(), newResetPassword.trim(), recoveryKey.trim());
    setResettingPassword(false);
    if (ok) {
      setTargetResetUser('');
      setNewResetPassword('');
      setRecoveryKey('');
      setShowResetModal(false);
    }
  }

  return (
    <View style={{ maxWidth: 840, gap: 20 }}>
      {/* 1. Exchange Rate Configuration */}
      {/* 1. Exchange Rate Configuration with Live / Static Toggle */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View>
            <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
              {tr('Exchange Rate (USD to KHR ៛)', 'អត្រាប្តូរប្រាក់ (ដុល្លារ ទៅ រៀល)')}
            </Text>
            <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 3 }}>
              {tr('Primary store currency is KHR. USD prices are derived based on this rate.', 'រូបិយប័ណ្ណគោលគឺរៀល (KHR) ហើយតម្លៃដុល្លារគិតតាមអត្រានេះ។')}
            </Text>
          </View>
        </View>

        {/* Currency Mode Selector Toggle: Live/AI Currency vs Static Currency */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, backgroundColor: P.surfaceAlt, padding: 4, borderRadius: 12 }}>
          <Press
            onPress={() => void toggleCurrencyMode('live')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: currencyMode === 'live' ? P.primary : 'transparent',
            }}
          >
            <Sparkles size={15} color={currencyMode === 'live' ? '#FFFFFF' : P.textSub} />
            <Text
              style={{
                color: currencyMode === 'live' ? '#FFFFFF' : P.textSub,
                fontSize: 13,
                fontWeight: '800',
              }}
            >
              {tr('AI / Live Market Currency', 'អត្រាទីផ្សារផ្ទាល់ (AI / Live)')}
            </Text>
          </Press>

          <Press
            onPress={() => void toggleCurrencyMode('manual')}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: currencyMode === 'manual' ? P.primary : 'transparent',
            }}
          >
            <SlidersHorizontal size={15} color={currencyMode === 'manual' ? '#FFFFFF' : P.textSub} />
            <Text
              style={{
                color: currencyMode === 'manual' ? '#FFFFFF' : P.textSub,
                fontSize: 13,
                fontWeight: '800',
              }}
            >
              {tr('Static / Custom Currency', 'អត្រាកំណត់ដោយខ្លួនឯង')}
            </Text>
          </Press>
        </View>

        {currencyMode === 'live' ? (
          <View
            style={{
              backgroundColor: P.primaryLight,
              borderWidth: 1,
              borderColor: P.border,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                <Text style={{ color: P.primary, fontSize: 12, fontWeight: '800' }}>
                  {tr('LIVE MARKET RATE ACTIVE', 'កំពុងប្រើអត្រាទីផ្សារបច្ចុប្បន្ន')}
                </Text>
              </View>
              <Text style={{ color: P.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                1 USD = {khr(Number(rateInput))}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: liveRateQuote?.isFallback ? P.amber : P.emerald,
                  }}
                />
                <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700' }}>
                  {tr('Source', 'ប្រភព')}: {liveRateQuote?.sourceName || tr('National Bank of Cambodia', 'ធនាគារជាតិនៃកម្ពុជា')}
                </Text>
                {liveRateQuote?.asOf ? (
                  <Text style={{ color: P.muted, fontSize: 11.5 }}>· {liveRateQuote.asOf}</Text>
                ) : null}
              </View>
              <Text style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
                {liveRateQuote
                  ? describeRateSource(liveRateQuote)
                  : tr(
                      'Official reference rate · data.mef.gov.kh',
                      'អត្រាផ្លូវការ · data.mef.gov.kh'
                    )}
                {liveRateQuote?.isFallback
                  ? tr(
                      ' — NBC feed unreachable, using market fallback',
                      ' — មិនអាចភ្ជាប់ NBC បានទេ កំពុងប្រើអត្រាទីផ្សារបម្រុង'
                    )
                  : ''}
              </Text>
            </View>

            <Press
              disabled={fetchingLiveRate}
              onPress={() => void fetchLiveExchangeRate()}
              style={{
                backgroundColor: P.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {fetchingLiveRate ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <RefreshCw size={14} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                    {tr('Sync Now', 'ទាញអត្រាថ្មី')}
                  </Text>
                </>
              )}
            </Press>
          </View>
        ) : (
          <View>
            <Text style={{ color: P.textSub, fontSize: 11.5, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' }}>
              1 USD = ? KHR (៛)
            </Text>
            <TextInput
              value={rateInput}
              onChangeText={setRateInput}
              keyboardType="numeric"
              style={{
                borderWidth: 1.5,
                borderColor: P.borderStrong,
                borderRadius: 10,
                paddingHorizontal: 14,
                height: 46,
                fontSize: 17,
                fontWeight: '800',
                color: P.text,
                backgroundColor: P.surfaceAlt,
              }}
            />

            {/* Quick Presets */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 16 }}>
              {[4000, 4100, 4200].map((preset) => (
                <Press
                  key={preset}
                  onPress={() => setRateInput(String(preset))}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: Number(rateInput) === preset ? P.primaryLight : P.surfaceAlt,
                    borderWidth: 1,
                    borderColor: Number(rateInput) === preset ? P.primary : P.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: P.text, fontWeight: '800', fontSize: 13 }}>
                    {khr(preset)}
                  </Text>
                </Press>
              ))}
            </View>

            <Press
              disabled={savingRate}
              onPress={() => void saveExchangeRate()}
              style={{
                height: 44,
                borderRadius: 10,
                backgroundColor: P.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                {savingRate ? 'Saving...' : tr('Save Custom Exchange Rate', 'រក្សាទុកអត្រាប្តូរប្រាក់')}
              </Text>
            </Press>
          </View>
        )}
      </View>

      {/* 2. User Management (Add New User) */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View>
            <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
              {tr('User Accounts & Roles', 'គណនីបុគ្គលិក & អ្នកគ្រប់គ្រង')}
            </Text>
            <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 2 }}>
              {tr('Manage store administrators and cashier accounts.', 'គ្រប់គ្រងអ្នកប្រើប្រាស់ និងអ្នកគិតលុយ។')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press
              onPress={() => setShowResetModal((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: P.surfaceAlt,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: P.border,
              }}
            >
              <KeyRound size={14} color={P.textSub} />
              <Text style={{ color: P.textSub, fontSize: 12, fontWeight: '700' }}>
                {tr('Reset Password', 'កំណត់លេខសម្ងាត់')}
              </Text>
            </Press>

            <Press
              onPress={() => setShowAddUser((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: P.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <UserPlus size={15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                {showAddUser ? tr('Close Form', 'បិទ') : tr('+ Add New User', '+ បន្ថែមអ្នកប្រើថ្មី')}
              </Text>
            </Press>
          </View>
        </View>

        {/* Add User Form */}
        {showAddUser && (
          <View
            style={{
              backgroundColor: P.surfaceAlt,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: P.border,
              gap: 12,
            }}
          >
            <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>
              {tr('Create New User Account', 'បង្កើតគណនីអ្នកប្រើថ្មី')}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>
                  {tr('USERNAME', 'ឈ្មោះគណនី')}
                </Text>
                <TextInput
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="e.g. cashier1"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  style={{
                    height: 40,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: P.surface,
                  }}
                />
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>
                  {tr('FULL NAME', 'ឈ្មោះពេញ')}
                </Text>
                <TextInput
                  value={newFullName}
                  onChangeText={setNewFullName}
                  placeholder="e.g. Sok Piseth"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    height: 40,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: P.surface,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>
                  {tr('ROLE / PERMISSION', 'តួនាទី')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['CASHIER', 'ADMIN'] as const).map((r) => (
                    <Press
                      key={r}
                      onPress={() => setNewRole(r)}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: newRole === r ? P.primaryLight : P.surface,
                        borderWidth: 1,
                        borderColor: newRole === r ? P.primary : P.border,
                      }}
                    >
                      <Text style={{ color: newRole === r ? P.primary : P.muted, fontSize: 12, fontWeight: '800' }}>
                        {r === 'ADMIN' ? tr('Administrator', 'អ្នកគ្រប់គ្រង') : tr('Cashier / Staff', 'បុគ្គលិក')}
                      </Text>
                    </Press>
                  ))}
                </View>
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={{ color: P.textSub, fontSize: 11, fontWeight: '700', marginBottom: 5 }}>
                  {tr('PASSWORD', 'លេខសម្ងាត់')}
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter password..."
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  style={{
                    height: 40,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: P.surface,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Press
                onPress={() => setShowAddUser(false)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
              >
                <Text style={{ color: P.muted, fontSize: 12.5, fontWeight: '700' }}>{tr('Cancel', 'បោះបង់')}</Text>
              </Press>
              <Press
                disabled={creatingUser || !newUsername.trim() || !newPassword}
                onPress={() => void handleCreateUser()}
                style={{
                  backgroundColor: P.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {creatingUser ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                      {tr('Create User', 'បង្កើតអ្នកប្រើ')}
                    </Text>
                  </>
                )}
              </Press>
            </View>
          </View>
        )}

        {/* Forgot / Reset Password In-Place Card */}
        {showResetModal && (
          <View
            style={{
              backgroundColor: '#FFFBEB',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#FDE68A',
              gap: 12,
            }}
          >
            <Text style={{ color: '#92400E', fontSize: 14, fontWeight: '800' }}>
              {tr('Reset User Password (Master Recovery)', 'កំណត់លេខសម្ងាត់ឡើងវិញ')}
            </Text>
            <Text style={{ color: '#B45309', fontSize: 12 }}>
              {tr('Forgot password? Reset any user using the administrator recovery key.', 'ភ្លេចលេខសម្ងាត់? អាចកំណត់ឡើងវិញដោយប្រើកូដមេរបស់អ្នកគ្រប់គ្រង។')}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  {tr('USERNAME', 'ឈ្មោះគណនី')}
                </Text>
                <TextInput
                  value={targetResetUser}
                  onChangeText={setTargetResetUser}
                  placeholder="e.g. admin"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  style={{
                    height: 38,
                    borderWidth: 1,
                    borderColor: '#FCD34D',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>

              <View style={{ flex: 1.2 }}>
                <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  {tr('NEW PASSWORD', 'លេខសម្ងាត់ថ្មី')}
                </Text>
                <TextInput
                  value={newResetPassword}
                  onChangeText={setNewResetPassword}
                  placeholder="New password..."
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  style={{
                    height: 38,
                    borderWidth: 1,
                    borderColor: '#FCD34D',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                  {tr('RECOVERY PIN', 'កូដមេ')}
                </Text>
                <TextInput
                  value={recoveryKey}
                  onChangeText={setRecoveryKey}
                  placeholder="Recovery Key"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    height: 38,
                    borderWidth: 1,
                    borderColor: '#FCD34D',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    fontSize: 13,
                    color: P.text,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Press
                onPress={() => setShowResetModal(false)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 }}
              >
                <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '700' }}>{tr('Cancel', 'បោះបង់')}</Text>
              </Press>
              <Press
                disabled={resettingPassword || !targetResetUser.trim() || !newResetPassword.trim()}
                onPress={() => void handleResetPassword()}
                style={{
                  backgroundColor: '#D97706',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {resettingPassword ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <RefreshCw size={13} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                      {tr('Update Password', 'ប្តូរលេខសម្ងាត់')}
                    </Text>
                  </>
                )}
              </Press>
            </View>
          </View>
        )}

        {/* Active Users List */}
        <View style={{ gap: 8 }}>
          {usersList.map((u) => (
            <View
              key={u.id || u.username}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: P.surfaceAlt,
                borderWidth: 1,
                borderColor: P.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: P.primaryLight,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={16} color={P.primary} />
                </View>
                <View>
                  <Text style={{ color: P.text, fontSize: 13.5, fontWeight: '800' }}>
                    {u.fullName || u.username}
                  </Text>
                  <Text style={{ color: P.muted, fontSize: 11 }}>
                    @{u.username}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: u.role === 'ADMIN' ? P.primaryLight : '#E0F2FE',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: u.role === 'ADMIN' ? P.primary : '#0369A1',
                    }}
                  >
                    {u.role === 'ADMIN' ? tr('Administrator', 'អ្នកគ្រប់គ្រង') : tr('Cashier', 'អ្នកគិតលុយ')}
                  </Text>
                </View>

                {usersList.length > 1 && u.username !== 'admin' && (
                  <Press
                    onPress={() => void deleteUserAction(u)}
                    style={{ padding: 6, borderRadius: 6, backgroundColor: P.roseLight }}
                  >
                    <Trash2 size={13} color={P.rose} />
                  </Press>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 3. Catalog Master Data Configuration (Base Units & Categories) */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: P.border,
          gap: 18,
        }}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Tag size={20} color={P.primary} />
            <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
              {tr('Catalog Master Configuration', 'ការកំណត់ឯកតាមូលដ្ឋាន និងក្រុមទំនិញ')}
            </Text>
          </View>
          <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 4 }}>
            {tr(
              'Configure predefined Base Units and Product Categories used in product registration and batch scan dropdowns.',
              'កំណត់ឯកតាមូលដ្ឋាន និងក្រុមទំនិញសម្រាប់ប្រើប្រាស់ក្នុងទម្រង់បង្កើតទំនិញ និងតារាងនាំចូលជាបាច់។'
            )}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          {/* Base Units Config Card */}
          <View
            style={{
              flex: 1,
              minWidth: 280,
              backgroundColor: P.surfaceAlt,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: P.borderStrong,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Package size={17} color={P.primary} />
              <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>
                {tr('Base Units (Single Items)', 'ឯកតាមូលដ្ឋានរាយ')} ({configuredBaseUnits.length})
              </Text>
            </View>

            {/* Chips List */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {configuredBaseUnits.map((unit) => (
                <View
                  key={unit}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: P.surface,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                  }}
                >
                  <Text style={{ color: P.text, fontSize: 12.5, fontWeight: '700' }}>{unit}</Text>
                  <Press
                    onPress={() => removeConfiguredBaseUnit(unit)}
                    style={{ padding: 2, borderRadius: 4 }}
                  >
                    <X size={13} color={P.muted} />
                  </Press>
                </View>
              ))}
            </View>

            {/* Add Input */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TextInput
                value={newBaseUnitText}
                onChangeText={setNewBaseUnitText}
                placeholder={tr('Add unit (e.g. Kg, Box)...', 'បន្ថែមឯកតា (ឧ. គីឡូ, ប្រអប់)...')}
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  height: 38,
                  fontSize: 12.5,
                  color: P.text,
                  backgroundColor: P.surface,
                }}
              />
              <Press
                onPress={() => {
                  if (newBaseUnitText.trim()) {
                    addConfiguredBaseUnit(newBaseUnitText.trim());
                    setNewBaseUnitText('');
                  }
                }}
                style={{
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: P.primary,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {tr('Add', 'បន្ថែម')}
                </Text>
              </Press>
            </View>
          </View>

          {/* Categories Config Card */}
          <View
            style={{
              flex: 1,
              minWidth: 280,
              backgroundColor: P.surfaceAlt,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: P.borderStrong,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Tag size={17} color={P.teal} />
              <Text style={{ color: P.text, fontSize: 14, fontWeight: '800' }}>
                {tr('Product Categories', 'ក្រុមទំនិញ')} ({configuredCategories.length})
              </Text>
            </View>

            {/* Chips List */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {configuredCategories.map((cat) => (
                <View
                  key={cat}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: P.surface,
                    borderWidth: 1,
                    borderColor: P.borderStrong,
                  }}
                >
                  <Text style={{ color: P.text, fontSize: 12.5, fontWeight: '700' }}>{cat}</Text>
                  <Press
                    onPress={() => removeConfiguredCategory(cat)}
                    style={{ padding: 2, borderRadius: 4 }}
                  >
                    <X size={13} color={P.muted} />
                  </Press>
                </View>
              ))}
            </View>

            {/* Add Input */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TextInput
                value={newCategoryText}
                onChangeText={setNewCategoryText}
                placeholder={tr('Add category...', 'បន្ថែមក្រុមទំនិញ...')}
                placeholderTextColor="#9CA3AF"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: P.borderStrong,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  height: 38,
                  fontSize: 12.5,
                  color: P.text,
                  backgroundColor: P.surface,
                }}
              />
              <Press
                onPress={() => {
                  if (newCategoryText.trim()) {
                    addConfiguredCategory(newCategoryText.trim());
                    setNewCategoryText('');
                  }
                }}
                style={{
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  backgroundColor: P.teal,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  {tr('Add', 'បន្ថែម')}
                </Text>
              </Press>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Hardware & Scanner Integration Info */}
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Usb size={20} color={P.teal} />
          <Text style={{ color: P.text, fontSize: 16, fontWeight: '800' }}>
            {tr('Hardware & Wireless Barcode Scanners', 'ម៉ាស៊ីនស្កេនបាកូដ USB & ឥតខ្សែ')}
          </Text>
        </View>
        <Text style={{ color: P.muted, fontSize: 13, lineHeight: 20 }}>
          {tr(
            'Plug in any USB / Bluetooth barcode scanner or turn your phone into a wireless scanner gun via the mobile app. Barcodes are beamed directly to POS checkout, Inventory, and Batch intake in real time.',
            'ភ្ជាប់ម៉ាស៊ីនស្កេនបាកូដ USB/Bluetooth ឬប្រើទូរស័ព្ទជាម៉ាស៊ីនស្កេនឥតខ្សែ។ បាកូដនឹងបញ្ជូនផ្ទាល់ទៅ POS និងការនាំចូលជាបាច់។'
          )}
        </Text>
      </View>
    </View>
  );
}
