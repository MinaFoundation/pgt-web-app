'use client'

import { useState, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDeliberationPhase, useDeliberationVote } from '@/hooks'
import { DeliberationDialog } from "@/components/dialogs/DeliberationDialog"
import Link from 'next/link'
import type { DeliberationProposal, DeliberationComment, DeliberationVote } from '@/types/deliberation'
import { ReviewerComments } from "@/components/ReviewerComments"
import { useAuth } from "@/contexts/AuthContext"

interface Props {
  fundingRoundId: string;
  fundingRoundName: string;
}

interface DialogState {
  open: boolean;
  proposalId?: number;
  mode?: 'recommend' | 'not-recommend' | 'community';
  existingVote?: DeliberationVote;
}

export function DeliberationPhase({ fundingRoundId, fundingRoundName }: Props) {
  const { user } = useAuth()
  const { proposals, loading, setProposals, pendingCount, totalCount, setPendingCount, setTotalCount } = useDeliberationPhase(fundingRoundId)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [dialogProps, setDialogProps] = useState<DialogState>({ open: false })
  
  const toggleExpanded = (proposalId: number) => {
    setExpanded(prev => ({
      ...prev,
      [proposalId]: !prev[proposalId]
    }))
  }

  const { submitVote, isLoading } = useDeliberationVote();

  // Sort proposals - pending first, then voted
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      if (!a.userDeliberation && b.userDeliberation) return -1;
      if (a.userDeliberation && !b.userDeliberation) return 1;
      return 0;
    });
  }, [proposals]);

  const handleSubmit = async (feedback: string, recommendation?: boolean) => {
    if (!dialogProps.proposalId || !user) return;

    try {
      const response = await submitVote(
        dialogProps.proposalId,
        feedback,
        recommendation
      );

      setProposals(prevProposals => {
        return prevProposals.map(proposal => {
          if (proposal.id !== dialogProps.proposalId) {
            return proposal;
          }

          // Create new comment object with proper date handling
          const newComment: DeliberationComment = {
            id: response.id,
            feedback,
            recommendation: proposal.isReviewerEligible ? recommendation : undefined,
            createdAt: new Date(), // This ensures it's a proper Date object
            isReviewerComment: Boolean(proposal.isReviewerEligible),
            ...(proposal.isReviewerEligible ? {
              reviewer: {
                username: user.metadata.username
              }
            } : {})
          };

          // Update comments list with proper date handling
          let updatedComments = [...proposal.reviewerComments];
          const existingCommentIndex = updatedComments.findIndex(
            c => (c.isReviewerComment && c.reviewer?.username === user.metadata.username) ||
                 (!c.isReviewerComment && !c.reviewer?.username)
          );

          if (existingCommentIndex !== -1) {
            updatedComments[existingCommentIndex] = newComment;
          } else {
            updatedComments = [...updatedComments, newComment];
          }

          // Ensure all dates are Date objects before sorting
          updatedComments = updatedComments.map(comment => ({
            ...comment,
            createdAt: new Date(comment.createdAt)
          }));

          // Sort comments
          updatedComments.sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          );

          return {
            ...proposal,
            userDeliberation: {
              feedback,
              recommendation,
              createdAt: new Date(),
              isReviewerVote: Boolean(proposal.isReviewerEligible)
            },
            hasVoted: true,
            reviewerComments: updatedComments
          };
        });
      });

      setDialogProps({ open: false });
    } catch (error) {
      console.error("Failed to submit vote:", error);
    }
  };

  const openEditDialog = (proposal: DeliberationProposal) => {
    const mode = proposal.isReviewerEligible 
      ? proposal.userDeliberation?.recommendation 
        ? 'recommend' 
        : 'not-recommend'
      : 'community';

    setDialogProps({
      open: true,
      proposalId: proposal.id,
      mode,
      existingVote: proposal.userDeliberation
    });
  };

  const renderVoteStatus = (proposal: DeliberationProposal) => {
    if (!proposal.userDeliberation) return null;

    if (proposal.isReviewerEligible) {
      return (
        <Badge variant={proposal.userDeliberation.recommendation ? 'default' : 'destructive'}>
          {proposal.userDeliberation.recommendation ? '✅ Recommended' : '❌ Not Recommended'}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        💭 Deliberation Submitted
      </Badge>
    );
  };

  const renderActionButtons = (proposal: DeliberationProposal) => {
    if (proposal.userDeliberation) {
      return (
        <Button
          variant="outline"
          onClick={() => openEditDialog(proposal)}
        >
          ✏️ Edit {proposal.isReviewerEligible ? 'Review' : 'Deliberation'}
        </Button>
      );
    }

    if (proposal.isReviewerEligible) {
      return (
        <>
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setDialogProps({
              open: true,
              proposalId: proposal.id,
              mode: 'recommend'
            })}
          >
            ✅ Recommend for Vote
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDialogProps({
              open: true,
              proposalId: proposal.id,
              mode: 'not-recommend'
            })}
          >
            ❌ Not Recommend
          </Button>
        </>
      );
    }

    return (
      <Button
        variant="secondary"
        onClick={() => setDialogProps({
          open: true,
          proposalId: proposal.id,
          mode: 'community'
        })}
      >
        💭 Deliberate
      </Button>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              Loading proposals...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            💭 Deliberation Phase: {fundingRoundName}
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ({pendingCount} pending, {totalCount} total)
            </span>
          </h1>
        </div>

        <div className="space-y-6">
          {sortedProposals.map((proposal: DeliberationProposal) => (
            <Card key={proposal.id} className={cn(
              "hover:bg-muted/50 transition-colors",
              proposal.userDeliberation && "bg-muted/10"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{proposal.proposalName}</CardTitle>
                    <CardDescription>
                      👤 Submitted by {proposal.submitter}
                    </CardDescription>
                  </div>
                  {renderVoteStatus(proposal)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Abstract</h3>
                  {expanded[proposal.id] ? (
                    <>
                      <p className="text-muted-foreground mb-4">{proposal.abstract}</p>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Motivation</h3>
                          <p className="text-muted-foreground">{proposal.motivation}</p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Rationale</h3>
                          <p className="text-muted-foreground">{proposal.rationale}</p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Delivery Requirements</h3>
                          <p className="text-muted-foreground">{proposal.deliveryRequirements}</p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Security & Performance</h3>
                          <p className="text-muted-foreground">{proposal.securityAndPerformance}</p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Budget Request</h3>
                          <p className="text-muted-foreground">
                            {proposal.budgetRequest.toLocaleString()} MINA
                          </p>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Contact Information</h3>
                          <div className="space-y-2">
                            {/* Show Discord info if author is a Discord user */}
                            {proposal.submitterMetadata?.authSource?.type === 'discord' ? (
                              <p className="text-muted-foreground">
                                Discord: {proposal.submitterMetadata.authSource.username}
                              </p>
                            ) : (
                              /* Check for linked Discord account */
                              proposal.submitterMetadata?.linkedAccounts?.some(account => 
                                account.authSource.type === 'discord'
                              ) ? (
                                <p className="text-muted-foreground">
                                  Discord: {proposal.submitterMetadata.linkedAccounts.find(account => 
                                    account.authSource.type === 'discord'
                                  )?.authSource.username} (linked account)
                                </p>
                              ) : (
                                <p className="text-muted-foreground text-sm italic">
                                  No Discord account linked
                                </p>
                              )
                            )}
                            <p className="text-muted-foreground">Email: {proposal.email}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground line-clamp-3">{proposal.abstract}</p>
                  )}
                </div>

                {proposal.userDeliberation && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Your Deliberation:</h4>
                    <p className="text-muted-foreground">{proposal.userDeliberation.feedback}</p>
                  </div>
                )}

                {expanded[proposal.id] && proposal.reviewerComments.length > 0 && (
                  <ReviewerComments 
                    comments={proposal.reviewerComments}
                  />
                )}
              </CardContent>

              <CardFooter className="flex justify-between items-center">
                <Button 
                  variant="ghost" 
                  className="gap-2"
                  onClick={() => toggleExpanded(proposal.id)}
                >
                  {expanded[proposal.id] ? (
                    <>
                      See less
                      <ChevronDown className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      See more
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-4">
                  {renderActionButtons(proposal)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <DeliberationDialog
        open={dialogProps.open}
        onOpenChange={(open: boolean) => setDialogProps({ ...dialogProps, open })}
        proposalId={dialogProps.proposalId!}
        isReviewer={proposals.find((p: DeliberationProposal) => p.id === dialogProps.proposalId)?.isReviewerEligible ?? false}
        mode={dialogProps.mode!}
        existingVote={dialogProps.existingVote}
        onSubmit={handleSubmit}
      />
    </div>
  )
} 
