import { RfpBucket } from './types';

/**
 * Enterprise RFP evaluation matrix — bucket → requirement list with
 * xpander's current coverage status. Mirrors the Multi-Cloud Agent Platform
 * evaluation sheet shown to customers. Counts and status values are what
 * this demo surfaces in the coverage report; update here when the matrix
 * ships.
 */
export const RFP_MATRIX: RfpBucket[] = [
  {
    code: 'MC',
    name: 'Multi-Cloud Abstraction',
    requirements: [
      { id: 'MC-001', name: 'Unified Cloud Adapter Layer', status: 'guidance' },
      { id: 'MC-002', name: 'Cloud Target Selector', status: 'supported' },
      {
        id: 'MC-003',
        name: 'Cloud-Specific Secret Resolution',
        status: 'supported',
      },
      { id: 'MC-004', name: 'Multi-Cloud Model Router', status: 'supported' },
      {
        id: 'MC-005',
        name: 'Model Fallback & Budget Degradation',
        status: 'roadmap',
      },
    ],
  },
  {
    code: 'AD',
    name: 'Agent Development',
    requirements: [
      { id: 'AD-001', name: 'LangGraph SDK Support', status: 'partial' },
      { id: 'AD-002', name: 'CrewAI SDK Support', status: 'partial' },
      {
        id: 'AD-003',
        name: 'Extensible Framework Support',
        status: 'supported',
      },
      { id: 'AD-004', name: 'Platform Manifest (YAML)', status: 'roadmap' },
      { id: 'AD-006', name: 'Local Development Mode', status: 'supported' },
      {
        id: 'AD-007',
        name: 'MCP Registry Access During Dev',
        status: 'supported',
      },
      { id: 'AD-010', name: 'Agent Scaffolding / Init', status: 'supported' },
    ],
  },
  {
    code: 'GC',
    name: 'Git & CI/CD',
    requirements: [
      { id: 'GC-001', name: 'Git Repository Integration', status: 'supported' },
      { id: 'GC-002', name: 'Branch-Based Workflow', status: 'supported' },
      { id: 'GC-003', name: 'Auto-Pull from Git', status: 'guidance' },
      { id: 'GC-004', name: 'Automated CI/CD Pipeline', status: 'supported' },
      { id: 'GC-005', name: 'Pipeline Trigger via CLI', status: 'supported' },
      { id: 'GC-006', name: 'Pipeline Trigger via UI', status: 'supported' },
      { id: 'GC-007', name: 'Pipeline Status & Logs', status: 'supported' },
      { id: 'GC-008', name: 'Automated Testing Gate', status: 'supported' },
    ],
  },
  {
    code: 'PD',
    name: 'Packaging & Deployment',
    requirements: [
      { id: 'PD-001', name: 'Agent Packaging', status: 'supported' },
      { id: 'PD-002', name: 'Container Registry Push', status: 'supported' },
      { id: 'PD-003', name: 'One-Command Deploy', status: 'supported' },
      { id: 'PD-004', name: 'UI-Based Deploy Wizard', status: 'supported' },
      { id: 'PD-005', name: 'Canary Deployment', status: 'roadmap' },
      { id: 'PD-007', name: 'Traffic Management', status: 'roadmap' },
      { id: 'PD-008', name: 'Environment Management', status: 'supported' },
      { id: 'PD-009', name: 'Configuration Injection', status: 'supported' },
    ],
  },
  {
    code: 'VR',
    name: 'Version & Rollback',
    requirements: [
      { id: 'VR-001', name: 'Semantic Versioning', status: 'partial' },
      { id: 'VR-002', name: 'Version History', status: 'supported' },
      { id: 'VR-003', name: 'One-Click Rollback', status: 'supported' },
      { id: 'VR-004', name: 'Hot Reload - Config', status: 'supported' },
      { id: 'VR-005', name: 'Hot Reload - Model Swap', status: 'supported' },
    ],
  },
  {
    code: 'AL',
    name: 'Agent Lifecycle',
    requirements: [
      {
        id: 'AL-001',
        name: 'Tenant Provisioning & Onboarding',
        status: 'supported',
      },
      {
        id: 'AL-002',
        name: 'Logical Namespace Isolation',
        status: 'supported',
      },
      { id: 'AL-003', name: 'Data Isolation', status: 'supported' },
      { id: 'AL-004', name: 'Model Access Isolation', status: 'supported' },
      {
        id: 'AL-005',
        name: 'Tenant-Level Budget & Quota Isolation',
        status: 'roadmap',
      },
      { id: 'AL-006', name: 'Tenant-Level RBAC', status: 'supported' },
      {
        id: 'AL-010',
        name: 'Tenant Dashboard & Visibility',
        status: 'supported',
      },
      { id: 'AL-011', name: 'Agent Registration', status: 'supported' },
      { id: 'AL-012', name: 'Auto-Register on Deploy', status: 'supported' },
      {
        id: 'AL-013',
        name: 'Agent Capability Declaration',
        status: 'supported',
      },
      {
        id: 'AL-014',
        name: 'Agent Lifecycle State Machine',
        status: 'supported',
      },
      { id: 'AL-015', name: 'Agent Discovery API', status: 'supported' },
      {
        id: 'AL-016',
        name: 'Agent-to-Agent Discovery (A2A)',
        status: 'supported',
      },
      { id: 'AL-017', name: 'Agent Catalog UI', status: 'supported' },
      { id: 'AL-019', name: 'Agent Health Monitoring', status: 'partial' },
      { id: 'AL-020', name: 'Agent Behavior Baseline', status: 'roadmap' },
      { id: 'AL-021', name: 'Agent Activity Audit', status: 'supported' },
      {
        id: 'AL-022',
        name: 'Agent Behavioral Drift Detection',
        status: 'roadmap',
      },
      {
        id: 'AL-023',
        name: 'Rogue Agent Definition & Rules',
        status: 'guidance',
      },
      { id: 'AL-024', name: 'Rogue Agent Detection Engine', status: 'partial' },
      {
        id: 'AL-025',
        name: 'Unregistered Agent Detection',
        status: 'supported',
      },
      { id: 'AL-026', name: 'Rogue Alert & Escalation', status: 'guidance' },
      { id: 'AL-027', name: 'Agent Quarantine Action', status: 'supported' },
      {
        id: 'AL-028',
        name: 'Auto-Quarantine on Rogue Detection',
        status: 'guidance',
      },
      {
        id: 'AL-029',
        name: 'Quarantine Investigation Mode',
        status: 'supported',
      },
      {
        id: 'AL-030',
        name: 'Quarantine Release (Reinstate)',
        status: 'supported',
      },
      { id: 'AL-031', name: 'Agent Kill Action', status: 'supported' },
      {
        id: 'AL-032',
        name: 'Graceful Kill (Drain & Stop)',
        status: 'supported',
      },
      { id: 'AL-033', name: 'Force Kill (Immediate)', status: 'supported' },
      { id: 'AL-034', name: 'Post-Kill Archival', status: 'supported' },
      { id: 'AL-036', name: 'MCP Server Registry', status: 'supported' },
      { id: 'AL-037', name: 'MCP Tool Schema Browser', status: 'supported' },
      { id: 'AL-039', name: 'MCP Server Health Monitoring', status: 'roadmap' },
      { id: 'AL-040', name: 'MCP Server Registration', status: 'supported' },
    ],
  },
  {
    code: 'UI',
    name: 'Platform UI',
    requirements: [
      { id: 'UI-001', name: 'Unified Dashboard', status: 'supported' },
      { id: 'UI-002', name: 'Agent Detail View', status: 'supported' },
      { id: 'UI-003', name: 'Multi-Cloud Comparison View', status: 'partial' },
      { id: 'UI-004', name: 'RBAC & User Management', status: 'supported' },
      { id: 'UI-005', name: 'Tenant Management', status: 'supported' },
      { id: 'UI-006', name: 'Audit Trail', status: 'supported' },
      { id: 'UI-007', name: 'Cost & FinOps Dashboard', status: 'partial' },
      { id: 'UI-011', name: 'Notification & Alerting', status: 'roadmap' },
      { id: 'UI-013', name: 'Chat Interface', status: 'supported' },
      { id: 'UI-014', name: 'Chat Context Awareness', status: 'supported' },
    ],
  },
  {
    code: 'OB',
    name: 'Observability',
    requirements: [
      {
        id: 'OB-002',
        name: 'Real-Time Performance Monitoring',
        status: 'partial',
      },
      {
        id: 'OB-003',
        name: 'End-to-End Request Tracing (OpenTelemetry)',
        status: 'supported',
      },
      { id: 'OB-004', name: 'Unified Log Aggregation', status: 'partial' },
      { id: 'OB-005', name: 'SLA Governance & Alerting', status: 'guidance' },
      { id: 'OB-006', name: 'AI Quality Assurance', status: 'partial' },
    ],
  },
  {
    code: 'GS',
    name: 'Governance & Security',
    requirements: [
      { id: 'GS-001', name: 'Guardrail Engine', status: 'supported' },
      { id: 'GS-002', name: 'PII Detection & Masking', status: 'supported' },
      { id: 'GS-003', name: 'Budget Enforcement', status: 'roadmap' },
      { id: 'GS-005', name: 'SSO / IdP Integration', status: 'supported' },
      { id: 'GS-006', name: 'API Key & Token Management', status: 'supported' },
      { id: 'GS-007', name: 'Network Isolation', status: 'supported' },
      { id: 'GS-010', name: 'Data Residency Controls', status: 'supported' },
    ],
  },
  {
    code: 'EV',
    name: 'Evaluation & Feedback',
    requirements: [
      { id: 'EV-001', name: 'Eval Suite Integration', status: 'supported' },
      { id: 'EV-002', name: 'Golden Dataset Management', status: 'supported' },
      { id: 'EV-003', name: 'A/B Testing', status: 'supported' },
      { id: 'EV-004', name: 'User Feedback Collection', status: 'roadmap' },
      { id: 'EV-006', name: 'Regression Testing', status: 'supported' },
    ],
  },
];

export function findRequirement(id: string) {
  for (const bucket of RFP_MATRIX) {
    const req = bucket.requirements.find((r) => r.id === id);
    if (req) return { bucket, req };
  }
  return null;
}

export function totalRequirements(): number {
  return RFP_MATRIX.reduce((sum, b) => sum + b.requirements.length, 0);
}
