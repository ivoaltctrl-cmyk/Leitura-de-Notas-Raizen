/**
 * Utilitários para tratamento de datas brasileiras (DD/MM/AAAA), intervalos e cálculos monetários
 */

/**
 * Converte qualquer formato de data (DD/MM/AAAA, DD/MM/AA, AAAA-MM-DD, ISO) em objeto Date normalizado
 */
export function parseDateString(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean === '-') return null;

  // Formato DD/MM/AAAA ou DD/MM/AA
  const brMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Formato AAAA-MM-DD (ISO)
  const isoMatch = clean.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback para Date parser nativo
  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0, 0);
  }

  return null;
}

/**
 * Retorna a data no formato DD/MM/AAAA para exibição amigável
 */
export function formatDateToBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  if (typeof date === 'string') {
    const parsed = parseDateString(date);
    if (!parsed) return date;
    date = parsed;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converte Date para formato YYYY-MM-DD para uso em <input type="date">
 */
export function formatDateToInput(date: Date | null | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Verifica se uma data de registro está dentro do intervalo [startInputDate, endInputDate]
 * startInputDate e endInputDate são strings no formato 'YYYY-MM-DD' ou 'DD/MM/AAAA'
 */
export function isRecordInDateRange(
  recordDateStr?: string | null,
  startDateInput?: string,
  endDateInput?: string
): boolean {
  if (!startDateInput && !endDateInput) return true;

  const recDate = parseDateString(recordDateStr);
  if (!recDate) {
    // Se não tiver data no registro, só passa se não houver filtro de data ativo
    return !startDateInput && !endDateInput;
  }

  const recTime = recDate.getTime();

  if (startDateInput) {
    const startDate = parseDateString(startDateInput);
    if (startDate) {
      // Início do dia (00:00:00)
      const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0).getTime();
      if (recTime < startOfDay) return false;
    }
  }

  if (endDateInput) {
    const endDate = parseDateString(endDateInput);
    if (endDate) {
      // Fim do dia (23:59:59)
      const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime();
      if (recTime > endOfDay) return false;
    }
  }

  return true;
}

/**
 * Converte string de volume (ex: "224,00" ou "1.450,50 L") para número decimal float
 */
export function parseVolumeFloat(volumeStr?: string | null): number {
  if (!volumeStr) return 0;
  const clean = String(volumeStr)
    .replace(/[^\d,\.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte string de valor monetário (ex: "5,89" ou "R$ 6,20") para número float
 */
export function parseCurrencyFloat(currencyStr?: string | null): number {
  if (!currencyStr) return 0;
  const clean = String(currencyStr)
    .replace(/[^\d,\.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Formata um número para moeda brasileira (R$ 1.234,56)
 */
export function formatCurrencyBRL(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata número de volume em Litros (ex: 1.234,56 L)
 */
export function formatVolumeL(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0,00 L';
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}
