import { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetCurrentUser, 
  useLoginUser, 
  useLogoutUser, 
  getGetCurrentUserQueryKey,
  type CurrentUserResponse,
  type LoginRequest
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: CurrentUserResponse['user'] | null;
  store: CurrentUserResponse['store'] | null;
  license: CurrentUserResponse['license'] | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  });

  const loginMutation = useLoginUser();
  const logoutMutation = useLogoutUser();

  const login = async (credentials: LoginRequest) => {
    try {
      await loginMutation.mutateAsync({ data: credentials });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "Bienvenido de vuelta" });
      
      // We need to wait for the user query to re-fetch to know their role
      const userRes = await queryClient.fetchQuery({
        queryKey: getGetCurrentUserQueryKey(),
        queryFn: () => fetch('/api/auth/me').then(r => r.json())
      }) as CurrentUserResponse;

      if (userRes.user.role === 'superadmin') {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    } catch (err: any) {
      toast({ 
        title: "Error al iniciar sesión", 
        description: err.message || "Verifica tus credenciales", 
        variant: "destructive" 
      });
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      queryClient.setQueryData(getGetCurrentUserQueryKey(), null);
      setLocation('/login');
      toast({ title: "Sesión cerrada correctamente" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user: data?.user || null,
      store: data?.store || null,
      license: data?.license || null,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
