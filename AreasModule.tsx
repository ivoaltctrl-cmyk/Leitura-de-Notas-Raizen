import React, { useState } from 'react';
import {
  Building,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Check,
  X,
  Send,
  Sparkles,
} from 'lucide-react';
import { AreaResponsavel, Employee, BrandConfig } from '../types/index.ts';
import { calculateAreaMetrics } from '../utils/storage.ts';

interface AreasModuleProps {
  areas: AreaResponsavel[];
  employees: Employee[];
  onSaveArea: (area: AreaResponsavel) => void;
  onDeleteArea: (id: string) => void;
  onSelectAreaForDispatch: (area: AreaResponsavel) => void;
  brand: BrandConfig;
}

export const AreasModule: React.FC<AreasModuleProps> = ({
  areas,
  employees,
  onSaveArea,
  onDeleteArea,
  onSelectAreaForDispatch,
  brand,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaResponsavel | null>(null);

  const [formData, setFormData] = useState<Partial<AreaResponsavel>>({
    nome: '',
    responsavelNome: '',
    responsavelCargo: '',
    responsavelEmail: '',
    responsavelTelefone: '',
    unidadeOuLoja: '',
    observacoes: '',
  });

  const primaryColor = brand?.primaryColor || '#006837';
  const accentColor = brand?.accentColor || '#f59e0b';

  const filteredAreas = areas.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.nome.toLowerCase().includes(term) ||
      a.responsavelNome.toLowerCase().includes(term) ||
      (a.unidadeOuLoja && a.unidadeOuLoja.toLowerCase().includes(term))
    );
  });

  const handleOpenNew = () => {
    setEditingArea(null);
    setFormData({
      id: `area-${Date.now()}`,
      nome: '',
      responsavelNome: '',
      responsavelCargo: '',
      responsavelEmail: '',
      responsavelTelefone: '',
      unidadeOuLoja: '',
      observacoes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (area: AreaResponsavel) => {
    setEditingArea(area);
    setFormData({ ...area });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.responsavelNome) return;

    const areaToSave: AreaResponsavel = {
      id: formData.id || `area-${Date.now()}`,
      nome: formData.nome,
      responsavelNome: formData.responsavelNome,
      responsavelCargo: formData.responsavelCargo || 'Responsável de Área',
      responsavelEmail: formData.responsavelEmail || '',
      responsavelTelefone: formData.responsavelTelefone || '',
      unidadeOuLoja: formData.unidadeOuLoja || '',
      observacoes: formData.observacoes || '',
    };

    onSaveArea(areaToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Gestão de Áreas & Responsáveis
            </h2>
            <span
              style={{ backgroundColor: `${accentColor}20`, color: primaryColor }}
              className="px-2 py-0.5 rounded-md text-xs font-black uppercase"
            >
              {areas.length} Áreas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre os gestores responsáveis por cada área para disparo de cobranças consolidadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar área, gestor ou unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
            />
          </div>

          <button
            onClick={handleOpenNew}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Área</span>
          </button>
        </div>
      </div>

      {/* Grid of Areas */}
      {filteredAreas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma Área Encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Cadastre as áreas da empresa (ex: Logística, Manutenção, Obras, Facilities, Segurança) e atrele os responsáveis para envio de pendências.
          </p>
          <button
            onClick={handleOpenNew}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
          >
            Cadastrar Primeira Área
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAreas.map((area) => {
            const metrics = calculateAreaMetrics(area.id, employees);
            const areaEmployees = employees.filter((e) => e.areaId === area.id);

            return (
              <div
                key={area.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Area Card Header */}
                <div className="p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        {area.unidadeOuLoja || 'Área Operacional'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {area.nome}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(area)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar Área"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja excluir a área "${area.nome}"?`)) {
                            onDeleteArea(area.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir Área"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Manager Contact Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">
                        {area.responsavelNome}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block pl-6">
                      {area.responsavelCargo}
                    </span>

                    <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-[11px] text-slate-600">
                      {area.responsavelEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <a
                            href={`mailto:${area.responsavelEmail}`}
                            className="hover:underline text-slate-700"
                          >
                            {area.responsavelEmail}
                          </a>
                        </span>
                      )}
                      {area.responsavelTelefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{area.responsavelTelefone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="p-5 bg-slate-50/50 space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Colabs
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {metrics.totalColaboradores}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Em Dia
                      </span>
                      <span className="text-sm font-black text-emerald-600">
                        {metrics.emDia}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Vencendo
                      </span>
                      <span className="text-sm font-black text-amber-600">
                        {metrics.aVencer30Dias}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">
                        Críticos
                      </span>
                      <span className="text-sm font-black text-rose-600">
                        {metrics.criticos}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-600">Conformidade da Área:</span>
                      <span
                        style={{ color: metrics.taxaConformidade >= 85 ? '#059669' : '#dc2626' }}
                      >
                        {metrics.taxaConformidade}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${metrics.taxaConformidade}%`,
                          backgroundColor:
                            metrics.taxaConformidade >= 85
                              ? '#059669'
                              : metrics.taxaConformidade >= 60
                              ? '#f59e0b'
                              : '#e11d48',
                        }}
                      />
                    </div>
                  </div>

                  {/* Dispatch Button for this Area */}
                  <button
                    type="button"
                    onClick={() => onSelectAreaForDispatch(area)}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Send className="w-3.5 h-3.5" style={{ color: accentColor }} />
                    <span>Disparar Cobrança para {area.responsavelNome.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating / Editing Area */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="p-2 rounded-xl text-white"
                >
                  <Building className="w-5 h-5" style={{ color: accentColor }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingArea ? 'Editar Área & Responsável' : 'Nova Área / Setor'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina o nome da área e os contatos do gestor responsável
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome da Área / Setor *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Logística & CDs, Manutenção, Obras, Facilities"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Gestor Responsável *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ricardo Fontes"
                    value={formData.responsavelNome || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavelNome: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Função:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Gerente de Operações"
                    value={formData.responsavelCargo || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavelCargo: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail Corporativo:
                  </label>
                  <input
                    type="email"
                    placeholder="gestor@gpa.com.br"
                    value={formData.responsavelEmail || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavelEmail: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp / Telefone:
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={formData.responsavelTelefone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, responsavelTelefone: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unidade / Regional / Loja:
                </label>
                <input
                  type="text"
                  placeholder="Ex: CD Osasco, Regional SP, Matriz GPA"
                  value={formData.unidadeOuLoja || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, unidadeOuLoja: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações / Regras da Área:
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações pertinentes à área..."
                  value={formData.observacoes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: primaryColor }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Área</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
