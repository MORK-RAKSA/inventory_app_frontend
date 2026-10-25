import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { KeyRound, Shield, Trash2, User, UserPlus, Usb, Check, RefreshCw } from 'lucide-react-native';
import { AppUser } from '../../api';
import { khr } from '../../theme';
import { Press } from '../../motion';
import { P, shadow } from '../theme';
import type { PortalController } from '../usePortalController';

export function SettingsTab({ portal }: { portal: PortalController }) {
  const {
    createUserAction,
    deleteUserAction,
    rateInput,
    resetPasswordAction,
    saveExchangeRate,
    savingRate,
    setRateInput,
    tr,
    usersList,
  } = portal;

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
    const ok = await resetPasswordAction(targetResetUser.trim(), newResetPassword.trim(), recoveryKey.trim() || 'admin1234');
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
      <View
        style={{
          backgroundColor: P.surface,
          borderRadius: 16,
          padding: 22,
          borderWidth: 1,
          borderColor: P.border,
        }}
      >
        <Text style={{ color: P.text, fontSize: 17, fontWeight: '800' }}>
          {tr('Exchange Rate (USD to KHR ៛)', 'អត្រាប្តូរប្រាក់ (ដុល្លារ ទៅ រៀល)')}
        </Text>
        <Text style={{ color: P.muted, fontSize: 12.5, marginTop: 3, marginBottom: 16 }}>
          {tr('Sets the active exchange rate for all sales and inventory.', 'កំណត់អត្រាប្តូរប្រាក់សម្រាប់ការលក់ និងស្តុក។')}
        </Text>

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
            {savingRate ? 'Saving...' : tr('Save Exchange Rate', 'រក្សាទុកអត្រាប្តូរប្រាក់')}
          </Text>
        </Press>
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
              {tr('Forgot password? Reset any user using the recovery PIN (default: admin1234 or 8888).', 'ភ្លេចលេខសម្ងាត់? អាចកំណត់ឡើងវិញដោយប្រើកូដមេ (admin1234 ឬ 8888)។')}
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
                  placeholder="admin1234"
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

      {/* 3. Hardware & Scanner Integration Info */}
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
