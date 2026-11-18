import { useSyncExternalStore } from 'react';
import { listProducts, type ApiProduct } from '../services/api';
import { findProductForPlan } from '../services/mappers';
import {
  PLAN_FEATURES,
  PLAN_NAMES,
  PLAN_ORDER,
  PLAN_PRICES,
  PLAN_SUMMARIES,
  PLAN_TAGS,
  normalizePlanText,
  type PlanFeature,
  type PlanId,
} from './planCoverage';

const YEARLY_RATIO = Object.fromEntries(
  PLAN_ORDER.map((id) => [id, PLAN_PRICES.yearly[id] / PLAN_PRICES.monthly[id]]),
) as Record<PlanId, number>;

const TIER_TAGS = new Set<string>([...PLAN_ORDER, 'personalizado']);
const BENEFIT_SEPARATOR = /[\n;]+/;

const RETRY_DELAYS_MS = [3000, 8000, 15000, 30000];

const listeners = new Set<() => void>();
let version = 0;
let loaded = false;
let pending: Promise<void> | null = null;

export function applyProducts(products: ApiProduct[]): void {
  let changed = false;
  const matched: string[] = [];

  PLAN_ORDER.forEach((id) => {
    const product = findProductForPlan(products, id);
    if (!product) {
      return;
    }

    const [name, tag, yearlyPrice] = product.nome.split('|').map((part) => part.trim());
    if (name) {
      PLAN_NAMES[id] = /^plano\s/i.test(name) ? name : `Plano ${name}`;
    }
    if (tag && !TIER_TAGS.has(normalizePlanText(tag))) {
      PLAN_TAGS[id] = tag.toUpperCase();
    }

    const description = product.descricao?.trim();
    if (description) {
      PLAN_SUMMARIES[id] = description;
    }

    const price = parsePrice(product.preco);
    if (price > 0) {
      const savedYearly = parsePrice(yearlyPrice);
      PLAN_PRICES.monthly[id] = price;
      PLAN_PRICES.yearly[id] = savedYearly > 0 ? savedYearly : Math.round(price * YEARLY_RATIO[id] * 100) / 100;
    }

    const features = parseBenefits(product.beneficios);
    if (features.length > 0) {
      PLAN_FEATURES[id] = features;
    }

    matched.push(`${id}=${product.nome}`);
    changed = true;
  });

  if (__DEV__) {
    console.log(`[PetVitaliz] ${products.length} plano(s) recebido(s) da API: ${matched.join(', ') || 'nenhum reconhecido'}`);
  }

  if (products.length > 0) {
    loaded = true;
  }

  if (changed) {
    version += 1;
    listeners.forEach((listener) => listener());
  }
}

export function loadPlanCatalog(): Promise<void> {
  if (loaded) {
    return Promise.resolve();
  }
  if (!pending) {
    pending = fetchWithRetry().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function fetchWithRetry(): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      applyProducts(await listProducts());
      return;
    } catch (error) {
      if (__DEV__) {
        console.log(`[PetVitaliz] Falha ao buscar planos (tentativa ${attempt + 1}): ${String(error)}`);
      }
      if (attempt >= RETRY_DELAYS_MS.length) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

export function usePlanCatalog(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getVersion(): number {
  return version;
}

function parsePrice(value: string | number | null | undefined): number {
  if (value === '') {
    return 0;
  }
  if (value === null || value === undefined) {
    return 0;
  }
  const text = String(value).trim();
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const price = Number(normalized.replace(/[^\d.]/g, ''));
  return Number.isFinite(price) ? price : 0;
}

function parseBenefits(benefits: string | null): PlanFeature[] {
  return (benefits ?? '')
    .split(BENEFIT_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const separator = item.lastIndexOf(':');
      return separator > 0
        ? { text: item.slice(0, separator).trim(), count: item.slice(separator + 1).trim() }
        : { text: item, count: '' };
    });
}
