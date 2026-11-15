import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Company,
  CompanyBranch,
  Job,
  Employee,
  Vacancy,
  Candidate,
  DocumentRecord,
  HireGridDatabase,
  DocumentStatus,
  PipelineStage,
  DocumentType,
  AuthUser,
} from '../types/database';
import { createInitialDatabase } from '../data/mockDatabase';
import { ONBOARDING_SQL_TRANSACTION } from '../utils/sqlTemplates';

export interface RegisterCompanyInput {
  company: {
    name: string;
    cnpj: string;
    cnpj_root?: string;
    email?: string;
    telefone?: string;
    area_atuacao?: string;
    porte?: 'micro' | 'pequena' | 'media' | 'grande';
    endereco?: string;
    cidade?: string;
    estado?: string;
    responsavel_nome?: string;
    responsavel_cargo?: string;
    beneficios?: string[];
    status?: 'pending_review' | 'active' | 'inactive';
  };
  vacancies?: Array<{
    cargo: string;
    area?: string;
    salario?: string;
    descricao?: string;
  }>;
}

interface HireGridContextType {
  database: HireGridDatabase;
  currentTenantId: string;
  setCurrentTenantId: (id: string) => void;
  currentCompany: Company;
  allCompanies: Company[];
  authUser: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  applyFromLanding: (
    vacancyId: string,
    tenantId: string,
    fullName: string,
    email: string,
    phone: string,
    resumeFileName?: string,
    linkedinUrl?: string
  ) => Candidate;
  registerClientCompany: (input: RegisterCompanyInput) => Company;
  approveCompanyStatus: (companyId: string, status?: 'active' | 'inactive') => void;
  addCompanyBranch: (
    companyId: string,
    branch: Omit<CompanyBranch, 'id' | 'company_id' | 'created_at'>
  ) => CompanyBranch;
  
