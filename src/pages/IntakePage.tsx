import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentThreadSummary } from '../lib/useCurrentThreadSummary';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  FolderPlus,
  Info,
  Landmark,
  Loader2,
  Mail,
  PencilLine,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  ArtifactRecord,
  DocumentCategory,
  DocumentType,
  ProjectData,
  ProjectDocumentRecord,
  ProjectProfileId,
  ProjectRecord,
  WorkspaceStatus,
} from '../types';
import { CURRENT_THREAD_ID, clearCurrentThread, saveCurrentThread } from '../lib/db';
import {
  loadCurrentWorkspaceSnapshot,
  replaceClausesForDocument,
  removeArtifactRecord,
  removeProjectDocumentRecord,
  saveArtifactRecord,
  saveProjectDocumentRecord,
  saveProjectRecord,
  setActiveProjectId,
} from '../lib/projectStore';
import {
  LEGACY_CONTRACT_BLOB_ARTIFACT_ID,
  LEGACY_DOCUMENT_RECORD_ID,
} from '../lib/storageAdapter';
import { buildLadotDemoClauses } from '../lib/ladotDemoClauses';

type OptionalDocumentCategory = Exclude<
  DocumentCategory,
  'governing-agreement' | 'correspondence-review-comments'
>;

type RoleOption = {
  id: string;
  label: string;
};

type IssueModeOption = {
  value: string;
  label: string;
};

type SupportingDocumentOption = {
  category: OptionalDocumentCategory;
  label: string;
  description: string;
};

type SupportingFileMap = Partial<Record<OptionalDocumentCategory, File>>;

type ProjectProfileDefaults = {
  label: string;
  demoProfile: string;
  projectName?: string;
  state?: string;
  agency?: string;
  deliveryModel?: string;
  ownerClient?: string;
  concessionaire?: string;
  builder?: string;
  leadDesigner?: string;
  defaultRoleId?: string;
  defaultIssueMode?: string;
};

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const PROJECT_PRESETS: Record<ProjectProfileId, ProjectProfileDefaults> = {
  'nsb-default': {
    label: 'General NSB Analysis',
    demoProfile: 'nsb-default',
  },
  'ladot-calcasieu': {
    label: 'LA DOTD Calcasieu Demo',
    demoProfile: 'ladot-calcasieu',
    projectName: 'I-10 Calcasieu River Bridge',
    state: 'Louisiana',
    agency: 'LA DOTD',
    deliveryModel: 'P3 / design-build',
    ownerClient: 'LA DOTD',
    concessionaire: 'Calcasieu Bridge Partners',
    builder: 'Calcasieu design-build team',
    leadDesigner: 'Arcadis',
    defaultRoleId: 'arcadis-internal-reviewer',
    defaultIssueMode: 'rejected-design-submittal',
  },
};

const ROLE_OPTIONS: RoleOption[] = [
  { id: 'arcadis-internal-reviewer', label: 'Arcadis internal reviewer' },
  { id: 'arcadis-design-lead', label: 'Arcadis design lead' },
  { id: 'owner-reviewer', label: 'Owner reviewer' },
  { id: 'builder-reviewer', label: 'Builder reviewer' },
  { id: 'concessionaire-reviewer', label: 'Concessionaire reviewer' },
];

const ISSUE_MODE_OPTIONS: IssueModeOption[] = [
  { value: 'rejected-design-submittal', label: 'Rejected design submittal' },
  { value: 'owner-comment-cycle', label: 'Owner comment cycle' },
  { value: 'correspondence-driven-change', label: 'Correspondence-driven change' },
  { value: 'redesign-pressure', label: 'Redesign pressure' },
  { value: 'notice-risk', label: 'Notice risk' },
];

const SUPPORTING_DOCUMENT_OPTIONS: SupportingDocumentOption[] = [
  {
    category: 'technical-provisions',
    label: 'Technical provisions',
    description: 'Specifications, standards, and governing technical criteria.',
  },
  {
    category: 'proposal-atcs',
    label: 'Proposal / ATCs',
    description: 'Bid commitments, proposal clarifications, or approved ATCs.',
  },
  {
    category: 'design-package',
    label: 'Design package',
    description: 'Submittal package, plan set, calculations, or design narrative.',
  },
  {
    category: 'marked-up-review-pdf',
    label: 'Marked-up review PDF',
    description: 'Annotated review set or comments embedded in marked drawings.',
  },
  {
    category: 'meeting-minutes',
    label: 'Meeting minutes',
    description: 'Coordination notes, meetings, or discussion summaries.',
  },
  {
    category: 'submittal-log',
    label: 'Submittal log',
    description: 'Tracking sheet for package status, dates, and review cycles.',
  },
  {
    category: 'pricing-backup',
    label: 'Pricing backup',
    description: 'Estimate support, cost buildup, or commercial backup.',
  },
  {
    category: 'schedule-backup',
    label: 'Schedule backup',
    description: 'Schedule fragments, narratives, or impact support.',
  },
  {
    category: 'directive-letter',
    label: 'Directive letter',
    description: 'Direction, instruction, or agency interpretation letter.',
  },
];

function createProjectId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `project-${crypto.randomUUID()}`;
  }

  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSupportedFile(file: File): boolean {
  return SUPPORTED_MIME_TYPES.includes(file.type);
}

function supportingDocumentId(projectId: string, category: OptionalDocumentCategory): string {
  return `${projectId}:document:supporting:${category}`;
}

function supportingArtifactId(projectId: string, category: OptionalDocumentCategory): string {
  return `${projectId}:artifact:supporting:${category}`;
}

