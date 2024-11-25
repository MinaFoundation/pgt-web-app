import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseConsiderationVoteProps {
  fundingRoundId: string;
}

export function useConsiderationVote({ fundingRoundId }: UseConsiderationVoteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const submitVote = async (proposalId: number, decision: 'APPROVED' | 'REJECTED', feedback: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/funding-rounds/${fundingRoundId}/consideration-proposals/${proposalId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, feedback }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully.",
      });

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit vote';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submitVote,
    isLoading,
    error,
  };
} 