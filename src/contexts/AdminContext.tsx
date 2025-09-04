"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

interface AdminContextType {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  availableBranches: string[];
  setAvailableBranches: (branches: string[]) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

interface AdminProviderProps {
  readonly children: ReactNode;
}

export function AdminProvider({ children }: Readonly<AdminProviderProps>) {
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [availableBranches, setAvailableBranches] = useState<string[]>([
    "main",
  ]);

  // Load branch from localStorage on mount
  useEffect(() => {
    const savedBranch = localStorage.getItem("etsa-admin-branch");
    if (savedBranch) {
      setSelectedBranch(savedBranch);
    }
  }, []);

  // Save branch to localStorage when it changes
  const setSelectedBranchWithStorage = (branch: string) => {
    setSelectedBranch(branch);
    localStorage.setItem("etsa-admin-branch", branch);
  };

  // Clear branch from localStorage on logout
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "etsa-admin-logout") {
        localStorage.removeItem("etsa-admin-branch");
        setSelectedBranch("main");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Validate branch exists when branches are loaded
  useEffect(() => {
    if (
      availableBranches.length > 0 &&
      !availableBranches.includes(selectedBranch)
    ) {
      // If selected branch doesn't exist, fall back to main
      setSelectedBranchWithStorage("main");
    }
  }, [availableBranches, selectedBranch]);

  const value = useMemo(
    () => ({
      selectedBranch,
      setSelectedBranch: setSelectedBranchWithStorage,
      availableBranches,
      setAvailableBranches,
    }),
    [selectedBranch, availableBranches, setAvailableBranches],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
