import React from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../lib/constants';
import { initials } from '../lib/format';

export const Avatar = ({ uri, name, size = 40 }: { uri?: string | null; name?: string | null; size?: number }) =>
  uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.cardAlt }} />
  ) : (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primary }}
      className="items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.38 }} className="text-white font-bold">
        {initials(name)}
      </Text>
    </View>
  );

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
  small?: boolean;
};

export const Button = ({ title, onPress, variant = 'primary', loading, disabled, icon, className = '', small }: ButtonProps) => {
  const bg = {
    primary: 'bg-[#FF6B00]',
    secondary: 'bg-[#222222] border border-[#333333]',
    danger: 'bg-red-500/15 border border-red-500/40',
    ghost: 'bg-transparent',
  }[variant];
  const color = variant === 'danger' ? '#F87171' : '#FFFFFF';
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      className={`${bg} ${small ? 'h-10 px-4' : 'h-14 px-5'} rounded-2xl flex-row items-center justify-center ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={color} style={{ marginRight: 8 }} />}
          <Text style={{ color }} className={`font-bold ${small ? 'text-sm' : 'text-base'}`}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const Field = ({ label, error, ...props }: TextInputProps & { label?: string; error?: string }) => (
  <View className="mb-4">
    {label ? <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</Text> : null}
    <TextInput
      placeholderTextColor="#6B7280"
      {...props}
      className={`bg-[#1A1A1A] border ${error ? 'border-red-500' : 'border-[#2A2A2A]'} rounded-2xl px-4 text-white text-base ${
        props.multiline ? 'py-3 min-h-[96px]' : 'h-14'
      }`}
      style={[{ textAlignVertical: props.multiline ? 'top' : 'center' }, props.style as any]}
    />
    {error ? <Text className="text-red-400 text-xs mt-1">{error}</Text> : null}
  </View>
);

export const Chip = ({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap }) => (
  <TouchableOpacity
    onPress={onPress}
    className={`px-4 h-10 rounded-full mr-2 flex-row items-center border ${
      active ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-[#1A1A1A] border-[#2A2A2A]'
    }`}
  >
    {icon && <Ionicons name={icon} size={14} color={active ? '#fff' : '#9CA3AF'} style={{ marginRight: 6 }} />}
    <Text className={`font-semibold text-sm ${active ? 'text-white' : 'text-zinc-300'}`}>{label}</Text>
  </TouchableOpacity>
);

export const Tabs = <T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) => (
  <View className="flex-row border-b border-[#2A2A2A]">
    {tabs.map((t) => (
      <TouchableOpacity key={t.key} onPress={() => onChange(t.key)} className="flex-1 items-center pb-3 pt-1">
        <Text className={`font-bold text-sm ${value === t.key ? 'text-[#FF6B00]' : 'text-zinc-500'}`}>{t.label}</Text>
        {value === t.key && <View className="absolute bottom-0 h-[3px] w-3/4 bg-[#FF6B00] rounded-full" />}
      </TouchableOpacity>
    ))}
  </View>
);

export const EmptyState = ({ icon, title, subtitle, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; action?: React.ReactNode }) => (
  <View className="items-center justify-center py-16 px-8">
    <View className="w-20 h-20 rounded-full bg-[#1A1A1A] items-center justify-center mb-4">
      <Ionicons name={icon} size={36} color="#6B7280" />
    </View>
    <Text className="text-white font-bold text-lg text-center">{title}</Text>
    {subtitle ? <Text className="text-zinc-500 text-sm text-center mt-2 leading-5">{subtitle}</Text> : null}
    {action ? <View className="mt-5 w-full">{action}</View> : null}
  </View>
);

export const Header = ({ title, right, back = true }: { title: string; right?: React.ReactNode; back?: boolean }) => {
  const navigation = useNavigation<any>();
  return (
    <View className="flex-row items-center px-4 h-14">
      {back ? (
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
      ) : null}
      <Text className="text-white font-extrabold text-xl flex-1" numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
};

export const Section = ({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) => (
  <View style={style} className="flex-row items-center justify-between px-4 mb-3">
    <Text className="text-white font-extrabold text-lg">{title}</Text>
    {action ? (
      <TouchableOpacity onPress={onAction}>
        <Text className="text-zinc-400 font-semibold text-sm">{action} ›</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const Loading = () => (
  <View className="flex-1 items-center justify-center bg-[#0E0E0E]">
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

export const Badge = ({ label, color }: { label: string; color: string }) => (
  <View style={{ backgroundColor: color + '26', borderColor: color + '66' }} className="self-start px-2 py-1 rounded-md border">
    <Text style={{ color }} className="text-[11px] font-extrabold uppercase">
      {label}
    </Text>
  </View>
);

export const ListRow = ({ icon, label, sub, onPress, danger, right }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress?: () => void; danger?: boolean; right?: React.ReactNode }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center px-4 py-4 border-b border-[#232323]">
    <View className="w-9 h-9 rounded-full bg-[#222] items-center justify-center mr-3">
      <Ionicons name={icon} size={18} color={danger ? '#F87171' : '#E5E7EB'} />
    </View>
    <View className="flex-1">
      <Text className={`text-base font-medium ${danger ? 'text-red-400' : 'text-white'}`}>{label}</Text>
      {sub ? <Text className="text-zinc-500 text-xs mt-0.5">{sub}</Text> : null}
    </View>
    {right ?? <Ionicons name="chevron-forward" size={18} color="#6B7280" />}
  </TouchableOpacity>
);
