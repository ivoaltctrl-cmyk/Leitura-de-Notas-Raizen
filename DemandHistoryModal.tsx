import React from 'react';
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Mail,
  FileText,
  Calendar,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DemandLog } from '../types/index.ts';

interface DemandHistoryProps {
  logs: DemandLog[];
  onUpdateLogStatus: (
    logId: string,
    newStatus: 'ENVIADO' | 'EM_ANDAMENTO' | 'REGULARIZADO' | 'VENCIDO'
  ) => void;
  onDeleteLog: (logId: string) => void;
  onOpenNewDemand: () => void;
}

export const DemandHistory: React.FC<DemandHistoryProps> = ({
  logs,
  onUpdateLogStatus,
  onDeleteLog,
  onOpenNewDemand,
}) => {
  const getChannelIcon = (canal: string) => {
    switch (canal) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-sky-600" />;
      case 'chamado':
        return <FileText className="w-4 h-4 text-amber-600" />;
      default:
        return <Send className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleResolve = (logId: string) => {
    onUpdateLogStatus(logId, 'REGULARIZADO');
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Send className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Centro de Demandas & Cobranças aos Responsáveis
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Histórico completo de notificações e prazos de regularização enviados aos gestores, encarregados e prestadores.
          </p>
        </div>

        <button
          onClick={onOpenNewDemand}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          <span>+ Nova Notificação / Demanda</span>
        </button>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500">
            <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhuma demanda enviada até o momento.</p>
            <p className="text-xs text-slate-400 mt-1">
              Selecione um colaborador com pendências ou contrato para disparar avisos automáticos.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isRegularizado = log.status === 'REGULARIZADO';
            const isVencido = log.status === 'VENCIDO';

            return (
              <div
                key={log.id}
                className={`p-5 rounded-2xl border transition-all bg-white shadow-xs ${
                  isRegularizado
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isVencido
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                      {getChannelIcon(log.canal)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{log.funcionarioNome}</h3>
                        <span className="text-xs text-slate-500 font-medium">
                          • {log.contratoNome || 'Geral'}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                            isRegularizado
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isVencido
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1">
                        Destinatário: <strong className="text-slate-900">{log.destinatario}</strong> via {log.canal.toUpperCase()}
                      </p>

                      {/* Pending items charged */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {log.pendenciasCobradas.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium"
                          >
                            ⚠️ {p}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> Enviado em: {log.dataEnvio}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Calendar className="w-3 h-3 text-[#002D62]" /> Prazo Limite: {log.prazoResolucao}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {!isRegularizado ? (
                      <button
                        onClick={() => handleResolve(log.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar como Regularizado</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" /> Concluído
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteLog(log.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Collapsible preview of message */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <details className="text-xs text-slate-500 cursor-pointer">
                    <summary className="font-semibold text-slate-700 hover:text-[#002D62]">
                      Visualizar texto da mensagem enviada
                    </summary>
                    <pre className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap font-mono">
                      {log.mensagemTexto}
                    </pre>
                  </details>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
