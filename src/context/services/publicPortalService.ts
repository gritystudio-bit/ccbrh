import type { Candidate, ContactLead, TalentBankEntry } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { geocodeAddress } from '../../utils/geocoding';
import type { CandidateApplicationInput, RegisterCompanyInput } from '../CcbContext';

export async function applyFromLandingService(
  input: CandidateApplicationInput
): Promise<Candidate> {
  let resumePath: string | null = null;

  if (input.resumeFile) {
    const safeName = input.resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${input.tenantId}/${input.vacancyId}/${Date.now()}_${safeName}`;
    const { error: uploadErr } = await supabase.storage
      .from('ccbrh-resumes')
      .upload(path, input.resumeFile, {
        upsert: true,
        contentType: input.resumeFile.type || 'application/pdf',
      });

    if (uploadErr) {
      throw new Error(
        `Falha ao enviar o currículo para o repositório seguro (${uploadErr.message}). Tente novamente.`
      );
    }
    resumePath = `ccbrh-resumes/${path}`;
  } else if (input.resumeFileName) {
    resumePath = `ccbrh-resumes/${input.tenantId}/${input.vacancyId}/${input.resumeFileName}`;
  }

  const coords = await geocodeAddress({
    endereco: input.endereco,
    numero: input.numero,
    bairro: input.bairro,
    cidade: input.cidade,
    estado: input.estado,
    cep: input.cep,
  });

  const { data, error } = await supabase.rpc('submit_public_application', {
    p_tenant_id: input.tenantId,
    p_vacancy_id: input.vacancyId,
    p_full_name: input.fullName.trim(),
    p_email: input.email.trim(),
    p_phone: input.phone.trim(),
    p_linkedin_url: input.linkedinUrl?.trim() || null,
    p_resume_path: resumePath,
    p_cep: input.cep?.trim() || null,
    p_endereco: input.endereco?.trim() || null,
    p_numero: input.numero?.trim() || null,
    p_complemento: input.complemento?.trim() || null,
    p_bairro: input.bairro?.trim() || null,
    p_cidade: input.cidade?.trim() || null,
    p_estado: input.estado?.trim() || null,
    p_latitude: coords?.latitude ?? null,
    p_longitude: coords?.longitude ?? null,
  });

  if (error || !data || !data[0]) {
    throw new Error(error?.message || 'Erro ao registrar candidatura.');
  }

  const resultRow = data[0] as {
    candidate_id: string;
    document_token: string;
    token_expires_at: string;
  };

  return {
    id: resultRow.candidate_id,
    tenant_id: input.tenantId,
    vacancy_id: input.vacancyId,
    full_name: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    linkedin_url: input.linkedinUrl?.trim() || null,
    resume_path: resumePath,
    cep: input.cep?.trim() || null,
    endereco: input.endereco?.trim() || null,
    numero: input.numero?.trim() || null,
    complemento: input.complemento?.trim() || null,
    bairro: input.bairro?.trim() || null,
    cidade: input.cidade?.trim() || null,
    estado: input.estado?.trim() || null,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    pipeline_stage: 'triagem',
    document_token: resultRow.document_token,
    token_expires_at: resultRow.token_expires_at,
    created_at: new Date().toISOString(),
  };
}

export async function submitPublicCompanyRegistrationService(
  input: RegisterCompanyInput
): Promise<string> {
  const { data, error } = await supabase.rpc('submit_public_company_registration', {
    p_company: {
      nome: input.company.name,
      cnpj: input.company.cnpj,
      email: input.company.email,
      telefone: input.company.telefone,
      area_atuacao: input.company.area_atuacao,
      porte: input.company.porte || 'pequena',
      descricao: input.company.descricao || null,
      endereco: input.company.endereco || null,
      numero: input.company.numero || null,
      complemento: input.company.complemento || null,
      bairro: input.company.bairro || null,
      cep: input.company.cep || null,
      cidade: input.company.cidade || null,
      estado: input.company.estado || null,
      tem_filiais: Boolean(input.company.tem_filiais),
      responsavel_nome: input.company.responsavel_nome || null,
      responsavel_cargo: input.company.responsavel_cargo || null,
      beneficios: input.company.beneficios || [],
    },
    p_branches: input.branches || [],
    p_vacancies: input.vacancies || [],
  });

  if (error) {
    throw new Error(error.message || 'Erro ao cadastrar empresa. Tente novamente.');
  }
  return String(data);
}

export type TalentRegistrationPayload = Omit<TalentBankEntry, 'id' | 'created_at' | 'status'> & {
  data_nascimento?: string;
  endereco?: string;
  cep?: string;
  formacao?: string;
  instituicao?: string;
  area_formacao?: string;
  experiencias?: string;
  habilidades?: string;
  idiomas?: string;
};

export async function submitTalentRegistrationService(
  payload: TalentRegistrationPayload,
  resumeFile?: File | null
): Promise<void> {
  let curriculoUrl = payload.curriculo_url || null;
  if (resumeFile) {
    const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `talent-bank/${Date.now()}_${safeName}`;
    await supabase.storage.from('ccbrh-resumes').upload(path, resumeFile, { upsert: true });
    curriculoUrl = `ccbrh-resumes/${path}`;
  }

  const { error } = await supabase.from('talent_bank').insert({
    nome: payload.nome,
    email: payload.email,
    telefone: payload.telefone || null,
    cpf: payload.cpf || null,
    data_nascimento: payload.data_nascimento || null,
    endereco: payload.endereco || null,
    cidade: payload.cidade || null,
    estado: payload.estado || null,
    cep: payload.cep || null,
    formacao: payload.formacao || null,
    instituicao: payload.instituicao || null,
    area_formacao: payload.area_formacao || null,
    experiencias: payload.experiencias || null,
    habilidades: payload.habilidades || null,
    idiomas: payload.idiomas || null,
    pretensao_salarial: payload.pretensao_salarial || null,
    cargo_desejado: payload.cargo_desejado || null,
    area_interesse: payload.area_interesse || null,
    disponibilidade: payload.disponibilidade || 'imediata',
    regime_preferido: payload.regime_preferido || 'presencial',
    linkedin: payload.linkedin || null,
    curriculo_url: curriculoUrl,
    status: 'disponivel',
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitContactLeadService(
  payload: Omit<ContactLead, 'id' | 'created_at' | 'status'>
): Promise<void> {
  const { error } = await supabase.from('contact_leads').insert({
    name: payload.name.trim(),
    company: payload.company?.trim() || null,
    email: payload.email.trim(),
    phone: payload.phone?.trim() || null,
    message: payload.message.trim(),
    status: 'novo',
  });
  if (error) {
    throw new Error(error.message);
  }
}
