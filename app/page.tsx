
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import CustomAlert from './components/CustomAlert';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [alertInfo, setAlertInfo] = useState<{ message: string; details: string } | null>(null);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password === '1111') {
      sessionStorage.setItem('isAuthenticated', 'true');
      router.push('/main');
    } else {
      setAlertInfo({ message: 'Acceso Denegado', details: 'La clave introducida es incorrecta.' });
    }
  };

  return (
    <main className={styles.main}>
      {alertInfo && (
        <CustomAlert 
          message={alertInfo.message} 
          details={alertInfo.details} 
          onClose={() => setAlertInfo(null)} 
        />
      )}
      <div className={styles.loginBox}>
        <h2 className={styles.orgTitle}>Asociación de Jubilados Cantv Zulia</h2>
        <h3 className={styles.subtitle}>BASE DE DATOS</h3>
        <h1 className={styles.title}>Control de Acceso</h1>
        <form onSubmit={handleLogin}>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="ingresa la clave"
          />
          <button type="submit" className={styles.button}>Acceder</button>
        </form>
      </div>
    </main>
  );
}
