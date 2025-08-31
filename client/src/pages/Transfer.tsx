import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

type Beneficiary = {
  id: string;
  name: string;
  bankAccount: string;
  country: string;
  currency: string;
};

type FxStatus = {
  ok: boolean;
  provider: string;
  cached: boolean;
  cacheAgeMs: number | null;
  cacheTtlMs: number;
};

const schema = z.object({
  beneficiaryId: z.string().uuid({ message: "Select a beneficiary" }),
  amountFrom: z
    .number()
    .positive({ message: "Enter an amount greater than 0" }),
  sourceCurrency: z.string().length(3, { message: "3-letter code" }),
  targetCurrency: z.string().length(3, { message: "3-letter code" }),
});

type FormData = z.infer<typeof schema>;

type Quote = {
  success: boolean;
  from: string;
  to: string;
  amount: number;
  rate: number;
  result: number;
  fee: number;
  totalDebit: number;
  meta?: { provider: string; cached: boolean; asOfMs: number | null };
};

function ago(ms: number | null) {
  if (ms === null) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function Transfer() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<FxStatus | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sourceCurrency: "USD",
      targetCurrency: "INR",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Beneficiary[]>("/beneficiaries");
        setBeneficiaries(res.data);
      } catch (e) {
      const msg =
        (e as any)?.response?.data?.error ??
        (e as any)?.message ??
        "Failed to load beneficiaries";
      setErr(msg);
    }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<FxStatus>("/fx/status");
        setStatus(res.data);
      } catch {
        setStatus(null);
      }
    })();
  }, []);

  const beneficiaryId = watch("beneficiaryId");
  const amountFrom = watch("amountFrom");
  const sourceCurrency = watch("sourceCurrency");
  const targetCurrency = watch("targetCurrency");

  useEffect(() => {
    setQuote(null);
    setErr(null);
    setOkMsg(null);

    if (
      !beneficiaryId ||
      !amountFrom ||
      amountFrom <= 0 ||
      sourceCurrency.length !== 3 ||
      targetCurrency.length !== 3
    ) {
      return;
    }

    const ctrl = new AbortController();
    const run = async () => {
      try {
        const res = await api.get<Quote>("/fx/quote", {
          params: {
            from: sourceCurrency.toUpperCase(),
            to: targetCurrency.toUpperCase(),
            amount: amountFrom,
          },
          signal: ctrl.signal,
        });
        setQuote(res.data);
      } catch (e) {
    const apiMsg =
      (e as any)?.response?.data?.error ??
      (e as any)?.message ??
      "FX quote failed";
    setErr(`FX quote failed: ${apiMsg}`);
  }
    };
    const t = setTimeout(run, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [beneficiaryId, amountFrom, sourceCurrency, targetCurrency]);

  const onSubmit = async (data: FormData) => {
    setErr(null);
    setOkMsg(null);
    setConfirming(true);
    try {
      const res = await api.post("/transfers", {
        beneficiaryId: data.beneficiaryId,
        amountFrom: data.amountFrom,
        sourceCurrency: data.sourceCurrency.toUpperCase(),
        targetCurrency: data.targetCurrency.toUpperCase(),
      });
      toast.success(
        `Transfer recorded: ${res.data.amountFrom} ${
          res.data.sourceCurrency
        } → ${res.data.amountTo.toFixed(2)} ${res.data.targetCurrency}`
      );
      setQuote(null);
      reset({ beneficiaryId: "", amountFrom: undefined as any, sourceCurrency: "USD", targetCurrency: "INR" });
    } catch (e) {
    const msg =
      (e as any)?.response?.data?.error ??
      (e as any)?.message ??
      "Transfer failed";
    toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  const selectedBen = useMemo(
    () => beneficiaries.find((b) => b.id === beneficiaryId),
    [beneficiaries, beneficiaryId]
  );

  useEffect(() => {
    if (selectedBen?.currency) {
      setValue("targetCurrency", selectedBen.currency.toUpperCase());
    }
  }, [selectedBen, setValue]);

  const chip = quote?.meta
    ? `${
        quote.meta.cached ? "Cached" : "Live"
      } • ${quote.meta.provider.toUpperCase()} • ${ago(
        quote.meta.asOfMs ? Date.now() - quote.meta.asOfMs : null
      )}`
    : status
    ? `${
        status.cached ? "Cached" : "Live"
      } • ${status.provider.toUpperCase()} • ${ago(status.cacheAgeMs)}`
    : "FX status: loading…";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold mb-6">Send money</h1>
        <div className="mb-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-white">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: quote?.meta?.cached ? "#f59e0b" : "#10b981",
              }}
            />
            {chip}
          </span>
          <button
            type="button"
            onClick={() => {
              const a = watch("amountFrom");
              if (!a) return;
              setQuote(null);
              setTimeout(() => setValue("amountFrom", a + 0.000001), 0);
              setTimeout(() => setValue("amountFrom", a), 0);
            }}
            className="rounded-md border px-2 py-1 bg-white hover:bg-gray-100"
          >
            Retry quote
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 rounded-xl border bg-white p-5"
        >
          <div>
            <label className="text-sm font-medium">Beneficiary</label>
            <select
              {...register("beneficiaryId")}
              className="mt-1 w-full rounded-md border px-3 py-2"
            >
              <option value="">Select a beneficiary…</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.bankAccount} ({b.country})
                </option>
              ))}
            </select>
            {errors.beneficiaryId && (
              <p className="text-sm text-red-600 mt-1">
                {errors.beneficiaryId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Amount (source)</label>
              <input
                type="number"
                step="0.01"
                {...register("amountFrom", { valueAsNumber: true })}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
              {errors.amountFrom && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.amountFrom.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Source currency</label>
              <input
                {...register("sourceCurrency")}
                className="mt-1 w-full rounded-md border px-3 py-2 uppercase"
              />
              {errors.sourceCurrency && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.sourceCurrency.message}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Target currency</label>
              <input
                {...register("targetCurrency")}
                className="mt-1 w-full rounded-md border px-3 py-2 uppercase"
              />
              {errors.targetCurrency && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.targetCurrency.message}
                </p>
              )}
            </div>
          </div>

          {quote && (
            <div className="rounded-lg border p-4 bg-gray-50 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {quote.amount} {quote.from} → {quote.result.toFixed(2)}{" "}
                  {quote.to}
                </div>
                <div className="text-gray-600">FX: {quote.rate.toFixed(6)}</div>
              </div>
              <div className="mt-2 grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-md border bg-white">
                  <div className="text-xs text-gray-500">Fee (source)</div>
                  <div className="font-semibold">
                    {quote.fee.toFixed(2)} {quote.from}
                  </div>
                </div>
                <div className="p-3 rounded-md border bg-white">
                  <div className="text-xs text-gray-500">Total debit</div>
                  <div className="font-semibold">
                    {quote.totalDebit.toFixed(2)} {quote.from}
                  </div>
                </div>
                <div className="p-3 rounded-md border bg-white">
                  <div className="text-xs text-gray-500">You receive</div>
                  <div className="font-semibold">
                    {quote.result.toFixed(2)} {quote.to}
                  </div>
                </div>
              </div>
            </div>
          )}

          {err && <div className="text-sm text-red-700">{err}</div>}
          {okMsg && <div className="text-sm text-green-700">{okMsg}</div>}

          <div className="flex gap-2">
            <button
              disabled={isSubmitting || confirming}
              className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-60"
            >
              {confirming ? "Processing..." : "Confirm transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
