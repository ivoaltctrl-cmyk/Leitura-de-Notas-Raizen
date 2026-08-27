import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Mail,
  FileText,
  Copy,
  Check,
  Sparkles,
  Calendar,
  Building2,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Employee, Contract, DemandLog } from '../types/index.ts';

interface DemandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee | null;
  contract?: Contract | null;
  contracts: Contract[];
  onSaveDemandLog: (log: DemandLog) => void;
}

export const DemandCenterModal: React.FC<DemandCenterModalProps> = ({
  isOpen,
  onClose,
  employee,
  contract,
  contracts,
  onSaveDemandLog,
}) => {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'chamado'>('whatsapp');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [prazoDias, setPrazoDias] = useState<number>(3);
  const [subject, setSubject] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize recipient details and generate default message
  useEffect(() => {
    if (!isOpen) return;

    // Find linked contract
    let activeContract = contract;
    if (!activeContract && employee && employee.contratoId) {
      activeContract = contracts.find((c) => c.id === employee.contratoId) || null;
    }

    if (activeContract) {
      setRecipientName(activeContract.gestorResponsavel || 'Gestor do Contrato');
      setRecipientContact(
        channel === 'email'
          ? activeContract.emailContato || ''
          : activeContract.telefoneContato || ''
      );
    } else {
      setRecipientName('Encarregado / RH');
      setRecipientContact('');
    }

    generateMessage(channel, activeContract);
  }, [isOpen, employee, contract, channel]);

  if (!isOpen) return null;

  const getPendingItemsList = () => {
    if (!employee) return [];
    return employee.pendencias
      .filter((p) => p.status === 'PENDENTE' || p.status === 'VENCIDO' || p.status === 'EM_ANALISE')
      .map((p) => ({
        nome: p.nomeDocumento,
        status: p.status === 'VENCIDO' ? 'VENCIDO' : 'PENDENTE',
        vencimento: p.dataVencimento,
        obs: p.observacoes,
      }));
  };

  const generateMessage = async (
    targetChannel: 'whatsapp' | 'email' | 'chamado',
    targetContract?: Contract | null
  ) => {
    if (!employee) return;

    const pending = getPendingItemsList();
    const contractName = targetContract
      ? `${targetContract.numero} - ${targetContract.titulo}`
      : employee.contratoNome || 'Geral';

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + prazoDias);
    const deadlineFormatted = deadlineDate.toLocaleDateString('pt-BR');

    if (targetChannel === 'whatsapp') {
      const text = `*⚠️ WFS SST - NOTIFICAÇÃO DE REGULARIZAÇÃO DOCUMENTAL*

Olá, *${recipientName || 'Gestor / Encarregado'}*,

Identificamos pendências documentais obrigatórias de SST para o colaborador abaixo vinculado ao contrato *${contractName}*:

👤 *Colaborador:* ${employee.nome}
📋 *Matrícula:* ${employee.matricula} | *Cargo:* ${employee.cargo}
🏢 *Empresa:* ${employee.empresa}

*📋 LISTA DE PENDÊNCIAS OBRIGATÓRIAS:*
${pending
  .map(
    (p, i) =>
      `${i + 1}. ${p.status === 'VENCIDO' ? '❌' : '⚠️'} *${p.nome}* (${p.status})${
        p.vencimento ? ` - Vencimento: ${p.vencimento}` : ''
      }${p.obs ? `\n   ↳ _${p.obs}_` : ''}`
  )
  .join('\n')}

⏳ *PRAZO PARA REGULARIZAÇÃO:* até *${deadlineFormatted}* (${prazoDias} dias úteis).
⚠️ *Impacto:* Risco de bloqueio do colaborador na portaria e paralisação dos serviços.

Favor providenciar e enviar os documentos regularizados em PDF respondendo a esta mensagem.`;

      setMessageText(text);
      setSubject('');
    } else if (targetChannel === 'email') {
      const emailSubject = `[URGENTE SST WFS] Regularização de Pendências - ${employee.nome} (${contractName})`;
      setSubject(emailSubject);

      const text = `Prezado(a) ${recipientName || 'Gestor Responsável'},

Esperamos que este e-mail o encontre bem.

Informamos que, após auditoria de conformidade documental de Segurança e Saúde no Trabalho (SST), foram constatadas pendências ativas referentes ao colaborador abaixo, vinculado ao contrato ${contractName}:

DADOS DO COLABORADOR:
• Nome: ${employee.nome}
• Matrícula: ${employee.matricula}
• CPF: ${employee.cpf || 'N/A'}
• Cargo: ${employee.cargo}
• Setor / Local: ${employee.setor}
• Empresa: ${employee.empresa}

PENDÊNCIAS IDENTIFICADAS:
${pending
  .map(
    (p, i) =>
      `${i + 1}. [${p.status}] ${p.nome}${p.vencimento ? ` (Vencimento: ${p.vencimento})` : ''}${
        p.obs ? ` - Obs: ${p.obs}` : ''
      }`
  )
  .join('\n')}

PRAZO DE REGULARIZAÇÃO:
Solicitamos a gentileza de providenciar e nos encaminhar os respectivos comprovantes/certificados até o dia ${deadlineFormatted} (${prazoDias} dias úteis).

Ressaltamos que a não regularização dentro do prazo poderá acarretar o bloqueio de acesso do colaborador à unidade operacional, conforme as normas de segurança e exigências contratuais.

Ficamos à disposição para quaisquer esclarecimentos.

Atenciosamente,
Coordenação de Segurança e Saúde no Trabalho (SST) & Gestão de Terceiros - WFS`;

      setMessageText(text);
    } else {
      // Chamado Técnico
      const ticketSubject = `CHAMADO SST WFS - Pendência Documental Colaborador ${employee.nome}`;
      setSubject(ticketSubject);

      const text = `========================================================
CHAMADO DE REGULARIZAÇÃO DE SST / GESTÃO DE CONTRATOS - WFS
========================================================
PRIORIDADE: ALTA
CONTRATO: ${contractName}
COLABORADOR: ${employee.nome} (Matrícula: ${employee.matricula})
CARGO: ${employee.cargo} | EMPRESA: ${employee.empresa}
DATA LIMITE: ${deadlineFormatted} (${prazoDias} dias úteis)
RESPONSÁVEL DESIGNADO: ${recipientName || 'Encarregado'}

DESCRIÇÃO DAS PENDÊNCIAS:
${pending
  .map((p, i) => `${i + 1}. [${p.status}] ${p.nome} ${p.obs ? `(${p.obs})` : ''}`)
  .join('\n')}

AÇÃO REQUERIDA:
- Realizar o upload dos documentos assinados/certificados válidos no portal.
- Informar número de protocolo ou comprovante de agendamento de exame se aplicável.
========================================================`;

      setMessageText(text);
    }
  };

  const handleGenerateAiEnhanced = async () => {
    if (!employee) return;
    setIsGeneratingAi(true);

    try {
      const res = await fetch('/api/generate-demand-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: employee.nome,
          matricula: employee.matricula,
          cargo: employee.cargo,
          contrato: employee.contratoNome,
          empresa: employee.empresa,
          pendencias: getPendingItemsList(),
          targetChannel: channel,
          recipientName: recipientName || 'Gestor',
          prazoDias,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.subject) setSubject(json.data.subject);
        if (json.data.messageText) setMessageText(json.data.messageText);

        try {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.8 },
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Erro ao gerar IA:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(
      channel === 'email' || channel === 'chamado'
        ? `ASSUNTO: ${subject}\n\n${messageText}`
        : messageText
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    recordDemandLog();
  };

  const recordDemandLog = () => {
    if (!employee) return;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + prazoDias);

    const newLog: DemandLog = {
      id: `dem_${Date.now()}`,
      funcionarioId: employee.id,
      funcionarioNome: employee.nome,
      contratoId: employee.contratoId,
      contratoNome: employee.contratoNome,
      canal: channel,
      destinatario: `${recipientName} (${recipientContact || 'Contato Geral'})`,
      dataEnvio: new Date().toISOString().replace('T', ' ').substring(0, 16),
      prazoResolucao: deadlineDate.toISOString().split('T')[0],
      status: 'ENVIADO',
      pendenciasCobradas: getPendingItemsList().map((p) => p.nome),
      mensagemTexto: messageText,
      assunto: subject,
    };

    onSaveDemandLog(newLog);
  };

  const handleSendWhatsApp = () => {
    recordDemandLog();
    const cleanPhone = recipientContact.replace(/\D/g, '');
    const encodedText = encodeURIComponent(messageText);
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, '_blank');
    onClose();
  };

  const handleSendEmail = () => {
    recordDemandLog();
    const mailtoUrl = `mailto:${encodeURIComponent(recipientContact)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(messageText)}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Demandar Regularização ao Responsável
              </h2>
              <p className="text-xs text-slate-500">
                Gere notificações automáticas para o gestor ou encarregado do contrato.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Employee & Pending Summary Card */}
          {employee && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-300 text-[#002D62] flex items-center justify-center font-bold text-sm">
                  {employee.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{employee.nome}</h3>
                  <p className="text-xs text-slate-500">
                    Matrícula: {employee.matricula} • Cargo: {employee.cargo} • {employee.empresa}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full inline-block">
                  {getPendingItemsList().length} pendência(s) ativa(s)
                </span>
                <span className="text-xs text-slate-500 font-medium block mt-1">
                  {employee.contratoNome || 'Sem Contrato Vinculado'}
                </span>
              </div>
            </div>
          )}

          {/* Channel Selector Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Selecione o Canal de Comunicação:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  channel === 'whatsapp'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  channel === 'email'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-4 h-4 text-sky-600" />
                <span>E-mail Corporativo</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('chamado')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  channel === 'chamado'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Chamado Técnico</span>
              </button>
            </div>
          </div>

          {/* Form Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Nome do Responsável / Destinatário
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Ex: Marcelo (Encarregado)"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:border-[#002D62] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                {channel === 'whatsapp' ? 'Número WhatsApp / Telefone' : 'E-mail do Responsável'}
              </label>
              <input
                type="text"
                value={recipientContact}
                onChange={(e) => setRecipientContact(e.target.value)}
                placeholder={channel === 'whatsapp' ? '(21) 98765-4321' : 'gestor@wfs.com.br'}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:border-[#002D62] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Prazo para Regularização
              </label>
              <select
                value={prazoDias}
                onChange={(e) => setPrazoDias(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:border-[#002D62] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value={1}>24 Horas (Crítico / Bloqueio Iminente)</option>
                <option value={2}>2 Dias Úteis</option>
                <option value={3}>3 Dias Úteis (Padrão)</option>
                <option value={5}>5 Dias Úteis (1 Semana)</option>
                <option value={10}>10 Dias Úteis</option>
              </select>
            </div>
          </div>

          {/* Email / Chamado Subject input */}
          {(channel === 'email' || channel === 'chamado') && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Assunto do E-mail / Título do Chamado:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:border-[#002D62] focus:bg-white focus:outline-none"
              />
            </div>
          )}

          {/* Message Content Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Texto da Mensagem Pronta:
              </label>

              <button
                type="button"
                onClick={handleGenerateAiEnhanced}
                disabled={isGeneratingAi}
                className="text-[11px] font-bold text-[#002D62] hover:text-[#001f44] flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Aprimorando com IA...' : 'Aprimorar com Gemini AI'}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3.5 text-xs font-mono rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:border-[#002D62] focus:bg-white focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleCopyMessage}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado com Sucesso!' : 'Copiar Mensagem'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>

            {channel === 'whatsapp' && (
              <button
                onClick={handleSendWhatsApp}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Abrir no WhatsApp Web</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {channel === 'email' && (
              <button
                onClick={handleSendEmail}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#002D62] hover:bg-[#001f44] shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Abrir no E-mail</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {channel === 'chamado' && (
              <button
                onClick={() => {
                  handleCopyMessage();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Registrar Chamado e Copiar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
