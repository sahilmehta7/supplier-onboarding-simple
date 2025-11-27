import { prisma } from "@/lib/prisma";

async function checkData() {
    console.log("--- Entities ---");
    const entities = await prisma.entity.findMany();
    console.table(entities.map(e => ({ code: e.code, name: e.name, id: e.id })));

    console.log("\n--- Geographies ---");
    const geographies = await prisma.geography.findMany();
    console.table(geographies.map(g => ({ code: g.code, name: g.name, id: g.id })));

    console.log("\n--- Form Configs ---");
    const configs = await prisma.formConfig.findMany({
        include: { entity: true, geography: true }
    });
    console.table(configs.map(c => ({
        entity: c.entity.code,
        geography: c.geography.code,
        isActive: c.isActive
    })));
}

checkData()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
