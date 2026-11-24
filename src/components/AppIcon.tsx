import React from 'react';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/* =========================================================
   Ícones padrão do app: Feather (traço fino).
   As telas usam <Icon> no lugar de <Ionicons> e <IconMC> no lugar de
   <MaterialCommunityIcons>; o nome antigo é trocado pelo equivalente
   no Feather pela tabela abaixo.
   Ficam no desenho original só os que o Feather não tem: coroa e patinha
   (marca dos planos), bichos (cachorro, gato...), WhatsApp, chip do
   cartão, QR code e código de barras.
   Para trocar um ícone em todo o app, mude a tabela.
   ========================================================= */

const TO_FEATHER: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  // navegação
  'chevron-back': 'chevron-left',
  'chevron-forward': 'chevron-right',
  'chevron-down': 'chevron-down',
  'arrow-forward': 'arrow-right',
  close: 'x',
  'close-circle': 'x-circle',
  'search-outline': 'search',
  // barra de baixo e menu
  home: 'home',
  'home-outline': 'home',
  gift: 'gift',
  'gift-outline': 'gift',
  person: 'user',
  'person-outline': 'user',
  'notifications-outline': 'bell',
  'headset-outline': 'headphones',
  'shield-checkmark-outline': 'shield',
  'help-circle-outline': 'help-circle',
  'chatbubbles-outline': 'message-circle',
  // status
  checkmark: 'check',
  'checkmark-circle': 'check-circle',
  'alert-circle-outline': 'alert-circle',
  'time-outline': 'clock',
  'clock-check-outline': 'clock',
  // dados e formulários
  'calendar-outline': 'calendar',
  'calendar-blank-outline': 'calendar',
  'mail-outline': 'mail',
  'lock-closed': 'lock',
  'eye-outline': 'eye',
  'eye-off-outline': 'eye-off',
  'pencil-outline': 'edit-2',
  'document-text-outline': 'file-text',
  'card-outline': 'credit-card',
  'credit-card-outline': 'credit-card',
  'repeat-outline': 'repeat',
  'ribbon-outline': 'award',
  'square-outline': 'square',
  'cube-outline': 'box',
  'heart-outline': 'heart',
  'barbell-outline': 'bar-chart-2',
  'water-outline': 'droplet',
  'link-outline': 'link',
  'share-social-outline': 'share-2',
  'cloud-upload-outline': 'upload-cloud',
  'nutrition-outline': 'coffee',
  // serviços
  'cut-outline': 'scissors',
  'flask-outline': 'clipboard',
  'medical-outline': 'plus-circle',
  'medkit-outline': 'shield',
  'pulse-outline': 'activity',
  'car-outline': 'truck',
};

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  [prop: string]: any; // demais props repassadas ao ícone
};

function render(Original: any, { name, ...rest }: IconProps) {
  const featherName = TO_FEATHER[name];
  if (featherName) return <Feather name={featherName} {...rest} />;
  return <Original name={name as any} {...rest} />;
}

/** Substitui <Ionicons> */
export function Icon(props: IconProps) {
  return render(Ionicons, props);
}

/** Substitui <MaterialCommunityIcons> */
export function IconMC(props: IconProps) {
  return render(MaterialCommunityIcons, props);
}

export type IconName = string;
