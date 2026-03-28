import { db } from "@workspace/db";
import {
  usersTable,
  storesTable,
  licensesTable,
  categoriesTable,
  productsTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword } from "./auth";
import { generateUniqueSlug } from "./slug";
import { logger } from "./logger";

// ─── Helper ───────────────────────────────────────────────────────────────────

function img(seed: string) {
  const s = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `https://picsum.photos/seed/${s}/600/600`;
}

interface SeedProduct {
  name: string;
  description?: string;
  price: string;
  salePrice?: string;
  stock: number;
  isFeatured?: boolean;
  imageSeed?: string; // override for picsum seed
}

interface SeedCategory {
  name: string;
  description?: string;
  products: SeedProduct[];
}

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
  categories: SeedCategory[];
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
      const imageSeed = prod.imageSeed || prod.name;
      await db.insert(productsTable).values({
        id: crypto.randomUUID(),
        storeId,
        categoryId: catId,
        name: prod.name,
        description: prod.description,
        price: prod.price,
        salePrice: prod.salePrice ?? null,
        stock: prod.stock,
        isFeatured: prod.isFeatured ?? false,
        imageUrl: img(imageSeed),
        isActive: true,
      });
    }
  }

  logger.info({ slug, email: data.email }, "Seed: demo store created");
}

// ─── Enrich existing demo stores with images + new products ──────────────────

