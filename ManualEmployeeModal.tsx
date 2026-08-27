import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Building2,
  Building,
  ShieldCheck,
  CheckCircle2,
  FileText,
  HeartPulse,
  HardHat,
  Radio,
  Calendar,
  Check,
} from 'lucide-react';
import { Employee, Contract, AreaResponsavel, DocType, DocStatus, PendingDoc, BrandConfig } from '../types/index.ts';
import { recalculateEmployeeStatus, updateEmployeeCalculatedFields } from '../utils/storage.ts';

interface ManualEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEmployee: (employee: Employee) => void;
  editingEmployee?: Employee | null;
  contracts: Contract[];
  areas: AreaResponsavel[];
  brand: BrandConfig;
}

export const ManualEmployeeModal: React.FC<ManualEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSaveEmployee,
  editingEmployee,
  contracts,
  areas,
  brand,
}) => {
  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';

  const [formData, setFormData] = useState<Partial<Employee>>({
    nome: '',
    matricula: '',
    cpf: '',
    cargo: '',
    setor: '',
    areaId: '',
    areaNome: '',
    areaResponsavelNome: '',
    empresa: '',
    contratoId: '',
    contratoNome: '',
    resumoGeral: '',
  });

  const [osStatus, setOsStatus] = useState<DocStatus>('EM_DIA');
  const [asoStatus, setAsoStatus] = useState<DocStatus>('EM_DIA');
  const [epiStatus, setEpiStatus] = useState<DocStatus>('EM_DIA');
  const [radioStatus, setRadioStatus] = useState<DocStatus>('NAO_APLICAVEL');

  useEffect(() => {
    if (!isOpen) return;

    if (editingEmployee) {
      setFormData(editingEmployee);
      const os = editingEmployee.pendencias.find((p) => p.tipo === 'ORDEM_DE_SERVICO');
      const aso = editingEmployee.pendencias.find((p) => p.tipo === 'ATESTADO_SAUDE_OCUPACIONAL');
      const epi = editingEmployee.pendencias.find((p) => p.tipo === 'FICHA_EPI');
      const radio = editingEmployee.pendencias.find((p) => p.tipo === 'TREINAMENTO_RADIOPROTECAO');

      if (os) setOsStatus(os.status);
      if (aso) setAsoStatus(aso.status);
      if (epi) setEpiStatus(epi.status);
      if (radio) setRadioStatus(radio.status);
    } else {
      const defaultArea = areas[0];
      const defaultContract = contracts[0];

      setFormData({
        nome: '',
        matricula: `GPA-${Math.floor(10000 + Math.random() * 90000)}`,
        cpf: '',
        cargo: '',
        setor: defaultArea?.nome || 'Operações',
        areaId: defaultArea?.id || '',
        areaNome: defaultArea?.nome || '',
        areaResponsavelNome: defaultArea?.responsavelNome || '',
        areaResponsavelEmail: defaultArea?.responsavelEmail || '',
        areaResponsavelTelefone: defaultArea?.responsavelTelefone || '',
        empresa: 'GPA Prestadora',
        contratoId: defaultContract?.id || '',
        contratoNome: defaultContract ? `${defaultContract.numero} - ${defaultContract.titulo}` : '',
        resumoGeral: '',
      });
      setOsStatus('EM_DIA');
      setAsoStatus('EM_DIA');
      setEpiStatus('EM_DIA');
      setRadioStatus('NAO_APLICAVEL');
    }
  }, [isOpen, editingEmployee, contracts, areas]);

  if (!isOpen) return null;

  const handleAreaSelect = (areaId: string) => {
    const selected = areas.find((a) => a.id === areaId);
    if (selected) {
      setFormData({
        ...formData,
        areaId: selected.id,
        areaNome: selected.nome,
        setor: selected.nome,
        areaResponsavelNome: selected.responsavelNome,
        areaResponsavelEmail: selected.responsavelEmail,
        areaResponsavelTelefone: selected.responsavelTelefone,
      });
    } else {
      setFormData({
        ...formData,
        areaId: '',
        areaNome: '',
        areaResponsavelNome: '',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.matricula || !formData.cargo) {
      alert('Por favor preencha os campos obrigatórios (Nome, Matrícula e Cargo).');
      return;
    }

    const matchedContract = contracts.find((c) => c.id === formData.contratoId);

    const pendencias: PendingDoc[] = [
      {
        id: `p_man_os_${Date.now()}`,
        tipo: 'ORDEM_DE_SERVICO',
        nomeDocumento: 'Ordem de Serviço de SST (NR-01)',
        status: osStatus,
        obrigatorio: true,
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
      },
      {
        id: `p_man_aso_${Date.now()}`,
        tipo: 'ATESTADO_SAUDE_OCUPACIONAL',
        nomeDocumento: 'Atestado de Saúde Ocupacional - ASO (NR-07)',
        status: asoStatus,
        obrigatorio: true,
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
      },
      {
        id: `p_man_epi_${Date.now()}`,
        tipo: 'FICHA_EPI',
        nomeDocumento: 'Ficha de Distribuição e Controle de EPI (NR-06)',
        status: epiStatus,
        obrigatorio: true,
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
      },
      {
        id: `p_man_rad_${Date.now()}`,
        tipo: 'TREINAMENTO_RADIOPROTECAO',
        nomeDocumento: 'Certificação Técnica Obrigatória (NR-10/NR-35/NR-33/Radioproteção)',
        status: radioStatus,
        obrigatorio: radioStatus !== 'NAO_APLICAVEL',
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
      },
    ];

    const rawEmployee: Partial<Employee> = {
      id: editingEmployee ? editingEmployee.id : `emp_man_${Date.now()}`,
      nome: formData.nome || '',
      matricula: formData.matricula || '',
      cpf: formData.cpf || '',
      cargo: formData.cargo || '',
      setor: formData.setor || formData.areaNome || 'Operações',
      areaId: formData.areaId,
      areaNome: formData.areaNome,
      areaResponsavelNome: formData.areaResponsavelNome,
      areaResponsavelEmail: formData.areaResponsavelEmail,
      areaResponsavelTelefone: formData.areaResponsavelTelefone,
      empresa: formData.empresa || 'GPA Prestadora',
      contratoId: formData.contratoId,
      contratoNome: matchedContract ? `${matchedContract.numero} - ${matchedContract.titulo}` : formData.contratoNome,
      pendencias,
      dataCadastro: editingEmployee ? editingEmployee.dataCadastro : new Date().toISOString().split('T')[0],
      dataUltimaLeitura: new Date().toISOString().split('T')[0],
      resumoGeral: formData.resumoGeral || '',
    };

    const updated = updateEmployeeCalculatedFields(rawEmployee as Employee);
    onSaveEmployee(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="p-2.5 rounded-2xl text-white shadow-xs"
            >
              <UserPlus className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {editingEmployee ? 'Editar Colaborador & Pendências' : 'Novo Colaborador GPA'}
              </h2>
              <p className="text-xs text-slate-500">
                Preencha os dados e selecione a área e o contrato vinculado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Identificação */}
          <div className="space-y-3">
            <span className="font-bold text-slate-900 uppercase tracking-wider block">
              1. Identificação do Colaborador
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Ferreira Silva"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Matrícula / ID *:</label>
                <input
                  type="text"
                  required
                  placeholder="GPA-00000"
                  value={formData.matricula || ''}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF:</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf || ''}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo / Função *:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operador Logístico, Eletricista"
                  value={formData.cargo || ''}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Área & Contrato */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900 uppercase tracking-wider block">
              2. Área & Responsável & Contrato GPA
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Área / Setor Responsável *:
                </label>
                <select
                  value={formData.areaId || ''}
                  onChange={(e) => handleAreaSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione uma Área</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} (Resp: {a.responsavelNome})
                    </option>
                  ))}
                </select>
                {formData.areaResponsavelNome && (
                  <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
                    ✓ Gestor vinculado: {formData.areaResponsavelNome}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contrato GPA Vinculado:
                </label>
                <select
                  value={formData.contratoId || ''}
                  onChange={(e) => {
                    const c = contracts.find((con) => con.id === e.target.value);
                    setFormData({
                      ...formData,
                      contratoId: e.target.value,
                      contratoNome: c ? `${c.numero} - ${c.titulo}` : '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione um Contrato</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero} - {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Empresa / Razão Social Prestadora:
                </label>
                <input
                  type="text"
                  placeholder="Ex: WFS Facilities Ltda"
                  value={formData.empresa || ''}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Status dos 4 Documentos */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900 uppercase tracking-wider block">
              3. Situação dos Documentos Obrigatórios
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">1. Ordem de Serviço (NR-01)</span>
                <select
                  value={osStatus}
                  onChange={(e) => setOsStatus(e.target.value as DocStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="EM_DIA">EM DIA</option>
                  <option value="A_VENCER">A VENCER (≤ 30 dias)</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">2. ASO Ocupacional (NR-07)</span>
                <select
                  value={asoStatus}
                  onChange={(e) => setAsoStatus(e.target.value as DocStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="EM_DIA">EM DIA</option>
                  <option value="A_VENCER">A VENCER (≤ 30 dias)</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">3. Ficha de EPI (NR-06)</span>
                <select
                  value={epiStatus}
                  onChange={(e) => setEpiStatus(e.target.value as DocStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="EM_DIA">EM DIA</option>
                  <option value="A_VENCER">A VENCER (≤ 30 dias)</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-800 block">4. Certificação Técnica</span>
                <select
                  value={radioStatus}
                  onChange={(e) => setRadioStatus(e.target.value as DocStatus)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                >
                  <option value="EM_DIA">EM DIA</option>
                  <option value="A_VENCER">A VENCER (≤ 30 dias)</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="VENCIDO">VENCIDO</option>
                  <option value="NAO_APLICAVEL">NÃO SE APLICA</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Colaborador</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
