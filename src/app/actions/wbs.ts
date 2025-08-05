"use server";

import prisma from "@/lib/prisma";

export async function getWbsById(id: string) {
  try {
    const wbs = await prisma.wbs.findUnique({
      where: {
        id: id,
      },
      include: {
        project: true,
      },
    });

    if (!wbs) {
      return null;
    }

    return {
      id: wbs.id,
      name: wbs.name,
      projectName: wbs.project?.name,
    };
  } catch (error) {
    console.error("Failed to fetch WBS:", error);
    throw new Error("Failed to fetch WBS information");
  }
}