/* Genera data/proyectos.json: CSV ANI (60 registros) + atributos oficiales (Modos_ANI/3, OpenDataAni/3)
   + interventorías de SECOP II. Ejecutar: node scripts/gen_proyectos.js */
import fs from 'node:fs';

const csv = JSON.parse(fs.readFileSync('data/ani_csv_concesiones.json', 'utf8'));
const previo = JSON.parse(fs.readFileSync('data/proyectos.json', 'utf8')).proyectos;
const previoPorId = new Map(previo.map((p) => [p.id, p]));

/* Modos_ANI/3 (IdPr): nombre oficial, ola, generación, LngCnc/LngCrg (m), etapa */
const atributos = {
  1: ['IP - Accesos Norte a Bogotá', 'IP', '4G', 62000, 66000, 'Construcción'],
  2: ['IP - Antioquia - Bolívar', 'IP', '4G', 504435, 504435, 'Construcción'],
  3: ['Autopista Conexión Pacífico 1', 'Ola 1', '4G', 50100, 50100, 'Construcción'],
  4: ['Autopista Conexión Pacífico 2', 'Ola 1', '4G', 96500, 96500, 'Operación'],
  5: ['Autopista Conexión Pacífico 3', 'Ola 1', '4G', 146000, 145635, 'Construcción'],
  6: ['Autopista al Mar 1', 'Ola 2', '4G', 181000, 181000, 'Operación'],
  7: ['Autopista al Mar 2', 'Ola 2', '4G', 254000, 254000, 'Construcción'],
  8: ['Autopista al Río Magdalena 2', 'Ola 1', '4G', 144000, 144000, 'Construcción'],
  9: ['Autopista Conexión Norte', 'Ola 1', '4G', 145000, 145000, 'Construcción'],
  10: ['Bucaramanga - Barrancabermeja - Yondó', 'Ola 2', '4G', 151600, 117710, 'Construcción'],
  11: ['Cartagena - Barranquilla y Circunvalar de la Prosperidad', 'Ola 1', '4G', 146000, 146000, 'Operación'],
  12: ['Bucaramanga - Pamplona', 'Ola 3', '4G', 134200, 119600, 'Construcción'],
  13: ['Pamplona - Cúcuta', 'Ola 3', '4G', 62600, 62600, 'Construcción'],
  14: ['Honda - Puerto Salgar - Girardot', 'Ola 1', '4G', 190560, 191820, 'Operación'],
  15: ['IP - Cambao Manizales', 'IP', '4G', 256000, 256000, 'Construcción'],
  16: ['IP - Chirajara - Fundadores', 'IP', '4G', 86000, 86000, 'Construcción'],
  17: ['IP - Malla vial del Meta', 'IP', '4G', 267500, 267500, 'Construcción'],
  18: ['APP Mulaló - Loboguerrero', 'Ola 1', '4G', 32000, 32000, 'Pre-construcción'],
  19: ['IP - Neiva - Girardot', 'IP', '4G', 198350, 198350, 'Construcción'],
  20: ['Rumichaca - Pasto', 'Ola 2', '4G', 83000, 83000, 'Operación'],
  21: ['Perimetral de Oriente de Cundinamarca', 'Ola 1', '4G', 152240, 152240, 'Construcción'],
  22: ['Puerta de Hierro - Palmar de Varela y Carreto - Cruz del Viso', 'Ola 2', '4G', 202560, 198206, 'Operación'],
  23: ['Santana - Mocoa - Neiva', 'Ola 2', '4G', 456000, 456000, 'Construcción'],
  24: ['Popayán - Santander de Quilichao', 'Ola 2', '4G', 77000, 77000, 'Construcción'],
  25: ['Transversal del Sisga', 'Ola 2', '4G', 137030, 137057, 'Construcción'],
  26: ['IP - Ampliación a tercer carril doble calzada Bogotá - Girardot', 'IP', '4G', 144810, 144810, 'Construcción'],
  27: ['IP - Vía al Puerto', 'IP', '4G', 111000, 111000, 'Revertido'],
  28: ['IP - Vías del Nus', 'IP', '4G', 157000, 157000, 'Operación'],
  29: ['Villavicencio - Yopal', 'Ola 2', '4G', 266000, 266000, 'Construcción'],
  30: ['IP - GICA (Girardot - Ibagué - Cajamarca)', 'IP', '4G', 180000, 180000, 'Construcción'],
  31: ['IP - Cesar - Guajira', 'IP', '4G', 10000, 10000, 'Revertido'],
  32: ['Desarrollo Vial Armenia - Pereira - Manizales', 'No aplica', '1G', 188500, 188500, 'Operación'],
  33: ['Santafé de Bogotá (Puente el Cortijo) - Siberia - La Punta - El Vino - La Vega - Villeta', 'No aplica', '1G', 81626, 81626, 'Construcción'],
  34: ['Bogotá - Villavicencio', 'No aplica', '3G', 85600, 85600, 'Reversión'],
  35: ['Cartagena - Barranquilla - "Vía al mar"', 'No aplica', '1G', 93000, 93000, 'Revertido'],
  36: ['Desarrollo Vial del Norte de Bogotá - DEVINORTE', 'No aplica', '1G', 10000, 10000, 'Reversión'],
  37: ['Desarrollo Vial del Oriente de Medellín - DEVIMED', 'No aplica', '1G', 172500, 175200, 'Operación'],
  38: ['Bogotá (Fontibón) - Faca - Los Alpes', 'No aplica', '1G', 38400, 38400, 'Operación'],
  39: ['Malla Vial del Meta', 'No aplica', '1G', 354000, 354000, 'Reversión'],
  40: ['Neiva - Espinal - Girardot (1G)', 'No aplica', '1G', 10000, 10000, 'Reversión'],
  41: ['Santa Marta - Riohacha - Paraguachón', 'No aplica', '1G', 285700, 285700, 'Operación'],
  42: ['Malla Vial del Valle del Cauca y Cauca', null, '2G', 263000, 263000, 'Revertido'],
  43: ['Área Metropolitana de Cúcuta y Norte de Santander', 'No aplica', '3G', 104000, 1000, 'Reversión'],
  44: ['Bosa - Granada - Girardot', 'No aplica', '3G', null, null, 'Reversión'],
  45: ['Briceño - Tunja - Sogamoso', 'No aplica', '3G', 206000, 206000, 'Operación'],
  46: ['Córdoba - Sucre', 'No aplica', '3G', 177000, 177000, 'Operación'],
  47: ['Girardot - Ibagué - Cajamarca', 'No aplica', '3G', 145365, 145365, 'Reversión'],
  48: ['Pereira - La Victoria', 'No aplica', '3G', 54000, 54000, 'Revertido'],
  49: ['Rumichaca - Pasto - Chachagüí - Aeropuerto', 'No aplica', '3G', 83000, 83000, 'Reversión'],
  50: ['Ruta Caribe', 'No aplica', '3G', 288000, 288000, 'Reversión'],
  51: ['Ruta del Sol - Sector 1', 'No aplica', '3G', 63200, 63200, 'Revertido'],
  52: ['Ruta del Sol - Sector 3', 'No aplica', '3G', 466463, 467020, 'Construcción'],
  53: ['Ruta del Sol - Sector 2', 'No aplica', '3G', 528000, 528000, 'Reversión'],
  54: ['Transversal de las Américas - Sector 1', 'No aplica', '3G', 714000, 11630, 'Reversión'],
  55: ['Zipaquirá - Palenque', 'No aplica', '3G', 10000, 10000, 'Reversión'],
  56: ['Zona Metropolitana Bucaramanga', 'No aplica', '3G', 10000, 10000, 'Reversión'],
  57: ['Buga - Loboguerrero', 'Ola 1', '4G', null, null, 'Revertido'],
  153: ['Nueva Malla Vial del Valle del Cauca - Corredor Accesos Cali y Palmira', 'IP', '5G', 310000, 310000, 'Pre-construcción'],
  154: ['Avenida Longitudinal de Occidente - ALO Sur', 'IP', '5G', null, null, 'Pre-construcción'],
  155: ['Troncal del Magdalena C1', 'IP', '5G', null, null, 'Estructuración'],
  156: ['Troncal del Magdalena C2', 'IP', '5G', null, null, 'Estructuración'],
  157: ['Accesos Norte Fase II', 'IP', '5G', 17960, 17960, 'Pre-construcción'],
  158: ['APP Buga - Buenaventura', 'IP', '5G', null, null, 'Estructuración'],
  184: ['IP Autopistas del Caribe, corredor de carga Cartagena - Barranquilla', 'Ola 1', '4G', 253000, 253000, 'Pre-construcción'],
  185: ['IP Autovía Córdoba - Sucre', 'Ola 2', '5G', null, null, 'Estructuración'],
  160: ['IP Santuario - Caño Alegre - Ruta del Agua', 'IP', '5G', null, null, 'Estructuración'],
  169: ['IP Conexión Centro', 'IP', '5G', null, null, 'Estructuración'],
};