  // Tenant-scoped queries (isolamento por empresa cliente gerenciada pela CCB)
  branches: CompanyBranch[];
  jobs: Job[];
  employees: Employee[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  documents: DocumentRecord[];
  
  // Actions
  promoteCandidateToEmployee: (
    candidateId: string,
    reportsToId: string | null,
    hireDate: string
  ) => { success: boolean; employeeId?: string; sql: string; message: string };
  reissueCandidateToken: (candidateId: string) => { newToken: string; newExpiresAt: string };
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;
  uploadCandidateDocument: (
    candidateId: string,
    docType: DocumentType,
    fileName: string
  ) => void;
  updateCandidateStage: (candidateId: string, stage: PipelineStage) => void;
  addNewCandidate: (
    vacancyId: string,
    fullName: string,
    email: string,
    phone: string
  ) => Candidate;
  addNewEmployee: (employeeData: Omit<Employee, 'id' | 'created_at' | 'tenant_id'>) => Employee;
  addNewVacancy: (vacancyData: Omit<Vacancy, 'id' | 'created_at' | 'tenant_id'>) => Vacancy;
  addNewJob: (jobData: Omit<Job, 'id' | 'created_at' | 'tenant_id'>) => Job;
  resetDatabase: () => void;
  
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

const HireGridContext = createContext<HireGridContextType | undefined>(undefined);

const STORAGE_KEY = 'ccbrh_db_v2';
const TENANT_STORAGE_KEY = 'ccbrh_current_tenant_v2';
const AUTH_STORAGE_KEY = 'ccbrh_auth_user_v1';

export const HireGridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        return JSON.parse(savedAuth);
      }
    } catch (e) {
      console.error('Error loading auth from localStorage', e);
    }
    return null;
  });
  const [database, setDatabase] = useState<HireGridDatabase>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...createInitialDatabase(),
          ...parsed,
          branches: Array.isArray(parsed.branches)
            ? parsed.branches
            : createInitialDatabase().branches,
        };
      }
    } catch (e) {
      console.error('Error loading database from localStorage', e);
    }
    return createInitialDatabase();
  });

  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    try {
      const savedTenant = localStorage.getItem(TENANT_STORAGE_KEY);
      if (savedTenant && database.companies.some((c) => c.id === savedTenant)) {
        return savedTenant;
      }
    } catch (e) {
      console.error('Error loading tenant from localStorage', e);
    }
    return database.companies[0]?.id || 'c1b50462-81b8-4c12-8884-a10c71280001';
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch (e) {
      console.error('Error saving database to localStorage', e);
    }
  }, [database]);

  useEffect(() => {
    try {
      localStorage.setItem(TENANT_STORAGE_KEY, currentTenantId);
    } catch (e) {
      console.error('Error saving tenant to localStorage', e);
    }
  }, [currentTenantId]);

  useEffect(() => {
    try {
      if (authUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving auth to localStorage', e);
    }
  }, [authUser]);

  // SaaS Login
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Falha ao autenticar.' };
      }
      const user: AuthUser = data.user;
      setAuthUser(user);
      return { success: true };
    } catch {
      return { success: false, error: 'Erro de comunicação com o servidor de autenticação.' };
    }
  };

  const logout = () => {
    setAuthUser(null);
  };

  const applyFromLanding = (
    vacancyId: string,
    tenantId: string,
    fullName: string,
    email: string,
    phone: string,
    resumeFileName?: string,
    linkedinUrl?: string
  ): Candidate => {
    const newCandId = `cand-${Date.now().toString(36)}`;
    const token = crypto.randomUUID ? crypto.randomUUID() : `tok-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const cleanResume = resumeFileName?.trim();
    const cleanLinkedin = linkedinUrl?.trim();

    const candidate: Candidate = {
      id: newCandId,
      tenant_id: tenantId,
      vacancy_id: vacancyId,
      full_name: fullName,
      email,
      phone,
      linkedin_url: cleanLinkedin || undefined,
      resume_file_name: cleanResume || undefined,
      pipeline_stage: 'triagem',
      document_token: token,
      token_expires_at: expiresAt,
      created_at: nowIso,
    };

    const newResumeDoc: DocumentRecord | null = cleanResume
      ? {
          id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          tenant_id: tenantId,
          employee_id: null,
          candidate_id: newCandId,
          document_type: 'Curriculo',
          storage_path: `ccbrh-docs/${tenantId.substring(0, 8)}/candidates/${newCandId}/${cleanResume}`,
          status: 'pending_review',
          uploaded_at: nowIso,
        }
      : null;

    setDatabase((prev) => ({
      ...prev,
      candidates: [candidate, ...prev.candidates],
      documents: newResumeDoc ? [newResumeDoc, ...prev.documents] : prev.documents,
    }));

    return candidate;
  };

  // Current company based on currentTenantId
  const currentCompany =
    database.companies.find((c) => c.id === currentTenantId) ||
    database.companies[0];

  // Multi-tenant scoped records (isolamento por empresa cliente gerenciada pela CCB)
  const branches = (database.branches || []).filter((b) => b.company_id === currentTenantId);
  const jobs = database.jobs.filter((j) => j.tenant_id === currentTenantId);
  const employees = database.employees.filter((e) => e.tenant_id === currentTenantId);
  const vacancies = database.vacancies.filter((v) => v.tenant_id === currentTenantId);
  const candidates = database.candidates.filter((c) => c.tenant_id === currentTenantId);
  const documents = database.documents.filter((d) => d.tenant_id === currentTenantId);

  // Analytics metrics computation
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const vacationEmployees = employees.filter((e) => e.status === 'vacation');
  
  // Total payroll for active/vacation employees
  const totalPayroll = employees
    .filter((e) => e.status === 'active' || e.status === 'vacation')
    .reduce((sum, emp) => {
      const job = jobs.find((j) => j.id === emp.job_id);
      return sum + (job ? Number(job.base_salary) : 0);
    }, 0);

  const activeSalaryCount = employees.filter(
    (e) => e.status === 'active' || e.status === 'vacation'
  ).length;
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

  // Onboarding action: move candidate to employees & re-link documents
  const promoteCandidateToEmployee = (
    candidateId: string,
    reportsToId: string | null,
    hireDate: string
  ) => {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) {
      return {
        success: false,
        sql: '',
        message: `Candidato não encontrado no tenant ${currentTenantId}.`,
      };
    }

    const vac = vacancies.find((v) => v.id === cand.vacancy_id);
    if (!vac) {
      return {
        success: false,
        sql: '',
        message: `Vaga vinculada ao candidato não foi encontrada.`,
      };
    }

    const newEmployeeId = `e-emp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newEmployee: Employee = {
      id: newEmployeeId,
      tenant_id: currentTenantId,
      job_id: vac.job_id,
      reports_to: reportsToId,
      full_name: cand.full_name,
      email: cand.email,
      status: 'active',
      hire_date: hireDate || new Date().toISOString().split('T')[0],
      resignation_date: null,
      created_at: new Date().toISOString(),
    };

    // SQL transaction log for transparency
    const sqlExecuted = ONBOARDING_SQL_TRANSACTION(
      currentTenantId,
      candidateId,
      reportsToId,
      newEmployee.hire_date
    );

    setDatabase((prev) => {
      // 1. Add to employees
      const updatedEmployees = [newEmployee, ...prev.employees];

      // 2. Transfer documents: candidate_id -> null, employee_id -> newEmployeeId
      const updatedDocuments = prev.documents.map((doc) => {
        if (doc.tenant_id === currentTenantId && doc.candidate_id === candidateId) {
          return {
            ...doc,
            employee_id: newEmployeeId,
            candidate_id: null,
          };
        }
        return doc;
      });

      // 3. Remove or archive candidate from candidates table
      const updatedCandidates = prev.candidates.filter(
        (c) => !(c.id === candidateId && c.tenant_id === currentTenantId)
      );

      return {
        ...prev,
        employees: updatedEmployees,
        documents: updatedDocuments,
        candidates: updatedCandidates,
      };
    });

    return {
      success: true,
      employeeId: newEmployeeId,
      sql: sqlExecuted,
      message: `Candidato ${cand.full_name} convertido com sucesso para Funcionário! Documentos transferidos e organograma atualizado.`,
    };
  };

  // Re-issue temporary upload token (7 days extension)
  const reissueCandidateToken = (candidateId: string) => {
    const newToken = crypto.randomUUID ? crypto.randomUUID() : `tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    setDatabase((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => {
        if (c.id === candidateId && c.tenant_id === currentTenantId) {
          return {
            ...c,
            document_token: newToken,
            token_expires_at: newExpiresAt,
          };
        }
        return c;
      }),
    }));

    return { newToken, newExpiresAt };
  };

  // Update document status (approved, rejected, pending_review)
  const updateDocumentStatus = (documentId: string, status: DocumentStatus) => {
    setDatabase((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) => {
        if (doc.id === documentId && doc.tenant_id === currentTenantId) {
          return { ...doc, status };
        }
        return doc;
      }),
    }));
  };

  // Candidate file upload simulator to Supabase Storage
  const uploadCandidateDocument = (
    candidateId: string,
    docType: DocumentType,
    fileName: string
  ) => {
    const storagePath = `ccbrh-docs/${currentTenantId.substring(0, 8)}/candidates/${candidateId}/${fileName}`;
    const newDocId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;

    setDatabase((prev) => {
      // Check if existing document of this type already exists for candidate
      const existingIndex = prev.documents.findIndex(
        (d) =>
          d.tenant_id === currentTenantId &&
          d.candidate_id === candidateId &&
          d.document_type === docType
      );

      if (existingIndex >= 0) {
        // Update existing document
        const updated = [...prev.documents];
        updated[existingIndex] = {
          ...updated[existingIndex],
          storage_path: storagePath,
          status: 'pending_review',
          uploaded_at: new Date().toISOString(),
        };
        return { ...prev, documents: updated };
      }

      // Add new document
      const newDoc: DocumentRecord = {
        id: newDocId,
        tenant_id: currentTenantId,
        employee_id: null,
        candidate_id: candidateId,
        document_type: docType,
        storage_path: storagePath,
        status: 'pending_review',
        uploaded_at: new Date().toISOString(),
      };

      return {
        ...prev,
        documents: [...prev.documents, newDoc],
      };
    });
  };

  // Move candidate across pipeline stages
  const updateCandidateStage = (candidateId: string, stage: PipelineStage) => {
    setDatabase((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => {
        if (c.id === candidateId && c.tenant_id === currentTenantId) {
          return { ...c, pipeline_stage: stage };
        }
        return c;
      }),
    }));
  };

  // Add new candidate
  const addNewCandidate = (
    vacancyId: string,
    fullName: string,
    email: string,
    phone: string
  ): Candidate => {
    const newCandId = `cand-${Date.now().toString(36)}`;
    const token = crypto.randomUUID ? crypto.randomUUID() : `tok-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const candidate: Candidate = {
      id: newCandId,
      tenant_id: currentTenantId,
      vacancy_id: vacancyId,
      full_name: fullName,
      email,
      phone,
      pipeline_stage: 'triagem',
      document_token: token,
      token_expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    setDatabase((prev) => ({
      ...prev,
      candidates: [candidate, ...prev.candidates],
    }));

    return candidate;
  };

  // Add new employee
  const addNewEmployee = (employeeData: Omit<Employee, 'id' | 'created_at' | 'tenant_id'>): Employee => {
    const newEmpId = `e-${Date.now().toString(36)}`;
    const newEmployee: Employee = {
      ...employeeData,
      id: newEmpId,
      tenant_id: currentTenantId,
      created_at: new Date().toISOString(),
    };

    setDatabase((prev) => ({
      ...prev,
      employees: [newEmployee, ...prev.employees],
    }));

    return newEmployee;
  };

  // Add new vacancy
  const addNewVacancy = (vacancyData: Omit<Vacancy, 'id' | 'created_at' | 'tenant_id'>): Vacancy => {
    const newVacId = `v-${Date.now().toString(36)}`;
    const newVac: Vacancy = {
      ...vacancyData,
      id: newVacId,
      tenant_id: currentTenantId,
      created_at: new Date().toISOString(),
    };

    setDatabase((prev) => ({
      ...prev,
      vacancies: [newVac, ...prev.vacancies],
    }));

    return newVac;
  };

  // Add new job role for current client company
  const addNewJob = (jobData: Omit<Job, 'id' | 'created_at' | 'tenant_id'>): Job => {
    const newJobId = `j-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newJob: Job = {
      ...jobData,
      id: newJobId,
      tenant_id: currentTenantId,
      created_at: new Date().toISOString(),
    };

    setDatabase((prev) => ({
      ...prev,
      jobs: [...prev.jobs, newJob],
    }));

    return newJob;
  };

  // Add a branch / unit to a client company
  const addCompanyBranch = (
    companyId: string,
    branch: Omit<CompanyBranch, 'id' | 'company_id' | 'created_at'>
  ): CompanyBranch => {
    const newBranch: CompanyBranch = {
      ...branch,
      id: `br-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      company_id: companyId,
      cnpj: branch.cnpj.replace(/\D/g, ''),
      created_at: new Date().toISOString(),
    };

    setDatabase((prev) => ({
      ...prev,
      branches: [...(prev.branches || []), newBranch],
    }));

    return newBranch;
  };

  // Register a client company (either from /cadastro-empresa or inside CCB SaaS)
  const registerClientCompany = (input: RegisterCompanyInput): Company => {
    const newCompanyId = crypto.randomUUID
      ? crypto.randomUUID()
      : `comp-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const companyStatus = input.company.status || 'active';
    const cleanCnpj = input.company.cnpj.replace(/\D/g, '');
    const cleanRoot = (input.company.cnpj_root || cleanCnpj.slice(0, 8)).replace(/\D/g, '').slice(0, 8);

    const newCompany: Company = {
      id: newCompanyId,
      name: input.company.name,
      cnpj: cleanCnpj || `${cleanRoot}000100`,
      cnpj_root: cleanRoot || undefined,
      email: input.company.email,
      telefone: input.company.telefone,
      area_atuacao: input.company.area_atuacao,
      porte: input.company.porte,
      endereco: input.company.endereco,
      cidade: input.company.cidade,
      estado: input.company.estado,
      responsavel_nome: input.company.responsavel_nome,
      responsavel_cargo: input.company.responsavel_cargo,
      beneficios: input.company.beneficios || [],
      status: companyStatus,
      created_at: nowIso,
    };

    const initialBranch: CompanyBranch | null = cleanCnpj.length === 14
      ? {
          id: `br-${Date.now().toString(36)}`,
          company_id: newCompanyId,
          label: input.company.cidade ? `Matriz · ${input.company.cidade}` : 'Matriz',
          cnpj: cleanCnpj,
          endereco: input.company.endereco,
          cidade: input.company.cidade,
          estado: input.company.estado,
          is_headquarters: true,
          created_at: nowIso,
        }
      : null;

    const newJobs: Job[] = [];
    const newVacancies: Vacancy[] = [];

    (input.vacancies || [])
      .filter((v) => v.cargo.trim().length > 0)
      .forEach((v, idx) => {
        const parsedSalary =
          Number(String(v.salario || '').replace(/[^\d,.-]/g, '').replace(',', '.')) || 3500;
        const jobId = `j-${Date.now().toString(36)}-${idx}`;
        newJobs.push({
          id: jobId,
          tenant_id: newCompanyId,
          title: v.cargo.trim(),
          department: v.area?.trim() || input.company.area_atuacao || 'Operações',
          base_salary: parsedSalary,
          created_at: nowIso,
        });
        newVacancies.push({
          id: `v-${Date.now().toString(36)}-${idx}`,
          tenant_id: newCompanyId,
          job_id: jobId,
          branch_id: initialBranch?.id || null,
          title: v.cargo.trim(),
          description: v.descricao?.trim() || `Vaga cadastrada para ${input.company.name}`,
          vacancies_count: 1,
          city: input.company.cidade,
          state: input.company.estado,
          show_salary: Boolean(v.salario),
          api_source: 'company_form',
          api_external_id: null,
          status: companyStatus === 'active' ? 'open' : 'paused',
          created_at: nowIso,
        });
      });

    setDatabase((prev) => ({
      ...prev,
      companies: [newCompany, ...prev.companies],
      branches: initialBranch ? [...(prev.branches || []), initialBranch] : prev.branches || [],
      jobs: [...newJobs, ...prev.jobs],
      vacancies: [...newVacancies, ...prev.vacancies],
    }));

    return newCompany;
  };

  // Approve or deactivate a client company inside CCB SaaS
  const approveCompanyStatus = (companyId: string, status: 'active' | 'inactive' = 'active') => {
    setDatabase((prev) => ({
      ...prev,
      companies: prev.companies.map((c) => (c.id === companyId ? { ...c, status } : c)),
      vacancies:
        status === 'active'
          ? prev.vacancies.map((v) =>
              v.tenant_id === companyId && v.api_source === 'company_form'
                ? { ...v, status: 'open' }
                : v
            )
          : prev.vacancies,
    }));
  };

  // Reset to default seed database
  const resetDatabase = () => {
    const freshDb = createInitialDatabase();
    setDatabase(freshDb);
    setCurrentTenantId(freshDb.companies[0].id);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <HireGridContext.Provider
      value={{
        database,
        currentTenantId,
        setCurrentTenantId,
        currentCompany,
        allCompanies: database.companies,
        authUser,
        login,
        logout,
        applyFromLanding,
        registerClientCompany,
        approveCompanyStatus,
        addCompanyBranch,
        branches,
        jobs,
        employees,
        vacancies,
        candidates,
        documents,
        promoteCandidateToEmployee,
        reissueCandidateToken,
        updateDocumentStatus,
        uploadCandidateDocument,
        updateCandidateStage,
        addNewCandidate,
        addNewEmployee,
        addNewVacancy,
        addNewJob,
        resetDatabase,
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
    </HireGridContext.Provider>
  );
};

export const useHireGrid = () => {
  const context = useContext(HireGridContext);
  if (!context) {
    throw new Error('useHireGrid must be used within a HireGridProvider');
  }
  return context;
};
