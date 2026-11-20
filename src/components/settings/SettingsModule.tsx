import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Users,
  Shield,
  Mail,
  Phone,
  Building2,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Power,
  BadgeCheck,
  Clock,
  Camera,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCcb } from '../../context/CcbContext';
import { processAvatarImageFile } from '../../utils/avatarImage';
import { ModuleBanner } from '../ui/ModuleBanner';

interface UserProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: 'ccb_admin' | 'ccb_hr' | 'company_manager';
  role_label: string;
  avatar_url?: string | null;
  phone: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserInvitationRow {
  id: string;
  email: string;
  full_name: string;
  role: 'ccb_admin' | 'ccb_hr' | 'company_manager';
  role_label: string;
  department: string | null;
  status: 'Pendente' | 'Ativo' | 'Revogado';
  invite_token: string;
  invited_by_email: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLE_OPTIONS: Array<{
  value: 'ccb_admin' | 'ccb_hr' | 'company_manager';
  label: string;
  defaultRoleLabel: string;
  description: string;
}> = [
  {
    value: 'ccb_admin',
    label: 'Administrador',
    defaultRoleLabel: 'Administrador · CCB Soluções em RH',
    description: 'Acesso total a empresas, folha, configurações, usuários e parâmetros.',
  },
  {
    value: 'ccb_hr',
    label: 'Consultor(a) de RH & DP',
    defaultRoleLabel: 'Consultoria de RH & DP · CCB Soluções em RH',
    description: 'Gestão completa de recrutamento, funcionários, documentos e folha.',
  },
  {
    value: 'company_manager',
    label: 'Gestor Cliente / Visualizador',
    defaultRoleLabel: 'Gestor Corporativo · Empresa Cliente',
    description: 'Acompanhamento de indicadores, vagas e quadro de colaboradores.',
  },
];

export const SettingsModule: React.FC = () => {
  const { authUser, refreshDatabase } = useCcb();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'team'>('profile');

  // Estados gerais de carregamento e feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [invitingUser, setInvitingUser] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado Meu Perfil
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    role_label: '',
    department: 'Administração & Gestão Estratégica',
    phone: '',
    avatar_url: '' as string | null,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Estado Alteração de Senha
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Estado Equipe & Convites
  const [teamProfiles, setTeamProfiles] = useState<UserProfileRow[]>([]);
  const [invitations, setInvitations] = useState<UserInvitationRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal/Formulário de Novo Convite
  const [inviteForm, setInviteForm] = useState<{
    full_name: string;
    email: string;
    role: 'ccb_admin' | 'ccb_hr' | 'company_manager';
    role_label: string;
    department: string;
    initial_password: string;
    provisionMode: 'instant' | 'invite_only';
  }>({
    full_name: '',
    email: '',
    role: 'ccb_hr',
    role_label: 'Consultoria de RH & DP · CCB Soluções em RH',
    department: 'Recursos Humanos & Departamento Pessoal',
    initial_password: '',
    provisionMode: 'instant',
  });

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchSettingsData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, invitesRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, email, full_name, role, role_label, avatar_url, phone, department, is_active, created_at')
          .order('created_at', { ascending: true }),
        supabase
          .from('user_invitations')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      const rows = (profilesRes.data || []) as UserProfileRow[];
      setTeamProfiles(rows);

      if (!invitesRes.error && invitesRes.data) {
        setInvitations(invitesRes.data as UserInvitationRow[]);
      }

      if (authUser) {
        const myRow = rows.find((r) => r.id === authUser.id);
        setProfileForm({
          full_name: myRow?.full_name || authUser.name || 'Administrador',
          email: myRow?.email || authUser.email || '',
          role_label: myRow?.role_label || authUser.roleLabel || 'Administrador · CCB Soluções em RH',
          department: myRow?.department || 'Administração & Gestão Estratégica',
          phone: myRow?.phone || '',
          avatar_url: myRow?.avatar_url || authUser.avatarUrl || null,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar configurações.';
      notify('error', msg);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    void fetchSettingsData();
  }, [fetchSettingsData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    if (!profileForm.full_name.trim()) {
      notify('error', 'Informe o nome de exibição do perfil.');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileForm.full_name.trim(),
          role_label: profileForm.role_label.trim() || 'Administrador · CCB Soluções em RH',
          department: profileForm.department.trim() || null,
          phone: profileForm.phone.trim() || null,
          avatar_url: profileForm.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);

      if (error) throw error;

      await refreshDatabase();
      await fetchSettingsData();
      notify('success', 'Perfil atualizado com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar perfil.';
      notify('error', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;
    setUploadingAvatar(true);
    try {
      const dataUrl = await processAvatarImageFile(file, 320);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: dataUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);
      if (error) throw error;

      setProfileForm((prev) => ({ ...prev, avatar_url: dataUrl }));
      await refreshDatabase();
      await fetchSettingsData();
      notify('success', 'Foto do seu perfil atualizada com sucesso!');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao atualizar foto do perfil.');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!authUser) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);
      if (error) throw error;

      setProfileForm((prev) => ({ ...prev, avatar_url: null }));
      await refreshDatabase();
      await fetchSettingsData();
      notify('success', 'Foto do perfil removida.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao remover foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      notify('error', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('error', 'A confirmação de senha não confere.');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;

      setPasswordForm({ newPassword: '', confirmPassword: '' });
      notify('success', 'Senha de acesso atualizada com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar a senha.';
      notify('error', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRoleSelectChange = (roleValue: 'ccb_admin' | 'ccb_hr' | 'company_manager') => {
    const found = ROLE_OPTIONS.find((r) => r.value === roleValue);
    setInviteForm((prev) => ({
      ...prev,
      role: roleValue,
      role_label: found ? found.defaultRoleLabel : prev.role_label,
    }));
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteForm.email.trim().toLowerCase();
    const cleanName = inviteForm.full_name.trim();

    if (!cleanName || !cleanEmail) {
      notify('error', 'Preencha o nome completo e o e-mail corporativo.');
      return;
    }

    if (inviteForm.provisionMode === 'instant' && inviteForm.initial_password.trim().length < 6) {
      notify('error', 'Para liberar acesso imediato, defina uma senha inicial com no mínimo 6 caracteres.');
      return;
    }

    setInvitingUser(true);
    try {
      const { error } = await supabase.rpc('invite_or_create_team_user', {
        p_email: cleanEmail,
        p_full_name: cleanName,
        p_role: inviteForm.role,
        p_role_label: inviteForm.role_label.trim() || 'Consultoria de RH · CCB Soluções em RH',
        p_department: inviteForm.department.trim() || 'Recursos Humanos',
        p_initial_password:
          inviteForm.provisionMode === 'instant' ? inviteForm.initial_password.trim() : null,
      });

      if (error) throw error;

      setInviteForm({
        full_name: '',
        email: '',
        role: 'ccb_hr',
        role_label: 'Consultoria de RH & DP · CCB Soluções em RH',
        department: 'Recursos Humanos & Departamento Pessoal',
        initial_password: '',
        provisionMode: 'instant',
      });

      await fetchSettingsData();
      notify(
        'success',
        inviteForm.provisionMode === 'instant'
          ? `Usuário ${cleanName} (${cleanEmail}) provisionado e ativo para login imediato!`
          : `Convite registrado para ${cleanEmail} com sucesso!`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível convidar/criar o usuário.';
      notify('error', msg);
    } finally {
      setInvitingUser(false);
    }
  };

  const handleToggleUserStatus = async (userRow: UserProfileRow) => {
    if (authUser && userRow.id === authUser.id) {
      notify('error', 'Você não pode desativar o seu próprio usuário administrador ativo.');
      return;
    }

    try {
      const nextStatus = !userRow.is_active;
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', userRow.id);

      if (error) throw error;
      await fetchSettingsData();
      notify(
        'success',
        `Acesso de ${userRow.full_name} foi ${nextStatus ? 'reativado' : 'suspenso'}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status do usuário.';
      notify('error', msg);
    }
  };

  const handleRevokeInvitation = async (inv: UserInvitationRow) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', inv.id);

      if (error) throw error;
      await fetchSettingsData();
      notify('success', `Convite para ${inv.email} removido.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover convite.';
      notify('error', msg);
    }
  };

  const handleCopyInviteLink = async (inv: UserInvitationRow) => {
    const inviteText = `Olá ${inv.full_name}! Seu acesso à plataforma CCB Soluções em RH (${window.location.origin}) foi liberado para o e-mail ${inv.email} (${inv.role_label}).`;
    await navigator.clipboard.writeText(inviteText);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho do Módulo */}
      <ModuleBanner
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-[#f5a90e] text-[10px] font-bold">
            Administração da Plataforma · Governança & Acessos
          </span>
        }
        title="Configurações & Gestão de Usuários"
        subtitle="Personalize os dados do seu perfil administrativo, gerencie credenciais e convide membros da equipe."
        actions={
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('profile')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'profile'
                  ? 'bg-white text-[#082175] shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Meu Perfil & Segurança
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('team')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'team'
                  ? 'bg-white text-[#082175] shadow-sm'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Usuários & Convites ({teamProfiles.length})
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-7 h-7 animate-spin text-[#0b2254]" />
          <p className="text-sm font-medium">Carregando configurações e usuários da plataforma...</p>
        </div>
      ) : activeSubTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Lateral de Identidade */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-[#0b2254] text-amber-400 flex items-center justify-center font-bold text-xl shadow-sm overflow-hidden border border-slate-200">
                    {profileForm.avatar_url ? (
                      <img
                        src={profileForm.avatar_url}
                        alt={profileForm.full_name || 'Administrador'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (profileForm.full_name || 'AD')
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    title="Importar ou trocar foto do perfil"
                    className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-500 text-[#0b2254] border-2 border-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-1">
                    <Shield className="w-3 h-3" />
                    Acesso Administrativo
                  </div>
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {profileForm.full_name || 'Administrador'}
                  </h2>
                  <p className="text-xs text-slate-500 truncate">{profileForm.role_label}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0b2254] text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      <Camera className="w-3 h-3 text-amber-600" />
                      <span>{profileForm.avatar_url ? 'Trocar Foto' : 'Importar Foto'}</span>
                    </button>
                    {profileForm.avatar_url && (
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={handleRemoveAvatar}
                        title="Remover foto do perfil"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-5 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    E-mail de Login
                  </span>
                  <span className="font-semibold text-slate-800">{profileForm.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Departamento
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profileForm.department || 'Não informado'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Telefone / WhatsApp
                  </span>
                  <span className="font-semibold text-slate-800">
                    {profileForm.phone || 'Não cadastrado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-5 rounded-b-2xl">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                As alterações feitas no seu nome de exibição e cargo refletem imediatamente na barra lateral e nos registros de auditoria do sistema.
              </p>
            </div>
          </div>

          {/* Formulários de Edição de Perfil e Senha */}
          <div className="lg:col-span-2 space-y-6">
            <form
              onSubmit={handleSaveProfile}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dados do Perfil</h3>
                  <p className="text-xs text-slate-500">
                    Ajuste como sua conta é identificada na plataforma CCB RH.
                  </p>
                </div>
                <User className="w-5 h-5 text-slate-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome de Exibição *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Ex: Administrador"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail Corporativo (Login)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profileForm.email}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título / Papel na Organização
                  </label>
                  <input
                    type="text"
                    value={profileForm.role_label}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, role_label: e.target.value }))
                    }
                    placeholder="Ex: Administrador · CCB Soluções em RH"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento / Área
                  </label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="Ex: Administração & Gestão Estratégica"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp de Contato
                  </label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b2254] text-white text-xs font-semibold hover:bg-[#133276] disabled:opacity-50 transition-all shadow-sm"
                >
                  {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Alterações do Perfil
                </button>
              </div>
            </form>

            <form
              onSubmit={handleUpdatePassword}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Segurança & Senha de Acesso</h3>
                  <p className="text-xs text-slate-500">
                    Atualize a senha da sua conta conectada.
                  </p>
                </div>
                <KeyRound className="w-5 h-5 text-slate-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    placeholder="Repita a nova senha"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || !passwordForm.newPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda: Convidar / Cadastrar Novo Usuário */}
          <form
            onSubmit={handleInviteUser}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 self-start"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Convidar / Liberar Usuário</h3>
                <p className="text-xs text-slate-500">
                  Adicione membros da equipe CCB RH ou gestores autorizados.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={inviteForm.full_name}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Ex: Ana Paula Mendes"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo *
              </label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="nome@ccbrh.com.br"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Perfil de Permissão *
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  handleRoleSelectChange(
                    e.target.value as 'ccb_admin' | 'ccb_hr' | 'company_manager'
                  )
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {ROLE_OPTIONS.find((r) => r.value === inviteForm.role)?.description}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo / Identificação no Sistema
              </label>
              <input
                type="text"
                value={inviteForm.role_label}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, role_label: e.target.value }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Departamento
              </label>
              <input
                type="text"
                value={inviteForm.department}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, department: e.target.value }))
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Modo de Liberação
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInviteForm((prev) => ({ ...prev, provisionMode: 'instant' }))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                    inviteForm.provisionMode === 'instant'
                      ? 'border-[#0b2254] bg-[#0b2254]/5 text-[#0b2254]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Acesso Imediato
                  <span className="block text-[10px] font-normal text-slate-500">
                    Define senha inicial
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setInviteForm((prev) => ({ ...prev, provisionMode: 'invite_only' }))
                  }
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                    inviteForm.provisionMode === 'invite_only'
                      ? 'border-[#0b2254] bg-[#0b2254]/5 text-[#0b2254]'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Apenas Convite
                  <span className="block text-[10px] font-normal text-slate-500">
                    Gera link de convite
                  </span>
                </button>
              </div>
            </div>

            {inviteForm.provisionMode === 'instant' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Senha Inicial de Acesso *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.initial_password}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, initial_password: e.target.value }))
                  }
                  placeholder="Ex: ccbrh2026"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0b2254]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  O usuário já poderá entrar imediatamente com o e-mail e esta senha inicial.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={invitingUser}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b2254] text-white text-xs font-semibold hover:bg-[#133276] disabled:opacity-50 transition-all shadow-sm"
            >
              {invitingUser ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {inviteForm.provisionMode === 'instant'
                ? 'Criar & Liberar Acesso Agora'
                : 'Registrar Convite'}
            </button>
          </form>

          {/* Coluna Direita: Lista de Usuários Ativos e Convites */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usuários Cadastrados */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Usuários com Acesso à Plataforma ({teamProfiles.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Contas ativas sincronizadas com o controle de autenticação.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchSettingsData()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {teamProfiles.map((u) => {
                  const isCurrentUser = authUser?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200 ${
                            u.is_active
                              ? 'bg-[#0b2254] text-amber-400'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            u.full_name
                              .split(' ')
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {u.full_name}
                            </span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Você
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {u.is_active ? 'Ativo' : 'Suspenso'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {u.email} · <span className="text-slate-600">{u.role_label}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => void handleToggleUserStatus(u)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              u.is_active
                                ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            {u.is_active ? 'Suspender' : 'Reativar'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Histórico de Convites */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Registro de Convites Enviados ({invitations.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Acompanhe os convites pendentes e acessos provisionados recentemente.
                </p>
              </div>

              {invitations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Nenhum convite registrado até o momento. Utilize o formulário ao lado para convidar novos membros.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {inv.full_name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === 'Ativo'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {inv.status === 'Ativo' ? (
                              <BadgeCheck className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.email} · {inv.role_label}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => void handleCopyInviteLink(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          title="Copiar mensagem de acesso"
                        >
                          {copiedId === inv.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar Dados
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRevokeInvitation(inv)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Excluir registro de convite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsModule;
