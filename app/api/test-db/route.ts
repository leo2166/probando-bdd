
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {

    // Crear la tabla con la nueva estructura si no existe
    await sql`
      CREATE TABLE IF NOT EXISTS Beneficiarios (
        id SERIAL PRIMARY KEY,
        nombre_completo VARCHAR(255) NOT NULL,
        cedula VARCHAR(20) UNIQUE NOT NULL,
        condicion VARCHAR(50) NOT NULL,
        nombre_finado VARCHAR(255)
      );
    `;

    // Insertar datos de ejemplo si no existen
    await sql`
      INSERT INTO Beneficiarios (nombre_completo, cedula, condicion, nombre_finado)
      VALUES ('Juan Perez', 'V-12345678', 'Jubilado', NULL)
      ON CONFLICT (cedula) DO NOTHING;
    `;
    await sql`
      INSERT INTO Beneficiarios (nombre_completo, cedula, condicion, nombre_finado)
      VALUES ('Maria Rodriguez', 'E-87654321', 'Sobreviviente', 'Pedro Rodriguez')
      ON CONFLICT (cedula) DO NOTHING;
    `;

    // Consultar todos los datos de la tabla
    const { rows } = await sql`SELECT * FROM Beneficiarios;`;
    
    return NextResponse.json({ rows }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
