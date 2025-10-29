'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../main/main.module.css';
import React from 'react';
import CustomAlert from '../../components/CustomAlert'; // Importar el componente


// (El resto de las interfaces y helpers no cambia)
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

const formatDateToDDMMYYYY = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// ... (resto de los helpers sin cambios) ...

export default function EditBeneficiarioPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ message: string; details: string } | null>(null); // Estado para la alerta

  const fechaNacimientoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const fetchBeneficiario = async () => {
        // ... (lógica de fetch sin cambios)
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/beneficiarios/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Jubilado o Sobreviviente no encontrado');
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
    const { name, value } = e.target;
    if (alertInfo) setAlertInfo(null);
    if (error) setError(null);

    let processedValue = value;

    // Máscara de fecha para campos de fecha
    if (name === 'fecha_nacimiento' || name === 'fecha_fallecimiento') {
      const onlyNums = value.replace(/[^\d]/g, '');
      if (onlyNums.length <= 2) {
        processedValue = onlyNums;
      } else if (onlyNums.length <= 4) {
        processedValue = `${onlyNums.slice(0, 2)}/${onlyNums.slice(2)}`;
      } else {
        processedValue = `${onlyNums.slice(0, 2)}/${onlyNums.slice(2, 4)}/${onlyNums.slice(4, 8)}`;
      }
    }

    const newState = { ...form, [name]: processedValue };

    if (name === 'condicion' && value !== 'Sobreviviente') {
      newState.nombre_finado = '';
      newState.fecha_fallecimiento = '';
    }

    if (name === 'asociado') {
      newState.asociado = value === 'true';
    }

    setForm(newState);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (form.fecha_nacimiento && !isValidDDMMYYYY(form.fecha_nacimiento)) {
      setAlertInfo({ message: 'Formato de fecha inválido', details: 'Use DD/MM/AAAA' });
      return;
    }
    if (form.fecha_fallecimiento && !isValidDDMMYYYY(form.fecha_fallecimiento)) {
      setAlertInfo({ message: 'Formato de fecha inválido', details: 'Use DD/MM/AAAA' });
      return;
    }
    if (form.condicion === 'Sobreviviente' && !form.fecha_fallecimiento) {
      setAlertInfo({ message: 'Campo requerido', details: 'Favor colocar fecha de fallecimiento' });
      return; 
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      ...form,
      fecha_nacimiento: parseDateToYYYYMMDD(form.fecha_nacimiento),
      fecha_fallecimiento: parseDateToYYYYMMDD(form.fecha_fallecimiento),
    };

    try {
      const response = await fetch(`/api/beneficiarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar');
      }
      router.push('/main'); 
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    } 
  };

  if (isLoading) {
    return <main className={styles.main}><p>Cargando datos...</p></main>;
  }

  // El error ahora se puede manejar con la alerta personalizada si se desea
  if (error) {
    return <main className={styles.main}><p>Error: {error}</p></main>;
  }

  return (
    <main className={styles.main}>
      {alertInfo && (
        <CustomAlert 
          message={alertInfo.message} 
          details={alertInfo.details} 
          onClose={() => setAlertInfo(null)} 
        />
      )}

      <div className={styles.description}>
        <h1>Editar Jubilado / Sobreviviente</h1>
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
          <input type="text" name="nombre_finado" value={form.nombre_finado || ''} onChange={handleInputChange} placeholder="Nombre finado/a (si aplica)" disabled={form.condicion !== 'Sobreviviente'} className={styles.input}/>
          <input type="text" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={styles.input} ref={fechaNacimientoRef}/>
          <input type="text" name="fecha_fallecimiento" value={form.fecha_fallecimiento} onChange={handleInputChange} placeholder="DD/MM/AAAA" disabled={form.condicion !== 'Sobreviviente'} className={styles.input} />
          <input type="text" name="telefono" value={form.telefono || ''} onChange={handleInputChange} placeholder="Teléfono" className={styles.input}/>
          <div className={styles.buttonGroup}>
            <button type="submit" disabled={isLoading || !form.nombre_completo || !form.cedula} className={`${styles.button} ${styles.buttonPrimary}`}>
              {isLoading ? 'Guardando...' : 'Actualizar'}
            </button>
            <button type="button" onClick={() => router.push('/main')} className={`${styles.button} ${styles.buttonSecondary}`}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
