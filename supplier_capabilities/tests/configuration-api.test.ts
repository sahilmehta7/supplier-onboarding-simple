import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireRoleMock = vi.fn();

vi.mock("@/lib/permissions", () => ({
  requireRole: requireRoleMock,
}));

const entityFindMany = vi.fn();
const entityCreate = vi.fn();
const requirementUpsert = vi.fn();
const requirementDelete = vi.fn();
const auditCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    entity: {
      findMany: entityFindMany,
      create: entityCreate,
    },
    formDocumentRequirement: {
      upsert: requirementUpsert,
      delete: requirementDelete,
    },
    auditLog: {
      create: auditCreate,
    },
  },
}));

describe("configuration entity API", () => {
  let entitiesRoute: typeof import("@/app/api/configuration/entities/route");

  beforeAll(async () => {
    entitiesRoute = await import("@/app/api/configuration/entities/route");
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ role: "ADMIN" });
  });

  it("returns entity list", async () => {
    entityFindMany.mockResolvedValue([
      { id: "ent-1", name: "Acme", code: "ACM" },
    ]);

    const response = await entitiesRoute.GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.entities).toHaveLength(1);
    expect(requireRoleMock).toHaveBeenCalledWith(["ADMIN"]);
  });

  it("creates an entity", async () => {
    entityCreate.mockResolvedValue({
      id: "ent-2",
      name: "Beta Corp",
      code: "BET",
      description: null,
    });

    const response = await entitiesRoute.POST(
      new Request("http://localhost/api/configuration/entities", {
        method: "POST",
        body: JSON.stringify({ name: "Beta Corp", code: "BET" }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.entity.name).toBe("Beta Corp");
    expect(entityCreate).toHaveBeenCalledWith({
      data: { name: "Beta Corp", code: "BET", description: null },
    });
    expect(auditCreate).toHaveBeenCalled();
  });
});

describe("document requirement API", () => {
  let requirementsRoute: typeof import("@/app/api/configuration/requirements/route");
  let requirementDeleteRoute: typeof import("@/app/api/configuration/requirements/[id]/route");

  beforeAll(async () => {
    requirementsRoute = await import(
      "@/app/api/configuration/requirements/route"
    );
    requirementDeleteRoute = await import(
      "@/app/api/configuration/requirements/[id]/route"
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ role: "ADMIN" });
  });

  it("upserts a requirement", async () => {
    requirementUpsert.mockResolvedValue({
      id: "req-1",
      formConfigId: "form-1",
      documentTypeId: "doc-1",
      required: true,
      helpText: null,
      formConfig: {
        id: "form-1",
        version: 1,
        entity: { id: "ent", name: "Acme", code: "ACM" },
        geography: { id: "geo", name: "United States", code: "US" },
      },
      documentType: {
        id: "doc-1",
        label: "W-9",
        key: "w9",
        category: "tax",
      },
    });

    const response = await requirementsRoute.POST(
      new Request("http://localhost/api/configuration/requirements", {
        method: "POST",
        body: JSON.stringify({
          formConfigId: "form-1",
          documentTypeId: "doc-1",
          required: true,
        }),
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.requirement.id).toBe("req-1");
    expect(requirementUpsert).toHaveBeenCalledWith({
      where: {
        formConfigId_documentTypeId: {
          formConfigId: "form-1",
          documentTypeId: "doc-1",
        },
      },
      update: {
        required: true,
        helpText: null,
      },
      create: {
        formConfigId: "form-1",
        documentTypeId: "doc-1",
        required: true,
        helpText: null,
      },
      include: {
        formConfig: { include: { entity: true, geography: true } },
        documentType: true,
      },
    });
    expect(auditCreate).toHaveBeenCalled();
  });

  it("deletes a requirement", async () => {
    requirementDelete.mockResolvedValue({ id: "req-1" });

    const response = await requirementDeleteRoute.DELETE(
      new Request("http://localhost/api/configuration/requirements/req-1", {
        method: "DELETE",
      }),
      { params: { id: "req-1" } }
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(requirementDelete).toHaveBeenCalledWith({ where: { id: "req-1" } });
  });
});


