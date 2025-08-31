import { useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

export default function RunKyc() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const { updateUser } = useAuth();
  const run = async () => {
    if (!fullName || !email || !country) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      const r = await api.post("/kyc/check", { fullName, email, country });
      toast.success(`KYC: ${r.data.status}`);
      updateUser({ kycStatus: r.data.status });
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "KYC failed");
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Full name</label>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">Email</label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <label className="text-xs text-muted-foreground">
          Country (e.g. IN)
        </label>
        <Input value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>
      <Button onClick={run}>Run KYC</Button>
    </div>
  );
}
