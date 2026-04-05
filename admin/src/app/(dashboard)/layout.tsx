import Protected from "@/components/protected";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
