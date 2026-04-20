import "./globals.css";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata = {
  title: "SEPM Payroll Management",
  description:
    "Payroll management system to calculate in-hand salary with custom deductions and store records.",
//   icons: {
//     icon: "/favicon.png",
//   },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
