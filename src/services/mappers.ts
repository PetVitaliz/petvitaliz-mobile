import { PLAN_KEYWORDS, PLAN_ORDER, normalizePlanText, type PlanId, type ServiceId } from '../data/planCoverage';
import type { ConsultationAppointment } from '../screens/private/PrivateConsultationsScreen';
import type { Pet } from '../screens/private/PrivatePetsFlowScreen';
import type { ApiAppointment, ApiPet, ApiProduct, AppointmentPayload, PetImage, PetPayload } from './api';

export const DEFAULT_BREED = 'SRD (Sem Raça Definida)';

const BREED_PREFIX = 'Raça: ';
const SERVICE_PREFIX = 'Serviço: ';
const UNKNOWN_SPECIES = 'Não informada';
const MAX_NOTES_LENGTH = 1000;

const PLAN_IDS: PlanId[] = PLAN_ORDER;
const CUSTOM_PLAN_TAG = 'personalizado';

const SERVICE_LABELS: Record<ServiceId, string> = {
  banho_tosa: 'Banho e tosa',
  exames: 'Exames',
  vacinacao: 'Vacinação',
  emergencia: 'Emergência 24h',
  leva_busca: 'Leva e busca',
  consulta: 'Consulta',
};

const SPECIES_TO_APP: Record<string, string> = {
  cachorro: 'Cachorro',
  gato: 'Gato',
  ave: 'Ave',
  coelho: 'Outro',
  outro: 'Outro',
};

const SPECIES_TO_API: Record<string, string> = {
  Cachorro: 'cachorro',
  Gato: 'gato',
  Ave: 'ave',
  Outro: 'outro',
};

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  return digits.length === 11 ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
}

export function ageFromBirthDate(birthDate: string, today: Date): string {
  const [year, month, day] = birthDate.slice(0, 10).split('-').map(Number);
  let months = (today.getFullYear() - year) * 12 + (today.getMonth() + 1 - month);
  if (today.getDate() < day) {
    months -= 1;
  }
  const years = Math.floor(months / 12);
  if (years >= 1) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }
  const shownMonths = Math.max(1, months);
  return `${shownMonths} ${shownMonths === 1 ? 'mês' : 'meses'}`;
}

export function birthDateFromAge(age: string, today: Date): string {
  const amount = Math.max(0, parseInt(age, 10) || 0);
  const inMonths = /m[eê]s/i.test(age);
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (inMonths) {
    date.setMonth(date.getMonth() - amount);
  } else {
    date.setFullYear(date.getFullYear() - amount);
  }
  return toIsoDate(date);
}

export function toMobilePet(api: ApiPet, today: Date, previous?: Pet): Pet {
  const { breed, bio } = readNotes(api.observacoes);
  const otherSpecies = api.outra_especie?.trim() || (api.especie === 'coelho' ? 'Coelho' : '');
  const birthDate = api.data_nascimento.slice(0, 10);
  const age = ageFromBirthDate(birthDate, today);

  return {
    id: String(api.id_pet),
    name: api.nome,
    species: SPECIES_TO_APP[api.especie] ?? 'Outro',
    breed: breed || otherSpecies || DEFAULT_BREED,
    age,
    gender: api.sexo === 'M' ? 'Macho' : 'Fêmea',
    weight: api.peso ? `${String(api.peso).replace('.', ',')} kg` : '',
    plan: previous?.plan ?? null,
    hasActivePlan: previous?.hasActivePlan ?? false,
    bio,
    avatar: api.foto_url,
    traits: previous?.traits ?? [],
    loves: previous?.loves ?? [],
    source: { birthDate, age, species: api.especie, otherSpecies: api.outra_especie },
  };
}

export function toPetPayload(pet: Pet, today: Date, original?: Pet): PetPayload {
  const source = original?.source;
  const birthDate = source && source.age === pet.age ? source.birthDate : birthDateFromAge(pet.age, today);
  const years = Math.max(0, today.getFullYear() - Number(birthDate.slice(0, 4)) - (isBeforeBirthday(birthDate, today) ? 1 : 0));
  const hasBreed = !!pet.breed && pet.breed !== DEFAULT_BREED;

  let species = SPECIES_TO_API[pet.species] ?? 'outro';
  let otherSpecies = '';
  if (species === 'outro') {
    const keepsSource = source && (source.species === 'coelho' || source.species === 'outro');
    species = keepsSource ? source.species : 'outro';
    otherSpecies = species === 'outro'
      ? (keepsSource && source.otherSpecies) || (hasBreed ? pet.breed : UNKNOWN_SPECIES)
      : '';
  }

  const notes = [hasBreed ? `${BREED_PREFIX}${pet.breed}` : '', pet.bio.trim()].filter(Boolean).join('\n');

  return {
    nome: pet.name.trim(),
    especie: species,
    outra_especie: otherSpecies.slice(0, 100),
    sexo: pet.gender === 'Macho' ? 'M' : 'F',
    data_nascimento: birthDate,
    idade: String(years),
    peso: pet.weight.replace(/kg/i, '').trim().replace(',', '.'),
    observacoes: notes.slice(0, MAX_NOTES_LENGTH),
  };
}