async function enrichDemoStores() {
  type ExtraMap = Record<string, SeedProduct[]>;
  const storeExtras: Array<{ email: string; extras: ExtraMap }> = [
    {
      email: "panaderia@eltrigal.pe",
      extras: {
        "Panes del Día": [
          { name: "Pan Francés Baguette", description: "Baguette clásica de corteza dorada y miga aireada, 300g", price: "2.80", stock: 70, imageSeed: "french-baguette" },
          { name: "Pan de Anís con Pasas", description: "Pan dulce perfumado con anís y pasas rubias, esponjoso", price: "3.20", stock: 50, imageSeed: "anise-bread" },
          { name: "Pan de Ajo Artesanal", description: "Pan con mantequilla de ajo, perejil fresco y queso parmesano", price: "3.50", stock: 40, imageSeed: "garlic-bread" },
          { name: "Pan de Camote Morado", description: "Suave pan dulce teñido naturalmente con camote morado de la sierra", price: "3.00", stock: 60, isFeatured: true, imageSeed: "purple-sweet-potato-bread" },
          { name: "Pan Chuta de San Ramón", description: "Pan redondo y aplastado de maíz blanco, receta tradicional de la zona", price: "1.50", stock: 120, imageSeed: "corn-bread-peru" },
        ],
        "Tortas y Queques": [
          { name: "Torta de Vainilla con Frutas", description: "Bizcocho suave con crema chantilly y frutas de temporada de la selva", price: "48.00", stock: 8, salePrice: "40.00", imageSeed: "vanilla-fruit-cake" },
          { name: "Muffins de Chocolate (6 un.)", description: "Muffins húmedos con chispas de chocolate y cobertura de ganache", price: "20.00", stock: 25, imageSeed: "chocolate-muffins" },
        ],
        "Dulces y Bocaditos": [
          { name: "Galletas de Avena y Miel (12 un.)", description: "Galletas crujientes con copos de avena, miel de abeja y canela", price: "10.00", stock: 40, salePrice: "8.50", imageSeed: "oat-honey-cookies" },
          { name: "Tejas de Limón (4 un.)", description: "Caramelo de coco relleno de manjar de limón, bañado en chocolate blanco", price: "12.00", stock: 30, isFeatured: true, imageSeed: "lemon-chocolate-candy" },
          { name: "Rosquitas de Maíz Morado", description: "Pequeñas rosquillas horneadas con harina de maíz morado y anís", price: "7.00", stock: 60, imageSeed: "purple-corn-donuts" },
          { name: "Suspiro Limeño (porción)", description: "Dulce crema de manjar blanco con merengue de oporto, receta clásica peruana", price: "8.00", stock: 20, imageSeed: "suspiro-limeno-dessert" },
        ],
      },
    },
    {
      email: "boutique@selvamoda.pe",
      extras: {
        "Vestidos": [
          { name: "Kimono Floral Largo", description: "Kimono playero en tela semitransparente con flores tropicales, talla única", price: "95.00", stock: 10, salePrice: "79.00", imageSeed: "floral-kimono-dress" },
          { name: "Vestido Boho Estampado", description: "Estilo bohemio con mangas abullonadas, tela ligera estampado étnico", price: "88.00", stock: 12, isFeatured: true, imageSeed: "boho-dress-women" },
          { name: "Vestido de Tirantes Casual", description: "Vestido sin mangas en tela algodón, fresco y cómodo para el calor", price: "58.00", stock: 18, imageSeed: "casual-summer-dress" },
        ],
        "Blusas y Tops": [
          { name: "Blusa Estampada Manga Larga", description: "Estampado floral, manga larga con puño, tela chiffon suave", price: "49.00", stock: 16, imageSeed: "floral-long-sleeve-blouse" },
          { name: "Top Deportivo Dry-Fit", description: "Top de entrenamiento en tela dry-fit, varios colores, tallas S-XL", price: "35.00", stock: 25, salePrice: "28.00", imageSeed: "women-sports-top" },
          { name: "Cardigan de Algodón", description: "Cardigan liviano abierto en frente, ideal para noches frescas, varios colores", price: "72.00", stock: 14, imageSeed: "women-cotton-cardigan" },
        ],
        "Pantalones y Faldas": [
          { name: "Pantalón Cargo Mujer", description: "Pantalón funcional con bolsillos laterales, tela gabardina, tiro medio", price: "79.00", stock: 18, imageSeed: "women-cargo-pants" },
          { name: "Falda Circular Plisada", description: "Falda midi plisada en tela georgette, muy elegante y ligera", price: "62.00", stock: 12, isFeatured: true, imageSeed: "pleated-midi-skirt" },
          { name: "Leggings Estampados", description: "Leggins cómodos con estampado tropical, tela elástica 4 vías, tallas S-XXL", price: "42.00", stock: 30, salePrice: "35.00", imageSeed: "tropical-print-leggings" },
          { name: "Bermuda de Lino", description: "Bermuda en lino 100%, fresca para el verano, tiro alto, varios colores", price: "55.00", stock: 20, imageSeed: "women-linen-shorts" },
        ],
      },
    },
    {
      email: "sabores@laselva.pe",
      extras: {
        "Platos de Fondo": [
          { name: "Pescado Frito con Tacacho", description: "Doncella o corvina frita acompañada de tacacho y ensalada criolla", price: "24.00", stock: 20, isFeatured: true, imageSeed: "fried-fish-tacacho" },
          { name: "Cecina con Chorizo Especial", description: "Tabla de cecina de res ahumada y chorizo de cerdo con yuca frita y salsa de ají charapita", price: "22.00", stock: 25, imageSeed: "cecina-chorizo-peru" },
          { name: "Chaufa Amazónico", description: "Arroz chaufa con cecina, chorizo, huevo y cebolla china al wok estilo selva", price: "18.00", stock: 30, salePrice: "15.00", imageSeed: "peruvian-arroz-chaufa" },
        ],
        "Entradas y Sopas": [
          { name: "Caldo de Gallina Criolla", description: "Caldo reconfortante de gallina criolla con fideos, papa y hierbabuena", price: "14.00", stock: 30, imageSeed: "chicken-soup-peruvian" },
          { name: "Ensalada de Chonta Fresca", description: "Palmito tierno laminado con palta, tomate cherry, aceitunas y limón", price: "12.00", stock: 20, imageSeed: "heart-of-palm-salad" },
          { name: "Tamal de Maíz con Chicharrón", description: "Tamal amazónico de masa de maíz relleno de chicharrón y aceituna, servido en hoja de bijao", price: "8.00", stock: 40, isFeatured: true, imageSeed: "peruvian-tamal-green-leaf" },
        ],
        "Bebidas y Postres": [
          { name: "Refresco de Cocona", description: "Fruta amazónica de sabor único, rica en antioxidantes, servida fría con poca azúcar", price: "6.00", stock: 50, salePrice: "5.00", imageSeed: "cocona-juice-fruit" },
          { name: "Arroz con Leche Amazónico", description: "Arroz cremoso con leche condensada, canela, clavo y una pizca de vainilla de la selva", price: "8.00", stock: 35, imageSeed: "arroz-con-leche-dessert" },
          { name: "Mazamorra de Aguaje", description: "Postre cremoso elaborado con aguaje, el palmero amazónico, naturalmente dulce y nutritivo", price: "9.00", stock: 25, imageSeed: "aguaje-fruit-dessert" },
        ],
      },
    },
    {
      email: "artesanias@chanchamayo.pe",
      extras: {
        "Tejidos y Textiles": [
          { name: "Mochila Tejida Grande", description: "Mochila en algodón nativo tejida a mano, capacidad 15L, varios diseños amazónicos", price: "80.00", stock: 12, isFeatured: true, imageSeed: "woven-backpack-craft" },
          { name: "Tapiz Mural Amazónico", description: "Tejido decorativo de pared con motivos de la flora y fauna de Chanchamayo, 60x90cm", price: "120.00", stock: 6, imageSeed: "woven-wall-tapestry-ethnic" },
          { name: "Llavero Tejido Asháninka", description: "Mini tejido de telar en miniatura con diseños tradicionales, varios modelos", price: "12.00", stock: 50, salePrice: "10.00", imageSeed: "woven-keychain-craft" },
          { name: "Monedero Tejido de Algodón", description: "Monedero pequeño con cierre, tejido en telar de cintura, con diseños étnicos coloridos", price: "20.00", stock: 35, imageSeed: "woven-coin-purse-colorful" },
        ],
        "Joyería Natural": [
          { name: "Pulsera de Macramé con Semillas", description: "Macramé en hilo de algodón con semillas de huayruro y cuentas de madera, ajustable", price: "22.00", stock: 40, imageSeed: "macrame-seed-bracelet" },
          { name: "Tobillera de Semillas Amazónicas", description: "Tobillera liviana con semillas de colores naturales, elástica, talla única", price: "15.00", stock: 45, salePrice: "12.00", imageSeed: "seed-ankle-bracelet" },
          { name: "Collar Étnico de Conchas y Semillas", description: "Collar largo con conchas de río, semillas y huayruro, pieza única artesanal", price: "45.00", stock: 18, isFeatured: true, imageSeed: "ethnic-shell-seed-necklace" },
        ],
        "Cerámica y Madera": [
          { name: "Figurita de Madera Tucán", description: "Tallado en madera balsa con pintura natural, representa al tucán andino, 12cm", price: "35.00", stock: 20, imageSeed: "wooden-toucan-carved" },
          { name: "Cuenco de Arcilla Nativa", description: "Cuenco para servir, pintado con tintes naturales, resistente al uso diario, Ø18cm", price: "30.00", stock: 15, imageSeed: "clay-bowl-handmade" },
          { name: "Florero de Cerámica Amazónica", description: "Florero alto pintado con motivos de peces y flores amazónicas, altura 25cm", price: "55.00", stock: 8, imageSeed: "ceramic-vase-ethnic-painted" },
        ],
      },
    },
    {
      email: "minimarket@donpepe.pe",
      extras: {
        "Abarrotes": [
          { name: "Sal de Mesa Emsal (1 kg)", description: "Sal refinada yodada, bolsa de 1 kg, ideal para cocina y conservas", price: "1.50", stock: 200, imageSeed: "table-salt-package" },
          { name: "Aceite de Oliva Extra Virgen (250ml)", description: "Aceite de oliva de primera prensa en frío, botella de vidrio 250ml", price: "18.50", stock: 30, salePrice: "15.00", imageSeed: "olive-oil-bottle" },
          { name: "Atún Florida en Agua (170g)", description: "Atún en trozos en agua con sal, lata de 170g — precio justo todos los días", price: "5.80", stock: 100, imageSeed: "tuna-can-fish" },
          { name: "Café Altomayo Clásico (250g)", description: "Café soluble peruano de altura, granulado, bolsa de 250g", price: "14.90", stock: 60, isFeatured: true, imageSeed: "peruvian-coffee-bag" },
        ],
        "Bebidas y Snacks": [
          { name: "Chocolate Sublime Relleno (38g)", description: "Tableta de chocolate con leche y maní relleno, clásico peruano de siempre", price: "2.00", stock: 200, imageSeed: "chocolate-bar-peruvian" },
          { name: "Gaseosa Pepsi 1.5L", description: "Bebida carbonatada cola en presentación familiar 1.5 litros, bien helada", price: "5.90", stock: 80, salePrice: "5.00", imageSeed: "pepsi-soda-bottle" },
          { name: "Yogurt Gloria Fresa (500g)", description: "Yogurt bebible sabor fresa, enriquecido con vitaminas, pomo 500g", price: "7.50", stock: 50, imageSeed: "strawberry-yogurt-bottle" },
        ],
        "Higiene y Limpieza": [
          { name: "Shampoo H&S Anticaspa (200ml)", description: "Control de caspa desde la primera lavada, fórmula con zinc, botella 200ml", price: "12.90", stock: 60, imageSeed: "shampoo-bottle-white" },
          { name: "Desodorante Sure Roll-On (50ml)", description: "Antitranspirante en roll-on, protección 48 horas, aroma suave", price: "9.50", stock: 70, salePrice: "8.00", imageSeed: "deodorant-roll-on" },
        ],
      },
    },
  ];

  for (const { email, extras } of storeExtras) {
    const [store] = await db
      .select({ id: storesTable.id })
      .from(storesTable)
      .where(eq(storesTable.email, email))
      .limit(1);
    if (!store) continue;

    // Update existing products with imageUrl if missing
    const existingProducts = await db
      .select({ id: productsTable.id, name: productsTable.name, imageUrl: productsTable.imageUrl })
      .from(productsTable)
      .where(eq(productsTable.storeId, store.id));

    for (const prod of existingProducts) {
      if (!prod.imageUrl) {
        await db
          .update(productsTable)
          .set({ imageUrl: img(prod.name) })
          .where(eq(productsTable.id, prod.id));
      }
    }

    // Insert new extra products per category
    const existingCategories = await db
      .select({ id: categoriesTable.id, name: categoriesTable.name })
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, store.id));

    const existingProductNames = new Set(existingProducts.map((p) => p.name));

    for (const [catName, products] of Object.entries(extras)) {
      const cat = existingCategories.find((c) => c.name === catName);
      if (!cat) continue;
      for (const prod of products) {
        if (existingProductNames.has(prod.name)) continue;
        const imageSeed = prod.imageSeed || prod.name;
        await db.insert(productsTable).values({
          id: crypto.randomUUID(),
          storeId: store.id,
          categoryId: cat.id,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          salePrice: prod.salePrice ?? null,
          stock: prod.stock,
          isFeatured: prod.isFeatured ?? false,
          imageUrl: img(imageSeed),
          isActive: true,
        });
      }
    }
  }
}

