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

  const inputs = approvedIncidents.map((ip) => ({
    type: ip.incident.type,
    date: ip.incident.date,
    sourceCount: ip.incident.sources.length,
    hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
  }));

  const { score, label } = computeRiskScore(inputs);

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

  const inputs = approvedIncidents.map((ip) => ({
    type: ip.incident.type,
    date: ip.incident.date,
    sourceCount: ip.incident.sources.length,
    hasArchivedSource: ip.incident.sources.some((s) => !!s.archiveUrl),
  }));

  const { score, label } = computeRiskScore(inputs);

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