export function petImageOf(pet: Pet): PetImage | null {
  const uri = pet.avatar;
  if (!uri || /^https?:\/\//i.test(uri)) {
    return null;
  }
  const isPng = /\.png($|\?)/i.test(uri) || uri.startsWith('data:image/png');
  return { uri, name: isPng ? 'pet.png' : 'pet.jpg', type: isPng ? 'image/png' : 'image/jpeg' };
}

export function toMobileAppointment(api: ApiAppointment, pets: Pet[]): ConsultationAppointment {
  const petId = String(api.id_pet);
  const serviceId = readServiceId(api);

  return {
    id: String(api.id_consulta),
    code: `PV-${String(api.id_consulta).padStart(6, '0')}`,
    petId,
    petName: api.pet?.nome ?? pets.find((pet) => pet.id === petId)?.name ?? 'Pet',
    service: SERVICE_LABELS[serviceId],
    serviceId,
    professional: api.funcionario?.nome,
    date: api.data_consulta.slice(0, 10),
    time: api.hora_inicio,
    status: api.status === 'finalizado' ? 'completed' : 'scheduled',
  };
}

export function apiServiceFor(serviceId: ServiceId | undefined): string {
  return (serviceId ?? 'consulta') === 'banho_tosa' ? 'tosador' : 'veterinario';
}

export function toAppointmentPayload(
  petId: string,
  serviceId: ServiceId | undefined,
  date: string,
  time: string,
): AppointmentPayload {
  const service = serviceId ?? 'consulta';
  return {
    servico: apiServiceFor(service),
    id_pet: Number(petId),
    data_consulta: date,
    hora_inicio: time,
    observacoes: `${SERVICE_PREFIX}${SERVICE_LABELS[service]}`,
  };
}

export function findProductForPlan(products: ApiProduct[], planId: PlanId): ApiProduct | undefined {
  const byName = products.find((product) => planIdByName(product) === planId);
  if (byName) {
    return byName;
  }
  const index = tiersWithoutName(products).indexOf(planId);
  return index >= 0 ? unnamedProducts(products)[index] : undefined;
}

export function planIdForProduct(product: ApiProduct, products: ApiProduct[]): PlanId | null {
  const byName = planIdByName(product);
  if (byName) {
    return byName;
  }
  const index = unnamedProducts(products).findIndex((item) => item.nome === product.nome);
  return index >= 0 ? tiersWithoutName(products)[index] ?? null : null;
}

function tiersWithoutName(products: ApiProduct[]): PlanId[] {
  const named = new Set(products.map(planIdByName));
  return PLAN_IDS.filter((planId) => !named.has(planId));
}

function unnamedProducts(products: ApiProduct[]): ApiProduct[] {
  return sortByPrice(
    products.filter((product) => planIdByName(product) === null && !normalizePlanText(product.nome).includes(CUSTOM_PLAN_TAG)),
  );
}

function planIdByName(product: ApiProduct): PlanId | null {
  const name = normalizePlanText(product.nome);
  return PLAN_IDS.find((planId) => PLAN_KEYWORDS[planId].some((keyword) => name.includes(keyword))) ?? null;
}

function sortByPrice(products: ApiProduct[]): ApiProduct[] {
  return [...products].sort((a, b) => priceOf(a) - priceOf(b));
}

function priceOf(product: ApiProduct): number {
  const price = Number(String(product.preco).replace(',', '.'));
  return Number.isFinite(price) ? price : 0;
}


function readNotes(notes: string | null): { breed: string; bio: string } {
  const lines = (notes ?? '').split('\n');
  if (lines[0]?.startsWith(BREED_PREFIX)) {
    return { breed: lines[0].slice(BREED_PREFIX.length).trim(), bio: lines.slice(1).join('\n').trim() };
  }
  return { breed: '', bio: (notes ?? '').trim() };
}

function readServiceId(api: ApiAppointment): ServiceId {
  const notes = api.observacoes ?? '';
  if (notes.startsWith(SERVICE_PREFIX)) {
    const label = notes.slice(SERVICE_PREFIX.length).split('\n')[0].trim();
    const match = (Object.keys(SERVICE_LABELS) as ServiceId[]).find((id) => SERVICE_LABELS[id] === label);
    if (match) {
      return match;
    }
  }
  return api.funcionario?.especialidade === 'tosador' ? 'banho_tosa' : 'consulta';
}

function isBeforeBirthday(birthDate: string, today: Date): boolean {
  const [, month, day] = birthDate.split('-').map(Number);
  return today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
}
