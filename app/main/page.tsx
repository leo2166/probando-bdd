'use client';

import { useState, FormEvent, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './main.module.css';
import CustomAlert from '../components/CustomAlert'; // Importar el componente

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

const parseDateToYYYYMMDD = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    // Basic validation for day, month, year
    if (parseInt(day) > 0 && parseInt(day) <= 31 &&
        parseInt(month) > 0 && parseInt(month) <= 12 &&
        parseInt(year) >= 1900 && parseInt(year) <= 2100) { // Adjust year range as needed
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return null;
};

const isValidDDMMYYYY = (dateString: string | null): boolean => {
  if (!dateString) return true; // Empty string is valid (optional field)

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateString.match(regex);

  if (!match) {
    return false; // Not a full DD/MM/AAAA format
  }

  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
    return false; // Invalid date components
  }

  // Further check for month-day validity (e.g., 31/02 is invalid)
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return false;
  }

  return true; // It's a valid DD/MM/AAAA date
};

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = sessionStorage.getItem('isAuthenticated');
    if (authStatus !== 'true') {
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true); // isLoading ahora se usa para la carga de datos
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBeneficiarios, setSelectedBeneficiarios] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Beneficiario[]>([]);
  const [alertInfo, setAlertInfo] = useState<{ message: string; details: string } | null>(null); // Estado para la alerta

  const fechaNacimientoRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const results = beneficiarios.filter(b =>
      (b.nombre_completo || '').toLowerCase().includes(lowercasedQuery) ||
      (b.cedula || '').includes(searchQuery)
    );
    setSearchResults(results);
    setSelectedBeneficiarios([]);
  };

  const handleSelectBeneficiario = (id: number) => {
    setSelectedBeneficiarios(prev =>
      prev.includes(id) ? prev.filter(beneficiarioId => beneficiarioId !== id) : [...prev, id]
    );
  };

  const extractNumber = (cedulaString: string): number => {
    const match = (cedulaString || '').match(/\d+/);
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
    if (isAuthenticated) {
      fetchBeneficiarios();
    }
  }, [isAuthenticated, fetchBeneficiarios]);

  if (!isAuthenticated) {
    return (
      <main className={styles.main}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Verificando acceso...</p>
        </div>
      </main>
    );
  }

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

    const url = isEditing ? `/api/beneficiarios/${form.id}` : '/api/beneficiarios';
    const method = isEditing ? 'PUT' : 'POST';

    const payload = {
      ...form,
      fecha_nacimiento: parseDateToYYYYMMDD(form.fecha_nacimiento),
      fecha_fallecimiento: parseDateToYYYYMMDD(form.fecha_fallecimiento),
    };

    try {
      const response = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
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
    setSelectedBeneficiarios([]);
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
        setSelectedBeneficiarios([]);
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
      {alertInfo && (
        <CustomAlert 
          message={alertInfo.message} 
          details={alertInfo.details} 
          onClose={() => setAlertInfo(null)} 
        />
      )}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>Actualizando Base de Datos...</p>
        </div>
      )}

      <div className={styles.description}>
        <h1 className={styles.mainTitle}>Gestión de Jubilados y Sobrevivientes</h1>
      </div>

      <div className={`${styles.container} ${styles.formContainer}`}>
        <h2>{isEditing ? 'Editando Registro' : 'Añadir Nuevo Jubilado / Sobreviviente'}</h2>
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
        <h2 className={styles.centeredTitle}>Consulta, modificación y eliminación de registros + Reportes</h2>
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
              className={`${styles.button} ${styles.buttonSecondary}`}>
              Modificar Selección
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedBeneficiarios.length === 0}
              className={`${styles.button} ${styles.buttonDanger}`}>
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