/* Interventorías SECOP II. verificado=true solo cuando el objeto del contrato nombra el corredor. */
const interventorias = {
  1: ['CONSORCIO APP ACCESOS NORTE', 'VEJ-538-2026', 23814232170, 'En ejecución', true],
  2: ['CONSORCIO IPAB', 'VEJ-523-2026', 30013436514, 'En ejecución', true],
  7: ['CONSORCIO AUTOPISTA AL MAR.', 'VEJ-604-2026', 30274387003, 'En ejecución', true],
  10: ['CONSORCIO CONSULTECNICOS', 'VEJ-756 DE 2024', 31020938276, 'En ejecución', true],
  11: ['CONSORCIO MAB (módulo Cartagena - Barranquilla)', 'VGC-476-2018', 17352388418, 'Suspendido', false],
  14: ['CONSORCIO INTERVENTORIAS INTEGRALES', 'VEJ 544 -2022', 14300000000, 'En ejecución', false],
  21: ['CONSORCIO INTERVENTOR ERS', 'VEJ-542-2022', 23130155000, 'Modificado', true],
  22: ['CONSORCIO PEB-EGIS', 'VEJ-759 DE 2024', 17849935925, 'En ejecución', false],
  23: ['CONSORCIO INTERRA TLS', 'VEJ-634-2022', 27167457000, 'En ejecución', true],
  25: ['CONSORCIO INTERVENTOR SISGA FR', 'VEJ-430-2025', 20918058256, 'En ejecución', true],
  26: ['CONSORCIO VIAL GIRARDOT CC', 'VEJ-554-2026', 33684509952, 'En ejecución', true],
  29: ['CONSORCIO CTE YOPAL 006', 'VEJ-724-2025', 27476402341, 'En ejecución', true],
  5: ['CONSORCIO INTERCORREDORES CS', 'VEJ-758 DE 2024', 17913189266, 'En ejecución', true],
  4: ['CONSORCIO INTERINTEGRALES GP', 'VEJ-553 de 2022', 15202683180, 'En ejecución', false],
  6: ['CONSORCIO TEA CONSULTORÍAS', 'VEJ-799-2023', 16566858606, 'En ejecución', false],
  9: ['CONSORCIO SERVICIOS DE INTERVENTORÍA INTEGRAL', 'VEJ-556-2021', 16387589367, 'En ejecución', false],
  19: ['CONSORCIO INTERDISEÑOS ANI-005', 'VEJ-543-2022', 15162874878, 'En ejecución', false],
  15: ['CONSORCIO HG MANIZALES', 'VEJ-717-2025', 20353226748, 'En ejecución', false],
  23: ['CONSORCIO INTERRA TLS', 'VEJ-634-2022', 27167457000, 'En ejecución', true],
  32: ['CAL Y MAYOR COLOMBIA S.A.S.', 'VEJ-001-2024', 9760585610, 'En ejecución', true],
  45: ['CONSORCIO VISI-TUNJA', 'VEJ-404-2019', 8474246148, 'Terminado', true],
  37: ['CONSORCIO CONCESIÓN ORIENTE 012', 'VEJ-746-2023', 8445423941, 'En ejecución', false],
  38: ['CONSORCIO INTERSABANA', 'VEJ 469 DE 2018', 5966521448.59, 'Modificado', false],
  41: ['CONSORCIO MAB 2', 'VEJ-652-2023', 9158165868, 'En ejecución', false],
  50: ['CONSORCIO GOC 009', 'VGC - 624 DE 2019', 6684130328, 'Modificado', false],
  46: ['CONSORCIO CONCESIÓN-FERREO', 'VEJ-518-2019', 7470904263, 'Modificado', false],
  132: ['CONSORCIO CORREDORES FERREOS 2019', 'VE-494-2019', 9162096108, 'Modificado', false],
  196: ['CONSORCIO INTERCOL UG-ING (estudios)', 'VE-717-2023', 1500000000, 'Terminado', false],
  52: ['CONSORCIO CONCESIONES G&A 2022', 'VEJ-633-2022', 36267440633, 'Modificado', true],
  153: ['CONSORCIO AUTOPISTAS DEL CARIBE CV (módulo 2)', 'VE-527-2021', 34005328774, 'Modificado', true],
  154: ['CONSORCIO VIAL DE OCCIDENTE', 'VEJ-501-2022', 25434218388, 'En ejecución', true],
  155: ['RESTREPOYURIBESAS', 'VEJ-540-2022', 34984919000, 'En ejecución', true],
  156: ['CONSORCIO CONCESIONES POR COLOMBIA', 'VEJ-539-2022', 35029834196, 'En ejecución', true],
  157: ['AFA CONSULTORES Y CONSTRUCTORES S.A.', 'VEJ-506-2022', 36812630000, 'En ejecución', true],
  158: ['CONSORCIO CONEXION INSA', 'VEJ-627-2022', 40096470702, 'En ejecución', true],
  184: ['CONSORCIO INTERCONCESIONES MALLA VIAL', 'VE-557-2021', 43097455758, 'En ejecución', true],
  167: ['CONSORCIO DIQUE MAI', 'VGCON-470-2023', 74800819095, 'En ejecución', true],
  128: ['CONSORCIO RED FÉRREA IJ', 'VGCON-777-2023', 11475744700, 'Modificado', false],
  129: ['CONSORCIO FERROPAC 2026', 'VGCON-732-2026', 23543874084, 'En ejecución', true],
  165: ['CONSORCIO GIS RED FÉRREA', 'VGCON-660-2023', 9683201419.5, 'Modificado', false],
};

