import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Handler para OBTENER todos los beneficiarios
export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM Beneficiarios ORDER BY id ASC;`;
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Handler para CREAR un nuevo beneficiario
export async function POST(request: Request) {
  try {
    const { nombre_completo, cedula, condicion, nombre_finado } = await request.json();

    if (!nombre_completo || !cedula || !condicion) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { rows } = await sql`
      INSERT INTO Beneficiarios (nombre_completo, cedula, condicion, nombre_finado)
      VALUES (${nombre_completo}, ${cedula}, ${condicion}, ${nombre_finado || null})
      RETURNING *;
    `;

    return NextResponse.json({ beneficiario: rows[0] }, { status: 201 });

  } catch (error) {
    // Manejo de errores específicos, como cédula duplicada
    if ((error as any).code === '23505') { // Código de error para violación de unicidad en PostgreSQL
        return NextResponse.json({ error: `La cédula ya existe.` }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
'''