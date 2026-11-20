import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Company,
  CompanyBranch,
  Job,
  Employee,
  EmployeeBenefitRecord,
  EmployeeBenefitStatus,
  EmployeeVacationRecord,
  EmployeeVacationStatus,
  Vacancy,
  Candidate,
  DocumentRecord,
  PayrollEntry,
  PayrollParameters,
  PayrollStatus,
  PayslipSentStatus,
  TalentBankEntry,
  ContactLead,
  CcbDatabase,
  DocumentStatus,
  PipelineStage,
  DocumentType,
  AuthUser,
  AuthRole,
} from '../types/database';
import { supabase } from '../lib/supabase';
import { ONBOARDING_SQL_TRANSACTION } from '../utils/sqlTemplates';
import { geocodeAddress } from '../utils/geocoding';
import {
  buildDefaultCompanyPayrollParameters,
  summarizeEmployeeBenefits,
} from '../utils/payrollCalculator';
import {
  applyFromLandingService,
  submitContactLeadService,
  submitPublicCompanyRegistrationService,
  submitTalentRegistrationService,
  type TalentRegistrationPayload,
} from './services/publicPortalService';
import {
  dispatchPayslipsService,
  generateCompetencePayrollService,
  resolveEmployeePayrollBaseSalary,
  resolveEmployeeVtEmployerValue,
  savePayrollParametersService,
  syncDraftEntriesForCompetenceService,
  syncEmployeeDraftPayrollEntriesService,
  updatePayslipDispatchStatusService,
  upsertPayrollEntryService,
  type PayrollUpsertInput,
} from './services/payrollService';
import {
  createEmployeeBenefitService,
  createEmployeeVacationService,
  deleteEmployeeBenefitService,
  deleteEmployeeVacationService,
  fetchEmployeeBenefitsService,
  fetchEmployeeVacationsService,
  updateEmployeeBenefitService,
  updateEmployeeVacationService,
  type CreateEmployeeBenefitInput,
  type CreateEmployeeVacationInput,
} from './services/employeeHrService';

export type { PayrollUpsertInput };

export interface RegisterCompanyInput {
  company: {
    name: string;
    cnpj: string;
    cnpj_root?: string;
    email?: string;
    telefone?: string;
    area_atuacao?: string;
    porte?: 'micro' | 'pequena' | 'media' | 'grande';
    descricao?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    cidade?: string;
    estado?: string;
    tem_filiais?: boolean;
    responsavel_nome?: string;
    responsavel_cargo?: string;
    beneficios?: string[];
    status?: 'pending_review' | 'active' | 'inactive';
  };
  branches?: Array<{
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }>;
  vacancies?: Array<{
    cargo: string;
    area?: string;
    salario?: string;
    vagas_disponiveis?: number;
    tipo_contratacao?: 'clt' | 'pj' | 'temporario' | 'estagio';
    regime?: 'presencial' | 'hibrido' | 'remoto';
    cidade?: string;
    estado?: string;
    descricao?: string;
    requisitos?: string;
  }>;
}