const contratos = {
  1: 'APP 001 de 2017', 2: 'APP 016 de 2015', 3: '007 de 2014', 4: '006 de 2014', 5: '005 de 2014',
  6: '014 de 2015', 7: '018 de 2015', 8: '012 de 2014', 9: '009 de 2014', 10: '013 de 2015',
  11: '004 de 2014', 12: 'APP 002 de 2016', 13: 'APP 010 de 2017', 14: '003 de 2014', 15: '008 de 2015',
  16: 'APP 005 de 2015', 17: '004 de 2015', 18: 'APP 001 de 2015', 19: '017 de 2015', 20: '015 de 2015',
  21: '002 de 2014', 22: '007 de 2015', 23: 'APP 008 de 2016', 24: 'APP 020 de 2015', 25: '009 de 2015',
  26: 'APP 004 de 2016', 28: 'APP 006 de 2015', 29: '010 de 2015', 30: 'APP 007 de 2015',
  32: '113 de 1997', 33: '447 de 1994', 34: '444 de 1994', 37: '0275 de 1996', 38: '0937 de 1995',
  41: '445 de 1994', 45: '377 de 2002', 46: '008 de 2007', 50: '008 de 2007', 52: '007 de 2010',
  153: 'APP 001 de 2021', 154: 'APP 003 de 2021', 155: 'APP 003 de 2022', 156: 'APP 004 de 2022',
  157: 'APP 005 de 2021', 158: 'APP 002 de 2022', 184: 'APP 002 de 2021',
  128: 'O-ATLA-00-99 de 1999', 129: '09-CONP-98 de 1998', 132: '313 de 2013', 165: 'Contrato de obra',
};

