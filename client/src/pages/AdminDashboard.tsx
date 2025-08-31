// src/pages/AdminDashboard.tsx
import { SetStateAction, useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtMoney, fmtNumber } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { beneficiaries: number; transactions: number };
};

type TxRow = {
  id: string;
  createdAt: string;
  amountFrom: number;
  amountTo: number;
  sourceCurrency: string;
  targetCurrency: string;
  fxRate: number;
  fee: number;
  status: string;
  user: { id: string; fullName: string; email: string };
  beneficiary: {
    id: string;
    name: string;
    bankAccount: string;
    country: string;
    currency: string;
  };
  usdEquivalent: number;
  highRisk: boolean;
};

type TxResp = {
  items: TxRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tx, setTx] = useState<TxResp | null>(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setErr(null);
      try {
        const [uRes, tRes] = await Promise.all([
          api.get<UserRow[]>("/admin/users"),
          api.get<TxResp>("/admin/transactions", {
            params: {
              q: q || undefined,
              from: from || undefined,
              to: to || undefined,
              page: p,
              pageSize: 50,
            },
          }),
        ]);
        setUsers(uRes.data);
        setTx(tRes.data);
        setPage(p);
      } catch (e: any) {
        setErr(e?.response?.data?.error ?? "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    },
    [q, from, to],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const txItems = tx?.items ?? [];
  const totalPages = tx?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View users and monitor transactions. High-risk transfers (&gt;
            $10,000 USD eq.) are flagged.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              All registered users with basic counts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[45vh]">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 border-y sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Beneficiaries
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Transactions
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading &&
                    users.length === 0 &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`u-skel-${i}`}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-40" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">{u.fullName}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            u.role === "ADMIN"
                              ? "border border-foreground/40"
                              : ""
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{u._count.beneficiaries}</td>
                      <td className="px-4 py-3">{u._count.transactions}</td>
                      <td className="px-4 py-3">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  Filter and review all transfers.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e: {
                    target: { value: SetStateAction<string> };
                  }) => setFrom(e.target.value)}
                  className="w-[11rem]"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={to}
                  onChange={(e: {
                    target: { value: SetStateAction<string> };
                  }) => setTo(e.target.value)}
                  className="w-[11rem]"
                />
                <Input
                  placeholder="Search user/beneficiary…"
                  value={q}
                  onChange={(e: {
                    target: { value: SetStateAction<string> };
                  }) => setQ(e.target.value)}
                  className="w-[18rem]"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setQ("");
                  }}
                >
                  Clear
                </Button>
                <Button onClick={() => load(1)}>Apply</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-auto max-h-[65vh]">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 border-y sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Beneficiary
                    </th>
                    <th className="px-4 py-3 text-left font-medium">From</th>
                    <th className="px-4 py-3 text-left font-medium">To</th>
                    <th className="px-4 py-3 text-left font-medium">FX</th>
                    <th className="px-4 py-3 text-left font-medium">Fee</th>
                    <th className="px-4 py-3 text-left font-medium">USD Eq.</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading &&
                    txItems.length === 0 &&
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={`t-skel-${i}`}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-40" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!loading && txItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No transactions
                      </td>
                    </tr>
                  )}
                  {txItems.map((t) => (
                    <tr
                      key={t.id}
                      className={
                        t.highRisk ? "bg-red-50/80" : "hover:bg-muted/40"
                      }
                    >
                      <td className="px-4 py-3">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.user.fullName}</div>
                        <div className="text-muted-foreground">
                          {t.user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.beneficiary.name}</div>
                        <div className="text-muted-foreground">
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
                        <Badge
                          className={
                            t.highRisk
                              ? "border-red-400 text-red-700 bg-red-50"
                              : ""
                          }
                        >
                          {t.usdEquivalent.toFixed(2)} USD{" "}
                          {t.highRisk ? "• High-Risk" : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-white">{t.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          <CardFooter className="justify-between text-sm">
            <div className="text-muted-foreground">
              Page {tx?.page ?? 1} of {totalPages} • {tx?.total ?? 0} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={(tx?.page ?? 1) <= 1}
                onClick={() => load(page - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={(tx?.page ?? 1) >= (tx?.totalPages ?? 1)}
                onClick={() => load(page + 1)}
              >
                Next
              </Button>
            </div>
          </CardFooter>

          {err && <div className="px-4 pb-4 text-sm text-red-700">{err}</div>}
        </Card>
      </div>
    </div>
  );
}
