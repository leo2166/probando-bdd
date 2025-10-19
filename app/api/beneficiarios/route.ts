import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Handler para OBTENER todos los beneficiarios
export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM Beneficiarios ORDER BY CAST(REPLACE(SUBSTRING(cedula FROM 3), '.', '') AS INT) ASC;`;
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Handler para CREAR un nuevo beneficiario
export async function POST(request: Request) {
  try {
    const { nombre_completo, cedula, condicion, nombre_finado, fecha_nacimiento, fecha_fallecimiento, telefono } = await request.json();
    const cedulaLimpia = cedula ? String(cedula).replace(/\./g, '') : '';

    if (!nombre_completo || !cedulaLimpia || !condicion) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO Beneficiarios (nombre_completo, cedula, condicion, nombre_finado, fecha_nacimiento, fecha_fallecimiento, telefono)
      VALUES (${nombre_completo}, ${cedulaLimpia}, ${condicion}, ${nombre_finado || null}, ${fecha_nacimiento || null}, ${fecha_fallecimiento || null}, ${telefono || null})
      RETURNING *;
    `;

    return NextResponse.json({ beneficiario: rows[0] }, { status: 201 });

  } catch (error) {
    // Manejo de errores específicos, como cédula duplicada
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505') {
        return NextResponse.json({ error: `La cédula ya existe.` }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}