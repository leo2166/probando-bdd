'use client';

import { useState } from 'react';
import styles from './page.module.css';

// Nueva interfaz para los datos de beneficiarios
interface Beneficiario {
  id: number;
  nombre_completo: string;
  cedula: string;
  condicion: string;
  nombre_finado: string | null;
}

export default function Home() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTestDb = async () => {
    setIsLoading(true);
    setError(null);
    setBeneficiarios([]);

    try {
      const response = await fetch('/api/test-db');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Algo salió mal');
      }
      const data = await response.json();
      setBeneficiarios(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Prueba de Base de Datos con Vercel Postgres</h1>
        <p>
          Haz clic en el botón para crear/conectar a la tabla <strong>Beneficiarios</strong>, insertar dos registros de ejemplo y mostrar los resultados.
        </p>
        <p>
          (Asegúrate de haber creado el archivo <code>.env.local</code> con las credenciales de tu base de datos).
        </p>
      </div>

      <div className={styles.center}>
        <button onClick={handleTestDb} disabled={isLoading} style={{ padding: '10px 20px', fontSize: '16px' }}>
          {isLoading ? 'Probando...' : 'Probar Conexión y Cargar Datos'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '20px', color: 'red', width: '100%', maxWidth: '800px' }}>
          <h2>Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</pre>
          <p>
            <strong>Posibles causas:</strong>
          </p>
          <ul>
            <li>El archivo <code>.env.local</code> no existe o está mal configurado.</li>
            <li>Las credenciales de la base de datos son incorrectas.</li>
            <li>Hay un problema de red con la base de datos de Vercel.</li>
          </ul>
        </div>
      )}

      {beneficiarios.length > 0 && (
        <div style={{ marginTop: '40px', width: '100%', maxWidth: '800px' }}>
          <h2>Resultados de la Tabla "Beneficiarios":</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nombre Completo</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Cédula</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Condición</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Nombre Finado</th>
              </tr>
            </thead>
            <tbody>
              {beneficiarios.map((b) => (
                <tr key={b.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.nombre_completo}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.cedula}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.condicion}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{b.nombre_finado || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
