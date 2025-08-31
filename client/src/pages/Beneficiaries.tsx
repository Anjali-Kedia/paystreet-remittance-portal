import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type Beneficiary = {
  id: string;
  name: string;
  bankAccount: string;
  country: string;
  currency: string;
  createdAt: string;
};

const schema = z.object({
  name: z.string().min(2, "Enter a name"),
  bankAccount: z.string().min(4, "Enter a bank account"),
  country: z.string().min(2, "Enter a country"),
  currency: z.string().length(3, "3-letter currency (e.g., USD, INR, AED)"),
});
type FormData = z.infer<typeof schema>;

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Beneficiaries() {
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Beneficiary[]>("/beneficiaries", {
        params: { q: debouncedQ },
      });
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      if (editing) {
        await api.put(`/beneficiaries/${editing.id}`, data);
      } else {
        await api.post(`/beneficiaries`, data);
      }
      reset({ name: "", bankAccount: "", country: "", currency: "" });
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed");
    }
  };

  const onEdit = (b: Beneficiary) => {
    setEditing(b);
    reset({
      name: b.name,
      bankAccount: b.bankAccount,
      country: b.country,
      currency: b.currency,
    });
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this beneficiary?")) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error ?? "Delete failed");
    }
  };

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Beneficiaries</h1>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-48"
            />
            <Button variant="outline" onClick={load}>
              Search
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>
                {editing ? "Edit beneficiary" : "Add beneficiary"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
                <div>
                  <Input placeholder="Name" {...register("name")} />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    placeholder="Bank Account"
                    {...register("bankAccount")}
                  />
                  {errors.bankAccount && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.bankAccount.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input placeholder="Country" {...register("country")} />
                    {errors.country && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.country.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Currency"
                      className="uppercase"
                      {...register("currency")}
                    />
                    {errors.currency && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.currency.message}
                      </p>
                    )}
                  </div>
                </div>

                {error && <div className="text-sm text-red-700">{error}</div>}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {editing ? "Update" : "Add"}
                  </Button>
                  {editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        reset({
                          name: "",
                          bankAccount: "",
                          country: "",
                          currency: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>
                {loading ? "Loading…" : `${items.length} beneficiary(ies)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {!hasItems && !loading && (
                  <li className="p-4 text-sm text-gray-500">
                    No beneficiaries yet. Add one on the left.
                  </li>
                )}
                {items.map((b) => (
                  <li
                    key={b.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-sm text-gray-600">
                        {b.bankAccount} • {b.country} •{" "}
                        {b.currency.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(b)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(b.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
