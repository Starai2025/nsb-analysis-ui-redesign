import { useEffect, useState } from 'react';
import { loadCurrentThread } from './db';
import { loadCurrentWorkspaceSnapshot } from './projectStore';

type ThreadSummary = {
  hasThread: boolean;
  projectName: string;
  contractNumber: string;
  changeRequestId: string;
  citationCount: number;
};

const EMPTY_SUMMARY: ThreadSummary = {
  hasThread: false,
  projectName: '',
  contractNumber: '',
  changeRequestId: '',
  citationCount: 0,
};

export function useCurrentThreadSummary(refreshKey: string) {
  const [summary, setSummary] = useState<ThreadSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    let cancelled = false;

    loadCurrentWorkspaceSnapshot()
      .then((thread) => {
        if (cancelled) return;
        if (thread?.project) {
          setSummary({
            hasThread: true,
            projectName: thread.project.projectData?.name ?? '',
            contractNumber: thread.project.projectData?.contractNumber ?? '',
            changeRequestId: thread.project.projectData?.changeRequestId ?? '',
            citationCount: thread.latestAnalysis?.citations?.length ?? 0,
          });
          return;
        }

        return loadCurrentThread().then((legacyThread) => {
          if (cancelled) return;
          if (!legacyThread) {
            setSummary(EMPTY_SUMMARY);
            return;
          }

          setSummary({
            hasThread: true,
            projectName: legacyThread.projectData?.name ?? '',
            contractNumber: legacyThread.projectData?.contractNumber ?? '',
            changeRequestId: legacyThread.projectData?.changeRequestId ?? '',
            citationCount: legacyThread.citations?.length ?? 0,
          });
        });
      })
      .catch(() => {
        if (!cancelled) setSummary(EMPTY_SUMMARY);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return summary;
}
