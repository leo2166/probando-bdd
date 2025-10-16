'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import styles from './page.module.css';

// Interfaz para los datos de beneficiarios
interface Beneficiario {
  id: number;
  nombre_completo: string;
  cedula: string;
  condicion: string;
  nombre_finado: string | null;
}

// Tipo para el estado del formulario, con id opcional y nombre_finado como string
type FormState = Omit<Beneficiario, 'id' | 'nombre_finado'> & {
  id?: number;
  nombre_finado: string;
}

const initialFormState: FormState = {
    nombre_completo: '',
    cedula: '',
    condicion: '',
    nombre_finado: '',
};

export default function Home() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Inicia en true para la carga inicial
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

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
    setForm({ ...beneficiario, nombre_finado: beneficiario.nombre_finado || '' });
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

  const generatePdfReport = (data: Beneficiario[]) => {
    const doc = new jsPDF('p', 'pt', 'letter'); // 'p' for portrait, 'pt' for points, 'letter' for Letter size
    const margin = 40; // Margins for the page
    let y = margin; // Y position for content

    // Set font for titles
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Asociacion de Jubilado', margin, y);
    y += 20;

    doc.setFontSize(12);
    doc.text('Listado de Socios y Sobrevivientes', margin, y);
    y += 15;

    // Add Date and Time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Fecha: ${formattedDate} - Hora: ${formattedTime}`, margin, y);
    y += 25; // Space after date/time

    // Table Headers
    const headers = ['#', 'Nombre Completo', 'Cédula', 'Condición', 'Nombre Finado'];
    const columnWidths = [30, 150, 80, 80, 150]; // Adjust as needed
    let x = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    headers.forEach((header, index) => {
      doc.text(header, x, y);
      x += columnWidths[index];
    });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(margin, y, doc.internal.pageSize.width - margin, y); // Line under headers
    y += 10;

    // Table Data
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.forEach((beneficiario, index) => {
      if (y > doc.internal.pageSize.height - margin) { // Check for page break
        doc.addPage();
        y = margin;
        // Re-add headers on new page
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        x = margin;
        headers.forEach((header, hIndex) => {
          doc.text(header, x, y);
          x += columnWidths[hIndex];
        });
        y += 15;
        doc.setLineWidth(0.5);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      x = margin;
      doc.text((index + 1).toString(), x, y);
      x += columnWidths[0];
      doc.text(beneficiario.nombre_completo, x, y);
      x += columnWidths[1];
      doc.text(beneficiario.cedula, x, y);
      x += columnWidths[2];
      doc.text(beneficiario.condicion === 'Jubilado' ? 'Jubilado/a' : beneficiario.condicion, x, y);
      x += columnWidths[3];
      doc.text(beneficiario.nombre_finado || 'N/A', x, y);
      y += 15; // Line height
    });

    // Open PDF in new window
    doc.output('dataurlnewwindow');
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
        <h1>Gestión de Beneficiarios</h1>
      </div>

      <div className={`${styles.container} ${styles.formContainer}`}>
        <h2>{isEditing ? 'Editando Beneficiario' : 'Añadir Nuevo Beneficiario'}</h2>
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
            <button onClick={() => generatePdfReport(beneficiarios)} className={`${styles.button} ${styles.buttonPrint}`}>
              Imprimir
            </button>
          </div>
          {isLoading && !beneficiarios.length && <p>Cargando lista...</p>}
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Nombre Completo</th>
                <th className={styles.th}>Cédula</th>
                <th className={styles.th}>Condición</th>
                <th className={styles.th}>Nombre Finado</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {beneficiarios.map((b, index) => (
                <tr key={b.id}>
                  <td className={styles.td}>{index + 1}</td>
                  <td className={styles.td}>{b.nombre_completo}</td>
                  <td className={styles.td}>{b.cedula}</td>
                  <td className={styles.td}>{b.condicion === 'Jubilado' ? 'Jubilado/a' : b.condicion}</td>
                  <td className={styles.td}>{b.nombre_finado || 'N/A'}</td>
                  <td className={`${styles.td} ${styles.actionsCell}`}>                    <button onClick={() => handleEditClick(b)} className={`${styles.button} ${styles.buttonSecondary}`}>Editar</button>
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
