import './globals.css';

export const metadata = {
  title: 'GAHCSLSM - Auto Trading Dashboard',
  description: 'Dashboard untuk monitoring auto trading dengan strategi Trend Following dan Volume Analysis',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
