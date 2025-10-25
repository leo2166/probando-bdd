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
  asociado: boolean;
  nombre_finado: string | null;
  fecha_nacimiento: string | null;
  fecha_fallecimiento: string | null;
  telefono: string | null;
}

type FormState = Omit<Beneficiario, 'id' | 'nombre_finado' | 'fecha_nacimiento' | 'fecha_fallecimiento' | 'telefono'> & {
  id?: number;
  nombre_finado: string;
  fecha_nacimiento: string;
  fecha_fallecimiento: string;
  telefono: string;
};

const initialFormState: FormState = {
    nombre_completo: '',
    cedula: '',
    condicion: '',
    asociado: false,
    nombre_finado: '',
    fecha_nacimiento: '',
    fecha_fallecimiento: '',
    telefono: '',
};

// Helper para formatear fecha de YYYY-MM-DD a DD/MM/AAAA
const formatDateToDDMMYYYY = (dateString: string | null): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return ''; // Return empty string for invalid format
};

// Helper para parsear fecha de DD/MM/AAAA a YYYY-MM-DD (o null si es inválido)
const parseDateToYYYYMMDD = (dateString: string): string | null => {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Validación básica de fecha
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return null;
};

// Helper para validar formato DD/MM/AAAA
const isValidDDMMYYYY = (dateString: string): boolean => {
  if (!dateString) return true; // Campo vacío es válido
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  return parseDateToYYYYMMDD(dateString) !== null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function EditBeneficiarioPage({ params }: any) {
  const router = useRouter();
  const resolvedParams = React.use(params) as { id: string };
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
            throw new Error(errorData.error || 'Asociado o Sobreviviente no encontrado');
          }
          const data = await response.json();
          setForm({
            id: data.beneficiario.id,
            nombre_completo: data.beneficiario.nombre_completo,
            cedula: data.beneficiario.cedula,
            condicion: data.beneficiario.condicion,
            asociado: data.beneficiario.asociado || false,
            nombre_finado: data.beneficiario.nombre_finado || '',
            fecha_nacimiento: formatDateToDDMMYYYY(data.beneficiario.fecha_nacimiento) || '',
            fecha_fallecimiento: formatDateToDDMMYYYY(data.beneficiario.fecha_fallecimiento) || '',
            telefono: data.beneficiario.telefono || '',
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
    console.log("NUEVA VERSIÓN DE handleInputChange FUNCIONANDO"); // Log de depuración definitivo
    const { name, value } = e.target;
    console.log(`Input change: name=${name}, value=${value}`); // Log para seguimiento

    const newState = { ...form, [name]: value };

    // Si se cambia la condición y NO es "Sobreviviente", limpiar el campo de finado
    if (name === 'condicion' && value !== 'Sobreviviente') {
      newState.nombre_finado = '';
    }

    // Si el campo es "asociado", convertir a booleano
    if (name === 'asociado') {
      newState.asociado = value === 'true';
    }

    setForm(newState);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. Validar formato de fecha antes de enviar
    if (form.fecha_nacimiento && !isValidDDMMYYYY(form.fecha_nacimiento)) {
      setError('Formato de fecha de nacimiento inválido. Use DD/MM/AAAA.');
      return;
    }
    if (form.fecha_fallecimiento && !isValidDDMMYYYY(form.fecha_fallecimiento)) {
      setError('Formato de fecha de fallecimiento inválido. Use DD/MM/AAAA.');
      return;
    }
    if (form.condicion === 'Sobreviviente' && !form.fecha_fallecimiento) {
      setError('Favor colocar fecha de fallecimiento del Jubilado/a');
      return; 
    }

    setIsLoading(true);
    setError(null);

    // 2. Preparar el payload con fechas parseadas
    const payload = {
      ...form,
      fecha_nacimiento: parseDateToYYYYMMDD(form.fecha_nacimiento),
      fecha_fallecimiento: parseDateToYYYYMMDD(form.fecha_fallecimiento),
    };

    console.log('Enviando payload:', payload); // Log para seguimiento

    try {
      const response = await fetch(`/api/beneficiarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Enviar el payload procesado
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar Asociado o Sobreviviente');
      }
      router.push('/'); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    } 
  };

  if (isLoading) {
    return <main className={styles.main}><p>Cargando datos...</p></main>;
  }

  if (error) {
    return <main className={styles.main}><p>Error: {error}</p></main>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Editar Asociado / Sobreviviente</h1>
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
          <select name="asociado" value={String(form.asociado)} onChange={handleInputChange} required className={styles.select}>
                <option value="false">Asociado: No</option>
                <option value="true">Asociado: Sí</option>
          </select>
          <input type="text" name="nombre_finado" value={form.nombre_finado || ''} onChange={handleInputChange} placeholder="Nombre Finado (si aplica)" disabled={form.condicion !== 'Sobreviviente'} className={styles.input}/>
          <input type="text" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={styles.input}/>
          <input type="text" name="fecha_fallecimiento" value={form.fecha_fallecimiento} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={styles.input}/>
          <input type="text" name="telefono" value={form.telefono} onChange={handleInputChange} placeholder="Teléfono" className={styles.input}/>
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
