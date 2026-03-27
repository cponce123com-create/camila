import { db } from "@workspace/db";
import {
  usersTable,
  storesTable,
  licensesTable,
  categoriesTable,
  productsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { generateUniqueSlug } from "./slug";
import { logger } from "./logger";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function createStore(data: {
  email: string;
  password: string;
  ownerName: string;
  businessName: string;
  businessType: "clothing" | "restaurant" | "bakery" | "fair_booth" | "general_catalog";
  documentType: "DNI" | "RUC10" | "RUC20";
  documentNumber: string;
  phone: string;
  whatsapp?: string;
  district: string;
  address: string;
  description: string;
  primaryColor: string;
  socialInstagram?: string;
  categories: Array<{ name: string; description?: string; products: Array<{
    name: string;
    description?: string;
    price: string;
    stock: number;
    isFeatured?: boolean;
  }> }>;
}) {
  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, data.email))
    .limit(1);

  if (existingUser) return;

  const storeId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const licenseId = crypto.randomUUID();
  const slug = await generateUniqueSlug(data.businessName);

  await db.insert(storesTable).values({
    id: storeId,
    slug,
    businessName: data.businessName,
    businessType: data.businessType,
    documentType: data.documentType,
    documentNumber: data.documentNumber,
    ownerName: data.ownerName,
    phone: data.phone,
    whatsapp: data.whatsapp ?? data.phone,
    email: data.email,
    district: data.district,
    address: data.address,
    description: data.description,
    primaryColor: data.primaryColor,
    socialInstagram: data.socialInstagram,
    isActive: true,
  });

  await db.insert(usersTable).values({
    id: userId,
    storeId,
    email: data.email,
    passwordHash: hashPassword(data.password),
    name: data.ownerName,
    role: "store_admin",
    isActive: true,
  });

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  await db.insert(licensesTable).values({
    id: licenseId,
    storeId,
    plan: "annual",
    status: "active",
    expiresAt: expiry,
  });

  for (const cat of data.categories) {
    const catId = crypto.randomUUID();
    await db.insert(categoriesTable).values({
      id: catId,
      storeId,
      name: cat.name,
      description: cat.description,
    });

    for (const prod of cat.products) {
      await db.insert(productsTable).values({
        id: crypto.randomUUID(),
        storeId,
        categoryId: catId,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        stock: prod.stock,
        isFeatured: prod.isFeatured ?? false,
        isActive: true,
      });
    }
  }

  logger.info({ slug, email: data.email }, "Seed: demo store created");
}

// ─── Main seed ────────────────────────────────────────────────────────────────

