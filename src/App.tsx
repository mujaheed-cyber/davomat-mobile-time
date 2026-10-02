import { useEffect } from "react";
import { useSession } from "./store/session";
import Login from "./screens/Login";
import Employee from "./screens/Employee";
import Admin from "./screens/Admin";
import { Skeleton } from "./components/ui";

export default function App() {
  const { me, loading, error, refresh } = useSession();
  useEffect(() => { void refresh(); }, [refresh]);

  if (loading)
    return <div className="mx-auto max-w-md space-y-4 p-6"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-48" /><Skeleton className="h-32" /></div>;
  if (!me)
    return error ? <p role="alert" className="p-6 text-danger">{error}</p> : <Login />;
  return me.user.role === "admin" ? <Admin /> : <Employee />;
}
