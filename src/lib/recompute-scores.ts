import { prisma } from "./prisma";
import { computeRiskScore } from "./risk-score";

export async function recomputePersonScore(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      incidents: {
        include: {
          incident: { include: { sources: true } },
        },
      },
    },
  });

  if (!person) return;

  const approvedIncidents = person.incidents.filter(
    (ip) => ip.incident.status === "APPROVED"
  );

  if (approvedIncidents.length === 0) {
    await prisma.person.update({
      where: { id: personId },
      data: { riskScore: 0, riskLabel: "LOW" },
    });
    return;
  }

  // Only VERIFIED incidents contribute to the score
  const verifiedIncidents = approvedIncidents.filter(
    (ip) => ip.incident.evidenceStatus === "VERIFIED"
  );

  const inputs = verifiedIncidents.map((ip) => ({
    type: ip.incident.type,
    date: ip.incident.date,
    sourceCount: ip.incident.sources.length,
    hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
  }));

  const { score, label } = inputs.length > 0 ? computeRiskScore(inputs) : { score: 0, label: "LOW" as const };

  await prisma.person.update({
    where: { id: personId },
    data: { riskScore: score, riskLabel: label },
  });
}

export async function recomputeProjectScore(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      incidents: {
        include: {
          incident: { include: { sources: true } },
        },
      },
    },
  });

  if (!project) return;

  const approvedIncidents = project.incidents.filter(
    (ip) => ip.incident.status === "APPROVED"
  );

  if (approvedIncidents.length === 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: { riskScore: 0, riskLabel: "LOW" },
    });
    return;
  }

  // Only VERIFIED incidents contribute to the score
  const verifiedIncidents = approvedIncidents.filter(
    (ip) => ip.incident.evidenceStatus === "VERIFIED"
  );

  const inputs = verifiedIncidents.map((ip) => ({
    type: ip.incident.type,
    date: ip.incident.date,
    sourceCount: ip.incident.sources.length,
    hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
  }));

  const { score, label } = inputs.length > 0 ? computeRiskScore(inputs) : { score: 0, label: "LOW" as const };

  await prisma.project.update({
    where: { id: projectId },
    data: { riskScore: score, riskLabel: label },
  });
}

export async function recomputeScoresForIncident(incidentId: string) {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      people: true,
      projects: true,
    },
  });

  if (!incident) return;

  await Promise.all([
    ...incident.people.map((ip) => recomputePersonScore(ip.personId)),
    ...incident.projects.map((ip) => recomputeProjectScore(ip.projectId)),
  ]);
}

export async function recomputeEvidenceStatus(entityId: string, kind: "person" | "project") {
  const includeQuery = {
    incidents: {
      include: {
        incident: { select: { evidenceStatus: true, status: true } },
      },
    },
  };

  const approvedIncidentStatuses: string[] = [];

  if (kind === "person") {
    const entity = await prisma.person.findUnique({
      where: { id: entityId },
      include: includeQuery,
    });
    if (!entity) return;
    entity.incidents
      .filter((ip) => ip.incident.status === "APPROVED")
      .forEach((ip) => approvedIncidentStatuses.push(ip.incident.evidenceStatus));
  } else {
    const entity = await prisma.project.findUnique({
      where: { id: entityId },
      include: includeQuery,
    });
    if (!entity) return;
    entity.incidents
      .filter((ip) => ip.incident.status === "APPROVED")
      .forEach((ip) => approvedIncidentStatuses.push(ip.incident.evidenceStatus));
  }

  let evidenceStatus: "ALLEGED" | "VERIFIED" | "CONTESTED" = "ALLEGED";

  if (approvedIncidentStatuses.includes("CONTESTED")) {
    evidenceStatus = "CONTESTED";
  } else if (approvedIncidentStatuses.includes("VERIFIED")) {
    evidenceStatus = "VERIFIED";
  }

  if (kind === "person") {
    await prisma.person.update({
      where: { id: entityId },
      data: { evidenceStatus },
    });
  } else {
    await prisma.project.update({
      where: { id: entityId },
      data: { evidenceStatus },
    });
  }
}
