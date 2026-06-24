import { AuthProvider } from "@/components/providers/AuthContext";
import { Funnel } from "@/components/funnel/Funnel";

export default function Home() {
  return (
    <AuthProvider>
      <Funnel />
    </AuthProvider>
  );
}
