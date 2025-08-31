export const fmtNumber = (n: number | null | undefined, maxFrac = 2) => {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFrac,
  }).format(n);
};

export const fmtMoney = (
  n: number | null | undefined,
  ccy?: string,
  maxFrac = 2,
) => {
  if (n == null || Number.isNaN(n)) return "—";
  if (!ccy) return fmtNumber(n, maxFrac);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: ccy,
      maximumFractionDigits: maxFrac,
    }).format(n);
  } catch {
    return `${fmtNumber(n, maxFrac)} ${ccy}`;
  }
};
