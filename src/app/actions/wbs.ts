"use server";

import prisma from "@/lib/prisma";

export async function getWbsById(id: string) {
  try {
    const wbs = await prisma.wbs.findUnique({
      select: {
        id: true,
        name: true,
        project: {
          select: {
            name: true,
          },
        },
      },
      where: {
        id: Number(id),
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