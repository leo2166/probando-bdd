'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import styles from '../page.module.css';

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

export default function ReportesPage() {
  const router = useRouter();
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [birthdayDate, setBirthdayDate] = useState<string>('');

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

  // --- FUNCIÓN DE PDF REFACTORIZADA ---
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
            fecha_nacimiento: beneficiario.fecha_nacimiento ? new Date(beneficiario.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A',
            fecha_fallecimiento: beneficiario.fecha_fallecimiento ? new Date(beneficiario.fecha_fallecimiento + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A',
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
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); // Ir a la página i
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const text = `Página ${i} de ${totalPages}`;
        // Calcular el ancho del texto para centrarlo
        const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        const x = (doc.internal.pageSize.width - textWidth) / 2;
        const y_footer = doc.internal.pageSize.height - 20; // 20 puntos desde abajo
        doc.text(text, x, y_footer);
    }

    doc.output('dataurlnewwindow');
  };

  // --- Lógica de generación de reportes ---
  const runReport = (reportType: string) => {
    switch (reportType) {
      case 'asociados-activos':
        const asociadosActivos = beneficiarios.filter(b => b.condicion === 'Jubilado' && !b.fecha_fallecimiento && b.asociado);
        generatePdfReport(asociadosActivos, 'Reporte de Asociados Activos', ['fecha_fallecimiento', 'nombre_finado'], 'l');
        break;
      case 'jubilados':
        const jubilados = beneficiarios.filter(b => b.condicion === 'Jubilado' && !b.fecha_fallecimiento);
        // Excluir la columna de fallecimiento para este reporte específico
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
      case 'cumpleaneros':
        if (!birthdayDate) {
            alert('Por favor, selecciona una fecha.');
            return;
        }
        const targetDate = new Date(birthdayDate + 'T00:00:00');
        const targetMonth = targetDate.getMonth();
        const targetDay = targetDate.getDate();

        const cumpleaneros = beneficiarios.filter(b => {
            if (!b.fecha_nacimiento) return false;
            const birthDate = new Date(b.fecha_nacimiento + 'T00:00:00');
            return birthDate.getMonth() === targetMonth && birthDate.getDate() === targetDay;
        });

        const title = `Reporte de Cumpleañeros del ${targetDay} de ${targetDate.toLocaleString('es-ES', { month: 'long' })}`;
        generatePdfReport(cumpleaneros, title, [], 'l');
        break;
    }
  };

  // --- Renderizado condicional de la UI ---
  const renderContent = () => {
    if (isLoading) {
        return (
            <div className={styles.loadingOverlay} style={{backgroundColor: 'transparent', color: 'black'}}>
                <div className={styles.spinner}></div>
                <p>Cargando datos...</p>
            </div>
        );
    }

    if (selectedReport === 'cumpleaneros') {
      return (
        <>
          <h3>Reporte de Cumpleañeros</h3>
          <p>Selecciona la fecha (día y mes) para buscar cumpleañeros.</p>
          <div className={styles.form} style={{alignItems: 'center', marginTop: '1.5rem'}}>
            <input
                type="date"
                value={birthdayDate}
                onChange={(e) => setBirthdayDate(e.target.value)}
                className={styles.input}
                style={{maxWidth: '250px'}}
            />
            <div className={styles.buttonGroup} style={{marginTop: '1rem'}}>
                <button onClick={() => runReport('cumpleaneros')} className={`${styles.button} ${styles.buttonPrimary}`}>Generar</button>
                <button onClick={() => setSelectedReport(null)} className={`${styles.button} ${styles.buttonSecondary}`}>Volver</button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2>Menú de Reportes</h2>
            <button onClick={() => router.back()} className={`${styles.button} ${styles.buttonSecondary}`}>Volver</button>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            <button onClick={() => runReport('asociados-activos')} className={styles.reportButton}>Reporte de Asociados Activos</button>
            <button onClick={() => runReport('jubilados')} className={styles.reportButton}>Reporte de Jubilados Activos</button>
            <button onClick={() => runReport('sobrevivientes')} className={styles.reportButton}>Reporte de Sobrevivientes</button>
            <button onClick={() => runReport('fallecidos')} className={styles.reportButton}>Reporte de Fallecidos</button>
            <button onClick={() => setSelectedReport('cumpleaneros')} className={styles.reportButton}>Reporte de Cumpleañeros por Fecha</button>
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