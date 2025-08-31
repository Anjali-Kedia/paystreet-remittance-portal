import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useForm } from "react-hook-form";
import { fmtMoney, fmtNumber } from "../lib/format";
import { downloadFile } from "../lib/download";
import type { AxiosError } from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";

type Tx = {
  id: string;
  amountFrom: number;
  amountTo: number;
  sourceCurrency: string;
  targetCurrency: string;
  fxRate: number;
  fee: number;
  status: string;
  createdAt: string;
  beneficiary: {
    id: string;
    name: string;
    bankAccount: string;
    country: string;
    currency: string;
  };
};

type ListResp = {
  items: Tx[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type SummaryResp = {
  totalSent: number;
  totalFees: number;
  totalDebit: number;
  avgRate: number | null;
  count: number;
};

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export default function Transactions() {
  const { register, watch, setValue } = useForm<{
    from?: string;
    to?: string;
    q?: string;
  }>();
  const q = watch("q") || "";
  const from = watch("from") || "";
  const to = watch("to") || "";
  const dq = useDebounced(q, 300);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [list, setList] = useState<ListResp | null>(null);
  const [summary, setSummary] = useState<SummaryResp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (p = 1, showToast = false) => {
      setLoading(true);
      try {
        const [listRes, sumRes] = await Promise.all([
          api.get<ListResp>("/transfers", {
            params: {
              q: dq || undefined,
              from: from || undefined,
              to: to || undefined,
              page: p,
              pageSize,
            },
          }),
          api.get<SummaryResp>("/transfers/summary", {
            params: {
              q: dq || undefined,
              from: from || undefined,
              to: to || undefined,
            },
          }),
        ]);

        setList(listRes.data);
        setSummary(sumRes.data);
        setPage(p);

        if (showToast) toast.success("Transactions updated");
      } catch (err) {
        const e = err as AxiosError<{ error?: string }>;
        const msg = e.response?.data?.error ?? "Failed to load transactions";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [dq, from, to, pageSize],
  );

  useEffect(() => {
    load(1, false); 
  }, [load]);

  const items = list?.items ?? [];
  const totalPages = list?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Transaction History</h1>
          <div className="flex items-center gap-2">
            <Input type="date" {...register("from")} className="w-[11rem]" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" {...register("to")} className="w-[11rem]" />
            <Input
              placeholder="Search beneficiary…"
              {...register("q")}
              className="w-[18rem]"
            />
            <Button
              variant="outline"
              onClick={() => {
                setValue("from", "");
                setValue("to", "");
                setValue("q", "");
                toast("Filters cleared");
              }}
            >
              Clear
            </Button>
            <Button onClick={() => load(1, true)}>Apply</Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadFile(
                  `/receipts/transactions.csv?q=${encodeURIComponent(
                    dq || "",
                  )}&from=${encodeURIComponent(
                    from || "",
                  )}&to=${encodeURIComponent(to || "")}`,
                  "transactions.csv",
                  "text/csv",
                )
              }
            >
              Export CSV (filters)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Sent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {summary ? (
                  summary.totalSent.toFixed(2)
                ) : (
                  <Skeleton className="h-5 w-24" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                in source currencies (sum)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {summary ? (
                  summary.totalFees.toFixed(2)
                ) : (
                  <Skeleton className="h-5 w-24" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                sum of fees (source curr.)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Total Debit
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {summary ? (
                  summary.totalDebit.toFixed(2)
                ) : (
                  <Skeleton className="h-5 w-24" />
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                sent + fees (source curr.)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">
                Average FX Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg font-semibold">
                {summary?.avgRate ? summary.avgRate.toFixed(6) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                simple average
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Beneficiary
                    </th>
                    <th className="px-4 py-3 text-left font-medium">From</th>
                    <th className="px-4 py-3 text-left font-medium">To</th>
                    <th className="px-4 py-3 text-left font-medium">FX Rate</th>
                    <th className="px-4 py-3 text-left font-medium">Fee</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Total Debit
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading &&
                    items.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-24" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )}
                  {items.map((t) => {
                    const totalDebit = t.amountFrom + t.fee;
                    return (
                      <tr key={t.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {t.beneficiary.name}
                          </div>
                          <div className="text-muted-foreground">
                            {t.beneficiary.bankAccount} •{" "}
                            {t.beneficiary.country}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {fmtMoney(t.amountFrom, t.sourceCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          {fmtMoney(t.amountTo, t.targetCurrency)}
                        </td>
                        <td className="px-4 py-3">{fmtNumber(t.fxRate, 6)}</td>
                        <td className="px-4 py-3">
                          {fmtMoney(t.fee, t.sourceCurrency)}
                        </td>
                        <td className="px-4 py-3">
                          {totalDebit.toFixed(2)} {t.sourceCurrency}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-black">{t.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="underline text-xs"
                              onClick={() =>
                                downloadFile(
                                  `/receipts/transactions/${t.id}.csv`,
                                  `receipt-${t.id}.csv`,
                                  "text/csv",
                                )
                              }
                            >
                              CSV
                            </button>
                            <button
                              className="underline text-xs"
                              onClick={() =>
                                downloadFile(
                                  `/receipts/transactions/${t.id}.pdf`,
                                  `receipt-${t.id}.pdf`,
                                  "application/pdf",
                                )
                              }
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Page {list?.page ?? 1} of {totalPages} • {list?.total ?? 0} total
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => load(page - 1, true)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => load(page + 1, true)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
