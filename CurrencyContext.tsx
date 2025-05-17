import React, { createContext, useContext, useState, ReactNode } from "react";
import { CurrencyOptions } from "./currencyOptions";

export type CurrencyCode = keyof typeof CurrencyOptions; // dynamically typed

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  getSymbol: (code?: CurrencyCode) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const getSymbol = (code?: CurrencyCode) => {
    const target = code || currency;
    return CurrencyOptions[target]?.symbol || target;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, getSymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
