import React from 'react';

interface ModuleBannerProps {
  badge?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  bottomSlot?: React.ReactNode;
  maxSubtitleWidth?: string;
}

/**
 * Cabeçalho padrão compacto com gradiente azul institucional (#082175)
 * compartilhado pelos módulos do CCBRH.
 */
export const ModuleBanner: React.FC<ModuleBannerProps> = ({
  badge,
  title,
  subtitle,
  actions,
  bottomSlot,
  maxSubtitleWidth = 'max-w-3xl',
}) => {
  return (
    <div className="bg-gradient-to-r from-[#082175] via-[#0a2c96] to-[#082175] rounded-2xl px-5 py-4 text-white shadow-md border border-[#03416A]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {badge && <div className="flex flex-wrap items-center gap-2">{badge}</div>}
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-snug">{title}</h1>
          {subtitle && (
            <p className={`text-[11px] sm:text-xs text-slate-200 leading-relaxed ${maxSubtitleWidth}`}>
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {bottomSlot && <div className="mt-3 pt-3 border-t border-white/15">{bottomSlot}</div>}
    </div>
  );
};
