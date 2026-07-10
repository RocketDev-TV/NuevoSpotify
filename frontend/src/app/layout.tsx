import '../styles/variables.css';
import '../styles/player.css'; 
import BottomPlayer from '../components/BottomPlayer';

export const metadata = {
  title: 'NuevoSpotify',
  description: 'El búnker de la música',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script src="https://unpkg.com/@phosphor-icons/web" async></script>
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}