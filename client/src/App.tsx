import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Beneficiaries from "./pages/Beneficiaries";
import ProtectedRoute from "./components/ProtectedRoute";
import Transfer from "./pages/Transfer";
import Transactions from "./pages/Transactions";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/AdminDashboard";
import { Toaster } from "sonner";
import NavBar from "./components/NavBar";
import RunKyc from "./components/RunKyc";
import { useAuth } from "./context/AuthContext";

function Home() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold">Remittance Portal</h1>
        {!user ? (
          <p className="mt-2 text-gray-600">
            Start by creating an account or logging in.
          </p>
        ) : (
          <p className="mt-2 text-gray-600">
            Welcome back, {user.fullName}! You can now manage beneficiaries, transfer funds, and view transactions.
          </p>
        )}
        {user && user.kycStatus !== "APPROVED" && (
          <div className="mt-6">
            <div className="text-sm font-medium mb-2">
              KYC is required to enable full transfers
            </div>
            <RunKyc />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/beneficiaries"
          element={
            <ProtectedRoute>
              <Beneficiaries />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute>
              <Transfer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}
export default App;
