import { API_URL } from '../config/env';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type RequestOptions = {
  body?: unknown;
  form?: FormData;
  token?: string | null;
};

const TIMEOUT_MS = 90000;
const RETRY_DELAY_MS = 1500;
const MAX_ATTEMPTS = 2;
const NETWORK_ERROR = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
const TIMEOUT_ERROR = 'O servidor demorou para responder. Tente novamente em instantes.';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function createIdempotencyKey(): string {
  const random = () => Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${random()}${random()}`;
}

export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client-Type': 'mobile',
  };

  const token = options.token ?? authToken;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (method !== 'GET') {
    headers['Idempotency-Key'] = createIdempotencyKey();
  }

  let body: FormData | string | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await send<T>(method, path, headers, body);
    } catch (error) {
      const retryable =
        error instanceof ApiError &&
        error.status === 0 &&
        (error.message === NETWORK_ERROR || (method === 'GET' && error.message === TIMEOUT_ERROR));
      if (!retryable || attempt >= MAX_ATTEMPTS) {
        throw error;
      }
      await delay(RETRY_DELAY_MS);
    }
  }
}

async function send<T>(
  method: HttpMethod,
  path: string,
  headers: Record<string, string>,
  body: FormData | string | undefined,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, controller.signal.aborted ? TIMEOUT_ERROR : NETWORK_ERROR);
  } finally {
    clearTimeout(timer);
  }

  const data = parseBody(await response.text());
  if (!response.ok) {
    throw new ApiError(response.status, messageOf(data) ?? `Erro ${response.status} ao falar com o servidor.`);
  }
  return data as T;
}

function parseBody(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageOf(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const message = record.mensagem ?? record.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