// ─── Default categories per business type ────────────────────────────────────

const DEFAULT_CATEGORIES: Record<string, { name: string; description?: string }[]> = {
  restaurant: [
    { name: "Entradas", description: "Aperitivos y entradas de la carta" },
    { name: "Sopas y Caldos", description: "Sopas calientes y caldos reconfortantes" },
    { name: "Platos de Fondo", description: "Platos principales de la carta" },
    { name: "Arroz y Pastas", description: "Arroces, tallarines y pasta" },
    { name: "Pollos y Aves", description: "Platos a base de pollo y aves" },
    { name: "Carnes y Parrilla", description: "Res, cerdo y parrilladas" },
    { name: "Pescados y Mariscos", description: "Ceviches, pescados y mariscos frescos" },
    { name: "Opciones Vegetarianas", description: "Platos sin carne" },
    { name: "Desayunos", description: "Menú matutino y desayunos especiales" },
    { name: "Almuerzos", description: "Menú del almuerzo" },
    { name: "Cenas", description: "Platos especiales para la cena" },
    { name: "Guarniciones", description: "Acompañamientos y extras" },
    { name: "Postres", description: "Dulces y postres caseros" },
    { name: "Bebidas Calientes", description: "Café, té e infusiones" },
    { name: "Jugos y Refrescos", description: "Jugos naturales y refrescos" },
    { name: "Bebidas Frías", description: "Gaseosas, aguas y bebidas frías" },
    { name: "Bebidas Alcohólicas", description: "Cervezas, vinos y cocktails" },
    { name: "Combos y Menús", description: "Combos especiales y menús del día" },
    { name: "Snacks y Bocaditos", description: "Piqueos y aperitivos rápidos" },
    { name: "Pedidos Especiales", description: "Pedidos para eventos y grupos" },
  ],
  clothing: [
    { name: "Polos y Camisetas", description: "Polos casuales, sport y formales" },
    { name: "Camisas y Blusas", description: "Camisas para caballero y blusas para dama" },
    { name: "Pantalones", description: "Pantalones de vestir, jean y sport" },
    { name: "Shorts y Bermudas", description: "Shorts casuales y bermudas" },
    { name: "Vestidos y Enterizos", description: "Vestidos casuales y para ocasiones" },
    { name: "Faldas", description: "Faldas cortas, largas y midi" },
    { name: "Casacas y Chaquetas", description: "Casacas de cuero, tela y deportivas" },
    { name: "Abrigos y Parkas", description: "Ropa de abrigo para temporada fría" },
    { name: "Ropa Interior", description: "Ropa interior para dama y caballero" },
    { name: "Medias y Calcetines", description: "Medias largas, cortas y calcetines" },
    { name: "Calzado", description: "Zapatos, zapatillas y sandalias" },
    { name: "Accesorios", description: "Joyería, relojes y accesorios de moda" },
    { name: "Gorras y Sombreros", description: "Gorras, sombreros y boinas" },
    { name: "Cinturones y Carteras", description: "Cinturones, carteras y billeteras" },
    { name: "Ropa Deportiva", description: "Ropa para el deporte y gimnasio" },
    { name: "Ropa de Niños", description: "Ropa para niños y niñas" },
    { name: "Ropa de Bebés", description: "Ropa y accesorios para bebés" },
    { name: "Uniformes y Trabajo", description: "Uniformes escolares y de trabajo" },
    { name: "Trajes de Baño", description: "Ropa para playa y piscina" },
    { name: "Liquidación y Ofertas", description: "Prendas con descuento y liquidación" },
  ],
  bakery: [
    { name: "Panes Artesanales", description: "Panes elaborados a mano con recetas tradicionales" },
    { name: "Panes de Molde", description: "Pan de molde blanco, integral y especiales" },
    { name: "Pan Integral y Light", description: "Opciones saludables con granos integrales" },
    { name: "Panes para Hamburguesas", description: "Buns y panes especiales para hamburguesas" },
    { name: "Bollería y Croissants", description: "Croissants, medialunas y bollería fina" },
    { name: "Empanadas y Salados", description: "Empanadas horneadas y bocaditos salados" },
    { name: "Pasteles y Tortas", description: "Tortas para cumpleaños y ocasiones" },
    { name: "Cupcakes y Muffins", description: "Cupcakes decorados y muffins variados" },
    { name: "Alfajores y Galletas", description: "Alfajores, galletas y bocaditos dulces" },
    { name: "Tartas y Cheesecakes", description: "Tartas de frutas y cheesecakes cremosos" },
    { name: "Roscas y Brioches", description: "Roscas dulces, brioches y panes brioche" },
    { name: "Waffles y Crepes", description: "Waffles y crepes dulces y salados" },
    { name: "Postres Fríos", description: "Mousse, flan, panna cotta y gelatinas" },
    { name: "Donuts y Berlines", description: "Donuts glasados y berlines rellenos" },
    { name: "Panetones y Budines", description: "Panetón navideño, budines y bizcochos" },
    { name: "Bebidas Calientes", description: "Café, capuchino, chocolate caliente y té" },
    { name: "Jugos y Limonadas", description: "Jugos naturales y limonadas frescas" },
    { name: "Desayunos y Combos", description: "Combos de desayuno con pan y bebida" },
    { name: "Pedidos Especiales", description: "Tortas y pasteles por encargo" },
    { name: "Ofertas del Día", description: "Productos del día con precio especial" },
  ],
  fair_booth: [
    { name: "Frutas Frescas", description: "Frutas de temporada y del día" },
    { name: "Verduras y Hortalizas", description: "Verduras frescas y hortalizas de campo" },
    { name: "Tubérculos y Raíces", description: "Papas, yuca, camote y tubérculos" },
    { name: "Frutas Tropicales", description: "Mangos, papayas, maracuyá y tropicales" },
    { name: "Frutas de Selva", description: "Camu camu, aguaje, cocona y más" },
    { name: "Plátanos y Bananas", description: "Plátano de freír, bellaco y de seda" },
    { name: "Ajíes y Picantes", description: "Ajíes frescos, secos y pastas de ají" },
    { name: "Cebollas y Ajos", description: "Cebollas, ajos y puerros" },
    { name: "Limones y Cítricos", description: "Limones, naranjas y mandarinas" },
    { name: "Maíz y Cereales", description: "Maíz choclo, maíz morado y cereales" },
    { name: "Granos y Legumbres", description: "Frijoles, lentejas, arvejas y garbanzos" },
    { name: "Hierbas Aromáticas", description: "Culantro, hierbabuena, albahaca y más" },
    { name: "Verduras de Hoja", description: "Espinaca, lechuga, col y acelga" },
    { name: "Tomates y Pimientos", description: "Tomates, pimientos y rocoto" },
    { name: "Productos Orgánicos", description: "Frutas y verduras sin pesticidas" },
    { name: "Huevos y Derivados", description: "Huevos de campo y criollos" },
    { name: "Productos Procesados", description: "Mermeladas, encurtidos y preparados" },
    { name: "Jugos y Pulpas", description: "Pulpas de frutas y jugos preparados" },
    { name: "Cosechas del Día", description: "Productos cosechados frescos del día" },
    { name: "Canastas y Packs", description: "Canastas armadas de frutas y verduras" },
  ],
  general_catalog: [
    { name: "Electrónica", description: "Dispositivos electrónicos y gadgets" },
    { name: "Hogar y Decoración", description: "Artículos para el hogar y decoración" },
    { name: "Cocina y Mesa", description: "Utensilios y artículos de cocina" },
    { name: "Limpieza del Hogar", description: "Productos de limpieza y desinfección" },
    { name: "Alimentos y Abarrotes", description: "Productos de despensa y abarrotes" },
    { name: "Bebidas", description: "Bebidas, jugos y refrescos" },
    { name: "Snacks y Golosinas", description: "Snacks, galletas y dulces" },
    { name: "Higiene Personal", description: "Cuidado personal e higiene" },
    { name: "Salud y Bienestar", description: "Vitaminas, suplementos y salud" },
    { name: "Juguetes y Juegos", description: "Juguetes para niños y juegos" },
    { name: "Papelería y Oficina", description: "Útiles escolares y de oficina" },
    { name: "Herramientas y Ferretería", description: "Herramientas y artículos de ferretería" },
    { name: "Jardín y Plantas", description: "Plantas, macetas y artículos de jardín" },
    { name: "Mascotas", description: "Alimentos y accesorios para mascotas" },
    { name: "Deporte y Fitness", description: "Artículos deportivos y de ejercicio" },
    { name: "Moda y Accesorios", description: "Ropa, calzado y accesorios" },
    { name: "Arte y Manualidades", description: "Materiales de arte y manualidades" },
    { name: "Libros y Educación", description: "Libros, revistas y material educativo" },
    { name: "Tecnología", description: "Computadoras, celulares y accesorios" },
    { name: "Ofertas Especiales", description: "Productos con descuento y promociones" },
  ],
};

