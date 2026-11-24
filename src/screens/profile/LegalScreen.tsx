import React from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/ui';
import { SUPPORT_EMAIL } from '../../lib/constants';

// NOT: Bu metinler taslaktır. Yayına çıkmadan önce şirket bilgileriyle birlikte bir hukukçuya kontrol ettirilmelidir.
const SECTIONS = [
  {
    title: 'Kullanım Koşulları (özet)',
    body:
      'CanlıSat, satıcılar ile alıcıları canlı yayın ve mağaza sayfaları üzerinden buluşturan bir aracı hizmet sağlayıcıdır. ' +
      'Mezatlarda verilen teklifler bağlayıcıdır; mezatı kazanan kullanıcı ürünü satın almayı kabul etmiş sayılır. ' +
      'Sahte, replika veya yasa dışı ürünlerin satışı yasaktır; bu tür ilanlar ve hesaplar kapatılır. ' +
      'Kullanıcılar sohbet alanlarında hakaret, taciz ve spam içerikten kaçınmalıdır; uygunsuz içerikler şikâyet edilebilir ve kaldırılır.',
  },
  {
    title: 'Gizlilik ve KVKK (özet)',
    body:
      'Hesap oluştururken verdiğin ad, e-posta, telefon ve adres bilgileri yalnızca siparişlerin teslimi, hesap güvenliği ve yasal yükümlülükler için işlenir. ' +
      'Teslimat adresin yalnızca satın aldığın ürünün satıcısıyla paylaşılır. Kart bilgilerin CanlıSat sunucularında saklanmaz; lisanslı ödeme kuruluşu tarafından işlenir. ' +
      'Verilerinin silinmesini Profil > Hesabımı sil adımından veya destek ekibimize yazarak talep edebilirsin.',
  },
  {
    title: 'Mesafeli Satış ve İade',
    body:
      'Satıcı, ürünü sipariş tarihinden itibaren en geç 3 iş günü içinde kargoya vermelidir. Ürün açıklamaya uygun gelmezse teslimattan itibaren 14 gün içinde destek ekibine başvurabilirsin.',
  },
  { title: 'İletişim', body: `Her türlü soru ve talep için: ${SUPPORT_EMAIL}` },
];

export const LegalScreen = () => (
  <SafeAreaView className="flex-1 bg-[#0E0E0E]">
    <Header title="Koşullar ve gizlilik" />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {SECTIONS.map((s) => (
        <React.Fragment key={s.title}>
          <Text className="text-white font-black text-lg mt-4 mb-2">{s.title}</Text>
          <Text className="text-zinc-400 leading-6">{s.body}</Text>
        </React.Fragment>
      ))}
    </ScrollView>
  </SafeAreaView>
);
