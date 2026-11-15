import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Candidate, CompanyBranch, Vacancy } from '../types/database';
import {
  buildGoogleMapsTransit06hUrl,
  calculateDistanceKm,
  estimatePublicTransitMorningPeak,
  formatCandidateAddress,
  isCleanCityName,
} from '../utils/geocoding';
import {
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
} from 'lucide-react';

interface CandidateLocationMapProps {
  candidates: Candidate[];
  branches: CompanyBranch[];
  vacancies: Vacancy[];
  initialSelectedCandidateId?: string | null;
  onGeocodeCandidate: (candidateId: string) => Promise<Candidate | null>;
}

function createPinIcon(color: string, label: string, isBranch = false, isHighlighted = false) {
  const scale = isHighlighted ? 'scale(1.08)' : 'scale(1)';
  const ring = isHighlighted ? '0 0 0 4px rgba(5,150,105,0.28), ' : '';
  return L.divIcon({
    className: 'ccbrh-custom-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) ${scale};transition:transform 0.2s;">
      <div style="background:${color};color:#fff;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:${ring}0 3px 8px rgba(0,0,0,0.32);border:2px solid #fff;">
        ${isBranch ? '🏢 ' : '👤 '}${label}
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const CandidateLocationMap: React.FC<CandidateLocationMapProps> = ({
  candidates,
  branches,
  vacancies,
  initialSelectedCandidateId = null,
  onGeocodeCandidate,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const attemptedAutoGeocodeRef = useRef<Set<string>>(new Set());

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    initialSelectedCandidateId || candidates[0]?.id || null
  );
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [geocodingId, setGeocodingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedCandidateId) {
      setSelectedCandidateId(initialSelectedCandidateId);
    }
  }, [initialSelectedCandidateId]);

  // Auto-geocodifica automaticamente candidatos que possuem CEP/endereço mas ainda estão sem latitude/longitude
  useEffect(() => {
    const missingCoords = candidates.filter(
      (c) =>
        (c.latitude == null || c.longitude == null) &&
        Boolean(c.cep || c.endereco || isCleanCityName(c.cidade)) &&
        !attemptedAutoGeocodeRef.current.has(c.id)
    );
    if (missingCoords.length === 0) return;

    missingCoords.forEach((cand) => {
      attemptedAutoGeocodeRef.current.add(cand.id);
      void onGeocodeCandidate(cand.id);
    });
  }, [candidates, onGeocodeCandidate]);

  const availableCities = Array.from(
    new Set(
      candidates
        .map((c) => (isCleanCityName(c.cidade) ? c.cidade!.trim() : null))
        .filter((city): city is string => Boolean(city))
    )
  );

  const filteredCandidates = candidates.filter((c) => {
    if (cityFilter !== 'all' && (c.cidade || '').trim() !== cityFilter) return false;
    return true;
  });

  // Helper para calcular distâncias e estimativa de transporte público (saída às 06h00 - pico) para todas as filiais
  const getBranchDistancesForCandidate = (cand: Candidate) => {
    if (cand.latitude == null || cand.longitude == null) return [];
    return branches
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => {
        const distanceKm = calculateDistanceKm(
          cand.latitude!,
          cand.longitude!,
          b.latitude!,
          b.longitude!
        );
        const transit = estimatePublicTransitMorningPeak(
          distanceKm,
          cand.cidade,
          b.cidade
        );
        return {
          branch: b,
          distanceKm,
          transit,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  };

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-23.595, -46.65], // Grande São Paulo default
      zoom: 11,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layer;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers & proximity lines when candidates/branches/selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const boundsPoints: L.LatLngExpression[] = [];

    const selectedCand =
      filteredCandidates.find((c) => c.id === selectedCandidateId) || null;
    const selectedVac = selectedCand
      ? vacancies.find((v) => v.id === selectedCand.vacancy_id)
      : undefined;
    const appliedBranch =
      (selectedVac?.branch_id
        ? branches.find((b) => b.id === selectedVac.branch_id)
        : undefined) ||
      branches.find((b) => b.is_headquarters) ||
      branches[0];

    // 1. Renderiza todas as filiais/unidades da empresa
    branches.forEach((branch) => {
      if (branch.latitude != null && branch.longitude != null) {
        const pos: L.LatLngExpression = [branch.latitude, branch.longitude];
        boundsPoints.push(pos);
        const isAppliedBranch = appliedBranch?.id === branch.id;
        const shortLabel = branch.label.replace(/^Filial\s*·\s*/i, '').trim();

        const marker = L.marker(pos, {
          icon: createPinIcon(
            isAppliedBranch ? '#082175' : '#03416A',
            shortLabel,
            true,
            isAppliedBranch
          ),
        });
        marker.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;min-width:190px;">
            <div style="font-size:10px;font-weight:700;color:#9F8548;text-transform:uppercase;">
              ${branch.is_headquarters ? 'Matriz da Empresa' : 'Filial / Unidade'}
            </div>
            <strong style="color:#082175;font-size:13px;">${branch.label}</strong><br/>
            <span style="color:#334155;">${branch.endereco || ''}</span><br/>
            <span style="color:#64748b;">${[branch.cidade, branch.estado].filter(Boolean).join('/')} ${
            branch.cep ? `· CEP ${branch.cep}` : ''
          }</span>
          </div>`
        );
        marker.addTo(layer);
      }
    });

    // 2. Renderiza todos os candidatos e linhas de proximidade
    let selectedMarker: L.Marker | null = null;

    filteredCandidates.forEach((cand) => {
      if (cand.latitude != null && cand.longitude != null) {
        const pos: L.LatLngExpression = [cand.latitude, cand.longitude];
        boundsPoints.push(pos);
        const isSelected = cand.id === selectedCandidateId;
        const vac = vacancies.find((v) => v.id === cand.vacancy_id);
        const candAppliedBranch =
          (vac?.branch_id ? branches.find((b) => b.id === vac.branch_id) : undefined) ||
          branches.find((b) => b.is_headquarters) ||
          branches[0];

        const allDists = getBranchDistancesForCandidate(cand);
        const closestBranchInfo = allDists[0] || null;
        const appliedDist =
          candAppliedBranch?.latitude != null && candAppliedBranch?.longitude != null
            ? calculateDistanceKm(
                cand.latitude,
                cand.longitude,
                candAppliedBranch.latitude,
                candAppliedBranch.longitude
              )
            : closestBranchInfo?.distanceKm ?? null;
        const appliedTransit =
          appliedDist !== null
            ? estimatePublicTransitMorningPeak(
                appliedDist,
                cand.cidade,
                candAppliedBranch?.cidade
              )
            : null;

        // Se este candidato está selecionado, desenha a linha tracejada conectando a residência dele até a Filial da Vaga (e à Filial mais próxima)
        if (isSelected && candAppliedBranch?.latitude != null && candAppliedBranch?.longitude != null) {
          const line = L.polyline(
            [
              [cand.latitude, cand.longitude],
              [candAppliedBranch.latitude, candAppliedBranch.longitude],
            ],
            {
              color: '#059669',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.85,
            }
          );
          line.addTo(layer);
        }

        const marker = L.marker(pos, {
          icon: createPinIcon(
            isSelected ? '#059669' : '#d97706',
            `${cand.full_name.split(' ')[0]}${
              appliedTransit
                ? ` · 🚌 ~${appliedTransit.durationLabel}`
                : appliedDist !== null
                ? ` (${appliedDist} km)`
                : ''
            }`,
            false,
            isSelected
          ),
        });

        marker.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;min-width:230px;line-height:1.45;">
            <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;">
              Candidato · ${cand.pipeline_stage.toUpperCase()}
            </div>
            <strong style="color:#082175;font-size:13px;">${cand.full_name}</strong><br/>
            <span style="color:#03416A;font-weight:700;">Vaga: ${vac?.title || 'Vaga'}</span><br/>
            <span style="color:#475569;">${formatCandidateAddress(cand) || 'Endereço não informado'}</span>
            ${
              appliedDist !== null && candAppliedBranch
                ? `<div style="margin-top:6px;padding:6px 8px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;color:#065f46;font-weight:700;">
                    📍 Distância até ${candAppliedBranch.label}: ~${appliedDist} km
                    ${
                      appliedTransit
                        ? `<div style="margin-top:3px;font-size:11px;color:#082175;">
                            🚌 Transp. Público (Saída 06h00): <strong>~${appliedTransit.durationLabel}</strong> (Chegada ~${appliedTransit.arrivalTime})
                          </div>`
                        : ''
                    }
                  </div>`
                : ''
            }
            ${
              closestBranchInfo &&
              candAppliedBranch &&
              closestBranchInfo.branch.id !== candAppliedBranch.id
                ? `<div style="margin-top:4px;font-size:11px;color:#03416A;font-weight:600;">
                    💡 Filial mais próxima: ${closestBranchInfo.branch.label} (~${closestBranchInfo.distanceKm} km · 🚌 ~${closestBranchInfo.transit.durationLabel})
                  </div>`
                : ''
            }
          </div>`
        );
        marker.on('click', () => setSelectedCandidateId(cand.id));
        marker.addTo(layer);

        if (isSelected) {
          selectedMarker = marker;
        }
      }
    });

    // 3. Enquadramento inteligente: se houver um candidato selecionado com coordenadas, enquadra o candidato + a unidade da vaga para mostrar a relação espacial!
    if (
      selectedCand?.latitude != null &&
      selectedCand?.longitude != null
    ) {
      if (appliedBranch?.latitude != null && appliedBranch?.longitude != null) {
        const pairBounds = L.latLngBounds([
          [selectedCand.latitude, selectedCand.longitude],
          [appliedBranch.latitude, appliedBranch.longitude],
        ]);
        map.fitBounds(pairBounds, { padding: [70, 70], maxZoom: 13, animate: true });
      } else {
        map.setView([selectedCand.latitude, selectedCand.longitude], 13, { animate: true });
      }
      if (selectedMarker) {
        setTimeout(() => {
          selectedMarker?.openPopup();
        }, 250);
      }
      return;
    }

    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 13 });
    }
  }, [filteredCandidates, branches, vacancies, selectedCandidateId]);

  const handleGeocodeAndFocus = async (candidate: Candidate) => {
    setSelectedCandidateId(candidate.id);
    if (candidate.latitude != null && candidate.longitude != null) {
      return;
    }
    setGeocodingId(candidate.id);
    try {
      const updated = await onGeocodeCandidate(candidate.id);
      if (updated) {
        setSelectedCandidateId(updated.id);
      }
    } finally {
      setGeocodingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#082175] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#9F8548]" />
            <span>Mapa de Proximidade: Candidatos × Unidades / Filiais da Empresa</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Clique em um candidato para visualizar no mapa sua residência, a linha de distância até a unidade da vaga e qual filial fica mais próxima.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-[#082175]" />
            <span className="text-slate-600 font-medium">
              Unidades/Filiais ({branches.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-600" />
            <span className="text-slate-600 font-medium">
              Candidatos Mapeados ({filteredCandidates.filter((c) => c.latitude != null).length}/{filteredCandidates.length})
            </span>
          </div>

          <select
            aria-label="Filtrar candidatos por cidade"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#082175]"
          >
            <option value="all">Todas as cidades</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Lista lateral de candidatos e distâncias por filial */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 max-h-[580px] overflow-y-auto divide-y divide-slate-100">
          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum candidato encontrado para exibição geográfica.
            </div>
          ) : (
            filteredCandidates.map((cand) => {
              const vac = vacancies.find((v) => v.id === cand.vacancy_id);
              const appliedBranch =
                (vac?.branch_id ? branches.find((b) => b.id === vac.branch_id) : undefined) ||
                branches.find((b) => b.is_headquarters) ||
                branches[0];
              const addr = formatCandidateAddress(cand);
              const hasCoords = cand.latitude != null && cand.longitude != null;
              const branchDistances = getBranchDistancesForCandidate(cand);
              const closestBranch = branchDistances[0] || null;
              const appliedDist =
                hasCoords && appliedBranch?.latitude != null && appliedBranch?.longitude != null
                  ? calculateDistanceKm(
                      cand.latitude!,
                      cand.longitude!,
                      appliedBranch.latitude,
                      appliedBranch.longitude
                    )
                  : null;
              const appliedTransit =
                appliedDist !== null
                  ? estimatePublicTransitMorningPeak(
                      appliedDist,
                      cand.cidade,
                      appliedBranch?.cidade
                    )
                  : null;
              const transitRouteUrl =
                hasCoords && appliedBranch?.latitude != null && appliedBranch?.longitude != null
                  ? buildGoogleMapsTransit06hUrl(
                      cand.latitude!,
                      cand.longitude!,
                      appliedBranch.latitude,
                      appliedBranch.longitude
                    )
                  : null;
              const mapsQuery = encodeURIComponent(
                addr || `${isCleanCityName(cand.cidade) ? cand.cidade : ''} ${cand.estado || ''}`
              );
              const isSelected = selectedCandidateId === cand.id;

              return (
                <div
                  key={cand.id}
                  onClick={() => void handleGeocodeAndFocus(cand)}
                  className={`p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#E0F4F7]/70 border-l-4 border-l-[#082175]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[#082175]">{cand.full_name}</h4>
                        {hasCoords && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" /> No Mapa
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-[#03416A] mt-0.5">
                        Vaga: {vac?.title || 'Vaga Geral'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 capitalize">
                      {cand.pipeline_stage}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#9F8548] shrink-0 mt-0.5" />
                    <span>{addr || 'Endereço não informado na candidatura'}</span>
                  </div>

                  {appliedBranch && (
                    <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-[#082175] flex items-center gap-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-[#082175] shrink-0" />
                          <span className="truncate">Unidade da Vaga: {appliedBranch.label}</span>
                        </span>
                        {appliedDist !== null && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-[10px] shrink-0">
                            ~{appliedDist} km
                          </span>
                        )}
                      </div>

                      {/* Estimativa de Tempo em Transporte Público saindo às 06:00 da manhã (Horário de Pico) */}
                      {appliedTransit && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#082175]">
                              <Bus className="w-3.5 h-3.5 text-[#03416A]" />
                              <span>Transp. Público (Pico · Saída 06:00)</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                                appliedTransit.viability === 'otimo'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : appliedTransit.viability === 'moderado'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              ~{appliedTransit.durationLabel}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#9F8548]" />
                              <span>
                                Saída <strong>06:00</strong> → Chegada est.{' '}
                                <strong>{appliedTransit.arrivalTime}</strong>
                              </span>
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">
                              {appliedTransit.transfersLabel}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Comparativo de proximidade e tempo de viagem com outras filiais da empresa */}
                      {branchDistances.length > 1 && (
                        <div className="pt-1.5 border-t border-slate-100 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#9F8548]" />
                            <span>Comparativo de Unidades (Distância & Pico 06h):</span>
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {branchDistances.slice(0, 3).map((item, idx) => (
                              <div
                                key={item.branch.id}
                                className="flex items-center justify-between text-[10px] text-slate-600"
                              >
                                <span className="truncate">
                                  {idx === 0 ? '⭐ ' : '• '}
                                  {item.branch.label}
                                  {idx === 0 ? ' (Mais próxima)' : ''}
                                </span>
                                <span
                                  className={`font-mono font-semibold shrink-0 ml-2 ${
                                    idx === 0 ? 'text-emerald-700 font-bold' : 'text-slate-500'
                                  }`}
                                >
                                  ~{item.distanceKm} km · 🚌 {item.transit.durationLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={geocodingId === cand.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleGeocodeAndFocus(cand);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#082175] text-white text-[10px] font-semibold hover:bg-[#0a2a8a] cursor-pointer"
                    >
                      {geocodingId === cand.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Navigation className="w-3 h-3 text-[#f5a90e]" />
                      )}
                      <span>
                        {hasCoords ? 'Focar Candidato × Filial no Mapa' : 'Localizar no Mapa'}
                      </span>
                    </button>

                    {closestBranch && appliedBranch && closestBranch.branch.id !== appliedBranch.id && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        Mais perto de: {closestBranch.branch.label.replace(/^Filial\s*·\s*/i, '')} (~{closestBranch.transit.durationLabel})
                      </span>
                    )}

                    {transitRouteUrl ? (
                      <a
                        href={transitRouteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#03416A] hover:underline ml-auto"
                        title="Abrir rota de Transporte Público no Google Maps"
                      >
                        <Bus className="w-3 h-3" />
                        <span>Rota Transporte Público</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      addr && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#03416A] hover:underline ml-auto"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Maps</span>
                        </a>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mapa Leaflet */}
        <div className="lg:col-span-7 h-[580px] relative bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>
      </div>
    </div>
  );
};
