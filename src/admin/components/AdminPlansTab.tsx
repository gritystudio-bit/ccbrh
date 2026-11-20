import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';
import type { AdminTheme, BillingCouponRecord, BillingGateway } from '../types';
import {
  CCBRH_PLAN_DEFINITIONS,
  createBillingCoupon,
  deleteBillingCoupon,
  fetchBillingCoupons,
  toggleBillingCoupon,
} from '../services/adminService';
import { formatBRL } from '../routeUtils';

interface AdminPlansTabProps {
  theme: AdminTheme;
}

const GATEWAY_LINKS = [
  {
    name: 'Stripe Dashboard',
    description: 'Assinaturas internacionais/cartão, webhooks e faturas',
    url: 'https://dashboard.stripe.com',
  },
  {
    name: 'Asaas Painel',
    description: 'Boletos, Pix recorrente e NFS-e automatizada no Brasil',
    url: 'https://www.asaas.com',
  },
  {
    name: 'Mercado Pago Developers',
    description: 'Checkout transparente e gestão de cobranças',
    url: 'https://www.mercadopago.com.br/developers',
  },
  {
    name: 'Resend E-mails',
    description: 'Domínios verificados e logs de disparo de holerites/campanhas',
    url: 'https://resend.com/overview',
  },
];

export const AdminPlansTab: React.FC<AdminPlansTabProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [coupons, setCoupons] = useState<BillingCouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('15');
  const [maxRedemptions, setMaxRedemptions] = useState('50');
  const [validUntil, setValidUntil] = useState('');
  const [gateway, setGateway] = useState<BillingGateway>('manual');

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchBillingCoupons();
      setCoupons(list);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao carregar cupons.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 3) {
      setFeedback({ type: 'error', message: 'Informe um código com ao menos 3 caracteres.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await createBillingCoupon({
        code,
        description,
        discount_type: discountType,
        discount_value: Number(discountValue) || 10,
        max_redemptions: maxRedemptions ? Number(maxRedemptions) : null,
        valid_until: validUntil ? `${validUntil}T23:59:59Z` : null,
        gateway,
      });
      setCode('');
      setDescription('');
      setFeedback({ type: 'success', message: 'Cupom promocional criado com sucesso.' });
      await loadCoupons();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao criar cupom.',
      });
    } finally {
      setSaving(false);
    }
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
          Monetização, Quotas & Gateways
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Planos & Billing</h1>
      </div>

      {/* Planos vigentes */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {CCBRH_PLAN_DEFINITIONS.map((plan) => (
          <div key={plan.tier} className={`rounded-xl border p-5 flex flex-col justify-between gap-4 ${cardClass}`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold uppercase text-[#9F8548]">{plan.tier}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#082175]/10 text-[#082175] dark:bg-[#f5a90e]/15 dark:text-[#f5a90e]">
                  {plan.storageQuotaMb >= 1024 ? `${plan.storageQuotaMb / 1024} GB` : `${plan.storageQuotaMb} MB`}
                </span>
              </div>
              <h2 className="text-base font-extrabold">{plan.name}</h2>
              <p className="text-2xl font-extrabold tracking-tight">
                {plan.monthlyPrice > 0 ? `${formatBRL(plan.monthlyPrice)}/mês` : 'Sob consulta'}
              </p>
              <p className={`text-xs ${mutedText}`}>{plan.tagline}</p>
            </div>
            <ul className={`space-y-1.5 text-xs pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              {plan.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Cupons Promocionais */}
      <section className={`rounded-xl border p-5 space-y-4 ${cardClass}`}>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#f5a90e]" />
          <h2 className="text-base font-bold">Cupons Promocionais</h2>
        </div>

        <form onSubmit={handleCreateCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código (ex: CCB20)"
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-mono ${inputClass}`}
          />
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
            className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          >
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
          <input
            type="number"
            min="1"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder="Desconto"
            className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          />
          <input
            type="number"
            min="1"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Limite usos"
            className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          />
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          />
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <Plus className="w-4 h-4 text-[#f5a90e]" />
            <span>{saving ? 'Criando...' : 'Criar Cupom'}</span>
          </button>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição comercial do cupom (opcional)"
            className={`sm:col-span-2 lg:col-span-4 min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          />
          <select
            value={gateway}
            onChange={(e) => setGateway(e.target.value as BillingGateway)}
            className={`lg:col-span-2 min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
          >
            <option value="manual">Gateway: Manual</option>
            <option value="stripe">Gateway: Stripe</option>
            <option value="asaas">Gateway: Asaas</option>
            <option value="mercadopago">Gateway: Mercado Pago</option>
          </select>
        </form>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#f5a90e]" />
          </div>
        ) : coupons.length === 0 ? (
          <p className={`text-xs ${mutedText}`}>Nenhum cupom promocional cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={isDark ? 'bg-slate-800/70' : 'bg-slate-50'}>
                  <th className="py-2.5 px-3 font-bold">Código</th>
                  <th className="py-2.5 px-3 font-bold">Desconto</th>
                  <th className="py-2.5 px-3 font-bold">Gateway</th>
                  <th className="py-2.5 px-3 font-bold">Usos</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold">{c.code}</span>
                      {c.description && <p className={`text-[11px] ${mutedText}`}>{c.description}</p>}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : formatBRL(c.discount_value)}
                    </td>
                    <td className="py-2.5 px-3 capitalize">{c.gateway}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {c.redemptions_count}/{c.max_redemptions ?? '∞'}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleBillingCoupon(c.id, !c.active);
                          await loadCoupons();
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                          c.active ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteBillingCoupon(c.id);
                          await loadCoupons();
                        }}
                        aria-label={`Excluir cupom ${c.code}`}
                        className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Links rápidos para painéis dos gateways */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9F8548]">
          Painéis de Gateways & Provedores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {GATEWAY_LINKS.map((gw) => (
            <a
              key={gw.name}
              href={gw.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-h-[44px] rounded-xl border p-4 flex flex-col justify-between gap-2 hover:border-[#f5a90e] transition-colors ${cardClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">{gw.name}</span>
                <ExternalLink className="w-4 h-4 text-[#f5a90e]" />
              </div>
              <p className={`text-[11px] leading-snug ${mutedText}`}>{gw.description}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
