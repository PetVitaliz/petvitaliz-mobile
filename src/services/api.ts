import { ApiError, request, setAuthToken } from './http';

export type ApiPet = {
  id_pet: number;
  id_usuario: number;
  nome: string;
  especie: string;
  outra_especie: string | null;
  sexo: 'M' | 'F';
  data_nascimento: string;
  foto_url: string | null;
  idade: number;
  peso: number | null;
  observacoes: string | null;
};

export type ApiAppointment = {
  id_consulta: number;
  id_pet: number;
  id_funcionario: number;
  data_consulta: string;
  hora_inicio: string;
  hora_fim: string;
  status: 'em_espera' | 'em_andamento' | 'finalizado';
  observacoes: string;
  pet?: { nome: string };
  funcionario?: { nome: string; especialidade: string };
};

export type ApiProduct = {
  id_produto?: number;
  nome: string;
  descricao: string;
  beneficios: string | null;
  preco: string;
};

export type ApiProfile = {
  nome: string;
  sobrenome: string;
  email: string;
  CPF: string;
  telefone?: string;
  data_nascimento?: string;
};

export type SignUpPayload = {
  nome: string;
  sobrenome: string;
  email: string;
  senha: string;
  CPF: string;
  telefone: string;
  genero: 'M' | 'F' | 'O';
  data_nascimento: string;
};

export type PetPayload = {
  nome: string;
  especie: string;
  outra_especie: string;
  sexo: 'M' | 'F';
  data_nascimento: string;
  idade: string;
  peso: string;
  observacoes: string;
};

export type PetImage = {
  uri: string;
  name: string;
  type: string;
};

export type AppointmentPayload = {
  servico: 'veterinario' | 'tosador';
  id_pet: number;
  data_consulta: string;
  hora_inicio: string;
  observacoes: string;
};

type LoginResponse = {
  token?: string;
  usuario?: { nome: string; email: string; tipo: string };
};

export async function login(email: string, password: string): Promise<void> {
  const response = await request<LoginResponse>('POST', '/user/login', {
    body: { email, senha: password },
  });
  setAuthToken(response.token ?? null);
}

export async function logout(): Promise<void> {
  try {
    await request('POST', '/user/logout');
  } finally {
    setAuthToken(null);
  }
}

export function signUp(payload: SignUpPayload): Promise<unknown> {
  return request('POST', '/user/cadastro', { body: payload });
}

export function requestPasswordReset(email: string): Promise<unknown> {
  return request('POST', '/user/login/esqueci-a-senha', { body: { email } });
}

export async function confirmResetCode(email: string, code: string): Promise<string> {
  const response = await request<{ token_reset: string }>('POST', '/user/login/esqueci-a-senha-confirmar', {
    body: { email, codigo: code },
  });
  return response.token_reset;
}

export function changePassword(resetToken: string, password: string): Promise<unknown> {
  return request('PUT', '/user/login/alterar-senha', {
    body: { senha1: password, senha2: password },
    token: resetToken,
  });
}

export function getProfile(): Promise<ApiProfile> {
  return request<ApiProfile>('GET', '/user/buscar/perfil');
}

export async function listPets(): Promise<ApiPet[]> {
  const response = await request<{ pets?: ApiPet[] }>('GET', '/user/listar/pet');
  return response.pets ?? [];
}

export async function createPet(payload: PetPayload, image: PetImage | null): Promise<void> {
  await request('POST', '/user/listar/pet/cadastar', { form: await petForm(payload, image) });
}

export async function updatePet(id: number, payload: PetPayload, image: PetImage | null): Promise<ApiPet> {
  const response = await request<{ pet: ApiPet }>('PUT', `/user/listar/pet/editar/${id}`, {
    form: await petForm(payload, image),
  });
  return response.pet;
}

export function deletePet(id: number): Promise<unknown> {
  return request('DELETE', `/user/listar/pet/delete/${id}`);
}

export async function listAppointments(): Promise<ApiAppointment[]> {
  try {
    const response = await request<{ consultas?: ApiAppointment[] }>('GET', '/consultas');
    return response.consultas ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export function scheduleAppointment(payload: AppointmentPayload): Promise<unknown> {
  return request('POST', '/agendamento', { body: payload });
}

export type Availability = {
  professionals: number;
  unavailableTimes: string[];
};

export async function getAvailability(service: string, date: string): Promise<Availability> {
  const query = `servico=${encodeURIComponent(service)}&data=${encodeURIComponent(date)}`;
  const response = await request<{ profissionais?: number; indisponiveis?: string[] }>(
    'GET',
    `/agendamento/horarios?${query}`,
  );
  return {
    professionals: response.profissionais ?? 0,
    unavailableTimes: response.indisponiveis ?? [],
  };
}

export function cancelAppointment(id: number): Promise<unknown> {
  return request('DELETE', `/user/agendamento/cancelar/${id}`);
}

export async function listProducts(): Promise<ApiProduct[]> {
  const response = await request<{ produtos?: ApiProduct[] }>('GET', '/adm/listar/produtos');
  return response.produtos ?? [];
}

export type ApiPetPlan = {
  id_pet: number;
  produto: ApiProduct;
};

export async function listPetPlans(): Promise<ApiPetPlan[]> {
  const response = await request<{ planos?: ApiPetPlan[] }>('GET', '/user/planos');
  return response.planos ?? [];
}

export function subscribe(productId: number, petId: number): Promise<unknown> {
  return request('POST', '/user/planos/pagamento', { body: { id_produto: productId, id_pet: petId } });
}

export function cancelPlan(petId: number): Promise<unknown> {
  return request('DELETE', `/user/planos/cancelar/${petId}`);
}

export function sendContact(email: string, message: string): Promise<unknown> {
  return request('POST', '/user/contato', { body: { email, mensagem: message } });
}

async function petForm(payload: PetPayload, image: PetImage | null): Promise<FormData> {
  const form = new FormData();
  Object.entries(payload).forEach(([field, value]) => form.append(field, value));

  if (image) {
    if (image.uri.startsWith('blob:') || image.uri.startsWith('data:')) {
      const blob = await (await fetch(image.uri)).blob();
      form.append('image', blob, image.name);
    } else {
      form.append('image', image as unknown as Blob);
    }
  }
  return form;
}
