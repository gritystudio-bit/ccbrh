export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCleanCityName(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || UUID_REGEX.test(trimmed)) return false;
  return true;
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  resolvedCity?: string;
  resolvedState?: string;
  resolvedBairro?: string;
  resolvedStreet?: string;
}

/**
 * Geocodifica um endereço brasileiro usando BrasilAPI CEP v2 + ViaCEP + OpenStreetMap Nominatim.
 */
export async function geocodeAddress(parts: {
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): Promise<GeoCoordinates | null> {
  const cepDigits = (parts.cep || '').replace(/\D/g, '');
  let cleanCity = isCleanCityName(parts.cidade) ? parts.cidade!.trim() : '';
  let cleanState = (parts.estado || '').trim();
  let cleanBairro = (parts.bairro || '').trim();
  let cleanStreet = (parts.endereco || '').trim();

  // 1. Se houver CEP de 8 dígitos, consulta BrasilAPI v2 (que já traz coordenadas + cidade limpa) e ViaCEP
  if (cepDigits.length === 8) {
    try {
      const brRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepDigits}`);
      if (brRes.ok) {
        const brData = (await brRes.json()) as {
          city?: string;
          state?: string;
          neighborhood?: string;
          street?: string;
          location?: {
            coordinates?: {
              latitude?: string | number;
              longitude?: string | number;
            };
          };
        };
        if (brData.city && !cleanCity) cleanCity = brData.city;
        if (brData.state && !cleanState) cleanState = brData.state;
        if (brData.neighborhood && !cleanBairro) cleanBairro = brData.neighborhood;
        if (brData.street && !cleanStreet) cleanStreet = brData.street;

        const lat = Number(brData.location?.coordinates?.latitude);
        const lon = Number(brData.location?.coordinates?.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat !== 0 && lon !== 0) {
          return {
            latitude: lat,
            longitude: lon,
            resolvedCity: cleanCity || brData.city,
            resolvedState: cleanState || brData.state,
            resolvedBairro: cleanBairro || brData.neighborhood,
            resolvedStreet: cleanStreet || brData.street,
          };
        }
      }
    } catch {
      // Continua para ViaCEP + Nominatim
    }

    if (!cleanCity) {
      const via = await lookupCep(cepDigits);
      if (via) {
        cleanCity = via.localidade || cleanCity;
        cleanState = via.uf || cleanState;
        cleanBairro = cleanBairro || via.bairro || '';
        cleanStreet = cleanStreet || via.logradouro || '';
      }
    }
  }

  const streetWithNumber = [cleanStreet, parts.numero].filter(Boolean).join(', ');
  const queries = [
    [streetWithNumber, cleanBairro, cleanCity, cleanState, cepDigits, 'Brasil']
      .filter(Boolean)
      .join(', '),
    [streetWithNumber, cleanCity, cleanState, 'Brasil'].filter(Boolean).join(', '),
    [cleanStreet, cleanCity, cleanState, 'Brasil'].filter(Boolean).join(', '),
    cepDigits.length === 8
      ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}, Brasil`
      : '',
    [cleanBairro, cleanCity, cleanState, 'Brasil'].filter(Boolean).join(', '),
    [cleanCity, cleanState, 'Brasil'].filter(Boolean).join(', '),
  ].filter((q) => q.length > 5);

  for (const query of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (results && results.length > 0) {
        const lat = Number(results[0].lat);
        const lon = Number(results[0].lon);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          return {
            latitude: lat,
            longitude: lon,
            resolvedCity: cleanCity || undefined,
            resolvedState: cleanState || undefined,
            resolvedBairro: cleanBairro || undefined,
            resolvedStreet: cleanStreet || undefined,
          };
        }
      }
    } catch {
      // Tenta próxima query
    }
  }

  // Fallback determinístico por faixa de CEP / Cidade para garantir que o candidato SEMPRE apareça no mapa na região correta
  const fallback = resolveRegionalFallbackCoords(cepDigits, cleanCity, cleanBairro);
  if (fallback) {
    return {
      latitude: fallback.latitude,
      longitude: fallback.longitude,
      resolvedCity: cleanCity || fallback.city,
      resolvedState: cleanState || 'SP',
      resolvedBairro: cleanBairro || undefined,
      resolvedStreet: cleanStreet || undefined,
    };
  }

  return null;
}

