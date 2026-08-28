import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Save,
  Calendar,
  Clock,
  Fuel,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Building,
  CreditCard,
  Truck,
  UserCheck,
  Hash,
} from 'lucide-react';
import { AbastecimentoRecord } from '../types';
import { parseCurrencyFloat, parseVolumeFloat, formatCurrencyBRL } from '../utils/dateUtils';

interface EditReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AbastecimentoRecord | null;
  onSave: (updatedRecord: AbastecimentoRecord, oldNumero?: string) => Promise<void>;
  isSaving: boolean;
}

export const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState<Partial<AbastecimentoRecord>>({});
  const [oldNumero, setOldNumero] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({
        numero: record.numero || '',
        dataAbastecimento: record.dataAbastecimento || '',
        formaPagamento: record.formaPagamento || 'CONTRATO',
        cliente: record.cliente || '',
        horaChegada: record.horaChegada || '',
        inicioAbastecimento: record.inicioAbastecimento || '',
        terminoAbastecimento: record.terminoAbastecimento || '',
        produto: record.produto || 'DIESEL',
        volume: record.volume || '0,00',
        obs: record.obs || '',
        assinaturaCliente: record.assinaturaCliente || '',
        valorLitro: record.valorLitro || '',
        valorTotal: record.valorTotal || '',
        driveFileUrl: record.driveFileUrl || '',
      });
      setOldNumero(record.numero || '');
      setValidationError(null);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleChange = (field: keyof AbastecimentoRecord, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-recalculate total if volume and valorLitro are changed
      if (field === 'volume' || field === 'valorLitro') {
        const vLitroStr = field === 'valorLitro' ? value : prev.valorLitro || '';
        const volStr = field === 'volume' ? value : prev.volume || '';

        const vLitroNum = parseCurrencyFloat(vLitroStr);
        const volNum = parseVolumeFloat(volStr);

        if (vLitroNum > 0 && volNum > 0) {
          updated.valorTotal = formatCurrencyBRL(volNum * vLitroNum);
        }
      }

      return updated;
    });
  };

  const handleVolumeBlur = () => {
    if (formData.volume) {
      const volNum = parseVolumeFloat(formData.volume);
      if (volNum > 0) {
        setFormData((prev) => ({
          ...prev,
          volume: volNum.toFixed(2).replace('.', ','),
        }));
      }
    }
  };

  const handleValorLitroBlur = () => {
    if (formData.valorLitro) {
      const vNum = parseCurrencyFloat(formData.valorLitro);
      if (vNum > 0) {
        setFormData((prev) => ({
          ...prev,
          valorLitro: formatCurrencyBRL(vNum),
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const num = (formData.numero || '').trim();
    if (!num) {
      setValidationError('O Número da Nota / O.S. é obrigatório.');
      return;
    }

    const vol = (formData.volume || '').trim();
    if (!vol || parseVolumeFloat(vol) <= 0) {
      setValidationError('Informe um volume válido maior que zero.');
      return;
    }

    const updatedRecord: AbastecimentoRecord = {
      ...record,
      ...formData,
      numero: num,
      volume: formData.volume?.trim() || '0,00',
    };

    try {
      await onSave(updatedRecord, oldNumero);
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao salvar alterações.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 relative animate-scaleUp my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Editar Lançamento de Abastecimento
              </h3>
              <p className="text-xs text-neutral-500">
                As alterações serão gravadas na linha correspondente da planilha <strong className="text-neutral-700">Dados_Raizen</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium shrink-0 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 py-4 pr-1 space-y-4">
          {/* Row 1: Número da Nota e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-neutral-400" />
                Número da Nota / OS *
              </label>
              <input
                type="text"
                value={formData.numero || ''}
                onChange={(e) => handleChange('numero', e.target.value)}
                placeholder="Ex: 2393379"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Data do Abastecimento
              </label>
              <input
                type="text"
                value={formData.dataAbastecimento || ''}
                onChange={(e) => handleChange('dataAbastecimento', e.target.value)}
                placeholder="DD/MM/AAAA (ex: 27/08/2026)"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 2: Cliente e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-neutral-400" />
                Cliente / Razão Social
              </label>
              <input
                type="text"
                value={formData.cliente || ''}
                onChange={(e) => handleChange('cliente', e.target.value)}
                placeholder="Ex: ORBITAL SERV AUX TRANSP AEREO"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                Forma de Pagamento
              </label>
              <input
                type="text"
                value={formData.formaPagamento || ''}
                onChange={(e) => handleChange('formaPagamento', e.target.value)}
                placeholder="Ex: CONTRATO, FATURADO, A VISTA"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all uppercase"
              />
            </div>
          </div>

          {/* Row 3: Horários (Chegada, Início, Término) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                Chegada
              </label>
              <input
                type="text"
                value={formData.horaChegada || ''}
                onChange={(e) => handleChange('horaChegada', e.target.value)}
                placeholder="12:51"
                className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-center font-mono text-neutral-900 focus:bg-white focus:border-red-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                Início
              </label>
              <input
                type="text"
                value={formData.inicioAbastecimento || ''}
                onChange={(e) => handleChange('inicioAbastecimento', e.target.value)}
                placeholder="12:51"
                className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-center font-mono text-neutral-900 focus:bg-white focus:border-red-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                Término
              </label>
              <input
                type="text"
                value={formData.terminoAbastecimento || ''}
                onChange={(e) => handleChange('terminoAbastecimento', e.target.value)}
                placeholder="12:51"
                className="w-full px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-center font-mono text-neutral-900 focus:bg-white focus:border-red-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 4: Produto e Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-neutral-400" />
                Produto / Combustível
              </label>
              <select
                value={formData.produto || 'DIESEL'}
                onChange={(e) => handleChange('produto', e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all cursor-pointer"
              >
                <option value="GASOLINA">GASOLINA</option>
                <option value="DIESEL">DIESEL</option>
                <option value="DIESEL S10">DIESEL S10</option>
                <option value="JET A-1">JET A-1</option>
                <option value="AVGAS">AVGAS</option>
                <option value="ETANOL">ETANOL</option>
                <option value="ARLA 32">ARLA 32</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-red-500" />
                Volume (Litros) *
              </label>
              <input
                type="text"
                value={formData.volume || ''}
                onChange={(e) => handleChange('volume', e.target.value)}
                onBlur={handleVolumeBlur}
                placeholder="Ex: 35,00"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Row 5: Obs / Equipamento e Assinatura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-neutral-400" />
                Obs. / Equipamento / Placa
              </label>
              <input
                type="text"
                value={formData.obs || ''}
                onChange={(e) => handleChange('obs', e.target.value)}
                placeholder="Ex: GASOL XXD / TZ01A81"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                Assinatura do Cliente / Matrícula
              </label>
              <input
                type="text"
                value={formData.assinaturaCliente || ''}
                onChange={(e) => handleChange('assinaturaCliente', e.target.value)}
                placeholder="Ex: MARCOS 441029"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 6: Financeiro (Valor/Litro e Valor Total) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Valor por Litro (R$)
              </label>
              <input
                type="text"
                value={formData.valorLitro || ''}
                onChange={(e) => handleChange('valorLitro', e.target.value)}
                onBlur={handleValorLitroBlur}
                placeholder="Ex: R$ 6,85"
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Valor Total (R$)
              </label>
              <input
                type="text"
                value={formData.valorTotal || ''}
                onChange={(e) => handleChange('valorTotal', e.target.value)}
                placeholder="Ex: R$ 239,75"
                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Salvando na Planilha...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
