import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomBeneficiario() {
    const firstNamesMale = ["Juan", "Pedro", "Carlos", "Luis", "Miguel", "José", "Antonio", "Manuel", "Francisco", "David"];
    const firstNamesFemale = ["María", "Ana", "Laura", "Sofía", "Isabel", "Carmen", "Elena", "Patricia", "Andrea", "Gabriela"];
    const lastNames = ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Díaz"];

    const isMale = Math.random() < 0.5;
    const firstName = isMale ? firstNamesMale[getRandomInt(0, firstNamesMale.length - 1)] : firstNamesFemale[getRandomInt(0, firstNamesFemale.length - 1)];
    const lastName1 = lastNames[getRandomInt(0, lastNames.length - 1)];
    const lastName2 = lastNames[getRandomInt(0, lastNames.length - 1)];
    const nombre_completo = `${firstName} ${lastName1} ${lastName2}`;

    const cedula = `V-${getRandomInt(1000000, 30000000).toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
    const condicion = Math.random() < 0.7 ? 'Jubilado' : 'Sobreviviente';
    const asociado = Math.random() < 0.5;

    let fecha_nacimiento: string;
    let fecha_fallecimiento: string | null = null;
    let nombre_finado: string | null = null;

    const today = new Date();

    if (condicion === 'Sobreviviente') {
        // Fecha de fallecimiento dentro de los últimos 10 años
        const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
        const randomDeathDate = new Date(tenYearsAgo.getTime() + Math.random() * (today.getTime() - tenYearsAgo.getTime()));
        fecha_fallecimiento = randomDeathDate.toISOString().split('T')[0];

        // Edad al fallecer entre 58 y 90 años
        const ageAtDeath = getRandomInt(58, 90);
        const birthYear = randomDeathDate.getFullYear() - ageAtDeath;
        const birthMonth = getRandomInt(0, 11);
        const birthDay = getRandomInt(1, 28); // Avoid issues with months having fewer days
        const birthDateForDeceased = new Date(birthYear, birthMonth, birthDay);
        fecha_nacimiento = birthDateForDeceased.toISOString().split('T')[0];

        const finadoFirstName = isMale ? firstNamesFemale[getRandomInt(0, firstNamesFemale.length - 1)] : firstNamesMale[getRandomInt(0, firstNamesMale.length - 1)];
        const finadoLastName1 = lastNames[getRandomInt(0, lastNames.length - 1)];
        const finadoLastName2 = lastNames[getRandomInt(0, lastNames.length - 1)];
        nombre_finado = `${finadoFirstName} ${finadoLastName1} ${finadoLastName2}`;
    } else { // Jubilado
        // Edad actual entre 50 y 80 años
        const currentAge = getRandomInt(50, 80);
        const birthYear = today.getFullYear() - currentAge;
        const birthMonth = getRandomInt(0, 11);
        const birthDay = getRandomInt(1, 28);
        const randomBirthDate = new Date(birthYear, birthMonth, birthDay);
        fecha_nacimiento = randomBirthDate.toISOString().split('T')[0];
    }

    const telefono = `041${getRandomInt(2, 6)}-${getRandomInt(1000000, 9999999)}`;

    return {
        nombre_completo,
        cedula,
        condicion,
        asociado,
        nombre_finado,
        fecha_nacimiento,
        fecha_fallecimiento,
        telefono,
    };
}

export async function GET() {
    try {
        // 1. Borrar registros existentes
        await sql`DELETE FROM Beneficiarios;`;

        // 2. Generar e insertar 100 registros aleatorios
        const beneficiariosToInsert = Array.from({ length: 100 }, generateRandomBeneficiario);

        for (const b of beneficiariosToInsert) {
            await sql`
                INSERT INTO Beneficiarios (nombre_completo, cedula, condicion, asociado, nombre_finado, fecha_nacimiento, fecha_fallecimiento, telefono)
                VALUES (
                    ${b.nombre_completo},
                    ${b.cedula},
                    ${b.condicion},
                    ${b.asociado},
                    ${b.nombre_finado},
                    ${b.fecha_nacimiento},
                    ${b.fecha_fallecimiento},
                    ${b.telefono}
                );
            `;
        }

        return NextResponse.json({ message: 'Base de datos sembrada con 100 registros aleatorios.' }, { status: 200 });
    } catch (error) {
        console.error('Error al sembrar la base de datos:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