export interface CandidateApplicationInput {
  vacancyId: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  resumeFile?: File | null;
  resumeFileName?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

export interface NewCandidateInput {
  vacancyId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface CcbContextType {
  database: CcbDatabase;
  loadingData: boolean;
  authLoading: boolean;
  dataError: string | null;
  refreshDatabase: () => Promise<void>;
  currentTenantId: string;
  setCurrentTenantId: (id: string) => void;
  currentCompany: Company | null;
  allCompanies: Company[];
  authUser: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  // Public flows
  applyFromLanding: (input: CandidateApplicationInput) => Promise<Candidate>;
  submitPublicCompanyRegistration: (input: RegisterCompanyInput) => Promise<string>;
  submitTalentRegistration: (
    payload: Omit<TalentBankEntry, 'id' | 'created_at' | 'status'> & {
      data_nascimento?: string;
      endereco?: string;
      cep?: string;
      formacao?: string;
      instituicao?: string;
      area_formacao?: string;
      experiencias?: string;
      habilidades?: string;
      idiomas?: string;
    },
    resumeFile?: File | null
  ) => Promise<void>;
  submitContactLead: (payload: Omit<ContactLead, 'id' | 'created_at' | 'status'>) => Promise<void>;

  // Companies & Branches CRUD
  registerClientCompany: (input: RegisterCompanyInput) => Promise<Company>;
  updateCompany: (companyId: string, patch: Partial<Company>) => Promise<void>;
  approveCompanyStatus: (companyId: string, status?: 'active' | 'inactive') => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;
  addCompanyBranch: (
    companyId: string,
    branch: Omit<CompanyBranch, 'id' | 'company_id' | 'created_at'>
  ) => Promise<CompanyBranch>;
  updateCompanyBranch: (branchId: string, patch: Partial<CompanyBranch>) => Promise<void>;
  deleteCompanyBranch: (branchId: string) => Promise<void>;

  // Tenant-scoped slices
  branches: CompanyBranch[];
  jobs: Job[];
  employees: Employee[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  // Documents & Payroll
  documents: DocumentRecord[];
  payrollEntries: PayrollEntry[];
  currentPayrollParameters: PayrollParameters;
  employeeVacations: EmployeeVacationRecord[];
  employeeBenefits: EmployeeBenefitRecord[];
  talentBank: TalentBankEntry[];
  contactLeads: ContactLead[];

  // Jobs CRUD
  addNewJob: (jobData: Omit<Job, 'id' | 'created_at' | 'tenant_id'>) => Promise<Job>;
  updateJob: (jobId: string, patch: Partial<Job>) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;

  // Employees CRUD
  addNewEmployee: (
    employeeData: Omit<Employee, 'id' | 'created_at' | 'tenant_id'>
  ) => Promise<Employee>;
  updateEmployee: (employeeId: string, patch: Partial<Employee>) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;

  // Vacancies CRUD
  addNewVacancy: (
    vacancyData: Omit<Vacancy, 'id' | 'created_at' | 'tenant_id'>
  ) => Promise<Vacancy>;
  updateVacancy: (vacancyId: string, patch: Partial<Vacancy>) => Promise<void>;
  deleteVacancy: (vacancyId: string) => Promise<void>;

  // Candidates CRUD & Workflow
  addNewCandidate: (input: NewCandidateInput) => Promise<Candidate>;
  updateCandidate: (candidateId: string, patch: Partial<Candidate>) => Promise<void>;
  updateCandidateStage: (candidateId: string, stage: PipelineStage) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<void>;
  geocodeCandidate: (candidateId: string) => Promise<Candidate | null>;
  reissueCandidateToken: (
    candidateId: string
  ) => Promise<{ newToken: string; newExpiresAt: string }>;
  promoteCandidateToEmployee: (
    candidateId: string,
    reportsToId: string | null,
    hireDate: string
  ) => Promise<{ success: boolean; employeeId?: string; sql: string; message: string }>;

  // Documents CRUD
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => Promise<void>;
  uploadCandidateDocument: (
    candidateId: string,
    docType: DocumentType,
    fileOrName: File | string
  ) => Promise<void>;
  uploadEmployeeDocument: (
    employeeId: string,
    docType: DocumentType,
    fileOrName: File | string
  ) => Promise<DocumentRecord>;
  deleteDocument: (documentId: string, storagePath: string) => Promise<void>;
  getDocumentSignedUrl: (
    storagePath: string,
    options?: { download?: string | boolean }
  ) => Promise<string | null>;

  // Payroll CRUD & Dispatch
  savePayrollParameters: (
    params: Omit<PayrollParameters, 'id' | 'tenant_id' | 'updated_at'>
  ) => Promise<PayrollParameters>;
  upsertPayrollEntry: (input: PayrollUpsertInput) => Promise<PayrollEntry>;
  generateCompetencePayroll: (
    competence: string
  ) => Promise<{ generated: number; skippedByDates: number }>;
  syncDraftPayroll: (competence?: string) => Promise<number>;
  updatePayrollStatus: (entryId: string, status: PayrollStatus) => Promise<void>;
  deletePayrollEntry: (entryId: string) => Promise<void>;
  dispatchPayslips: (
    competence: string,
    entryIds?: string[]
  ) => Promise<{
    providerConfigured: boolean;
    sentCount: number;
    failedCount: number;
    message?: string;
  }>;
  updatePayslipDispatchStatus: (
    entryIds: string[],
    status: PayslipSentStatus,
    channel?: string
  ) => Promise<void>;

  // Employee Vacations & Benefits (connected with Payroll)
  addEmployeeVacation: (input: CreateEmployeeVacationInput) => Promise<EmployeeVacationRecord>;
  updateEmployeeVacation: (
    vacationId: string,
    patch: Partial<
      Omit<EmployeeVacationRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
    > & { status?: EmployeeVacationStatus }
  ) => Promise<EmployeeVacationRecord>;
  deleteEmployeeVacation: (vacationId: string) => Promise<void>;
  launchVacationToPayroll: (vacationId: string) => Promise<PayrollEntry>;
  addEmployeeBenefit: (input: CreateEmployeeBenefitInput) => Promise<EmployeeBenefitRecord>;
  updateEmployeeBenefit: (
    benefitId: string,
    patch: Partial<
      Omit<EmployeeBenefitRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
    > & { status?: EmployeeBenefitStatus }
  ) => Promise<EmployeeBenefitRecord>;
  deleteEmployeeBenefit: (benefitId: string, employeeId: string) => Promise<void>;

  // Talent Bank & Contact Leads management
  updateTalentStatus: (id: string, status: TalentBankEntry['status']) => Promise<void>;
  deleteTalentEntry: (id: string) => Promise<void>;
  updateContactLeadStatus: (id: string, status: ContactLead['status']) => Promise<void>;
  deleteContactLead: (id: string) => Promise<void>;

  // Analytics helpers for current tenant
  metrics: {
    totalHeadcount: number;
    activeHeadcount: number;
    vacationHeadcount: number;
    totalPayroll: number;
    averageSalary: number;
    departmentsCount: number;
    activeVacanciesCount: number;
    candidatesInPipelineCount: number;
    pendingDocsCount: number;
    expiredTokensCount: number;
  };
}

const EMPTY_DB: CcbDatabase = {
  companies: [],
  branches: [],
  jobs: [],
  employees: [],
  vacancies: [],
  candidates: [],
  documents: [],
  payrollEntries: [],
  payrollParameters: [],
  employeeVacations: [],
  employeeBenefits: [],
  talentBank: [],
  contactLeads: [],
};

const CcbContext = createContext<CcbContextType | undefined>(undefined);
const TENANT_STORAGE_KEY = 'ccbrh_selected_tenant_id';

export const CcbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [database, setDatabase] = useState<CcbDatabase>(EMPTY_DB);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    try {
      return localStorage.getItem(TENANT_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (currentTenantId) {
        localStorage.setItem(TENANT_STORAGE_KEY, currentTenantId);
      }
    } catch {
      // ignore
    }
  }, [currentTenantId]);

  const loadUserProfile = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, role_label, avatar_url, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile || !profile.is_active) {
      return null;
    }

    const cleanEmail = (profile.email || email).toLowerCase();
    const isLegacyAdminName =
      cleanEmail === 'gestao@ccbrh.com.br' &&
      profile.full_name?.toLowerCase().includes('cristina');

