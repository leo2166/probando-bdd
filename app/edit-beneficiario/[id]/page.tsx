'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../page.module.css'; // Adjust path as needed
import React from 'react';

// Interfaz para los datos de beneficiarios
interface Beneficiario {
  id: number;
  nombre_completo: string;
  cedula: string;
  condicion: string;
  nombre_finado: string | null;
}

type FormState = Omit<Beneficiario, 'id' | 'nombre_finado'> & {
  id?: number;
  nombre_finado: string;
};

const initialFormState: FormState = {
    nombre_completo: '',
    cedula: '',
    condicion: '',
    nombre_finado: '',
};

export default async function EditBeneficiarioPage({ params }: { params: { id: string | Promise<string> } }) {
  const router = useRouter();
  const resolvedParams = React.use(Promise.resolve(params));
  const { id } = resolvedParams;
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchBeneficiario = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/beneficiarios/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Beneficiario no encontrado');
          }
          const data = await response.json();
          setForm({
            id: data.beneficiario.id,
            nombre_completo: data.beneficiario.nombre_completo,
            cedula: data.beneficiario.cedula,
            condicion: data.beneficiario.condicion,
            nombre_finado: data.beneficiario.nombre_finado || '',
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
        } finally {
          setIsLoading(false);
        }
      };
      fetchBeneficiario();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/beneficiarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar beneficiario');
      }
      router.push('/'); // Navigate back to the main list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <main className={styles.main}><p>Cargando beneficiario...</p></main>;
  }

  if (error) {
    return <main className={styles.main}><p>Error: {error}</p></main>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Editar Beneficiario</h1>
      </div>

      <div className={`${styles.container} ${styles.formContainer}`}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input type="text" name="nombre_completo" value={form.nombre_completo} onChange={handleInputChange} placeholder="Nombre Completo" required className={styles.input}/>
          <input type="text" name="cedula" value={form.cedula} onChange={handleInputChange} placeholder="Cédula" required className={styles.input}/>
          <select name="condicion" value={form.condicion} onChange={handleInputChange} required className={styles.select}>
            <option value="">Seleccione Condición</option>
            <option value="Jubilado">Jubilado/a</option>
            <option value="Sobreviviente">Sobreviviente</option>
          </select>
          <input type="text" name="nombre_finado" value={form.nombre_finado || ''} onChange={handleInputChange} placeholder="Nombre Finado (si aplica)" className={styles.input}/>
          <div className={styles.buttonGroup}>
            <button type="submit" disabled={isLoading || !form.nombre_completo || !form.cedula} className={`${styles.button} ${styles.buttonPrimary}`}>
              {isLoading ? 'Guardando...' : 'Actualizar'}
            </button>
            <button type="button" onClick={() => router.push('/')} className={`${styles.button} ${styles.buttonSecondary}`}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
