import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// Handler para OBTENER un único beneficiario por ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const { rows } = await sql`SELECT * FROM Beneficiarios WHERE id = ${Number(params.id)};`;
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Beneficiario no encontrado' }, { status: 404 });
        }
        return NextResponse.json({ beneficiario: rows[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// Handler para ACTUALIZAR (Modificar) un beneficiario
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { nombre_completo, cedula, condicion, nombre_finado } = await request.json();
    const id = Number(params.id);

    if (!nombre_completo || !cedula || !condicion) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE Beneficiarios
      SET nombre_completo = ${nombre_completo}, 
          cedula = ${cedula}, 
          condicion = ${condicion}, 
          nombre_finado = ${nombre_finado || null}
      WHERE id = ${id}
      RETURNING *;
    `;

    if (rows.length === 0) {
        return NextResponse.json({ error: 'Beneficiario no encontrado para actualizar' }, { status: 404 });
    }

    return NextResponse.json({ beneficiario: rows[0] }, { status: 200 });

  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505') {
        return NextResponse.json({ error: `La cédula ya existe.` }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Handler para ELIMINAR un beneficiario
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = Number(params.id);
        const { rowCount } = await sql`DELETE FROM Beneficiarios WHERE id = ${id};`;

        if (rowCount === 0) {
            return NextResponse.json({ error: 'Beneficiario no encontrado para eliminar' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Beneficiario eliminado exitosamente' }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}