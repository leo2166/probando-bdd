import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await sql`DELETE FROM Beneficiarios;`;
        return NextResponse.json({ message: 'Tabla Beneficiarios limpiada exitosamente.' }, { status: 200 });
    } catch (error) {
        console.error('Error al limpiar la tabla Beneficiarios:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
