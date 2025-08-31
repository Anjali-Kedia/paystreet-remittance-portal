import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function kycColor(status?: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700 border-green-300";
    case "REVIEW":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "REJECTED":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="text-xl font-semibold">PayStreet</div>
        <nav className="flex items-center gap-4 text-sm">
          {/* Home is always visible */}
          <Link
            to="/"
            className={pathname === "/" ? "underline" : "hover:underline"}
          >
            Home
          </Link>

          {!user ? (
            <>
              <Link
                to="/login"
                className={
                  pathname === "/login" ? "underline" : "hover:underline"
                }
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={
                  pathname === "/signup" ? "underline" : "hover:underline"
                }
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/transfer"
                className={
                  pathname === "/transfer" ? "underline" : "hover:underline"
                }
              >
                Transfer
              </Link>
              <Link
                to="/beneficiaries"
                className={
                  pathname === "/beneficiaries"
                    ? "underline"
                    : "hover:underline"
                }
              >
                Beneficiaries
              </Link>
              <Link
                to="/transactions"
                className={
                  pathname === "/transactions" ? "underline" : "hover:underline"
                }
              >
                Transactions
              </Link>
              {user?.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className={
                    pathname === "/admin" ? "underline" : "hover:underline"
                  }
                >
                  Admin
                </Link>
              )}
              {/* KYC badge (optional but nice) */}
              <span
                className={`hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${kycColor(user?.kycStatus)}`}
              >
                KYC: {user?.kycStatus ?? "PENDING"}
              </span>
              <span className="text-gray-600 hidden sm:inline">
                Hi, {user.fullName}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md border"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
