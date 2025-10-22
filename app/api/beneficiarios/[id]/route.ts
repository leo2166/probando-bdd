import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

// Handler para OBTENER un único beneficiario por ID
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: NextRequest, context: any) {
    const { params } = context;
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: Request, context: any) {
  const { params } = context;
  try {
    const { nombre_completo, cedula, condicion, asociado, nombre_finado, fecha_nacimiento, fecha_fallecimiento, telefono } = await request.json();
    const cedulaLimpia = cedula ? String(cedula).replace(/\./g, '') : '';
    const id = Number(params.id);

    if (!nombre_completo || !cedulaLimpia || !condicion) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const { rows } = await sql`
      UPDATE Beneficiarios
      SET nombre_completo = ${nombre_completo},
          cedula = ${cedulaLimpia},
          condicion = ${condicion},
          asociado = ${asociado},
          nombre_finado = ${nombre_finado || null},
          fecha_nacimiento = ${fecha_nacimiento || null},
          fecha_fallecimiento = ${fecha_fallecimiento || null},
          telefono = ${telefono || null}
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: Request, context: any) {
    const { params } = context;
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