function correspondenceArtifactId(projectId: string): string {
  return `${projectId}:artifact:correspondence-upload`;
}

function roleLabelFor(roleId: string): string {
  return ROLE_OPTIONS.find((option) => option.id === roleId)?.label ?? '';
}

function formatBooleanState(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function createFileFromArtifact(
  name: string,
  mimeType: string,
  uploadedAt: string,
  arrayBuffer?: ArrayBuffer,
): File | null {
  if (!arrayBuffer) return null;

  return new File([arrayBuffer], name, {
    type: mimeType,
    lastModified: Number.isNaN(Date.parse(uploadedAt))
      ? Date.now()
      : Date.parse(uploadedAt),
  });
}

export default function IntakePage() {
  const navigate = useNavigate();
  const summary = useCurrentThreadSummary('intake');

  const [projectId, setProjectId] = useState(() => createProjectId());
  const [projectCreatedAt, setProjectCreatedAt] = useState(() => new Date().toISOString());
  const [projectPreset, setProjectPreset] = useState<ProjectProfileId>('nsb-default');

  const [projectName, setProjectName] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [changeRequestId, setChangeRequestId] = useState('');
  const [stateName, setStateName] = useState('');
  const [agency, setAgency] = useState('');
  const [deliveryModel, setDeliveryModel] = useState('');
  const [ownerClient, setOwnerClient] = useState('');
  const [concessionaire, setConcessionaire] = useState('');
  const [builder, setBuilder] = useState('');
  const [leadDesigner, setLeadDesigner] = useState('');

  const [userRoleId, setUserRoleId] = useState('');
  const [issueMode, setIssueMode] = useState('');
  const [workAlreadyProceeding, setWorkAlreadyProceeding] = useState(false);
  const [noticeAlreadySent, setNoticeAlreadySent] = useState(false);
  const [scheduleImpactKnown, setScheduleImpactKnown] = useState(false);
  const [pricingImpactKnown, setPricingImpactKnown] = useState(false);

  const [contractFile, setContractFile] = useState<File | null>(null);
  const [correspondenceFile, setCorrespondenceFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<SupportingFileMap>({});

  const [frameworkExpanded, setFrameworkExpanded] = useState(false);
  const [moreContextOpen, setMoreContextOpen] = useState(false);
  const [supportingOpen, setSupportingOpen] = useState(false);
  const [activeSupportingCategory, setActiveSupportingCategory] = useState<OptionalDocumentCategory | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisTimer, setAnalysisTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const contractInputRef = useRef<HTMLInputElement>(null);
  const correspondenceInputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  const selectedRoleLabel = roleLabelFor(userRoleId);
  const selectedPreset = PROJECT_PRESETS[projectPreset];
  const hasRequiredDocuments = Boolean(contractFile && correspondenceFile);
  const workflowStep = !contractFile
    ? 'governing-agreement'
    : !correspondenceFile
      ? 'review-comments'
      : 'risk-score-generation';
  const governingAgreementStepState = contractFile
    ? 'complete'
    : workflowStep === 'governing-agreement'
      ? 'active'
      : 'pending';
  const reviewCommentsStepState = correspondenceFile
    ? 'complete'
    : workflowStep === 'review-comments'
      ? 'active'
      : 'pending';
  const riskScoreStepState = hasRequiredDocuments ? 'active' : 'pending';
  const stagedSupportingDocuments = SUPPORTING_DOCUMENT_OPTIONS.filter(
    (option) => supportingFiles[option.category],
  );
  const shouldPersistWorkspace = Boolean(
    projectName.trim() ||
      contractNumber.trim() ||
      changeRequestId.trim() ||
      contractFile ||
      correspondenceFile ||
      stagedSupportingDocuments.length > 0 ||
      stateName.trim() ||
      agency.trim() ||
      deliveryModel.trim() ||
      ownerClient.trim() ||
      concessionaire.trim() ||
      builder.trim() ||
      leadDesigner.trim() ||
      userRoleId ||
      issueMode ||
      workAlreadyProceeding ||
      noticeAlreadySent ||
      scheduleImpactKnown ||
      pricingImpactKnown ||
      projectPreset !== 'nsb-default',
  );

  const projectData: ProjectData = {
    id: projectId,
    name: projectName.trim(),
    contractNumber: contractNumber.trim(),
    changeRequestId: changeRequestId.trim(),
    state: stateName.trim() || undefined,
    agency: agency.trim() || undefined,
    deliveryModel: deliveryModel.trim() || undefined,
    ownerClient: ownerClient.trim() || undefined,
    userRole: selectedRoleLabel || undefined,
    concessionaire: concessionaire.trim() || undefined,
    builder: builder.trim() || undefined,
    leadDesigner: leadDesigner.trim() || undefined,
    demoProfile: selectedPreset.demoProfile,
    issueMode: issueMode || undefined,
    projectProfileId: projectPreset,
    primaryRoleId: userRoleId || undefined,
    workAlreadyProceeding,
    noticeAlreadySent,
    scheduleImpactKnown,
    pricingImpactKnown,
  };

  useEffect(() => {
    let cancelled = false;

    async function hydrateWorkspace() {
      try {
        const snapshot = await loadCurrentWorkspaceSnapshot({ includeArtifactBuffers: true });
        if (cancelled || !snapshot?.project) {
          setHydrating(false);
          return;
        }

        const artifactMap = new Map(
          snapshot.artifacts
            .filter((artifact) => artifact.arrayBuffer)
            .map((artifact) => [artifact.id, artifact]),
        );

        setProjectId(snapshot.project.id);
        setProjectCreatedAt(snapshot.project.createdAt);
        setProjectPreset(
          snapshot.project.profileId ?? snapshot.project.projectData.projectProfileId ?? 'nsb-default',
        );
        setProjectName(snapshot.project.projectData.name ?? '');
        setContractNumber(snapshot.project.projectData.contractNumber ?? '');
        setChangeRequestId(snapshot.project.projectData.changeRequestId ?? '');
        setStateName(snapshot.project.projectData.state ?? '');
        setAgency(snapshot.project.projectData.agency ?? '');
        setDeliveryModel(snapshot.project.projectData.deliveryModel ?? '');
        setOwnerClient(snapshot.project.projectData.ownerClient ?? '');
        setConcessionaire(snapshot.project.projectData.concessionaire ?? '');
        setBuilder(snapshot.project.projectData.builder ?? '');
        setLeadDesigner(snapshot.project.projectData.leadDesigner ?? '');
        setUserRoleId(snapshot.project.primaryRoleId ?? snapshot.project.projectData.primaryRoleId ?? '');
        setIssueMode(snapshot.project.projectData.issueMode ?? '');
        setWorkAlreadyProceeding(Boolean(snapshot.project.projectData.workAlreadyProceeding));
        setNoticeAlreadySent(Boolean(snapshot.project.projectData.noticeAlreadySent));
        setScheduleImpactKnown(Boolean(snapshot.project.projectData.scheduleImpactKnown));
        setPricingImpactKnown(Boolean(snapshot.project.projectData.pricingImpactKnown));
        setMoreContextOpen(
          Boolean(
            snapshot.project.projectData.scheduleImpactKnown ||
              snapshot.project.projectData.pricingImpactKnown,
          ),
        );
        setError(snapshot.project.lastError?.message ?? null);

        let nextContractFile: File | null = null;
        let nextCorrespondenceFile: File | null = null;
        const nextSupportingFiles: SupportingFileMap = {};

        for (const document of snapshot.documents) {
          const artifact = document.blobArtifactId
            ? artifactMap.get(document.blobArtifactId)
            : undefined;
          const hydratedFile = createFileFromArtifact(
            document.name,
            document.mimeType,
            document.uploadedAt,
            artifact?.arrayBuffer,
          );

          if (document.legacyType === 'contract' || document.category === 'governing-agreement') {
            nextContractFile = hydratedFile;
            continue;
          }

          if (
            document.legacyType === 'correspondence' ||
            document.category === 'correspondence-review-comments'
          ) {
            nextCorrespondenceFile = hydratedFile;
            continue;
          }

          if (hydratedFile) {
            nextSupportingFiles[document.category as OptionalDocumentCategory] = hydratedFile;
          }
        }

        setContractFile(nextContractFile);
        setCorrespondenceFile(nextCorrespondenceFile);
        setSupportingFiles(nextSupportingFiles);
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    }

    void hydrateWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrating || !shouldPersistWorkspace) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const now = new Date().toISOString();
      const status: WorkspaceStatus = analyzing
        ? 'analyzing'
        : error
          ? 'analysis-failed'
          : hasRequiredDocuments
            ? 'ready'
            : 'setup';

      const record: ProjectRecord = {
        id: projectId,
        legacyThreadId: CURRENT_THREAD_ID,
        createdAt: projectCreatedAt,
        updatedAt: now,
        status,
        profileId: projectPreset,
        primaryRoleId: userRoleId || undefined,
        projectData,
        lastError: error
          ? {
              source: 'analysis',
              message: error,
              at: now,
            }
          : null,
      };

      void saveProjectRecord(record).then(() => setActiveProjectId(projectId));
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    analyzing,
    error,
    hasRequiredDocuments,
    hydrating,
    projectCreatedAt,
    projectData,
    projectId,
    projectPreset,
    shouldPersistWorkspace,
    userRoleId,
  ]);

  useEffect(() => {
    if (hydrating || !shouldPersistWorkspace) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const uploads: Array<{ artifact: ArtifactRecord; document: ProjectDocumentRecord }> = [];

        if (contractFile) {
          const artifactId = LEGACY_CONTRACT_BLOB_ARTIFACT_ID(projectId);
          const uploadedAt = new Date().toISOString();
          uploads.push({
            artifact: {
              id: artifactId,
              projectId,
              kind: 'staged-document-blob',
              mimeType: contractFile.type,
              name: contractFile.name,
              createdAt: uploadedAt,
              updatedAt: uploadedAt,
              arrayBuffer: await contractFile.arrayBuffer(),
            },
            document: {
              id: LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract'),
              projectId,
              category: 'governing-agreement',
              analysisRole: 'core',
              legacyType: 'contract',
              name: contractFile.name,
              mimeType: contractFile.type,
              fileSize: contractFile.size,
              uploadedAt,
              blobArtifactId: artifactId,
              revision: 'current',
              discipline: 'contract',
              sourceRole: 'governing-agreement',
              extractionStatus: 'staged-locally',
              status: 'staged',
              usedInLatestAnalysis: false,
            },
          });
        }

        if (correspondenceFile) {
          const artifactId = correspondenceArtifactId(projectId);
          const uploadedAt = new Date().toISOString();
          uploads.push({
            artifact: {
              id: artifactId,
              projectId,
              kind: 'staged-document-blob',
              mimeType: correspondenceFile.type,
              name: correspondenceFile.name,
              createdAt: uploadedAt,
              updatedAt: uploadedAt,
              arrayBuffer: await correspondenceFile.arrayBuffer(),
            },
            document: {
              id: LEGACY_DOCUMENT_RECORD_ID(projectId, 'correspondence'),
              projectId,
              category: 'correspondence-review-comments',
              analysisRole: 'core',
              legacyType: 'correspondence',
              name: correspondenceFile.name,
              mimeType: correspondenceFile.type,
              fileSize: correspondenceFile.size,
              uploadedAt,
              blobArtifactId: artifactId,
              revision: 'current',
              discipline: 'review-comments',
              sourceRole: 'review-correspondence',
              extractionStatus: 'staged-locally',
              status: 'staged',
              usedInLatestAnalysis: false,
            },
          });
        }

        for (const option of SUPPORTING_DOCUMENT_OPTIONS) {
          const file = supportingFiles[option.category];
          if (!file) continue;

          const artifactId = supportingArtifactId(projectId, option.category);
          const uploadedAt = new Date().toISOString();
          uploads.push({
            artifact: {
              id: artifactId,
              projectId,
              kind: 'staged-document-blob',
              mimeType: file.type,
              name: file.name,
              createdAt: uploadedAt,
              updatedAt: uploadedAt,
              arrayBuffer: await file.arrayBuffer(),
            },
            document: {
              id: supportingDocumentId(projectId, option.category),
              projectId,
              category: option.category,
              analysisRole: 'supporting',
              name: file.name,
              mimeType: file.type,
              fileSize: file.size,
              uploadedAt,
              blobArtifactId: artifactId,
              revision: 'current',
              discipline: option.label,
              sourceRole: 'supporting-context',
              extractionStatus: 'staged-locally',
              status: 'staged',
              usedInLatestAnalysis: false,
            },
          });
        }

        await Promise.all(
          uploads.flatMap((upload) => [
            saveArtifactRecord(upload.artifact),
            saveProjectDocumentRecord(upload.document),
          ]),
        );
      })();
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [contractFile, correspondenceFile, hydrating, projectId, shouldPersistWorkspace, supportingFiles]);

  const startTimer = () => {
    setAnalysisTimer(0);
    timerRef.current = window.setInterval(() => setAnalysisTimer((previous) => previous + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePresetChange = (nextPreset: ProjectProfileId) => {
    setProjectPreset(nextPreset);
    setError(null);

    if (nextPreset === 'ladot-calcasieu') {
      const preset = PROJECT_PRESETS[nextPreset];
      setProjectName((previous) => previous || preset.projectName || '');
      setStateName(preset.state ?? '');
      setAgency(preset.agency ?? '');
      setDeliveryModel(preset.deliveryModel ?? '');
      setOwnerClient(preset.ownerClient ?? '');
      setConcessionaire(preset.concessionaire ?? '');
      setBuilder(preset.builder ?? '');
      setLeadDesigner(preset.leadDesigner ?? '');
      setUserRoleId((previous) => previous || preset.defaultRoleId || '');
      setIssueMode((previous) => previous || preset.defaultIssueMode || '');
      setFrameworkExpanded(false);
      return;
    }

    setStateName('');
    setAgency('');
    setDeliveryModel('');
    setOwnerClient('');
    setConcessionaire('');
    setBuilder('');
    setLeadDesigner('');
    setFrameworkExpanded(true);
  };

  const handleRequiredFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!isSupportedFile(file)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }

    if (type === 'contract') {
      setContractFile(file);
    } else {
      setCorrespondenceFile(file);
    }

    setError(null);
  };

  const handleSupportingFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !activeSupportingCategory) return;
    if (!isSupportedFile(file)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }

    setSupportingFiles((previous) => ({
      ...previous,
      [activeSupportingCategory]: file,
    }));
    setSupportingOpen(true);
    setError(null);
  };

  const handleRemoveRequiredFile = async (type: DocumentType) => {
    if (type === 'contract') {
      setContractFile(null);
      await removeProjectDocumentRecord(LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract'));
      await removeArtifactRecord(LEGACY_CONTRACT_BLOB_ARTIFACT_ID(projectId));
    } else {
      setCorrespondenceFile(null);
      await removeProjectDocumentRecord(LEGACY_DOCUMENT_RECORD_ID(projectId, 'correspondence'));
      await removeArtifactRecord(correspondenceArtifactId(projectId));
    }

    setError(null);
  };

  const handleRemoveSupportingFile = async (category: OptionalDocumentCategory) => {
    setSupportingFiles((previous) => {
      const next = { ...previous };
      delete next[category];
      return next;
    });

    await removeProjectDocumentRecord(supportingDocumentId(projectId, category));
    await removeArtifactRecord(supportingArtifactId(projectId, category));
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!contractFile || !correspondenceFile) {
      setError('Please upload both the governing agreement and the correspondence / review comments.');
      return;
    }

    const now = new Date().toISOString();
    const projectRecord: ProjectRecord = {
      id: projectId,
      legacyThreadId: CURRENT_THREAD_ID,
      createdAt: projectCreatedAt,
      updatedAt: now,
      status: 'analyzing',
      profileId: projectPreset,
      primaryRoleId: userRoleId || undefined,
      projectData,
      lastError: null,
    };

    await saveProjectRecord(projectRecord);
    await setActiveProjectId(projectId);

    setAnalyzing(true);
    setAnalysisStatus('Uploading documents to server...');
    setError(null);
    startTimer();

    try {
      setAnalysisStatus('Connecting to server...');

      try {
        const healthCheck = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        if (!healthCheck.ok) {
          throw new Error('Server is not responding. Please ensure the server is running.');
        }
      } catch {
        throw new Error('Cannot connect to server. Please ensure the server is running at http://localhost:3000');
      }

      const formData = new FormData();
      formData.append('contract', contractFile);
      formData.append('correspondence', correspondenceFile);
      formData.append('projectName', projectData.name);
      formData.append('contractNumber', projectData.contractNumber);
      formData.append('changeRequestId', projectData.changeRequestId);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(180000),
      });

      setAnalysisStatus('Processing server response...');

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server returned an invalid response. Check server logs.');
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error (${response.status}): Analysis failed.`);
      }

      setAnalysisStatus('Analysis complete - saving results...');

      const contractBuffer =
        contractFile.type === 'application/pdf' ? await contractFile.arrayBuffer() : undefined;
      const mergedProjectData: ProjectData = {
        ...projectData,
        ...(data.projectData ?? {}),
        id: projectId,
        state: projectData.state,
        agency: projectData.agency,
        deliveryModel: projectData.deliveryModel,
        ownerClient: projectData.ownerClient,
        userRole: projectData.userRole,
        concessionaire: projectData.concessionaire,
        builder: projectData.builder,
        leadDesigner: projectData.leadDesigner,
        demoProfile: projectData.demoProfile,
        issueMode: projectData.issueMode,
        projectProfileId: projectData.projectProfileId,
        primaryRoleId: projectData.primaryRoleId,
        workAlreadyProceeding: projectData.workAlreadyProceeding,
        noticeAlreadySent: projectData.noticeAlreadySent,
        scheduleImpactKnown: projectData.scheduleImpactKnown,
        pricingImpactKnown: projectData.pricingImpactKnown,
      };

      await saveCurrentThread({
        analysis: data.analysis,
        projectData: mergedProjectData,
        contract: data.contract,
        correspondence: data.correspondence,
        citations: data.citations ?? [],
        contractBlob: contractBuffer,
        draft: undefined,
        report: undefined,
        chatHistory: undefined,
      });

      const contractDocumentId = LEGACY_DOCUMENT_RECORD_ID(projectId, 'contract');
      const projectClauses = projectPreset === 'ladot-calcasieu'
        ? buildLadotDemoClauses(projectId, contractDocumentId)
        : [];

      await replaceClausesForDocument(contractDocumentId, projectClauses);

      stopTimer();
      navigate('/summary');
    } catch (caughtError) {
      stopTimer();

      let message = 'An unexpected error occurred.';
      if (caughtError instanceof Error) {
        message = caughtError.message;

        if (caughtError.name === 'TimeoutError' || caughtError.message.includes('timeout')) {
          message =
            'Analysis timed out. The document may be too large or the server may be overloaded. Try again with a smaller document.';
        } else if (
          caughtError.message.includes('Failed to fetch') ||
          caughtError.message.includes('NetworkError')
        ) {
          message =
            'Network error: Cannot reach the server. Please check that the server is running at http://localhost:3000';
        } else if (caughtError.message.includes('ANTHROPIC_API_KEY')) {
          message =
            'Server configuration error: Anthropic API key is not set. Check your .env file.';
        }
      }

      const failedAt = new Date().toISOString();
      await saveProjectRecord({
        id: projectId,
        legacyThreadId: CURRENT_THREAD_ID,
        createdAt: projectCreatedAt,
        updatedAt: failedAt,
        status: 'analysis-failed',
        profileId: projectPreset,
        primaryRoleId: userRoleId || undefined,
        projectData,
        lastError: {
          source: 'analysis',
          message,
          at: failedAt,
        },
      });
      await setActiveProjectId(projectId);
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetAnalysis = async () => {
    try {
      await clearCurrentThread();
      window.location.reload();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Unable to reset the workspace right now.',
      );
    }
  };

  const frameworkSummary = [
    { label: 'State', value: stateName || 'Not set' },
    { label: 'Agency', value: agency || 'Not set' },
    { label: 'Delivery model', value: deliveryModel || 'Not set' },
    { label: 'Owner / client', value: ownerClient || 'Not set' },
    { label: 'Concessionaire', value: concessionaire || 'Not set' },
    { label: 'Builder', value: builder || 'Not set' },
    { label: 'Lead designer', value: leadDesigner || 'Not set' },
  ];

  return (
    <div className="mx-auto max-w-[1780px] space-y-6 px-10 py-8">
      <input
        id="contractInput"
        type="file"
        ref={contractInputRef}
        className="hidden"
        onChange={(event) => handleRequiredFileChange(event, 'contract')}
        accept=".pdf,.docx"
      />
      <input
        id="correspondenceInput"
        type="file"
        ref={correspondenceInputRef}
        className="hidden"
        onChange={(event) => handleRequiredFileChange(event, 'correspondence')}
        accept=".pdf,.docx"
      />
      <input
        id="supportingInput"
        type="file"
        ref={supportingInputRef}
        className="hidden"
        onChange={handleSupportingFileChange}
        accept=".pdf,.docx"
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm xl:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Current Matter</div>
            <div className="text-[14px] font-bold text-on-surface">
              {summary.hasThread && summary.projectName ? summary.projectName : 'Start a new contract analysis'}
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Secure workspace
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            {hasRequiredDocuments ? 'Ready for analysis' : 'Awaiting uploads'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-400">
          <span>{hydrating ? 'Loading workspace...' : 'Saved locally first'}</span>
          <span>Confidence available after review</span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[24px] border border-[#f0dfca] bg-[radial-gradient(circle_at_right,#f7e1c7_0%,#fffaf4_14%,#ffffff_42%,#ffffff_100%)] px-8 py-6 shadow-lg shadow-slate-900/5">
        <div className="absolute -left-20 -top-16 h-56 w-56 rounded-full bg-slate-900/4 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-[#e67e22]/14 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#e67e22]">New Analysis</div>
            <h1 className="font-headline text-[2.7rem] font-black uppercase leading-[0.94] tracking-[-0.025em] text-[#162a55]">
              New Change Analysis
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] font-medium leading-6 text-slate-400">
              Create the workspace, stage the governing documents locally, then run a focused legal and financial review.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-full border border-slate-200 bg-white/90 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-on-surface">
                Governing agreement + correspondence required
              </div>
              <div className="rounded-full border border-[#e67e22]/20 bg-[#fef9f0] px-5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#8b4e0e]">
                Local-first workspace
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleResetAnalysis()}
              disabled={hydrating || analyzing}
              className="rounded-full bg-[#0f2044] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset Analysis
            </button>
            <div className="rounded-full bg-[#0f2044] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg">
              Secure Intake
            </div>
          </div>
        </div>
      </section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="mb-1 font-bold">Analysis Error</p>
            <p className="font-medium">{error}</p>
            {(error.toLowerCase().includes('api key') ||
              error.toLowerCase().includes('connect') ||
              error.toLowerCase().includes('network') ||
              error.toLowerCase().includes('econnrefused')) && (
              <p className="mt-2 text-xs opacity-70">
                Ensure your server is running with ANTHROPIC_API_KEY set in your .env file.
              </p>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_324px] gap-6">
        <div className="flex flex-col gap-6">

          <section className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white shadow-xl shadow-slate-900/5">
            <div className="border-b border-slate-100 p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Project</h2>
                  <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant">
                    Set the workspace identity first, then keep the framework compact unless you need to adjust it.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {selectedPreset.label}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
                <div className="space-y-5">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Project preset</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(['nsb-default', 'ladot-calcasieu'] as ProjectProfileId[]).map((presetId) => {
                        const preset = PROJECT_PRESETS[presetId];
                        const isActive = projectPreset === presetId;

                        return (
                          <button
                            key={presetId}
                            type="button"
                            onClick={() => handlePresetChange(presetId)}
                            className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                              isActive
                                ? 'border-[#e67e22] bg-[#fef7ef] shadow-lg shadow-[#e67e22]/10'
                                : 'border-slate-200 bg-white hover:border-[#e67e22]/35 hover:shadow-sm'
                            }`}
                          >
                            <div className="text-[12px] font-bold text-on-surface">{preset.label}</div>
                            <div className="mt-1 text-[11px] leading-5 text-slate-500">
                              {presetId === 'ladot-calcasieu'
                                ? 'Auto-fills the Louisiana demo framework and Arcadis review lens.'
                                : 'Keeps the workspace neutral and editable for general NSB analysis.'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="flex flex-col gap-2.5">
                      <label htmlFor="projectNameInput" className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Project name</label>
                      <input
                        id="projectNameInput"
                        className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                        placeholder="e.g., I-10 Calcasieu River Bridge"
                        type="text"
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <label htmlFor="contractNumberInput" className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Contract number</label>
                      <input
                        id="contractNumberInput"
                        className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                        placeholder="e.g., CA-24-001"
                        type="text"
                        value={contractNumber}
                        onChange={(event) => setContractNumber(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <label htmlFor="changeRequestInput" className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Potential Change Request ID</label>
                      <input
                        id="changeRequestInput"
                        className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                        placeholder="e.g., Review Cycle 4 / RFI-012"
                        type="text"
                        value={changeRequestId}
                        onChange={(event) => setChangeRequestId(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#11244d] text-white">
                        <Landmark size={18} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Project framework</div>
                        <div className="mt-1 text-[14px] font-bold text-on-surface">
                          {projectPreset === 'ladot-calcasieu' ? 'LA DOTD Calcasieu defaults' : 'General framework'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFrameworkExpanded((previous) => !previous)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                    >
                      <PencilLine size={12} />
                      Edit project framework
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {frameworkSummary.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white bg-white px-4 py-3 shadow-sm">
                        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                        <div className="mt-1 text-[13px] font-semibold text-on-surface">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {frameworkExpanded && (
                    <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
                      {[
                        { label: 'State', value: stateName, onChange: setStateName },
                        { label: 'Agency', value: agency, onChange: setAgency },
                        { label: 'Delivery model', value: deliveryModel, onChange: setDeliveryModel },
                        { label: 'Owner / client', value: ownerClient, onChange: setOwnerClient },
                        { label: 'Concessionaire', value: concessionaire, onChange: setConcessionaire },
                        { label: 'Builder', value: builder, onChange: setBuilder },
                        { label: 'Lead designer', value: leadDesigner, onChange: setLeadDesigner },
                      ].map((field, index) => (
                        <div key={field.label} className={`flex flex-col gap-2.5 ${index === 6 ? 'md:col-span-2' : ''}`}>
                          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">{field.label}</label>
                          <input
                            className="rounded-md border border-slate-300 bg-white p-3 text-[13px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                            value={field.value}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white shadow-xl shadow-slate-900/5">
            <div className="border-b border-slate-100 p-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Scenario</h2>
              <p className="mt-4 max-w-2xl text-[14px] leading-6 text-on-surface-variant">
                Capture the user lens and issue posture now, then open extra context only if it sharpens the analysis.
              </p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">User role</label>
                  <select
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    value={userRoleId}
                    onChange={(event) => setUserRoleId(event.target.value)}
                  >
                    <option value="">Select role</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Issue mode</label>
                  <select
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    value={issueMode}
                    onChange={(event) => setIssueMode(event.target.value)}
                  >
                    <option value="">Select scenario</option>
                    {ISSUE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                {[
                  { label: 'Work already proceeding', value: workAlreadyProceeding, setValue: setWorkAlreadyProceeding },
                  { label: 'Notice already sent', value: noticeAlreadySent, setValue: setNoticeAlreadySent },
                ].map((field) => (
                  <div key={field.label} className="flex flex-col gap-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">{field.label}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[true, false].map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          onClick={() => field.setValue(value)}
                          className={`rounded-xl border px-3 py-3 text-[12px] font-semibold transition-all ${
                            field.value === value
                              ? 'border-[#e67e22] bg-[#fef7ef] text-[#8b4e0e]'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-[#e67e22]/35'
                          }`}
                        >
                          {formatBooleanState(value)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Current framing</div>
                    <div className="mt-1 text-[13px] font-semibold text-on-surface">
                      {selectedRoleLabel || 'Role not selected'} · {ISSUE_MODE_OPTIONS.find((option) => option.value === issueMode)?.label || 'Scenario not selected'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoreContextOpen((previous) => !previous)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                  >
                    More context
                    {moreContextOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {moreContextOpen && (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {[
                      { label: 'Schedule impact known', value: scheduleImpactKnown, setValue: setScheduleImpactKnown },
                      { label: 'Pricing impact known', value: pricingImpactKnown, setValue: setPricingImpactKnown },
                    ].map((field) => (
                      <div key={field.label}>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">{field.label}</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[true, false].map((value) => (
                            <button
                              key={String(value)}
                              type="button"
                              onClick={() => field.setValue(value)}
                              className={`rounded-xl border px-3 py-3 text-[12px] font-semibold transition-all ${
                                field.value === value
                                  ? 'border-[#e67e22] bg-[#fef7ef] text-[#8b4e0e]'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-[#e67e22]/35'
                              }`}
                            >
                              {formatBooleanState(value)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e67e22]/15 bg-white shadow-xl shadow-slate-900/5">
            <div className="hidden">
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Project Details</h2>
              <p className="mb-8 max-w-2xl text-[14px] leading-6 text-on-surface-variant">
                Set the analysis context before uploading the source documents.
              </p>
              <div className="grid grid-cols-3 gap-5">
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Project Name</label>
                  <input
                    id="legacyProjectNameInput"
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., Skyline Tower Phase 2"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Contract Number</label>
                  <input
                    id="legacyContractNumberInput"
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., BC-2024-881"
                    type="text"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface">Potential Change Request Number</label>
                  <input
                    id="legacyChangeRequestInput"
                    className="rounded-md border border-slate-300 bg-white p-3.5 text-[14px] text-on-surface outline-none transition-all placeholder:text-slate-400 focus:border-[#e67e22] focus:ring-4 focus:ring-[#e67e22]/10"
                    placeholder="e.g., CR-012"
                    type="text"
                    value={changeRequestId}
                    onChange={(e) => setChangeRequestId(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50/35 p-8">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface">Documents</h2>
                  <p className="max-w-2xl text-[14px] leading-6 text-on-surface-variant">
                    Stage the required files first. Optional supporting material stays tucked away until you decide the workspace needs more evidence.
                  </p>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  {stagedSupportingDocuments.length} supporting documents staged
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">

                {contractFile ? (
                  <div className="group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/30 p-6 transition-all xl:p-8">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-bold text-on-surface">{contractFile.name}</p>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        <button type="button" onClick={() => contractInputRef.current?.click()} className="text-[10px] font-bold text-primary hover:underline">
                          Replace
                        </button>
                        <button type="button" onClick={() => void handleRemoveRequiredFile('contract')} className="text-[10px] font-bold text-slate-500 hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => contractInputRef.current?.click()}
                    className="group relative flex min-h-[178px] flex-col justify-end rounded-[20px] border-[1.5px] border-dashed border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_100%)] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#e67e22] hover:bg-[linear-gradient(180deg,#ffffff_0%,#fef9f0_100%)] hover:shadow-lg hover:shadow-[#e67e22]/10"
                  >
                    <div className="absolute right-5 top-5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Required
                    </div>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all group-hover:border-[#e67e22]/30 group-hover:text-[#e67e22]">
                      <FileUp size={24} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-on-surface">Upload Governing Agreement</p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">PDF or DOCX staged locally before analysis</p>
                    </div>
                  </button>
                )}

                {correspondenceFile ? (
                  <div className="group relative flex min-h-[178px] flex-col justify-end rounded-[20px] border-[1.5px] border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f3fbf6_100%)] p-6 text-left shadow-lg shadow-emerald-500/5">
                    <div className="absolute right-5 top-5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                      Staged locally
                    </div>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-on-surface">{correspondenceFile.name}</p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">
                        Successfully staged
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button type="button" onClick={() => correspondenceInputRef.current?.click()} className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary hover:underline">
                        Replace
                      </button>
                      <button type="button" onClick={() => void handleRemoveRequiredFile('correspondence')} className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:underline">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => correspondenceInputRef.current?.click()}
                    className="group relative flex min-h-[178px] flex-col justify-end rounded-[20px] border-[1.5px] border-dashed border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#fff7ef_100%)] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#e67e22] hover:shadow-lg hover:shadow-[#e67e22]/10"
                  >
                    <div className="absolute right-5 top-5 rounded-full border border-[#e67e22]/20 bg-white px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8b4e0e]">
                      {analyzing ? 'Processing' : 'Required'}
                    </div>
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e67e22]/20 bg-white text-[#e67e22]">
                      <Mail size={24} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-on-surface">Upload Correspondence / Review Comments</p>
                      <p className="mt-1 text-[12px] leading-5 text-slate-500">PDF or DOCX (Emails, RFIs, or minutes)</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Supporting documents</div>
                    <div className="mt-1 text-[13px] font-semibold text-on-surface">
                      Add optional context without making the core intake heavier.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupportingOpen((previous) => !previous)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                  >
                    <FolderPlus size={12} />
                    Add supporting documents
                    {supportingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {supportingOpen && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {SUPPORTING_DOCUMENT_OPTIONS.map((option) => {
                      const file = supportingFiles[option.category];
                      return (
                        <div key={option.category} className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[12px] font-bold text-on-surface">{option.label}</div>
                              <div className="mt-1 text-[11px] leading-5 text-slate-500">
                                {file ? file.name : option.description}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSupportingCategory(option.category);
                                supportingInputRef.current?.click();
                              }}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-[#e67e22]/40 hover:text-[#8b4e0e]"
                            >
                              {file ? 'Replace' : 'Add'}
                            </button>
                          </div>
                          {file && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveSupportingFile(option.category)}
                              className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 hover:text-on-surface"
                            >
                              Remove staged document
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-10 flex flex-col items-end gap-3">
                <p className="text-[10px] font-medium text-slate-500">
                  The workspace is saved locally before analysis. Failed runs keep your project and staged documents.
                </p>
                <button
                  id="analyzeBtn"
                  onClick={handleAnalyze}
                  disabled={!hasRequiredDocuments || analyzing}
                  className={`flex items-center gap-2 rounded-md px-12 py-4 text-[15px] font-bold transition-all shadow-lg ${
                    hasRequiredDocuments && !analyzing
                      ? 'bg-[#e67e22] text-white hover:opacity-95 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {analyzing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                      <span className="text-[10px] font-medium text-white/70 animate-pulse">
                        {analysisStatus} ({analysisTimer}s)
                      </span>
                      {analysisTimer > 60 && (
                        <span className="text-[10px] text-amber-300 font-bold mt-1 animate-bounce">
                          {analysisTimer > 90 ? 'Complex analysis in progress. Almost there...' : 'Large document detected. Still processing...'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>Analyze and Create Workspace <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-4 rounded-2xl bg-on-surface p-6 text-white shadow-xl shadow-slate-900/10 xl:p-7">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e67e22]/20 text-[#f39c12]">
              <Info size={20} />
            </div>
            <div>
              <p className="mb-1.5 text-[14px] font-bold">Disclaimer</p>
              <p className="text-[12px] font-medium leading-relaxed text-white/70">
                DISCLAIMER: This clause analysis is generated by an AI assistant and does not constitute legal advice. It is intended as a preliminary review tool to assist in understanding contract structure and content. This analysis may contain errors, miss important nuances, or misinterpret legal language. All findings should be reviewed by a qualified attorney licensed in the relevant jurisdiction before any decisions are made based on this analysis.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="sticky top-24 flex flex-col gap-6">
            <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#13264f_0%,#0f2044_100%)] shadow-2xl shadow-slate-900/15">
              <div className="border-b border-white/8 p-6">
                <h3 className="text-[13px] font-bold text-white">Workflow Progress</h3>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">Analysis readiness</p>
              </div>
              <div className="border-b border-white/8 px-8 py-6">
                <div className="flex items-end gap-3">
                  <div className="font-headline text-[3rem] font-extrabold leading-none text-white">
                    {contractFile ? (correspondenceFile ? '2/2' : '1/2') : '0/2'}
                  </div>
                  <div className="max-w-[150px] pb-1 text-[12px] leading-5 text-white/60">
                    Required steps completed before the report can be generated.
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-5 p-8">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      governingAgreementStepState === 'complete'
                        ? 'bg-emerald-500 text-white'
                        : governingAgreementStepState === 'active'
                          ? 'border-2 border-[#e67e22] bg-[#e67e22]/15'
                          : 'border-2 border-white/20'
                    }`}
                  >
                    {governingAgreementStepState === 'complete' ? (
                      <CheckCircle2 size={14} />
                    ) : governingAgreementStepState === 'active' ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#e67e22] animate-pulse" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Governing Agreement</p>
                    <p className="text-[11px] text-white/55">{contractFile ? contractFile.name : 'Waiting for governing agreement'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      reviewCommentsStepState === 'complete'
                        ? 'bg-emerald-500 text-white'
                        : reviewCommentsStepState === 'active'
                          ? 'border-2 border-[#e67e22] bg-[#e67e22]/15'
                          : 'border-2 border-white/20'
                    }`}
                  >
                    {reviewCommentsStepState === 'complete' ? (
                      <CheckCircle2 size={14} />
                    ) : reviewCommentsStepState === 'active' ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#e67e22] animate-pulse" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Review Comments</p>
                    <p className="text-[11px] text-white/55">
                      {correspondenceFile
                        ? correspondenceFile.name
                        : analyzing
                          ? 'Parsing attachments and metadata...'
                          : 'Waiting for correspondence upload'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      riskScoreStepState === 'active'
                        ? 'border-2 border-[#e67e22] bg-[#e67e22]/15'
                        : 'border-2 border-white/20'
                    }`}
                  >
                    {riskScoreStepState === 'active' ? (
                      <div className="h-1.5 w-1.5 rounded-full bg-[#e67e22] animate-pulse" />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Risk Score Generation</p>
                    <p className="text-[11px] text-white/55">{analyzing ? analysisStatus || 'Queued for analysis' : 'Analysis not yet run'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-8 pb-8">
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">Docs staged</div>
                  <div className="mt-2 text-[14px] font-bold leading-6 text-white">
                    {Number(Boolean(contractFile)) + Number(Boolean(correspondenceFile))} of 2 required documents ready
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                  <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">Expected output</div>
                  <div className="mt-2 text-[14px] font-bold leading-6 text-white">Executive summary, evidence map, formal report, and draft response.</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
