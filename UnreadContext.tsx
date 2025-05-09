// UnreadContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

interface UnreadContextType {
  hasUnreadMessages: boolean;
  setHasUnreadMessages: Dispatch<SetStateAction<boolean>>; // Allow setting the value
}

// Create context with a default undefined value or a default object
const UnreadContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  return (
    <UnreadContext.Provider value={{ hasUnreadMessages, setHasUnreadMessages }}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnreadMessages = (): UnreadContextType => {
  const context = useContext(UnreadContext);
  if (context === undefined) {
    throw new Error("useUnreadMessages must be used within an UnreadProvider");
  }
  return context;
};
