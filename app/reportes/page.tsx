'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import styles from '../main/main.module.css';

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

// --- NUEVOS HELPERS para DD/MM ---
const isValidDDMM = (dateString: string): boolean => {
  if (!dateString) return false;
  const regex = /^\d{2}\/\d{2}$/;
  if (!regex.test(dateString)) return false;

  const [day, month] = dateString.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Se podrían añadir más validaciones por mes, pero esto es suficiente para el filtro.
  return true;
};

export default function ReportesPage() {
  const router = useRouter();
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [birthdayQuery, setBirthdayQuery] = useState<string>(''); // Nuevo estado para DD/MM

  const handleBirthdayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setError(null);
    const onlyNums = value.replace(/[^\d]/g, '');
    let processedValue = onlyNums;

    if (onlyNums.length > 2) {
      processedValue = `${onlyNums.slice(0, 2)}/${onlyNums.slice(2, 4)}`;
    } 

    setBirthdayQuery(processedValue);
  };

  // ... (fetchBeneficiarios y generatePdfReport sin cambios)
  const fetchBeneficiarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/beneficiarios');
      if (!response.ok) throw new Error('No se pudieron cargar los datos');
      const data = await response.json();
      setBeneficiarios(data.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeneficiarios();
  }, [fetchBeneficiarios]);

  const generatePdfReport = (data: Beneficiario[], title: string, excludeColumns: string[] = [], orientation: 'p' | 'l' = 'p', dataFontSize: number = 12, customColumnProportions?: { [key: string]: number }, customHeaders?: string[]) => {
    if (data.length === 0) {
        alert('No hay datos para generar este reporte.');
        return;
    }
    const doc = new jsPDF(orientation, 'pt', 'letter');
    const margin = 40;
    let y = margin;

    // Títulos del documento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('AJUPTEL ZULIA', margin, y);
    y += 20;
    doc.setFontSize(14);
    doc.text(title, margin, y);
    y += 15;
    const now = new Date();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Fecha: ${now.toLocaleDateString('es-ES')} - Hora: ${now.toLocaleTimeString('es-ES')}`, margin, y);
    y += 25;

    // Definiciones maestras de columnas
    const allHeaders = ['#', 'Nombre Completo', 'Cédula', 'Condición', 'Asociado', 'Nombre Finado', 'F. Nacimiento', 'F. Fallecimiento', 'Teléfono'];
    const allDataKeys = ['index', 'nombre_completo', 'cedula', 'condicion', 'asociado', 'nombre_finado', 'fecha_nacimiento', 'fecha_fallecimiento', 'telefono'];

    const effectiveHeaders = customHeaders || allHeaders;

    // Filtrar columnas basadas en `excludeColumns`
    const headers: string[] = [];
    const columnWidths: number[] = [];
    const dataKeys: string[] = [];

    allDataKeys.forEach((key, index) => {
        if (!excludeColumns.includes(key)) {
            headers.push(effectiveHeaders[index]);
            dataKeys.push(key);
        }
    });

    // Definir proporciones de ancho para cada columna
    const effectiveColumnProportions = customColumnProportions || {
        'index': 1,
        'nombre_completo': 5,
        'cedula': 2,
        'condicion': 2,
        'asociado': 1.5,
        'nombre_finado': 3,
        'fecha_nacimiento': 2.5,
        'fecha_fallecimiento': 2,
        'telefono': 2,
    };

    // Calcular anchos de columna basados en proporciones
    const availableWidth = doc.internal.pageSize.width - (2 * margin);
    let totalActiveProportions = 0;
    dataKeys.forEach(key => {
        totalActiveProportions += effectiveColumnProportions[key as keyof typeof effectiveColumnProportions] || 1; // Default to 1 if not defined
    });

    columnWidths.length = 0; // Limpiar anchos existentes
    dataKeys.forEach(key => {
        const proportion = effectiveColumnProportions[key as keyof typeof effectiveColumnProportions] || 1;
        columnWidths.push((proportion / totalActiveProportions) * availableWidth);
    });

    // Dibujar encabezados de tabla
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    let x = margin;
    headers.forEach((header, index) => {
        doc.text(header, x, y, { maxWidth: columnWidths[index] });
        x += columnWidths[index];
    });
    y += 15;
    doc.setLineWidth(0.5);
    doc.line(margin, y, doc.internal.pageSize.width - margin, y);
    y += 20;

    // Dibujar filas de datos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(dataFontSize);
    data.forEach((beneficiario, index) => {
        if (y > doc.internal.pageSize.height - margin) { // Salto de página
            doc.addPage();
            y = margin;
            // Repetir encabezados en nueva página
            x = margin;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            headers.forEach((header, hIndex) => {
                doc.text(header, x, y, { maxWidth: columnWidths[hIndex] });
                x += columnWidths[hIndex];
            });
            y += 15;
            doc.setLineWidth(0.5);
            doc.line(margin, y, doc.internal.pageSize.width - margin, y);
            y += 20;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(dataFontSize);
        }

        const fullRow = {
            index: (index + 1).toString(),
            nombre_completo: beneficiario.nombre_completo,
            cedula: beneficiario.cedula,
            condicion: beneficiario.condicion === 'Jubilado' ? 'Jubilado/a' : beneficiario.condicion,
            asociado: beneficiario.asociado ? 'Sí' : 'No', // Nuevo campo
            nombre_finado: beneficiario.nombre_finado || 'N/A',
            fecha_nacimiento: formatDateToDDMMYYYY(beneficiario.fecha_nacimiento) || 'N/A',
            fecha_fallecimiento: formatDateToDDMMYYYY(beneficiario.fecha_fallecimiento) || 'N/A',
            telefono: beneficiario.telefono || 'N/A'
        };

        x = margin;
        dataKeys.forEach((key, colIndex) => {
            doc.text(fullRow[key as keyof typeof fullRow], x, y);
            x += columnWidths[colIndex];
        });

        y += 25;
    });

    // --- AÑADIR NÚMEROS DE PÁGINA ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); // Ir a la página i
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const text = `Página ${i} de ${totalPages}`;
        // Calcular el ancho del texto para centrarlo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textWidth = doc.getStringUnitWidth(text) * (doc.internal as any).getFontSize() / doc.internal.scaleFactor;
        const x = (doc.internal.pageSize.width - textWidth) / 2;
        const y_footer = doc.internal.pageSize.height - 20; // 20 puntos desde abajo
        doc.text(text, x, y_footer);
    }

    doc.output('dataurlnewwindow');
  };


  const runReport = (reportType: string) => {
    switch (reportType) {
      case 'asociados-activos':
        const asociadosActivos = beneficiarios.filter(b => b.condicion === 'Jubilado' && !b.fecha_fallecimiento && b.asociado);
        generatePdfReport(asociadosActivos, 'Reporte de Asociados Activos', ['fecha_fallecimiento', 'nombre_finado'], 'l');
        break;
      case 'jubilados':
        const jubilados = beneficiarios.filter(b => b.condicion === 'Jubilado' && !b.fecha_fallecimiento);
        generatePdfReport(jubilados, 'Reporte de Jubilados Activos', ['fecha_fallecimiento', 'nombre_finado'], 'l');
        break;
      case 'sobrevivientes':
        const sobrevivientes = beneficiarios.filter(b => b.condicion === 'Sobreviviente');
        const sobrevivientesColumnProportions = {
            'index': 2,
            'nombre_completo': 25,
            'cedula': 10,
            'nombre_finado': 25,
            'fecha_fallecimiento': 10,
            'telefono': 10,
        };
        const customSobrevivientesHeaders = ['#', 'Nombre Completo', 'Cédula', 'Condición', 'Asociado', 'Nombre Finado', 'F. Nacimiento', 'F. Deceso', 'Teléfono'];
        generatePdfReport(sobrevivientes, 'Reporte de Sobrevivientes', ['condicion', 'fecha_nacimiento', 'asociado'], 'l', 11, sobrevivientesColumnProportions, customSobrevivientesHeaders);
        break;
      case 'fallecidos':
        const fallecidos = beneficiarios.filter(b => !!b.fecha_fallecimiento).sort((a, b) => {
            const dateA = a.fecha_fallecimiento ? new Date(a.fecha_fallecimiento).getTime() : 0;
            const dateB = b.fecha_fallecimiento ? new Date(b.fecha_fallecimiento).getTime() : 0;
            return dateB - dateA;
        });
        generatePdfReport(fallecidos, 'Reporte de Fallecidos', ['nombre_completo', 'cedula', 'condicion', 'telefono'], 'l');
        break;
      case 'cumpleaneros': {
        if (!isValidDDMM(birthdayQuery)) {
            setError('Formato de fecha inválido. Use DD/MM.');
            return;
        }

        const [day, month] = birthdayQuery.split('/').map(Number);
        const targetMonth = month - 1; // Mes en JS es 0-indexado
        const targetDay = day;

        const cumpleaneros = beneficiarios.filter(b => {
            if (!b.fecha_nacimiento) return false;
            const birthDate = new Date(b.fecha_nacimiento.split('T')[0] + 'T12:00:00');
            return birthDate.getMonth() === targetMonth && birthDate.getDate() === targetDay;
        });

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const title = `Reporte de Cumpleañeros del ${targetDay} de ${monthNames[targetMonth]}`;
        generatePdfReport(cumpleaneros, title, [], 'l');
        break;
      }
    }
  };

  const renderContent = () => {
    if (isLoading) {
        // ... (loader sin cambios)
    }

    if (selectedReport === 'cumpleaneros') {
      return (
        <>
          <h3 style={{textAlign: 'center'}}>Reporte de Cumpleañeros</h3>
          <p style={{textAlign: 'center'}}>Introduce el día y el mes.</p>
          <div className={styles.form} style={{alignItems: 'center', marginTop: '1.5rem'}}>
            <input
                type="text"
                value={birthdayQuery}
                onChange={handleBirthdayInputChange}
                placeholder="DD/MM"
                className={styles.input}
                style={{maxWidth: '150px', textAlign: 'center'}}
            />
            <div className={styles.buttonGroup} style={{marginTop: '1rem', justifyContent: 'center'}}>
                <button onClick={() => runReport('cumpleaneros')} className={`${styles.button} ${styles.buttonPrimary}`}>Generar</button>
                <button onClick={() => { setSelectedReport(null); setError(null); }} className={`${styles.button} ${styles.buttonSecondary}`}>Volver</button>
            </div>
          </div>
        </>
      );
    }

    return (
      // ... (menú principal de reportes sin cambios)
      <>
        <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
            <h2>Menú de Reportes</h2>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'}}>
            <button onClick={() => runReport('asociados-activos')} className={styles.reportOption}>Reporte de Asociados Activos</button>
            <button onClick={() => runReport('jubilados')} className={styles.reportOption}>Reporte de Jubilados Activos</button>
            <button onClick={() => runReport('sobrevivientes')} className={styles.reportOption}>Reporte de Sobrevivientes</button>
            <button onClick={() => runReport('fallecidos')} className={styles.reportOption}>Reporte de Fallecidos</button>
            <button onClick={() => setSelectedReport('cumpleaneros')} className={styles.reportOption}>Reporte de Cumpleañeros por Fecha</button>
            <button onClick={() => router.back()} className={`${styles.button} ${styles.buttonPrint}`} style={{marginTop: '1rem', width: 'auto', padding: '0.8rem 2.5rem'}}>Volver</button>
        </div>
      </>
    );
  };

  return (
    <main className={styles.main}>
        {error && <div className={styles.error}><pre>{error}</pre></div>}
        <div className={styles.container}>
            {renderContent()}
        </div>
    </main>
  );
}