    return {
      id: profile.id,
      name: isLegacyAdminName ? 'Administrador' : profile.full_name,
      email: profile.email || email,
      role: profile.role as AuthRole,
      roleLabel: isLegacyAdminName ? 'Administrador · CCB Soluções em RH' : profile.role_label,
      avatarUrl: profile.avatar_url || null,
      tenantId: 'all',
      companyName: 'CCB Soluções em RH (Gestão Multi-Empresa)',
      loggedInAt: new Date().toISOString(),
    };
  }, []);

  const fetchDatabase = useCallback(async (isStaff: boolean) => {
    setLoadingData(true);
    setDataError(null);
    try {
      if (isStaff) {
        const [
          compRes,
          branchRes,
          jobRes,
          empRes,
          vacRes,
          candRes,
          docRes,
          payrollRes,
          payrollParamsRes,
          empVacationsList,
          empBenefitsList,
          talentRes,
          leadRes,
        ] = await Promise.all([
          supabase.from('companies').select('*').order('created_at', { ascending: false }),
          supabase.from('company_branches').select('*').order('created_at', { ascending: true }),
          supabase.from('jobs').select('*').order('title', { ascending: true }),
          supabase.from('employees').select('*').order('full_name', { ascending: true }),
          supabase.from('vacancies').select('*').order('created_at', { ascending: false }),
          supabase.from('candidates').select('*').order('created_at', { ascending: false }),
          supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
          supabase.from('payroll_entries').select('*').order('competence', { ascending: false }),
          supabase.from('payroll_parameters').select('*'),
          fetchEmployeeVacationsService().catch(() => []),
          fetchEmployeeBenefitsService().catch(() => []),
          supabase.from('talent_bank').select('*').order('created_at', { ascending: false }),
          supabase.from('contact_leads').select('*').order('created_at', { ascending: false }),
        ]);

        const firstErr =
          compRes.error ||
          branchRes.error ||
          jobRes.error ||
          empRes.error ||
          vacRes.error ||
          candRes.error ||
          docRes.error ||
          payrollRes.error;

        if (firstErr) {
          throw firstErr;
        }

        const companies = (compRes.data || []) as Company[];
        setDatabase({
          companies,
          branches: (branchRes.data || []) as CompanyBranch[],
          jobs: (jobRes.data || []) as Job[],
          employees: (empRes.data || []) as Employee[],
          vacancies: (vacRes.data || []) as Vacancy[],
          candidates: (candRes.data || []) as Candidate[],
          documents: (docRes.data || []) as DocumentRecord[],
          payrollEntries: (payrollRes.data || []) as PayrollEntry[],
          payrollParameters: (payrollParamsRes.data || []) as PayrollParameters[],
          employeeVacations: empVacationsList,
          employeeBenefits: empBenefitsList,
          talentBank: (talentRes.data || []) as TalentBankEntry[],
          contactLeads: (leadRes.data || []) as ContactLead[],
        });

        setCurrentTenantId((prev) =>
          prev && companies.some((c) => c.id === prev) ? prev : companies[0]?.id || ''
        );
      } else {
        const [compRes, branchRes, jobRes, vacRes] = await Promise.all([
          supabase.from('companies').select('*').eq('status', 'active').order('created_at', { ascending: false }),
          supabase.from('company_branches').select('*').order('created_at', { ascending: true }),
          supabase.from('jobs').select('*').order('title', { ascending: true }),
          supabase.from('vacancies').select('*').eq('status', 'open').order('created_at', { ascending: false }),
        ]);

        if (compRes.error) throw compRes.error;

        const companies = (compRes.data || []) as Company[];
        setDatabase({
          ...EMPTY_DB,
          companies,
          branches: (branchRes.data || []) as CompanyBranch[],
          jobs: (jobRes.data || []) as Job[],
          vacancies: (vacRes.data || []) as Vacancy[],
        });

        setCurrentTenantId((prev) =>
          prev && companies.some((c) => c.id === prev) ? prev : companies[0]?.id || ''
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados do sistema.';
      console.error('[ccbrh] fetchDatabase error:', err);
      setDataError(msg);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Initialize Supabase Auth session listener
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;
        if (sessionUser && mounted) {
          const profile = await loadUserProfile(sessionUser.id, sessionUser.email || '');
          if (mounted) {
            setAuthUser(profile);
            await fetchDatabase(Boolean(profile));
          }
        } else if (mounted) {
          setAuthUser(null);
          await fetchDatabase(false);
        }
      } catch (err) {
        console.error('[ccbrh] initSession error:', err);
        if (mounted) {
          setAuthUser(null);
          await fetchDatabase(false);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await loadUserProfile(session.user.id, session.user.email || '');
        if (!mounted) return;
        setAuthUser(profile);
        await fetchDatabase(Boolean(profile));
      } else {
        setAuthUser(null);
        await fetchDatabase(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchDatabase, loadUserProfile]);

  const refreshDatabase = useCallback(async () => {
    if (authUser) {
      const updatedProfile = await loadUserProfile(authUser.id, authUser.email);
      if (updatedProfile) {
        setAuthUser(updatedProfile);
      }
    }
    await fetchDatabase(Boolean(authUser));
  }, [authUser, fetchDatabase, loadUserProfile]);

  // Supabase Auth Login
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error:
          error?.message === 'Invalid login credentials'
            ? 'E-mail ou senha inválidos. Verifique suas credenciais corporativas.'
            : error?.message || 'Falha ao autenticar. Verifique suas credenciais.',
      };
    }

    const profile = await loadUserProfile(data.user.id, data.user.email || cleanEmail);
    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Usuário autenticado não possui perfil ativo na equipe CCB.',
      };
    }

    setAuthUser(profile);
    await fetchDatabase(true);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    await fetchDatabase(false);
  };

  // Public application from /vagas
  const applyFromLanding = async (input: CandidateApplicationInput): Promise<Candidate> => {
    const createdCandidate = await applyFromLandingService(input);
    if (authUser) {
      await fetchDatabase(true);
    }
    return createdCandidate;
  };

  // Public company registration via RPC
  const submitPublicCompanyRegistration = (input: RegisterCompanyInput): Promise<string> =>
    submitPublicCompanyRegistrationService(input);

  const submitTalentRegistration = (
    payload: TalentRegistrationPayload,
    resumeFile?: File | null
  ): Promise<void> => submitTalentRegistrationService(payload, resumeFile);

  const submitContactLead = (
    payload: Omit<ContactLead, 'id' | 'created_at' | 'status'>
  ): Promise<void> => submitContactLeadService(payload);

  // Current company based on currentTenantId
  const currentCompany =
    database.companies.find((c) => c.id === currentTenantId) || database.companies[0] || null;

  const activeTenantId = currentCompany?.id || currentTenantId;

  // Multi-tenant scoped records
  const branches = database.branches.filter((b) => b.company_id === activeTenantId);
  const jobs = database.jobs.filter((j) => j.tenant_id === activeTenantId);
  const employees = database.employees.filter((e) => e.tenant_id === activeTenantId);
  const vacancies = database.vacancies.filter((v) => v.tenant_id === activeTenantId);
  const candidates = database.candidates.filter((c) => c.tenant_id === activeTenantId);
  const documents = database.documents.filter((d) => d.tenant_id === activeTenantId);
  const payrollEntries = database.payrollEntries.filter((p) => p.tenant_id === activeTenantId);
  const employeeVacations = database.employeeVacations.filter(
    (v) => v.tenant_id === activeTenantId
  );
  const employeeBenefits = database.employeeBenefits.filter(
    (b) => b.tenant_id === activeTenantId
  );
  const currentPayrollParameters: PayrollParameters =
    database.payrollParameters.find((p) => p.tenant_id === activeTenantId) ||
    buildDefaultCompanyPayrollParameters(activeTenantId);

  // Analytics metrics
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const vacationEmployees = employees.filter((e) => e.status === 'vacation');

  const totalPayroll = employees
    .filter((e) => e.status === 'active' || e.status === 'vacation')
    .reduce((sum, emp) => {
      const job = jobs.find((j) => j.id === emp.job_id);
      const salary = emp.salary_override ?? (job ? Number(job.base_salary) : 0);
      return sum + Number(salary || 0);
    }, 0);

  const activeSalaryCount = activeEmployees.length + vacationEmployees.length;
  const averageSalary = activeSalaryCount > 0 ? totalPayroll / activeSalaryCount : 0;
  const departmentsCount = new Set(jobs.map((j) => j.department)).size;
  const activeVacanciesCount = vacancies.filter((v) => v.status === 'open').length;
  const candidatesInPipelineCount = candidates.length;
  const pendingDocsCount = documents.filter(
    (d) => d.status === 'pending_review' && d.candidate_id !== null
  ).length;

  const now = new Date();
  const expiredTokensCount = candidates.filter((c) => {
    if (c.pipeline_stage === 'proposta' || c.pipeline_stage === 'aprovado') {
      return new Date(c.token_expires_at) < now;
    }
    return false;
  }).length;

  // ==================== COMPANIES & BRANCHES CRUD ====================
  const registerClientCompany = async (input: RegisterCompanyInput): Promise<Company> => {
    const cleanCnpj = input.company.cnpj.replace(/\D/g, '');
    const cleanRoot = (input.company.cnpj_root || cleanCnpj.slice(0, 8)).replace(/\D/g, '').slice(0, 8);

    const { data: createdComp, error: compErr } = await supabase
      .from('companies')
      .insert({
        name: input.company.name.trim(),
        cnpj: cleanCnpj || null,
        cnpj_root: cleanRoot || null,
        email: input.company.email || null,
        telefone: input.company.telefone || null,
        area_atuacao: input.company.area_atuacao || null,
        porte: input.company.porte || 'pequena',
        endereco: input.company.endereco || null,
        cidade: input.company.cidade || null,
        estado: input.company.estado || null,
        responsavel_nome: input.company.responsavel_nome || null,
        responsavel_cargo: input.company.responsavel_cargo || null,
        beneficios: input.company.beneficios || [],
        status: input.company.status || 'active',
      })
      .select('*')
      .single();

    if (compErr || !createdComp) {
      throw new Error(compErr?.message || 'Erro ao cadastrar empresa.');
    }

    let hqBranchId: string | null = null;
    if (cleanCnpj.length === 14) {
      const coords = await geocodeAddress({
        endereco: input.company.endereco,
        cidade: input.company.cidade,
        estado: input.company.estado,
      });
      const { data: branchData } = await supabase
        .from('company_branches')
        .insert({
          company_id: createdComp.id,
          label: input.company.cidade ? `Matriz · ${input.company.cidade}` : 'Matriz',
          cnpj: cleanCnpj,
          endereco: input.company.endereco || null,
          cidade: input.company.cidade || null,
          estado: input.company.estado || null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          is_headquarters: true,
        })
        .select('id')
        .single();
      hqBranchId = branchData?.id || null;
    }

    const validVacancies = (input.vacancies || []).filter((v) => v.cargo.trim().length > 0);
    for (const v of validVacancies) {
      const parsedSalary =
        Number(String(v.salario || '').replace(/[^\d,.-]/g, '').replace(',', '.')) || 3500;
      const { data: jobData } = await supabase
        .from('jobs')
        .insert({
          tenant_id: createdComp.id,
          title: v.cargo.trim(),
          department: v.area?.trim() || input.company.area_atuacao || 'Operações',
          base_salary: parsedSalary,
        })
        .select('id')
        .single();

      if (jobData) {
        await supabase.from('vacancies').insert({
          tenant_id: createdComp.id,
          job_id: jobData.id,
          branch_id: hqBranchId,
          title: v.cargo.trim(),
          area: v.area?.trim() || null,
          description: v.descricao?.trim() || `Vaga cadastrada para ${createdComp.name}`,
          salary: parsedSalary,
          show_salary: Boolean(v.salario),
          vacancies_count: v.vagas_disponiveis || 1,
          city: input.company.cidade || null,
          state: input.company.estado || null,
          api_source: 'internal',
          status: createdComp.status === 'active' ? 'open' : 'paused',
        });
      }
    }

    await fetchDatabase(true);
    return createdComp as Company;
  };

  const updateCompany = async (companyId: string, patch: Partial<Company>) => {
    const { error } = await supabase
      .from('companies')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', companyId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const approveCompanyStatus = async (
    companyId: string,
    status: 'active' | 'inactive' = 'active'
  ) => {
    if (status === 'active') {
      const { error } = await supabase.rpc('approve_registered_company', {
        p_company_id: companyId,
      });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('companies')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', companyId);
      if (error) throw new Error(error.message);
    }
    await fetchDatabase(true);
  };

  const deleteCompany = async (companyId: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', companyId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const addCompanyBranch = async (
    companyId: string,
    branch: Omit<CompanyBranch, 'id' | 'company_id' | 'created_at'>
  ): Promise<CompanyBranch> => {
    const coords = await geocodeAddress({
      endereco: branch.endereco,
      cidade: branch.cidade,
      estado: branch.estado,
      cep: branch.cep,
    });

    const { data, error } = await supabase
      .from('company_branches')
      .insert({
        company_id: companyId,
        label: branch.label,
        cnpj: branch.cnpj ? branch.cnpj.replace(/\D/g, '') : null,
        endereco: branch.endereco || null,
        cidade: branch.cidade || null,
        estado: branch.estado || null,
        cep: branch.cep || null,
        latitude: branch.latitude ?? coords?.latitude ?? null,
        longitude: branch.longitude ?? coords?.longitude ?? null,
        is_headquarters: Boolean(branch.is_headquarters),
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao adicionar filial.');
    await fetchDatabase(true);
    return data as CompanyBranch;
  };

  const updateCompanyBranch = async (branchId: string, patch: Partial<CompanyBranch>) => {
    const { error } = await supabase.from('company_branches').update(patch).eq('id', branchId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const deleteCompanyBranch = async (branchId: string) => {
    const { error } = await supabase.from('company_branches').delete().eq('id', branchId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  // ==================== JOBS CRUD ====================
  const addNewJob = async (
    jobData: Omit<Job, 'id' | 'created_at' | 'tenant_id'>
  ): Promise<Job> => {
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...jobData,
        tenant_id: activeTenantId,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao criar cargo.');
    await fetchDatabase(true);
    return data as Job;
  };

  const updateJob = async (jobId: string, patch: Partial<Job>) => {
    const { data: updatedJob, error } = await supabase
      .from('jobs')
      .update(patch)
      .eq('id', jobId)
      .eq('tenant_id', activeTenantId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (updatedJob && patch.base_salary !== undefined) {
      const updatedJobs = jobs.map((j) => (j.id === jobId ? (updatedJob as Job) : j));
      const affectedEmployees = employees.filter((e) => e.job_id === jobId);
      for (const emp of affectedEmployees) {
        await syncEmployeeDraftPayrollEntriesService({
          tenantId: activeTenantId,
          employee: emp,
          jobs: updatedJobs,
          payrollEntries,
          companyParams: currentPayrollParameters,
        });
      }
    }
    await fetchDatabase(true);
  };

  const deleteJob = async (jobId: string) => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  // ==================== EMPLOYEES CRUD ====================
  const addNewEmployee = async (
    employeeData: Omit<Employee, 'id' | 'created_at' | 'tenant_id'>
  ): Promise<Employee> => {
    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...employeeData,
        tenant_id: activeTenantId,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao cadastrar colaborador.');
    await fetchDatabase(true);
    return data as Employee;
  };

  const updateEmployee = async (employeeId: string, patch: Partial<Employee>) => {
    const { data: updatedEmp, error } = await supabase
      .from('employees')
      .update(patch)
      .eq('id', employeeId)
      .eq('tenant_id', activeTenantId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    if (updatedEmp) {
      await syncEmployeeDraftPayrollEntriesService({
        tenantId: activeTenantId,
        employee: updatedEmp as Employee,
        jobs,
        payrollEntries,
        companyParams: currentPayrollParameters,
        employeeBenefits,
      });
    }
    await fetchDatabase(true);
  };

  const deleteEmployee = async (employeeId: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  // ==================== VACANCIES CRUD ====================
  const addNewVacancy = async (
    vacancyData: Omit<Vacancy, 'id' | 'created_at' | 'tenant_id'>
  ): Promise<Vacancy> => {
    const { data, error } = await supabase
      .from('vacancies')
      .insert({
        ...vacancyData,
        tenant_id: activeTenantId,
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao publicar vaga.');
    await fetchDatabase(true);
    return data as Vacancy;
  };

  const updateVacancy = async (vacancyId: string, patch: Partial<Vacancy>) => {
    const { error } = await supabase
      .from('vacancies')
      .update(patch)
      .eq('id', vacancyId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const deleteVacancy = async (vacancyId: string) => {
    const { error } = await supabase
      .from('vacancies')
      .delete()
      .eq('id', vacancyId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  // ==================== CANDIDATES CRUD & WORKFLOW ====================
  const addNewCandidate = async (input: NewCandidateInput): Promise<Candidate> => {
    const coords = await geocodeAddress({
      endereco: input.endereco,
      numero: input.numero,
      bairro: input.bairro,
      cidade: input.cidade,
      estado: input.estado,
      cep: input.cep,
    });

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        tenant_id: activeTenantId,
        vacancy_id: input.vacancyId,
        full_name: input.fullName.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        linkedin_url: input.linkedinUrl?.trim() || null,
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
      })
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao adicionar candidato.');
    await fetchDatabase(true);
    return data as Candidate;
  };

  const updateCandidate = async (candidateId: string, patch: Partial<Candidate>) => {
    const { error } = await supabase
      .from('candidates')
      .update(patch)
      .eq('id', candidateId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const updateCandidateStage = async (candidateId: string, stage: PipelineStage) => {
    await updateCandidate(candidateId, { pipeline_stage: stage });
  };

  const deleteCandidate = async (candidateId: string) => {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const geocodeCandidate = async (candidateId: string): Promise<Candidate | null> => {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return null;
    const coords = await geocodeAddress({
      endereco: cand.endereco,
      numero: cand.numero,
      bairro: cand.bairro,
      cidade: cand.cidade,
      estado: cand.estado,
      cep: cand.cep,
    });
    if (!coords) return null;

    const patch: Record<string, unknown> = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    if (coords.resolvedCity) patch.cidade = coords.resolvedCity;
    if (coords.resolvedState) patch.estado = coords.resolvedState;
    if (coords.resolvedBairro && !cand.bairro) patch.bairro = coords.resolvedBairro;
    if (coords.resolvedStreet && !cand.endereco) patch.endereco = coords.resolvedStreet;

    const { data, error } = await supabase
      .from('candidates')
      .update(patch)
      .eq('id', candidateId)
      .eq('tenant_id', activeTenantId)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    await fetchDatabase(true);
    return data as Candidate;
  };

  const reissueCandidateToken = async (
    candidateId: string
  ): Promise<{ newToken: string; newExpiresAt: string }> => {
    const { data, error } = await supabase.rpc('reissue_candidate_token', {
      p_tenant_id: activeTenantId,
      p_candidate_id: candidateId,
    });

    if (error || !data || !data[0]) {
      throw new Error(error?.message || 'Erro ao renovar token.');
    }

    const row = data[0] as { new_token: string; new_expires_at: string };
    await fetchDatabase(true);
    return { newToken: row.new_token, newExpiresAt: row.new_expires_at };
  };

  const promoteCandidateToEmployee = async (
    candidateId: string,
    reportsToId: string | null,
    hireDate: string
  ) => {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) {
      return {
        success: false,
        sql: '',
        message: `Candidato não encontrado no tenant ${activeTenantId}.`,
      };
    }

    const { data, error } = await supabase.rpc('promote_candidate_to_employee', {
      p_tenant_id: activeTenantId,
      p_candidate_id: candidateId,
      p_reports_to: reportsToId || null,
      p_hire_date: hireDate || new Date().toISOString().split('T')[0],
    });

    if (error) {
      return {
        success: false,
        sql: '',
        message: error.message || 'Falha ao admitir colaborador.',
      };
    }

    const employeeId = String(data);
    const vac = vacancies.find((v) => v.id === cand.vacancy_id);
    if (vac?.contract_type === 'pj') {
      await supabase
        .from('employees')
        .update({
          contract_type: 'pj',
          pj_monthly_value: vac.salary ?? null,
        })
        .eq('id', employeeId)
        .eq('tenant_id', activeTenantId);
    }

    const sqlExecuted = ONBOARDING_SQL_TRANSACTION(
      activeTenantId,
      candidateId,
      reportsToId,
      hireDate || new Date().toISOString().split('T')[0]
    );

    await fetchDatabase(true);
    return {
      success: true,
      employeeId: String(data),
      sql: sqlExecuted,
      message: `Candidato ${cand.full_name} convertido com sucesso para Funcionário! Documentos transferidos e organograma atualizado.`,
    };
  };

  // ==================== DOCUMENTS CRUD ====================
  const updateDocumentStatus = async (documentId: string, status: DocumentStatus) => {
    const { error } = await supabase
      .from('documents')
      .update({ status })
      .eq('id', documentId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const uploadCandidateDocument = async (
    candidateId: string,
    docType: DocumentType,
    fileOrName: File | string
  ) => {
    const fileObj = typeof fileOrName === 'string' ? null : fileOrName;
    const rawName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${activeTenantId}/candidates/${candidateId}/${Date.now()}_${safeName}`;

    if (fileObj) {
      const { error: uploadErr } = await supabase.storage
        .from('ccbrh-docs')
        .upload(objectKey, fileObj, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
    }

    const storagePath = `ccbrh-docs/${objectKey}`;
    const existing = documents.find(
      (d) => d.candidate_id === candidateId && d.document_type === docType
    );

    if (docType === 'Curriculo') {
      await supabase
        .from('candidates')
        .update({ resume_path: storagePath })
        .eq('id', candidateId)
        .eq('tenant_id', activeTenantId);
    }

    if (existing) {
      const { error } = await supabase
        .from('documents')
        .update({
          storage_path: storagePath,
          status: 'pending_review',
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('documents').insert({
        tenant_id: activeTenantId,
        employee_id: null,
        candidate_id: candidateId,
        document_type: docType,
        storage_path: storagePath,
        status: 'pending_review',
      });
      if (error) throw new Error(error.message);
    }

    await fetchDatabase(true);
  };

  const uploadEmployeeDocument = async (
    employeeId: string,
    docType: DocumentType,
    fileOrName: File | string
  ): Promise<DocumentRecord> => {
    const fileObj = typeof fileOrName === 'string' ? null : fileOrName;
    const rawName = typeof fileOrName === 'string' ? fileOrName : fileOrName.name;
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `${activeTenantId}/employees/${employeeId}/${Date.now()}_${safeName}`;

    if (fileObj) {
      const { error: uploadErr } = await supabase.storage
        .from('ccbrh-docs')
        .upload(objectKey, fileObj, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);
    }

    const storagePath = `ccbrh-docs/${objectKey}`;
    const { data, error } = await supabase
      .from('documents')
      .insert({
        tenant_id: activeTenantId,
        employee_id: employeeId,
        candidate_id: null,
        document_type: docType,
        storage_path: storagePath,
        status: 'approved',
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Erro ao anexar documento.');
    await fetchDatabase(true);
    return data as DocumentRecord;
  };

  const deleteDocument = async (documentId: string, storagePath: string) => {
    const bucketMatch = storagePath.match(/^(ccbrh-docs|ccbrh-resumes|ccbrh-company-assets)\/(.+)$/);
    if (bucketMatch) {
      await supabase.storage.from(bucketMatch[1]).remove([bucketMatch[2]]);
    }
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const getDocumentSignedUrl = async (
    storagePath: string,
    options?: { download?: string | boolean }
  ): Promise<string | null> => {
    const bucketMatch = storagePath.match(/^(ccbrh-docs|ccbrh-resumes|ccbrh-company-assets)\/(.+)$/);
    if (!bucketMatch) return null;
    const [, bucket, key] = bucketMatch;
    if (bucket === 'ccbrh-company-assets') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 3600, options?.download ? { download: options.download } : undefined);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }

    // Fallback: download directo do Blob no Storage caso createSignedUrl não retorne URL
    const { data: blobData, error: blobErr } = await supabase.storage.from(bucket).download(key);
    if (!blobErr && blobData) {
      return URL.createObjectURL(blobData);
    }

    return null;
  };

  // ==================== PAYROLL CRUD ====================
  const savePayrollParameters = async (
    params: Omit<PayrollParameters, 'id' | 'tenant_id' | 'updated_at'>
  ): Promise<PayrollParameters> => {
    const saved = await savePayrollParametersService(activeTenantId, params);
      await syncDraftEntriesForCompetenceService({
        tenantId: activeTenantId,
        employees,
        jobs,
        payrollEntries,
        companyParams: saved,
        employeeBenefits,
      });
    await fetchDatabase(true);
    return saved;
  };

  const upsertPayrollEntry = async (input: PayrollUpsertInput): Promise<PayrollEntry> => {
    const emp = employees.find((e) => e.id === input.employeeId);
    const saved = await upsertPayrollEntryService(
      activeTenantId,
      {
        ...input,
        vtEmployerValue:
          input.vtEmployerValue ??
          (emp
            ? resolveEmployeeVtEmployerValue(
                emp,
                input.baseSalary,
                currentPayrollParameters,
                employeeBenefits,
                0
              )
            : 0),
      },
      emp,
      currentPayrollParameters
    );
    await fetchDatabase(true);
    return saved;
  };

  const generateCompetencePayroll = async (
    competence: string
  ): Promise<{ generated: number; skippedByDates: number }> => {
    const result = await generateCompetencePayrollService({
      tenantId: activeTenantId,
      competence,
      employees,
      jobs,
      payrollEntries,
      companyParams: currentPayrollParameters,
      employeeBenefits,
    });
    if (result.generated > 0) {
      await fetchDatabase(true);
    }
    return result;
  };

  const syncDraftPayroll = async (competence?: string): Promise<number> => {
    const synced = await syncDraftEntriesForCompetenceService({
      tenantId: activeTenantId,
      competence,
      employees,
      jobs,
      payrollEntries,
      companyParams: currentPayrollParameters,
      employeeBenefits,
    });
    if (synced > 0) {
      await fetchDatabase(true);
    }
    return synced;
  };

  const updatePayrollStatus = async (entryId: string, status: PayrollStatus) => {
    const { error } = await supabase
      .from('payroll_entries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const deletePayrollEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('payroll_entries')
      .delete()
      .eq('id', entryId)
      .eq('tenant_id', activeTenantId);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const dispatchPayslips = async (competence: string, entryIds?: string[]) => {
    const result = await dispatchPayslipsService(activeTenantId, competence, entryIds);
    await fetchDatabase(true);
    return result;
  };

  const updatePayslipDispatchStatus = async (
    entryIds: string[],
    status: PayslipSentStatus,
    channel = 'email_client'
  ) => {
    await updatePayslipDispatchStatusService(
      activeTenantId,
      entryIds,
      payrollEntries,
      employees,
      status,
      channel
    );
    await fetchDatabase(true);
  };

  // ==================== EMPLOYEE VACATIONS & BENEFITS ====================
  const syncBenefitsToEmployeeAndPayroll = async (
    employeeId: string,
    nextTenantBenefits: EmployeeBenefitRecord[]
  ) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp || emp.contract_type === 'pj') return;

    const baseSalary = resolveEmployeePayrollBaseSalary(emp, jobs);
    const empBenefits = nextTenantBenefits.filter((b) => b.employee_id === employeeId);
    const summary = summarizeEmployeeBenefits(empBenefits, baseSalary, currentPayrollParameters);

    const { data: updatedEmp, error: empErr } = await supabase
      .from('employees')
      .update({
        vt_opted_in: summary.vtOptedIn,
        vr_discount: summary.vrVaDiscount,
        health_plan_discount: summary.healthAndOtherDiscounts,
      })
      .eq('id', employeeId)
      .eq('tenant_id', activeTenantId)
      .select('*')
      .single();

    if (empErr) throw new Error(empErr.message);
    if (updatedEmp) {
      await syncEmployeeDraftPayrollEntriesService({
        tenantId: activeTenantId,
        employee: updatedEmp as Employee,
        jobs,
        payrollEntries,
        companyParams: currentPayrollParameters,
        employeeBenefits: nextTenantBenefits,
      });
    }
  };

  const addEmployeeVacation = async (
    input: CreateEmployeeVacationInput
  ): Promise<EmployeeVacationRecord> => {
    const created = await createEmployeeVacationService(activeTenantId, input);
    await fetchDatabase(true);
    return created;
  };

  const updateEmployeeVacation = async (
    vacationId: string,
    patch: Partial<
      Omit<EmployeeVacationRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
    > & { status?: EmployeeVacationStatus }
  ): Promise<EmployeeVacationRecord> => {
    const updated = await updateEmployeeVacationService(activeTenantId, vacationId, patch);
    await fetchDatabase(true);
    return updated;
  };

  const deleteEmployeeVacation = async (vacationId: string): Promise<void> => {
    await deleteEmployeeVacationService(activeTenantId, vacationId);
    await fetchDatabase(true);
  };

  const launchVacationToPayroll = async (vacationId: string): Promise<PayrollEntry> => {
    const vacation = employeeVacations.find((v) => v.id === vacationId);
    if (!vacation) {
      throw new Error('Registro de férias não encontrado.');
    }

    const emp = employees.find((e) => e.id === vacation.employee_id);
    if (!emp) {
      throw new Error('Colaborador vinculado às férias não encontrado.');
    }
    if (emp.contract_type === 'pj') {
      throw new Error('Apenas colaboradores em regime CLT podem receber férias na folha.');
    }

    const competence = vacation.competence || vacation.start_date.slice(0, 7);
    const existingEntry = payrollEntries.find(
      (p) => p.employee_id === emp.id && p.competence === competence
    );
    const baseSalary = existingEntry
      ? Number(existingEntry.base_salary)
      : resolveEmployeePayrollBaseSalary(emp, jobs);

    const monthDays = 30;
    const leaveDays = existingEntry ? Number(existingEntry.leave_days || 0) : 0;
    const workedDays = Math.max(0, monthDays - Number(vacation.days_taken || 0) - leaveDays);
    const vtEmployerValue = resolveEmployeeVtEmployerValue(
      emp,
      baseSalary,
      currentPayrollParameters,
      employeeBenefits,
      Number(existingEntry?.vt_employer_value ?? 0)
    );

    const periodTag =
      Number(vacation.doubled_days || 0) > 0
        ? `${vacation.acquisitive_period_label} (Vencida · Dobra Art. 137 CLT)`
        : `${vacation.acquisitive_period_label} (No Prazo Concessivo · Art. 134 CLT)`;

    const savedEntry = await upsertPayrollEntryService(
      activeTenantId,
      {
        employeeId: emp.id,
        competence,
        contractType: 'clt',
        baseSalary,
        workedDays,
        dependentsCount: existingEntry
          ? Number(existingEntry.dependents_count)
          : emp.dependents_count ?? 0,
        overtime50Hours: existingEntry ? Number(existingEntry.overtime_50_hours || 0) : 0,
        overtime100Hours: existingEntry ? Number(existingEntry.overtime_100_hours || 0) : 0,
        nightHours: existingEntry ? Number(existingEntry.night_hours || 0) : 0,
        insalubrityRate: existingEntry ? Number(existingEntry.insalubrity_rate || 0) : 0,
        hazardPay: existingEntry ? Boolean(existingEntry.hazard_pay) : false,
        bonuses: existingEntry ? Number(existingEntry.bonuses || 0) : 0,
        absenceDays: existingEntry
          ? Number(existingEntry.absence_days || 0)
          : Number(vacation.unjustified_absences || 0),
        vtOptedIn: existingEntry
          ? Boolean(existingEntry.vt_opted_in)
          : emp.vt_opted_in ?? currentPayrollParameters.default_vt_opted_in,
        vtEmployerValue,
        vrDiscount: existingEntry
          ? Number(existingEntry.vr_discount)
          : Number(emp.vr_discount ?? currentPayrollParameters.default_vr_discount ?? 0),
        otherDiscounts: existingEntry
          ? Number(existingEntry.other_discounts)
          : Number(emp.health_plan_discount ?? 0),
        vacationDays: Number(vacation.days_taken || 0),
        vacationSoldDays: Number(vacation.sold_days || 0),
        vacationDoubledDays: Number(vacation.doubled_days || 0),
        vacationPeriodLabel: periodTag,
        leaveType: existingEntry?.leave_type || 'none',
        leaveDays,
        thirteenthMode: vacation.advance_13th_requested
          ? 'first_installment'
          : existingEntry?.thirteenth_mode || 'none',
        status: existingEntry?.status || 'draft',
        notes:
          existingEntry?.notes ||
          `Férias programadas (${vacation.start_date.split('-').reverse().join('/')} a ${vacation.end_date.split('-').reverse().join('/')})`,
      },
      emp,
      currentPayrollParameters
    );

    const todayIso = new Date().toISOString().slice(0, 10);
    const nextVacStatus: EmployeeVacationStatus =
      vacation.end_date < todayIso
        ? 'completed'
        : vacation.start_date <= todayIso
        ? 'in_progress'
        : 'scheduled';

    await updateEmployeeVacationService(activeTenantId, vacation.id, {
      competence,
      payroll_entry_id: savedEntry.id,
      status: nextVacStatus,
      approved_by: vacation.approved_by || authUser?.id || null,
      approved_at: vacation.approved_at || new Date().toISOString(),
    });

    if (nextVacStatus === 'in_progress' && emp.status !== 'vacation') {
      await supabase
        .from('employees')
        .update({ status: 'vacation' })
        .eq('id', emp.id)
        .eq('tenant_id', activeTenantId);
    }

    await fetchDatabase(true);
    return savedEntry;
  };

  const addEmployeeBenefit = async (
    input: CreateEmployeeBenefitInput
  ): Promise<EmployeeBenefitRecord> => {
    const created = await createEmployeeBenefitService(activeTenantId, input);
    const nextTenantBenefits = [created, ...employeeBenefits];
    await syncBenefitsToEmployeeAndPayroll(input.employee_id, nextTenantBenefits);
    await fetchDatabase(true);
    return created;
  };

  const updateEmployeeBenefit = async (
    benefitId: string,
    patch: Partial<
      Omit<EmployeeBenefitRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
    > & { status?: EmployeeBenefitStatus }
  ): Promise<EmployeeBenefitRecord> => {
    const existing = employeeBenefits.find((b) => b.id === benefitId);
    const updated = await updateEmployeeBenefitService(activeTenantId, benefitId, patch);
    const targetEmpId = updated.employee_id || existing?.employee_id;
    if (targetEmpId) {
      const nextTenantBenefits = employeeBenefits.map((b) =>
        b.id === benefitId ? updated : b
      );
      await syncBenefitsToEmployeeAndPayroll(targetEmpId, nextTenantBenefits);
    }
    await fetchDatabase(true);
    return updated;
  };

  const deleteEmployeeBenefit = async (benefitId: string, employeeId: string): Promise<void> => {
    await deleteEmployeeBenefitService(activeTenantId, benefitId);
    const nextTenantBenefits = employeeBenefits.filter((b) => b.id !== benefitId);
    await syncBenefitsToEmployeeAndPayroll(employeeId, nextTenantBenefits);
    await fetchDatabase(true);
  };

  // ==================== TALENT BANK & LEADS ====================
  const updateTalentStatus = async (id: string, status: TalentBankEntry['status']) => {
    const { error } = await supabase.from('talent_bank').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const deleteTalentEntry = async (id: string) => {
    const { error } = await supabase.from('talent_bank').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const updateContactLeadStatus = async (id: string, status: ContactLead['status']) => {
    const { error } = await supabase.from('contact_leads').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  const deleteContactLead = async (id: string) => {
    const { error } = await supabase.from('contact_leads').delete().eq('id', id);
    if (error) throw new Error(error.message);
    await fetchDatabase(true);
  };

  return (
    <CcbContext.Provider
      value={{
        database,
        loadingData,
        authLoading,
        dataError,
        refreshDatabase,
        currentTenantId: activeTenantId,
        setCurrentTenantId,
        currentCompany,
        allCompanies: database.companies,
        authUser,
        login,
        logout,
        applyFromLanding,
        submitPublicCompanyRegistration,
        submitTalentRegistration,
        submitContactLead,
        registerClientCompany,
        updateCompany,
        approveCompanyStatus,
        deleteCompany,
        addCompanyBranch,
        updateCompanyBranch,
        deleteCompanyBranch,
        branches,
        jobs,
        employees,
        vacancies,
        candidates,
        documents,
        payrollEntries,
        currentPayrollParameters,
        employeeVacations,
        employeeBenefits,
        talentBank: database.talentBank,
        contactLeads: database.contactLeads,
        addNewJob,
        updateJob,
        deleteJob,
        addNewEmployee,
        updateEmployee,
        deleteEmployee,
        addNewVacancy,
        updateVacancy,
        deleteVacancy,
        addNewCandidate,
        updateCandidate,
        updateCandidateStage,
        deleteCandidate,
        geocodeCandidate,
        reissueCandidateToken,
        promoteCandidateToEmployee,
        updateDocumentStatus,
        uploadCandidateDocument,
        uploadEmployeeDocument,
        deleteDocument,
        getDocumentSignedUrl,
        savePayrollParameters,
        upsertPayrollEntry,
        generateCompetencePayroll,
        syncDraftPayroll,
        updatePayrollStatus,
        deletePayrollEntry,
        dispatchPayslips,
        updatePayslipDispatchStatus,
        addEmployeeVacation,
        updateEmployeeVacation,
        deleteEmployeeVacation,
        launchVacationToPayroll,
        addEmployeeBenefit,
        updateEmployeeBenefit,
        deleteEmployeeBenefit,
        updateTalentStatus,
        deleteTalentEntry,
        updateContactLeadStatus,
        deleteContactLead,
        metrics: {
          totalHeadcount: employees.length,
          activeHeadcount: activeEmployees.length,
          vacationHeadcount: vacationEmployees.length,
          totalPayroll,
          averageSalary,
          departmentsCount,
          activeVacanciesCount,
          candidatesInPipelineCount,
          pendingDocsCount,
          expiredTokensCount,
        },
      }}
    >
      {children}
    </CcbContext.Provider>
  );
};

export const useCcb = () => {
  const context = useContext(CcbContext);
  if (!context) {
    throw new Error('useCcb must be used within a CcbProvider');
  }
  return context;
};
