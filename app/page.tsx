'use client';

import { useState, FormEvent, useEffect } from 'react';
import styles from './page.module.css';

// Interfaz para los datos de beneficiarios
interface Beneficiario {
  id: number;
  nombre_completo: string;
  cedula: string;
  condicion: string;
  nombre_finado: string | null;
}

const initialFormState = {
    id: 0,
    nombre_completo: '',
    cedula: '',
    condicion: '',
    nombre_finado: '',
};

export default function Home() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Inicia en true para la carga inicial
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  const fetchBeneficiarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/beneficiarios');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Algo salió mal al cargar datos');
      }
      const data = await response.json();
      setBeneficiarios(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiarios();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const url = isEditing ? `/api/beneficiarios/${form.id}` : '/api/beneficiarios';
    const method = isEditing ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error al ${isEditing ? 'actualizar' : 'crear'}`);
        }
        setForm(initialFormState);
        setIsEditing(false);
        await fetchBeneficiarios();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
        setIsLoading(false);
    }
  };

  const handleEditClick = (beneficiario: Beneficiario) => {
    setIsEditing(true);
    setForm(beneficiario);
    window.scrollTo(0, 0); // Sube al inicio de la página para ver el formulario
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setForm(initialFormState);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este beneficiario?')) {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/beneficiarios/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar');
            }
            await fetchBeneficiarios();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
        } finally {
            setIsLoading(false);
        }
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Gestión de Beneficiarios</h1>
      </div>

      <div className={`${styles.container} ${styles.formContainer}`}>
        <h2>{isEditing ? 'Editando Beneficiario' : 'Añadir Nuevo Beneficiario'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
            <input type="text" name="nombre_completo" value={form.nombre_completo} onChange={handleInputChange} placeholder="Nombre Completo" required className={styles.input}/>
            <input type="text" name="cedula" value={form.cedula} onChange={handleInputChange} placeholder="Cédula" required className={styles.input}/>
            <select name="condicion" value={form.condicion} onChange={handleInputChange} required className={styles.select}>
                <option value="">Seleccione Condición</option>
                <option value="Jubilado">Jubilado</option>
                <option value="Sobreviviente">Sobreviviente</option>
            </select>
            <input type="text" name="nombre_finado" value={form.nombre_finado || ''} onChange={handleInputChange} placeholder="Nombre Finado (si aplica)" className={styles.input}/>
            <div className={styles.buttonGroup}>
                <button type="submit" disabled={isLoading} className={`${styles.button} ${styles.buttonPrimary}`}>
                    {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
                </button>
                {isEditing && (
                    <button type="button" onClick={cancelEdit} className={`${styles.button} ${styles.buttonSecondary}`}>
                        Cancelar
                    </button>
                )}
            </div>
        </form>
      </div>

      {error && (
        <div className={styles.error}>
          <h2>Error</h2>
          <pre>{error}</pre>
        </div>
      )}

      <div className={styles.container}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Lista de Beneficiarios</h2>
            <button onClick={() => window.print()} className={`${styles.button} ${styles.buttonSecondary}`}>
              Imprimir
            </button>
          </div>
          {isLoading && !beneficiarios.length && <p>Cargando lista...</p>}
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ID</th>
                <th className={styles.th}>Nombre Completo</th>
                <th className={styles.th}>Cédula</th>
                <th className={styles.th}>Condición</th>
                <th className={styles.th}>Nombre Finado</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {beneficiarios.map((b) => (
                <tr key={b.id}>
                  <td className={styles.td}>{b.id}</td>
                  <td className={styles.td}>{b.nombre_completo}</td>
                  <td className={styles.td}>{b.cedula}</td>
                  <td className={styles.td}>{b.condicion}</td>
                  <td className={styles.td}>{b.nombre_finado || 'N/A'}</td>
                  <td className={`${styles.td} ${styles.actionsCell}`}>
                    <button onClick={() => handleEditClick(b)} className={`${styles.button} ${styles.buttonSecondary}`}>Editar</button>
                    <button onClick={() => handleDelete(b.id)} className={`${styles.button} ${styles.buttonDanger}`}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </main>
  );
}
