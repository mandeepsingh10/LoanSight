import { createContext, useState, ReactNode } from "react";

interface AppContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  defaultersCount: number;
  setDefaultersCount: (count: number) => void;
}

export const AppContext = createContext<AppContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  sidebarOpen: true,
  setSidebarOpen: () => {},
  defaultersCount: 0,
  setDefaultersCount: () => {},
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [defaultersCount, setDefaultersCount] = useState(0);

  return (
    <AppContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        sidebarOpen,
        setSidebarOpen,
        defaultersCount,
        setDefaultersCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