export async function seedDefaultCategories(storeId: string, businessType: string): Promise<void> {
  try {
    const existing = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.storeId, storeId))
      .limit(1);

    if (existing.length > 0) return; // Already has categories

    const cats = DEFAULT_CATEGORIES[businessType] ?? DEFAULT_CATEGORIES.general_catalog;
    for (let i = 0; i < cats.length; i++) {
      await db.insert(categoriesTable).values({
        id: crypto.randomUUID(),
        storeId,
        name: cats[i].name,
        description: cats[i].description,
        sortOrder: i,
      });
    }
    logger.info({ storeId, businessType, count: cats.length }, "Seed: default categories created");
  } catch (err) {
    logger.error({ err }, "Seed: failed to create default categories");
  }
}

// ─── Seed exports ─────────────────────────────────────────────────────────────

/**
 * seedProduction — only creates the superadmin user.
 * Called automatically on startup in production.
 */
export async function seedProduction() {
  return _seedCore(true);
}

/**
 * seedDevelopment — creates superadmin + demo stores (when SEED_DEMO_STORES=true).
 * Called automatically on startup in development/staging.
 */
export async function seedDevelopment() {
  return _seedCore(false);
}

/**
 * seedDefaultData — legacy export; dispatches by NODE_ENV.
 * @deprecated Use seedProduction / seedDevelopment directly.
 */
