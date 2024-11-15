import { PrismaClient, Proposal, ProposalStatus } from "@prisma/client";
import { z } from "zod";
import { ProposalValidation as PV } from "@/constants/validation";
import { Decimal } from "decimal.js";

// Validation schema (reuse from CreateProposal component)
export const proposalSchema = z.object({
  proposalName: z
    .string()
    .min(PV.NAME.MIN)
    .max(PV.NAME.MAX)
    .regex(PV.NAME.PATTERN),
  abstract: z.string().min(PV.ABSTRACT.MIN).max(PV.ABSTRACT.MAX),
  motivation: z.string().min(PV.MOTIVATION.MIN).max(PV.MOTIVATION.MAX),
  rationale: z.string().min(PV.RATIONALE.MIN).max(PV.RATIONALE.MAX),
  deliveryRequirements: z
    .string()
    .min(PV.DELIVERY_REQUIREMENTS.MIN)
    .max(PV.DELIVERY_REQUIREMENTS.MAX),
  securityAndPerformance: z
    .string()
    .min(PV.SECURITY_AND_PERFORMANCE.MIN)
    .max(PV.SECURITY_AND_PERFORMANCE.MAX),
  budgetRequest: z
    .string()
    .regex(PV.BUDGET_REQUEST.PATTERN)
    .transform((val) => parseFloat(val)),
  discord: z.string().max(PV.DISCORD.MAX).regex(PV.DISCORD.PATTERN),
  email: z.string().email().max(PV.EMAIL.MAX),
});

export type CreateProposalInput = z.infer<typeof proposalSchema>;

export class ProposalService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createDraft(
    userId: string,
    data: CreateProposalInput
  ): Promise<Proposal> {
    try {
      // Validate input
      const validatedData = proposalSchema.parse(data);

      // Create proposal
      return await this.prisma.proposal.create({
        data: {
          userId,
          status: "DRAFT", // Use string literal instead of enum
          ...validatedData,
          budgetRequest: new Decimal(validatedData.budgetRequest.toString()),
        },
      });
    } catch (error) {
      console.error("Error creating proposal:", error);
      throw error; // Re-throw to handle in the API route
    }
  }

  async getUserProposals(userId: string): Promise<Proposal[]> {
    return await this.prisma.proposal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProposalsByStatus(status: ProposalStatus): Promise<Proposal[]> {
    return await this.prisma.proposal.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  }

  async searchProposals(searchTerm: string): Promise<Proposal[]> {
    return await this.prisma.proposal.findMany({
      where: {
        proposalName: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProposalById(
    id: string,
    userId: string,
    userLinkId: string
  ): Promise<(Proposal & { canEdit: boolean; canDelete: boolean }) | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            linkId: true,
            metadata: true,
          },
        },
      },
    });

    if (!proposal) return null;

    // Check if user has access (is creator or has same linkId)
    const hasAccess =
      proposal.userId === userId || proposal.user.linkId === userLinkId;

    if (!hasAccess) return null;

    // Only creator can edit/delete, and only if status is DRAFT
    const canEdit = proposal.userId === userId && proposal.status === "DRAFT";
    const canDelete = canEdit;

    return {
      ...proposal,
      canEdit,
      canDelete,
    };
  }

  async getUserProposalsWithLinked(
    userId: string,
    userLinkId: string
  ): Promise<Proposal[]> {
    return await this.prisma.proposal.findMany({
      where: {
        user: {
          OR: [{ id: userId }, { linkId: userLinkId }],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            metadata: true,
            linkId: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // Show drafts first
        { createdAt: "desc" }, // Then by creation date
      ],
    });
  }

  async deleteProposal(id: string, userId: string): Promise<void> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.userId !== userId) {
      throw new Error("Not authorized to delete this proposal");
    }

    if (proposal.status !== "DRAFT") {
      throw new Error("Only draft proposals can be deleted");
    }

    await this.prisma.proposal.delete({
      where: { id },
    });
  }

  async updateProposal(
    id: string,
    data: CreateProposalInput
  ): Promise<Proposal> {
    try {
      // Validate input
      const validatedData = proposalSchema.parse(data);

      // Update proposal
      return await this.prisma.proposal.update({
        where: { id },
        data: {
          ...validatedData,
          budgetRequest: new Decimal(validatedData.budgetRequest.toString()),
        },
      });
    } catch (error) {
      console.error("Error updating proposal:", error);
      throw error;
    }
  }
}
