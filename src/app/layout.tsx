import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Roof House Board - ระบบแทรกกิ้งงานรายเดือน",
  description: "Kanban Board ส่วนตัวสำหรับจัดการงานรายเดือน พร้อมเชื่อมต่อ Supabase Cloud",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