export async function seedDefaultData() {
  if (process.env.NODE_ENV === "production") {
    return seedProduction();
  }
  return seedDevelopment();
}

async function _seedCore(isProduction: boolean) {
  try {
    // ── Superadmin ─────────────────────────────────────────────────────────
    const adminEmail = process.env.SUPERADMIN_EMAIL ?? "admin@camila.pe";
    const adminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!adminPassword) {
      if (isProduction) {
        logger.error("Seed: SUPERADMIN_PASSWORD env var is required in production — skipping superadmin seed");
      } else {
        logger.warn("Seed: SUPERADMIN_PASSWORD not set — skipping superadmin seed (set it in .env)");
      }
    } else {
      const [existingAdmin] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, adminEmail))
        .limit(1);

      if (!existingAdmin) {
        await db.insert(usersTable).values({
          id: crypto.randomUUID(),
          email: adminEmail,
          passwordHash: hashPassword(adminPassword),
          name: "Administrador Camila",
          role: "superadmin",
          isActive: true,
        });
        logger.info({ email: adminEmail }, "Seed: superadmin created");
      }
    }

    // ── Demo stores — development/staging only ────────────────────────────
    if (isProduction) {
      logger.info("Seed: skipping demo stores in production");
      return;
    }

    if (process.env.SEED_DEMO_STORES !== "true") {
      logger.info("Seed: demo stores skipped (set SEED_DEMO_STORES=true to enable)");
      return;
    }

    // ── Test store ─────────────────────────────────────────────────────────
    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo1234!";
    await createStore({
      email: "tienda@test.pe",
      password: demoPassword,
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
            { name: "Camisa Azul Test", price: "35.00", stock: 20, isFeatured: true, imageSeed: "blue-shirt-men" },
            { name: "Pantalón Negro Test", price: "55.00", stock: 15, imageSeed: "black-pants-men" },
          ],
        },
        {
          name: "Ropa Mujer",
          products: [
            { name: "Blusa Floral", price: "38.00", stock: 12, imageSeed: "floral-blouse-women" },
            { name: "Falda Estampada", price: "42.00", stock: 8, imageSeed: "patterned-skirt-women" },
          ],
        },
      ],
    });

    // ── 1. Panadería El Trigal ─────────────────────────────────────────────
    await createStore({
      email: "panaderia@eltrigal.pe",
      password: demoPassword,
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
            { name: "Pan de Yema (6 unidades)", description: "Suave y esponjoso, hecho con yemas de huevo fresco", price: "3.50", stock: 100, isFeatured: true, imageSeed: "egg-yolk-rolls-bread" },
            { name: "Pan Integral de Kiwicha", description: "Pan nutritivo con kiwicha andina, ideal para el desayuno", price: "4.00", stock: 80, imageSeed: "whole-grain-kiwicha-bread" },
            { name: "Pan Ciabatta Artesanal", description: "Pan italiano de corteza crujiente y miga aireada", price: "2.50", stock: 60, imageSeed: "ciabatta-artisan-bread" },
            { name: "Pan de Molde Casero (500g)", description: "Pan de molde suave, perfecto para sándwiches", price: "6.50", stock: 50, imageSeed: "homemade-sandwich-bread" },
            { name: "Trenza de Mantequilla", description: "Pan dulce trenzado con mantequilla y azúcar", price: "3.00", stock: 40, imageSeed: "butter-braided-bread-sweet" },
          ],
        },
        {
          name: "Tortas y Queques",
          description: "Tortas para cumpleaños, bodas y toda ocasión",
          products: [
            { name: "Torta de Chocolate (1 kg)", description: "Húmeda y esponjosa, con cobertura de ganache y frutos rojos", price: "45.00", stock: 10, isFeatured: true, imageSeed: "chocolate-cake-ganache" },
            { name: "Queque de Naranja", description: "Queque casero con ralladura de naranja y glasé cítrico", price: "18.00", stock: 20, imageSeed: "orange-pound-cake" },
            { name: "Torta Tres Leches", description: "El clásico peruano: bizcocho empapado en tres tipos de leche", price: "55.00", stock: 8, imageSeed: "tres-leches-cake-cream" },
            { name: "Cupcakes de Vainilla (6 unidades)", description: "Mini tortas decoradas con buttercream de vainilla", price: "22.00", stock: 30, imageSeed: "vanilla-cupcakes-frosting" },
          ],
        },
        {
          name: "Dulces y Bocaditos",
          description: "Para el lonche o merienda",
          products: [
            { name: "Alfajores de Maicena (4 unidades)", description: "Rellenos de manjar blanco y bañados en azúcar glass", price: "8.00", stock: 50, isFeatured: true, imageSeed: "alfajores-manjar-sugar" },
            { name: "Empanaditas de Carne (6 unidades)", description: "Masa hojaldrada rellena de carne sazonada con ají", price: "12.00", stock: 40, imageSeed: "meat-empanadas-baked" },
            { name: "Pionono de Manjar", description: "Bizcocho enrollado relleno de manjar blanco casero", price: "15.00", stock: 25, imageSeed: "swiss-roll-cream-cake" },
          ],
        },
      ],
    });

    // ── 2. Boutique Selva Moda ─────────────────────────────────────────────
    await createStore({
      email: "boutique@selvamoda.pe",
      password: demoPassword,
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
            { name: "Vestido Floral Tropical", description: "Estampado de flores silvestres, tela fresca tipo lino, manga sisa", price: "75.00", stock: 15, isFeatured: true, imageSeed: "tropical-floral-dress" },
            { name: "Vestido Casual Midi", description: "Vestido a media pierna en tela jersey, muy cómodo para el calor", price: "65.00", stock: 12, imageSeed: "casual-midi-dress-women" },
            { name: "Vestido Playero con Bordado", description: "Bordado artesanal en el dobladillo, perfecto para paseos", price: "85.00", stock: 10, imageSeed: "embroidered-beach-dress" },
            { name: "Vestido de Noche Elegante", description: "Tela satinada con escote en V, ideal para eventos", price: "120.00", stock: 6, salePrice: "99.00", imageSeed: "elegant-evening-dress-satin" },
          ],
        },
        {
          name: "Blusas y Tops",
          description: "Prendas superiores ligeras y modernas",
          products: [
            { name: "Blusa Off-Shoulder Floral", description: "Blusa con hombros descubiertos, estampado de flores, tela suave", price: "45.00", stock: 20, isFeatured: true, imageSeed: "off-shoulder-floral-blouse" },
            { name: "Top Tejido Crochet", description: "Tejido a mano en hilo de algodón, ideal para la playa o paseos", price: "38.00", stock: 18, imageSeed: "crochet-knit-top-women" },
            { name: "Camisa de Lino Manga Corta", description: "Fresca y elegante, en varios colores disponibles", price: "52.00", stock: 22, imageSeed: "linen-short-sleeve-shirt" },
            { name: "Blusa con Lazada", description: "Estilo romántico, con lazo en el cuello, varios estampados", price: "42.00", stock: 16, imageSeed: "tie-neck-blouse-romantic" },
          ],
        },
        {
          name: "Pantalones y Faldas",
          description: "Prendas inferiores para cada ocasión",
          products: [
            { name: "Pantalón Palazzo Estampado", description: "Tela fluida de caída amplia, muy fresco, estampado tropical", price: "68.00", stock: 14, imageSeed: "palazzo-pants-wide-leg" },
            { name: "Falda Midi Flores", description: "Falda a media pierna con estampado de flores silvestres", price: "55.00", stock: 12, imageSeed: "floral-midi-skirt-women" },
            { name: "Jean Skinny Tiro Alto", description: "Jean elástico de tiro alto, favorecedor para toda figura", price: "89.00", stock: 20, imageSeed: "high-waist-skinny-jeans" },
            { name: "Short de Jean con Bordado", description: "Short casual con bordado artesanal en el bolsillo", price: "48.00", stock: 18, isFeatured: true, imageSeed: "denim-shorts-embroidered" },
          ],
        },
      ],
    });

    // ── 3. Restaurante Sabores de la Selva ────────────────────────────────
    await createStore({
      email: "sabores@laselva.pe",
      password: demoPassword,
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
            { name: "Juane de Arroz con Gallina", description: "El plato emblemático de la selva: arroz sazonado con gallina, envuelto en hoja de bijao y cocido al vapor", price: "22.00", stock: 30, isFeatured: true, imageSeed: "juane-arroz-gallina-bijao" },
            { name: "Tacacho con Cecina", description: "Bolas de plátano verde majado con manteca, acompañadas de cecina de cerdo ahumada y chorizo", price: "20.00", stock: 25, isFeatured: true, imageSeed: "tacacho-cecina-peruvian" },
            { name: "Paiche a la Plancha", description: "Filete de paiche fresco del Amazonas a la plancha con ensalada de chonta y arroz", price: "28.00", stock: 15, imageSeed: "grilled-fish-fillet-rice" },
            { name: "Inchicapi de Gallina", description: "Sopa espesa de gallina con maní molido, cilantro y maíz, receta tradicional awajún", price: "18.00", stock: 20, imageSeed: "chicken-peanut-soup-amazon" },
            { name: "Patarashca de Pescado", description: "Pescado fresco envuelto en hojas de bijao con ajíes nativos, asado a las brasas", price: "25.00", stock: 18, imageSeed: "banana-leaf-fish-grilled" },
          ],
        },
        {
          name: "Entradas y Sopas",
          description: "Para iniciar bien el almuerzo",
          products: [
            { name: "Ceviche de Paiche", description: "Trozos de paiche en leche de tigre con ají charapita, cebolla morada y cancha", price: "18.00", stock: 20, isFeatured: true, imageSeed: "ceviche-fish-lime-peru" },
            { name: "Timbuche de Pescado", description: "Caldo ligero y reconfortante de pescado con plátano verde y hierbas amazónicas", price: "12.00", stock: 25, imageSeed: "fish-soup-broth-amazon" },
            { name: "Chonta Fresca con Limón", description: "Palmito tierno cortado en rodajas, aliñado con limón, aceite de oliva y hierbas", price: "10.00", stock: 30, imageSeed: "heart-of-palm-salad-lime" },
          ],
        },
        {
          name: "Bebidas y Postres",
          description: "Zumos amazónicos y dulces de la región",
          products: [
            { name: "Chapo de Plátano", description: "Bebida espesa y dulce de plátano maduro, servida fría, tradicional amazónica", price: "7.00", stock: 50, isFeatured: true, imageSeed: "banana-smoothie-thick-cold" },
            { name: "Jugo de Camu Camu", description: "El superfruito amazónico, altísimo en vitamina C, sin azúcar añadida", price: "8.00", stock: 40, imageSeed: "camu-camu-fruit-juice" },
            { name: "Mazamorra de Plátano", description: "Postre cremoso de plátano maduro con leche, canela y clavo de olor", price: "9.00", stock: 30, imageSeed: "banana-pudding-dessert" },
            { name: "Masato de Yuca", description: "Bebida fermentada tradicional de yuca, suave y refrescante", price: "6.00", stock: 35, imageSeed: "fermented-yuca-drink-cup" },
          ],
        },
      ],
    });

    // ── 4. Artesanías Chanchamayo ─────────────────────────────────────────
    await createStore({
      email: "artesanias@chanchamayo.pe",
      password: demoPassword,
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
            { name: "Cushma Asháninka Adulto", description: "Vestimenta tradicional asháninka tejida en algodón nativo, diseños geométricos ancestrales, talla única", price: "150.00", stock: 8, isFeatured: true, imageSeed: "traditional-woven-garment-tribal" },
            { name: "Bolso Tejido de Algodón", description: "Tejido a mano con telar de cintura, diseños de flora y fauna amazónica, varios colores", price: "45.00", stock: 20, imageSeed: "handwoven-cotton-bag-colorful" },
            { name: "Camino de Mesa Tejido", description: "Decoración para el hogar con figuras de animales amazónicos, 40x120cm", price: "35.00", stock: 15, imageSeed: "woven-table-runner-ethnic" },
            { name: "Porta Laptop Tejido", description: "Bolso funcional y artístico para laptop de hasta 15 pulgadas", price: "60.00", stock: 10, imageSeed: "woven-laptop-bag-handmade" },
          ],
        },
        {
          name: "Joyería Natural",
          description: "Bisutería con semillas, huayruro y maderas nativas",
          products: [
            { name: "Collar de Huayruro y Plata", description: "Semillas rojas de huayruro combinadas con dije de plata 925, amuleto de buena suerte", price: "35.00", stock: 30, isFeatured: true, imageSeed: "huayruro-seed-silver-necklace" },
            { name: "Pulsera de Semillas Amazónicas", description: "Combinación de semillas de sachavaca, anquilla y palmeras, elástica, talla ajustable", price: "18.00", stock: 50, imageSeed: "colorful-seed-bracelet" },
            { name: "Aretes Colgantes de Semillas", description: "Diseño largo con semillas de colores naturales, peso muy ligero", price: "22.00", stock: 35, imageSeed: "dangling-seed-earrings" },
            { name: "Vincha de Plumas y Semillas", description: "Tocado tradicional asháninka con plumas de aves ornamentales criadas, semillas y fibra natural", price: "55.00", stock: 12, imageSeed: "feather-seed-headband-tribal" },
          ],
        },
        {
          name: "Cerámica y Madera",
          description: "Piezas únicas de alfarería y talla en madera",
          products: [
            { name: "Taza de Cerámica Amazónica", description: "Hecha a mano con arcilla local, diseños pintados de peces y flores amazónicas, 250ml", price: "28.00", stock: 20, isFeatured: true, imageSeed: "handmade-ceramic-mug-painted" },
            { name: "Figura de Madera Balsa — Jaguar", description: "Tallado a mano en madera balsa ligera, pintado con tintes naturales, 15cm", price: "40.00", stock: 15, imageSeed: "carved-balsa-wood-jaguar" },
            { name: "Frutero de Cerámica", description: "Frutero amplio con motivos tribales, resistente y de uso diario, capacidad 3kg", price: "65.00", stock: 8, imageSeed: "ceramic-fruit-bowl-tribal" },
          ],
        },
      ],
    });

    // ── 5. Minimarket Don Pepe ────────────────────────────────────────────
    await createStore({
      email: "minimarket@donpepe.pe",
      password: demoPassword,
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
            { name: "Arroz Costeño Extra (5 kg)", description: "Arroz blanco de grano largo, bolsa de 5kg — el más vendido de San Ramón", price: "24.50", stock: 150, isFeatured: true, imageSeed: "rice-bag-white-grain" },
            { name: "Aceite Primor (1 litro)", description: "Aceite vegetal de girasol 100%, sin colesterol, botella de 1 litro", price: "9.80", stock: 80, imageSeed: "sunflower-oil-bottle" },
            { name: "Azúcar Rubia (1 kg)", description: "Azúcar rubia de caña 100% nacional, bolsa de 1kg", price: "4.20", stock: 200, imageSeed: "brown-sugar-bag-cane" },
            { name: "Leche Gloria Entera (410g)", description: "Leche evaporada entera, lata de 410g. Ideal para cocina y desayuno", price: "4.50", stock: 120, imageSeed: "evaporated-milk-can" },
            { name: "Fideos Don Vittorio Spaghetti (500g)", description: "Fideo spaghetti semola de trigo, bolsa 500g", price: "3.80", stock: 100, imageSeed: "spaghetti-pasta-package" },
          ],
        },
        {
          name: "Bebidas y Snacks",
          description: "Refrescos, snacks y golosinas",
          products: [
            { name: "Inca Kola 1.5 litros", description: "La bebida de sabor nacional, botella descartable de 1.5L, bien fría", price: "6.50", stock: 60, isFeatured: true, imageSeed: "soda-bottle-yellow-drink" },
            { name: "Agua San Luis 625ml (pack x6)", description: "Agua mineral sin gas en presentación personal, pack económico de 6 unidades", price: "12.00", stock: 80, salePrice: "10.00", imageSeed: "water-bottle-plastic-pack" },
            { name: "Papitas Lay's Clásicas 38g", description: "Clásico snack de papas fritas en su punto de sal", price: "2.50", stock: 150, imageSeed: "potato-chips-bag-snack" },
            { name: "Galletas Oreo x3 Pack", description: "Galletas de chocolate con crema, paquete de 3 unidades", price: "3.00", stock: 100, imageSeed: "oreo-cookies-chocolate" },
            { name: "Néctar Frugos Durazno 1L", description: "Néctar de durazno sin conservantes artificiales, caja de 1 litro", price: "5.50", stock: 70, imageSeed: "peach-juice-carton-box" },
          ],
        },
        {
          name: "Higiene y Limpieza",
          description: "Todo para tu hogar y cuidado personal",
          products: [
            { name: "Jabón Bolívar Limón (360g)", description: "Jabón en barra multiusos para ropa y limpieza del hogar, aroma limón", price: "3.20", stock: 90, isFeatured: true, imageSeed: "lemon-soap-bar-cleaning" },
            { name: "Detergente Ariel (500g)", description: "Detergente en polvo con tecnología quitamanchas, bolsa 500g", price: "8.90", stock: 75, imageSeed: "laundry-detergent-powder" },
            { name: "Papel Higiénico Elite Doble Hoja (4 rollos)", description: "Suave y resistente, papel de doble hoja, paquete de 4 rollos", price: "7.50", stock: 120, imageSeed: "toilet-paper-rolls-pack" },
            { name: "Lejía Clorox Original (680ml)", description: "Desinfectante multiusos para ropa blanca y superficies, botella 680ml", price: "5.80", stock: 80, imageSeed: "bleach-cleaner-bottle" },
          ],
        },
      ],
    });

    // ── Enrich all demo stores with extra products and images ──────────────
    await enrichDemoStores();

    logger.info("Seed: all demo stores processed");
  } catch (err) {
    logger.error({ err }, "Seed error — skipping");
  }
}
