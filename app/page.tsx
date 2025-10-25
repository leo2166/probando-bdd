'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import styles from './page.module.css';

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

// Tipo para el estado del formulario, con id opcional y nombre_finado como string
type FormState = Omit<Beneficiario, 'id' | 'nombre_finado' | 'fecha_nacimiento' | 'fecha_fallecimiento' | 'telefono'> & {
  id?: number;
  nombre_finado: string;
  fecha_nacimiento: string;
  fecha_fallecimiento: string;
  telefono: string;
}

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

export default function Home() {
  const router = useRouter();
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Inicia en true para la carga inicial
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBeneficiarios, setSelectedBeneficiarios] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Beneficiario[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const results = beneficiarios.filter(b =>
      b.nombre_completo.toLowerCase().includes(lowercasedQuery) ||
      b.cedula.includes(searchQuery)
    );
    setSearchResults(results);
    // Clear selection when a new search is performed
    setSelectedBeneficiarios([]);
  };

  const handleSelectBeneficiario = (id: number) => {
    setSelectedBeneficiarios(prev =>
      prev.includes(id) ? prev.filter(beneficiarioId => beneficiarioId !== id) : [...prev, id]
    );
  };

const extractNumber = (cedulaString: string): number => {
  const match = cedulaString.match(/\d+/); // Extracts the first sequence of digits
  return match ? parseInt(match[0], 10) : 0;
};

  const fetchBeneficiarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/beneficiarios');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Algo salió mal al cargar datos');
      }
      const data = await response.json();
      const sortedData = data.rows.sort((a: Beneficiario, b: Beneficiario) => extractNumber(a.cedula) - extractNumber(b.cedula));
      setBeneficiarios(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [setBeneficiarios, setIsLoading, setError]);

  useEffect(() => {
    fetchBeneficiarios();
  }, [fetchBeneficiarios]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'asociado') {
      setForm(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (name === 'fecha_nacimiento' || name === 'fecha_fallecimiento') {
      // Validar y parsear fecha
      if (value && !isValidDDMMYYYY(value)) {
        setError(`Formato de fecha inválido para ${name}. Use DD/MM/AAAA.`);
        setForm(prev => ({ ...prev, [name]: value })); // Mantener el valor inválido para que el usuario lo corrija
      } else {
        setError(null);
        setForm(prev => ({ ...prev, [name]: parseDateToYYYYMMDD(value) || '' }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // --- NEW VALIDATION LOGIC ---
    if (form.condicion === 'Sobreviviente' && !form.fecha_fallecimiento) {
      setError('Favor colocar fecha de fallecimiento del Jubilado/a');
      setIsLoading(false);
      return; // Stop submission
    }

    if (form.fecha_nacimiento && !isValidDDMMYYYY(formatDateToDDMMYYYY(form.fecha_nacimiento))) {
      setError('Formato de fecha de nacimiento inválido. Use DD/MM/AAAA.');
      setIsLoading(false);
      return;
    }
    if (form.fecha_fallecimiento && !isValidDDMMYYYY(formatDateToDDMMYYYY(form.fecha_fallecimiento))) {
      setError('Formato de fecha de fallecimiento inválido. Use DD/MM/AAAA.');
      setIsLoading(false);
      return;
    }
    // --- END NEW VALIDATION LOGIC ---

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

  const cancelEdit = () => {
    setIsEditing(false);
    setForm(initialFormState);
    setSelectedBeneficiarios([]); // Clear selection on cancel
  };

  const handleEditSelected = () => {
    if (selectedBeneficiarios.length === 1) {
      const beneficiarioId = selectedBeneficiarios[0];
      router.push(`/edit-beneficiario/${beneficiarioId}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedBeneficiarios.length > 0 && window.confirm('¿Estás seguro de que quieres eliminar los registros seleccionados?')) {
      setIsLoading(true);
      setError(null);
      try {
        for (const id of selectedBeneficiarios) {
          const response = await fetch(`/api/beneficiarios/${id}`, { method: 'DELETE' });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error al eliminar el registro con ID ${id}`);
          }
        }
        setSelectedBeneficiarios([]); // Clear selection after deletion
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
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Actualizando Base de Datos...</p>
        </div>
      )}
      <div className={styles.description}>
        <h1>Gestión de Asociados y Sobrevivientes</h1>
      </div>

      <div className={`${styles.container} ${styles.formContainer}`}>
        <h2>{isEditing ? 'Editando Registro' : 'Añadir Nuevo Asociado / Sobreviviente'}</h2>
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
            <input type="text" name="nombre_finado" value={form.nombre_finado || ''} onChange={handleInputChange} placeholder="Nombre Finado (si aplica)" className={styles.input}/>
            <input type="text" name="fecha_nacimiento" value={formatDateToDDMMYYYY(form.fecha_nacimiento)} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={styles.input}/>
            <input type="text" name="fecha_fallecimiento" value={formatDateToDDMMYYYY(form.fecha_fallecimiento)} onChange={handleInputChange} placeholder="DD/MM/AAAA" className={styles.input}/>
            <input type="text" name="telefono" value={form.telefono} onChange={handleInputChange} placeholder="Teléfono" className={styles.input}/>
            <div className={styles.buttonGroup}>
                <button type="submit" disabled={isLoading || !form.nombre_completo || !form.cedula} className={`${styles.button} ${styles.buttonPrimary}`}>
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
        <h2>Consulta, modificación y eliminación de registro</h2>
        <div className={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            placeholder="Buscar por Nombre o Cédula..."
            className={styles.input}
            style={{ maxWidth: '400px', marginRight: '10px' }}
          />
          <button onClick={handleSearch} className={`${styles.button} ${styles.buttonPrimary}`}>Buscar</button>
        </div>

        <div className={styles.buttonGroup} style={{ marginTop: '20px' }}>
            <button
              onClick={handleEditSelected}
              disabled={selectedBeneficiarios.length !== 1}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Modificar Selección
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedBeneficiarios.length === 0}
              className={`${styles.button} ${styles.buttonDanger}`}
            >
              Eliminar Selección
            </button>
             <button onClick={() => router.push('/reportes')} className={`${styles.button} ${styles.buttonPrint}`}>
              Reportes
            </button>
        </div>

        {searchQuery && (
          <div className={styles.tableWrapper} style={{ marginTop: '20px' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Seleccionar</th>
                  <th className={styles.th}>Nombre Completo</th>
                  <th className={styles.th}>Cédula</th>
                  <th className={styles.th}>Condición</th>
                  <th className={styles.th}>Asociado</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.length > 0 ? (
                  searchResults.map((b) => (
                    <tr key={b.id}>
                      <td className={styles.td}>
                        <input
                          type="checkbox"
                          checked={selectedBeneficiarios.includes(b.id)}
                          onChange={() => handleSelectBeneficiario(b.id)}
                        />
                      </td>
                      <td className={styles.td}>{b.nombre_completo}</td>
                      <td className={styles.td}>{b.cedula}</td>
                      <td className={styles.td}>{b.condicion === 'Jubilado' ? 'Jubilado/a' : b.condicion}</td>
                      <td className={styles.td}>{b.asociado ? 'Sí' : 'No'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                      No se encontraron registros con el criterio de búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