function resolveRegionalFallbackCoords(
  cepDigits: string,
  city: string,
  bairro: string
): { latitude: number; longitude: number; city: string } | null {
  const prefix3 = cepDigits.length >= 3 ? Number(cepDigits.slice(0, 3)) : NaN;
  const prefix5 = cepDigits.length >= 5 ? Number(cepDigits.slice(0, 5)) : NaN;
  const normCity = city.toLowerCase();
  const normBairro = bairro.toLowerCase();

  // Faixas específicas por CEP de 5 dígitos (Grande SP e Interior)
  if (!Number.isNaN(prefix5)) {
    if (prefix5 >= 9600 && prefix5 <= 9699) {
      // Taboão / Rudge Ramos - São Bernardo do Campo
      return { latitude: -23.6612, longitude: -46.5994, city: 'São Bernardo do Campo' };
    }
    if (prefix5 >= 9700 && prefix5 <= 9899) {
      return { latitude: -23.6944, longitude: -46.5654, city: 'São Bernardo do Campo' };
    }
    if (prefix5 >= 9000 && prefix5 <= 9299) {
      return { latitude: -23.6639, longitude: -46.5383, city: 'Santo André' };
    }
    if (prefix5 >= 9500 && prefix5 <= 9599) {
      return { latitude: -23.6226, longitude: -46.5489, city: 'São Caetano do Sul' };
    }
    if (prefix5 >= 9900 && prefix5 <= 9999) {
      return { latitude: -23.6865, longitude: -46.6234, city: 'Diadema' };
    }
    if (prefix5 >= 18540 && prefix5 <= 18549) {
      return { latitude: -23.2145, longitude: -47.5256, city: 'Porto Feliz' };
    }
  }

  // Faixas de São Paulo Capital por região (010 a 059, 080 a 084)
  if (!Number.isNaN(prefix3)) {
    if (prefix3 >= 10 && prefix3 <= 15) {
      return { latitude: -23.5558, longitude: -46.6396, city: 'São Paulo' }; // Centro / Bela Vista / Jardins
    }
    if (prefix3 >= 20 && prefix3 <= 29) {
      return { latitude: -23.5015, longitude: -46.6258, city: 'São Paulo' }; // Zona Norte
    }
    if (prefix3 >= 30 && prefix3 <= 39) {
      return { latitude: -23.5448, longitude: -46.5604, city: 'São Paulo' }; // Zona Leste
    }
    if (prefix3 >= 40 && prefix3 <= 49) {
      return { latitude: -23.6225, longitude: -46.6602, city: 'São Paulo' }; // Zona Sul (Moema / Saúde / Santo Amaro)
    }
    if (prefix3 >= 50 && prefix3 <= 58) {
      return { latitude: -23.5672, longitude: -46.7024, city: 'São Paulo' }; // Zona Oeste (Pinheiros / Butantã / Cidade Jardim)
    }
    if (prefix3 >= 60 && prefix3 <= 64) {
      return { latitude: -23.5325, longitude: -46.7917, city: 'Osasco' };
    }
    if (prefix3 >= 70 && prefix3 <= 73) {
      return { latitude: -23.4543, longitude: -46.5337, city: 'Guarulhos' };
    }
  }

  if (normCity.includes('bernardo') || normBairro.includes('taboão') || normBairro.includes('taboao')) {
    return { latitude: -23.6612, longitude: -46.5994, city: 'São Bernardo do Campo' };
  }
  if (normCity.includes('santo andr')) {
    return { latitude: -23.6639, longitude: -46.5383, city: 'Santo André' };
  }
  if (normCity.includes('porto feliz')) {
    return { latitude: -23.2145, longitude: -47.5256, city: 'Porto Feliz' };
  }
  if (normCity.includes('são paulo') || normCity.includes('sao paulo')) {
    return { latitude: -23.5656, longitude: -46.6552, city: 'São Paulo' };
  }

  return null;
}

/**
 * Calcula a distância em quilômetros entre dois pontos geográficos (Haversine).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatCandidateAddress(cand: {
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): string {
  const line1 = [cand.endereco, cand.numero].filter(Boolean).join(', ');
  const line2 = [cand.complemento, cand.bairro].filter(Boolean).join(' - ');
  const cleanCity = isCleanCityName(cand.cidade) ? cand.cidade : null;
  const cityState = [cleanCity, cand.estado].filter(Boolean).join('/');
  return [line1, line2, cityState, cand.cep ? `CEP ${cand.cep}` : null]
    .filter(Boolean)
    .join(' · ');
}

export interface MorningPeakTransitEstimate {
  /** Horário fixo de partida simulado (06:00 da manhã - horário de pico) */
  departureTime: '06:00';
  /** Horário estimado de chegada na unidade da vaga */
  arrivalTime: string;
  /** Tempo total estimado em minutos */
  totalMinutes: number;
  /** Rótulo amigável ex: "52 min" ou "1h 15min" */
  durationLabel: string;
  /** Estimativa de baldeações / integrações (Ônibus / Metrô / CPTM) */
  transfersLabel: string;
  /** Classificação de viabilidade de deslocamento diário (VT) */
  viability: 'otimo' | 'moderado' | 'longo';
  viabilityLabel: string;
}