export async function seedDefaultData() {
  try {
    // ── Superadmin ─────────────────────────────────────────────────────────
    const [existingAdmin] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "admin@camila.pe"))
      .limit(1);

    if (!existingAdmin) {
      await db.insert(usersTable).values({
        id: crypto.randomUUID(),
        email: "admin@camila.pe",
        passwordHash: hashPassword("Camila2025!"),
        name: "Administrador Camila",
        role: "superadmin",
        isActive: true,
      });
      logger.info("Seed: superadmin created (admin@camila.pe)");
    }

    // ── Test store (original) ──────────────────────────────────────────────
    await createStore({
      email: "tienda@test.pe",
      password: "Test1234!",
      ownerName: "Demo Emprendedor",
      businessName: "Tienda Demo Camila",
      businessType: "general_catalog",
      documentType: "DNI",
      documentNumber: "12345678",
      phone: "999000001",
      district: "San Ramón",
      address: "Jr. Comercio 123",
      description: "Tienda de demostración para probar la plataforma Camila.",
      primaryColor: "#1a5c2e",
      categories: [
        {
          name: "Ropa",
          products: [
            { name: "Camisa Azul Test", price: "35.00", stock: 20, isFeatured: true },
            { name: "Pantalón Negro Test", price: "55.00", stock: 15 },
          ],
        },
        {
          name: "Ropa Mujer",
          products: [
            { name: "Blusa Floral", price: "38.00", stock: 12 },
            { name: "Falda Estampada", price: "42.00", stock: 8 },
          ],
        },
      ],
    });

    // ── 1. Panadería El Trigal ─────────────────────────────────────────────
    await createStore({
      email: "panaderia@eltrigal.pe",
      password: "Trigal2025!",
      ownerName: "Ana María Quispe Lazo",
      businessName: "Panadería El Trigal",
      businessType: "bakery",
      documentType: "RUC10",
      documentNumber: "10456789012",
      phone: "964112233",
      whatsapp: "964112233",
      district: "San Ramón",
      address: "Jr. Progreso 245, San Ramón",
      description: "Panadería artesanal con más de 15 años ofreciendo pan fresco cada mañana. Especialistas en panes integrales, queques y tortas para toda ocasión.",
      primaryColor: "#b45309",
      socialInstagram: "panaderia_eltrigal",
      categories: [
        {
          name: "Panes del Día",
          description: "Panes frescos horneados cada mañana",
          products: [
            { name: "Pan de Yema (6 unidades)", description: "Suave y esponjoso, hecho con yemas de huevo fresco", price: "3.50", stock: 100, isFeatured: true },
            { name: "Pan Integral de Kiwicha", description: "Pan nutritivo con kiwicha andina, ideal para el desayuno", price: "4.00", stock: 80 },
            { name: "Pan Ciabatta Artesanal", description: "Pan italiano de corteza crujiente y miga aireada", price: "2.50", stock: 60 },
            { name: "Pan de Molde Casero (500g)", description: "Pan de molde suave, perfecto para sándwiches", price: "6.50", stock: 50 },
            { name: "Trenza de Mantequilla", description: "Pan dulce trenzado con mantequilla y azúcar", price: "3.00", stock: 40 },
          ],
        },
        {
          name: "Tortas y Queques",
          description: "Tortas para cumpleaños, bodas y toda ocasión",
          products: [
            { name: "Torta de Chocolate (1 kg)", description: "Húmeda y esponjosa, con cobertura de ganache y frutos rojos", price: "45.00", stock: 10, isFeatured: true },
            { name: "Queque de Naranja", description: "Queque casero con ralladura de naranja y glasé cítrico", price: "18.00", stock: 20 },
            { name: "Torta Tres Leches", description: "El clásico peruano: bizcocho empapado en tres tipos de leche", price: "55.00", stock: 8 },
            { name: "Cupcakes de Vainilla (6 unidades)", description: "Mini tortas decoradas con buttercream de vainilla", price: "22.00", stock: 30 },
          ],
        },
        {
          name: "Dulces y Bocaditos",
          description: "Para el lonche o merienda",
          products: [
            { name: "Alfajores de Maicena (4 unidades)", description: "Rellenos de manjar blanco y bañados en azúcar glass", price: "8.00", stock: 50, isFeatured: true },
            { name: "Empanaditas de Carne (6 unidades)", description: "Masa hojaldrada rellena de carne sazonada con ají", price: "12.00", stock: 40 },
            { name: "Pionono de Manjar", description: "Bizcocho enrollado relleno de manjar blanco casero", price: "15.00", stock: 25 },
          ],
        },
      ],
    });

    // ── 2. Boutique Selva Moda ─────────────────────────────────────────────
    await createStore({
      email: "boutique@selvamoda.pe",
      password: "Selva2025!",
      ownerName: "Rosa Elena Flores Torres",
      businessName: "Boutique Selva Moda",
      businessType: "clothing",
      documentType: "RUC10",
      documentNumber: "10567890123",
      phone: "972334455",
      whatsapp: "972334455",
      district: "La Merced",
      address: "Av. La Merced 178, La Merced, Chanchamayo",
      description: "Moda femenina con estilo tropical. Ropa cómoda y colorida para el clima de nuestra selva central. Tallas S al XXL. ¡Envíos a toda la provincia!",
      primaryColor: "#7c3aed",
      socialInstagram: "boutique_selvamoda",
      categories: [
        {
          name: "Vestidos",
          description: "Vestidos frescos para el clima selvático",
          products: [
            { name: "Vestido Floral Tropical", description: "Estampado de flores silvestres, tela fresca tipo lino, manga sisa", price: "75.00", stock: 15, isFeatured: true },
            { name: "Vestido Casual Midi", description: "Vestido a media pierna en tela jersey, muy cómodo para el calor", price: "65.00", stock: 12 },
            { name: "Vestido Playero con Bordado", description: "Bordado artesanal en el dobladillo, perfecto para paseos", price: "85.00", stock: 10 },
            { name: "Vestido de Noche Elegante", description: "Tela satinada con escote en V, ideal para eventos", price: "120.00", stock: 6 },
          ],
        },
        {
          name: "Blusas y Tops",
          description: "Prendas superiores ligeras y modernas",
          products: [
            { name: "Blusa Off-Shoulder Floral", description: "Blusa con hombros descubiertos, estampado de flores, tela suave", price: "45.00", stock: 20, isFeatured: true },
            { name: "Top Tejido Crochet", description: "Tejido a mano en hilo de algodón, ideal para la playa o paseos", price: "38.00", stock: 18 },
            { name: "Camisa de Lino Manga Corta", description: "Fresca y elegante, en varios colores disponibles", price: "52.00", stock: 22 },
            { name: "Blusa con Lazada", description: "Estilo romántico, con lazo en el cuello, varios estampados", price: "42.00", stock: 16 },
          ],
        },
        {
          name: "Pantalones y Faldas",
          description: "Prendas inferiores para cada ocasión",
          products: [
            { name: "Pantalón Palazzo Estampado", description: "Tela fluida de caída amplia, muy fresco, estampado tropical", price: "68.00", stock: 14 },
            { name: "Falda Midi Flores", description: "Falda a media pierna con estampado de flores silvestres", price: "55.00", stock: 12 },
            { name: "Jean Skinny Tiro Alto", description: "Jean elástico de tiro alto, favorecedor para toda figura", price: "89.00", stock: 20 },
            { name: "Short de Jean con Bordado", description: "Short casual con bordado artesanal en el bolsillo", price: "48.00", stock: 18, isFeatured: true },
          ],
        },
      ],
    });

    // ── 3. Restaurante Sabores de la Selva ────────────────────────────────
    await createStore({
      email: "sabores@laselva.pe",
      password: "Sabores2025!",
      ownerName: "Carlos Alberto Huamán Poma",
      businessName: "Sabores de la Selva",
      businessType: "restaurant",
      documentType: "RUC10",
      documentNumber: "10678901234",
      phone: "951556677",
      whatsapp: "951556677",
      district: "Chanchamayo",
      address: "Jr. Los Incas 89, Chanchamayo",
      description: "Cocina tradicional de la selva central peruana. Usamos ingredientes frescos de la región: paiche, cecina, tacacho, juane y mucho más. ¡Ven a descubrir los sabores únicos de Chanchamayo!",
      primaryColor: "#065f46",
      socialInstagram: "sabores_laselva_chanchamayo",
      categories: [
        {
          name: "Platos de Fondo",
          description: "Nuestros principales a base de productos de la selva",
          products: [
            { name: "Juane de Arroz con Gallina", description: "El plato emblemático de la selva: arroz sazonado con gallina, envuelto en hoja de bijao y cocido al vapor", price: "22.00", stock: 30, isFeatured: true },
            { name: "Tacacho con Cecina", description: "Bolas de plátano verde majado con manteca, acompañadas de cecina de cerdo ahumada y chorizo", price: "20.00", stock: 25, isFeatured: true },
            { name: "Paiche a la Plancha", description: "Filete de paiche fresco del Amazonas a la plancha con ensalada de chonta y arroz", price: "28.00", stock: 15 },
            { name: "Inchicapi de Gallina", description: "Sopa espesa de gallina con maní molido, cilantro y maíz, receta tradicional awajún", price: "18.00", stock: 20 },
            { name: "Patarashca de Pescado", description: "Pescado fresco envuelto en hojas de bijao con ajíes nativos, asado a las brasas", price: "25.00", stock: 18 },
          ],
        },
        {
          name: "Entradas y Sopas",
          description: "Para iniciar bien el almuerzo",
          products: [
            { name: "Ceviche de Paiche", description: "Trozos de paiche en leche de tigre con ají charapita, cebolla morada y cancha", price: "18.00", stock: 20, isFeatured: true },
            { name: "Timbuche de Pescado", description: "Caldo ligero y reconfortante de pescado con plátano verde y hierbas amazónicas", price: "12.00", stock: 25 },
            { name: "Chonta Fresca con Limón", description: "Palmito tierno cortado en rodajas, aliñado con limón, aceite de oliva y hierbas", price: "10.00", stock: 30 },
          ],
        },
        {
          name: "Bebidas y Postres",
          description: "Zumos amazónicos y dulces de la región",
          products: [
            { name: "Chapo de Plátano", description: "Bebida espesa y dulce de plátano maduro, servida fría, tradicional amazónica", price: "7.00", stock: 50, isFeatured: true },
            { name: "Jugo de Camu Camu", description: "El superfruito amazónico, altísimo en vitamina C, sin azúcar añadida", price: "8.00", stock: 40 },
            { name: "Mazamorra de Plátano", description: "Postre cremoso de plátano maduro con leche, canela y clavo de olor", price: "9.00", stock: 30 },
            { name: "Masato de Yuca", description: "Bebida fermentada tradicional de yuca, suave y refrescante", price: "6.00", stock: 35 },
          ],
        },
      ],
    });

    // ── 4. Artesanías Chanchamayo ─────────────────────────────────────────
    await createStore({
      email: "artesanias@chanchamayo.pe",
      password: "Arte2025!",
      ownerName: "María Luz Condori Apaza",
      businessName: "Artesanías Chanchamayo",
      businessType: "fair_booth",
      documentType: "DNI",
      documentNumber: "45678901",
      phone: "943778899",
      whatsapp: "943778899",
      district: "Pichanaqui",
      address: "Feria Artesanal de Pichanaqui, Stand 12",
      description: "Artesanías auténticas hechas a mano por familias amazónicas. Tejidos en telares, cerámica nativa, joyería con semillas y maderas. Apoyamos el comercio justo de las comunidades asháninkas y nomatsiguengas.",
      primaryColor: "#92400e",
      socialInstagram: "artesanias_chanchamayo",
      categories: [
        {
          name: "Tejidos y Textiles",
          description: "Elaborados en telar de cintura por artesanas locales",
          products: [
            { name: "Cushma Asháninka Adulto", description: "Vestimenta tradicional asháninka tejida en algodón nativo, diseños geométricos ancestrales, talla única", price: "150.00", stock: 8, isFeatured: true },
            { name: "Bolso Tejido de Algodón", description: "Tejido a mano con telar de cintura, diseños de flora y fauna amazónica, varios colores", price: "45.00", stock: 20 },
            { name: "Camino de Mesa Tejido", description: "Decoración para el hogar con figuras de animales amazónicos, 40x120cm", price: "35.00", stock: 15 },
            { name: "Porta Laptop Tejido", description: "Bolso funcional y artístico para laptop de hasta 15 pulgadas", price: "60.00", stock: 10 },
          ],
        },
        {
          name: "Joyería Natural",
          description: "Bisutería con semillas, huayruro y maderas nativas",
          products: [
            { name: "Collar de Huayruro y Plata", description: "Semillas rojas de huayruro combinadas con dije de plata 925, amuleto de buena suerte", price: "35.00", stock: 30, isFeatured: true },
            { name: "Pulsera de Semillas Amazónicas", description: "Combinación de semillas de sachavaca, anquilla y palmeras, elástica, talla ajustable", price: "18.00", stock: 50 },
            { name: "Aretes Colgantes de Semillas", description: "Diseño largo con semillas de colores naturales, peso muy ligero", price: "22.00", stock: 35 },
            { name: "Vincha de Plumas y Semillas", description: "Tocado tradicional asháninka con plumas de aves ornamentales criadas, semillas y fibra natural", price: "55.00", stock: 12 },
          ],
        },
        {
          name: "Cerámica y Madera",
          description: "Piezas únicas de alfarería y talla en madera",
          products: [
            { name: "Taza de Cerámica Amazónica", description: "Hecha a mano con arcilla local, diseños pintados de peces y flores amazónicas, 250ml", price: "28.00", stock: 20, isFeatured: true },
            { name: "Figura de Madera Balsa — Jaguar", description: "Tallado a mano en madera balsa ligera, pintado con tintes naturales, 15cm", price: "40.00", stock: 15 },
            { name: "Frutero de Cerámica", description: "Frutero amplio con motivos tribales, resistente y de uso diario, capacidad 3kg", price: "65.00", stock: 8 },
          ],
        },
      ],
    });

    // ── 5. Minimarket Don Pepe ────────────────────────────────────────────
    await createStore({
      email: "minimarket@donpepe.pe",
      password: "DonPepe2025!",
      ownerName: "José Luis Ramírez Cárdenas",
      businessName: "Minimarket Don Pepe",
      businessType: "general_catalog",
      documentType: "RUC10",
      documentNumber: "10789012345",
      phone: "956990011",
      whatsapp: "956990011",
      district: "San Ramón",
      address: "Av. San Ramón 432, frente al mercado central",
      description: "Tu minimarket de confianza en San Ramón. Abarrotes, bebidas, snacks, productos de limpieza e higiene personal. Abierto de lunes a domingo de 6am a 10pm. ¡Delivery al barrio!",
      primaryColor: "#1d4ed8",
      categories: [
        {
          name: "Abarrotes",
          description: "Productos de primera necesidad",
          products: [
            { name: "Arroz Costeño Extra (5 kg)", description: "Arroz blanco de grano largo, bolsa de 5kg — el más vendido de San Ramón", price: "24.50", stock: 150, isFeatured: true },
            { name: "Aceite Primor (1 litro)", description: "Aceite vegetal de girasol 100%, sin colesterol, botella de 1 litro", price: "9.80", stock: 80 },
            { name: "Azúcar Rubia (1 kg)", description: "Azúcar rubia de caña 100% nacional, bolsa de 1kg", price: "4.20", stock: 200 },
            { name: "Leche Gloria Entera (410g)", description: "Leche evaporada entera, lata de 410g. Ideal para cocina y desayuno", price: "4.50", stock: 120 },
            { name: "Fideos Don Vittorio Spaghetti (500g)", description: "Fideo spaghetti semola de trigo, bolsa 500g", price: "3.80", stock: 100 },
          ],
        },
        {
          name: "Bebidas y Snacks",
          description: "Refrescos, snacks y golosinas",
          products: [
            { name: "Inca Kola 1.5 litros", description: "La bebida de sabor nacional, botella descartable de 1.5L, bien fría", price: "6.50", stock: 60, isFeatured: true },
            { name: "Agua San Luis 625ml (pack x6)", description: "Agua mineral sin gas en presentación personal, pack económico de 6 unidades", price: "12.00", stock: 80 },
            { name: "Papitas Lay's Clásicas 38g", description: "Clásico snack de papas fritas en su punto de sal", price: "2.50", stock: 150 },
            { name: "Galletas Oreo x3 Pack", description: "Galletas de chocolate con crema, paquete de 3 unidades", price: "3.00", stock: 100 },
            { name: "Néctar Frugos Durazno 1L", description: "Néctar de durazno sin conservantes artificiales, caja de 1 litro", price: "5.50", stock: 70 },
          ],
        },
        {
          name: "Higiene y Limpieza",
          description: "Todo para tu hogar y cuidado personal",
          products: [
            { name: "Jabón Bolívar Limón (360g)", description: "Jabón en barra multiusos para ropa y limpieza del hogar, aroma limón", price: "3.20", stock: 90, isFeatured: true },
            { name: "Detergente Ariel (500g)", description: "Detergente en polvo con tecnología quitamanchas, bolsa 500g", price: "8.90", stock: 75 },
            { name: "Papel Higiénico Elite Doble Hoja (4 rollos)", description: "Suave y resistente, papel de doble hoja, paquete de 4 rollos", price: "7.50", stock: 120 },
            { name: "Lejía Clorox Original (680ml)", description: "Desinfectante multiusos para ropa blanca y superficies, botella 680ml", price: "5.80", stock: 80 },
          ],
        },
      ],
    });

    logger.info("Seed: all demo stores processed");
  } catch (err) {
    logger.error({ err }, "Seed error — skipping");
  }
}