const extra = {
  128: { alcance: 'Rehabilitación 245 km, construcción 191 km' },
  132: { alcance: 'Dorada - Chiriguaná: 522 km rehabilitados; Bogotá - Belencito: 318 km' },
};

const proyectos = csv.map((c) => {
  const a = atributos[c.id];
  const i = interventorias[c.id];
  const p = previoPorId.get(c.id) || {};
  const [nombreOf, ola, gen, lngCnc, lngCrg, etp] = a || [];
  return {
    id: c.id,
    codigo: c.codigo,
    nombre: nombreOf || c.nombre,
    nombreCatalogo: c.nombre,
    nombreCorto: p.nombreCorto || c.nombreCorto,
    tipo: c.tipo,
    generacion: gen || (c.tipo === 'Carretero' ? '5G' : null),
    ola: ola === undefined ? null : ola,
    etapa: etp || (c.tipo === 'Carretero' ? 'Estructuración' : 'Estructuración'),
    longitudConcesionKm: lngCnc != null ? +(lngCnc / 1000).toFixed(3) : null,
    longitudCargoKm: lngCrg != null ? +(lngCrg / 1000).toFixed(3) : null,
    ...(extra[c.id] || {}),
    contratista: c.contratista || null,
    nit: c.nit || null,
    municipioDomicilio: c.municipioDomicilio || null,
    direccion: p.direccion || c.direccion || null,
    telefono: c.telefono || null,
    correo: c.correo || null,
    web: c.web || null,
    contratoConcesion: contratos[c.id] || null,
    interventoria: i
      ? { nombre: i[0], contrato: i[1], valorCop: i[2], estado: i[3], verificado: i[4] }
      : { nombre: null, contrato: null, valorCop: null, estado: null, verificado: false },
  };
});

const out = {
  _meta: {
    actualizado: '2026-11-18',
    fuenteCatalogo: 'Concesiones ANI - datos.gov.co (b9m8-fgtx), corte 2026-11-18',
    fuenteLongitudes: 'ANI - servicio de datos abiertos Modos_ANI capa 3 (LngCnc / LngCrg en metros)',
    fuenteEstado: 'ANI - OpenDataAni capa 3 y Modos_ANI capa 3 (etapa)',
    fuenteInterventorias: 'SECOP II - datos.gov.co (jbjy-vk9h), contratos de interventoría de la ANI, consulta 2026-11-18',
    nota: 'verificado=false indica que el objeto contractual en SECOP II no nombra explícitamente el corredor y el emparejamiento es indicativo: debe confirmarse en SECOP II.',
  },
  proyectos,
};

fs.writeFileSync('data/proyectos.json', JSON.stringify(out, null, 2));
console.log(`proyectos.json: ${proyectos.length} registros; con km: ${proyectos.filter((p) => p.longitudConcesionKm).length}; con interventoría: ${proyectos.filter((p) => p.interventoria.nombre).length}`);