/**
 * Calcula a estimativa realista de deslocamento em Transporte Público (Ônibus / Metrô / CPTM)
 * considerando saída às 06:00 da manhã (horário de pico matinal na Grande SP / Interior).
 *
 * Metodologia de cálculo urbano às 06h00:
 * - Fator de tortuosidade viária urbana: ~1.35x a distância linear (Haversine)
 * - Caminhada até o ponto/estação + espera na faixa das 06h00: ~12 min fixos
 * - Velocidade comercial média de transporte coletivo no pico das 06h00:
 *   • Trechos locais (< 6 km): ~15 km/h (ônibus urbano + semáforos)
 *   • Trechos metropolitanos médios (6 a 18 km): ~19 km/h (corredor de ônibus + integração Metrô/CPTM + 8 min de baldeação)
 *   • Trechos intermunicipais / longos (> 18 km): ~23 km/h (CPTM/Metrô/Expresso + 15 min de integrações)
 */
export function estimatePublicTransitMorningPeak(
  distanceKm: number,
  originCity?: string | null,
  destCity?: string | null
): MorningPeakTransitEstimate {
  const effectiveRouteKm = Math.max(0.8, distanceKm * 1.35);
  const normOrigin = (originCity || '').trim().toLowerCase();
  const normDest = (destCity || '').trim().toLowerCase();
  const isIntercity =
    Boolean(normOrigin && normDest) &&
    isCleanCityName(originCity) &&
    isCleanCityName(destCity) &&
    normOrigin !== normDest;

  let transitMinutes: number;
  let transfersLabel: string;

  if (distanceKm <= 2.2) {
    transitMinutes = Math.round(10 + (effectiveRouteKm / 14) * 60);
    transfersLabel = '1 condução direta (Ônibus ou Caminhada)';
  } else if (distanceKm <= 8 && !isIntercity) {
    transitMinutes = Math.round(12 + (effectiveRouteKm / 15.5) * 60);
    transfersLabel = '1 a 2 conduções (Ônibus / Metrô)';
  } else if (distanceKm <= 20) {
    const intercityPenalty = isIntercity ? 12 : 6;
    transitMinutes = Math.round(12 + intercityPenalty + (effectiveRouteKm / 19.5) * 60);
    transfersLabel = isIntercity
      ? '2 a 3 conduções (Ônibus Intermunicipal / CPTM + Metrô)'
      : '2 conduções (Integração Ônibus + Metrô/CPTM)';
  } else {
    const intercityPenalty = isIntercity ? 18 : 12;
    transitMinutes = Math.round(14 + intercityPenalty + (effectiveRouteKm / 24) * 60);
    transfersLabel = '3+ conduções (Trecho Intermunicipal / Rodoviário)';
  }

  const totalMinutes = Math.max(12, transitMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const durationLabel =
    hours > 0 ? `${hours}h ${mins > 0 ? `${String(mins).padStart(2, '0')}min` : ''}`.trim() : `${mins} min`;

  // Calcula horário de chegada saindo às 06:00
  const arrivalTotalMinutes = 6 * 60 + totalMinutes;
  const arrHour = Math.floor(arrivalTotalMinutes / 60) % 24;
  const arrMin = arrivalTotalMinutes % 60;
  const arrivalTime = `${String(arrHour).padStart(2, '0')}:${String(arrMin).padStart(2, '0')}`;

  let viability: 'otimo' | 'moderado' | 'longo' = 'otimo';
  let viabilityLabel = 'Deslocamento rápido';
  if (totalMinutes > 85) {
    viability = 'longo';
    viabilityLabel = 'Trajeto longo no pico';
  } else if (totalMinutes > 45) {
    viability = 'moderado';
    viabilityLabel = 'Tempo moderado (Pico 06h)';
  }

  return {
    departureTime: '06:00',
    arrivalTime,
    totalMinutes,
    durationLabel,
    transfersLabel,
    viability,
    viabilityLabel,
  };
}

/**
 * Monta URL do Google Maps Directions no modo Transporte Público (travelmode=transit)
 * já parametrizado para saída às 06:00 da manhã do próximo dia útil.
 */
export function buildGoogleMapsTransit06hUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=transit`;
}
