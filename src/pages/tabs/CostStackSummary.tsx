import React, { useMemo } from 'react'
import { useStore } from '../../store'
import { calculateCostStack } from '../../engine/costStack'
import { computeLandCost } from '../../engine/landCost'
import { getProjectGDV, getCostPresets, type Project } from '../../db'
import { AreaTrend, DonutShare, ProgressRing, StageBars, ProgressTrack } from '../../components/charts'
import { tokens } from '../../theme/tokens'

interface Props { projectId: string }

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` :
  `$${Math.round(n).toLocaleString()}`

const fmtPercent = (n: number) => `${(n * 100).toFixed(1)}%`

// ── KPI Card (Header Row) ──────────────────────────────────────────
function KpiCard({ label, value, unit = '', note = '', color = '#237A52' }: { label: string; value: string; unit?: string; note?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ color: '#888', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color: color }}>{value}</span>
        {unit && <span style={{ color: '#999', fontSize: 12 }}>{unit}</span>}
      </div>
      {note && <p style={{ color: '#999', fontSize: 10, margin: 0 }}>{note}</p>}
    </div>
  )
}

// ── Section Container ──────────────────────────────────────────
function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, gap: 2, border: '1px solid rgba(35,122,82,0.08)', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#1A1A1A', fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function CostStackSummary({ projectId }: Props) {
  const { projects } = useStore()
  const project = projects.find(p => p.id === projectId) as Project | undefined
  if (!project) return <div style={{ padding: 24, color: '#999' }}>Project not found</div>

  // Calculate costs
  const presets = getCostPresets(project.id)
  const costResult = calculateCostStack({
    gba: project.gba || 0,
    buildRatePerSqm: presets?.buildRatePerSqm ?? 2500,
    contingencyPct: presets?.contingencyPct ?? 0.1,
    prelimsPct: presets?.prelimsPct ?? 0.08,
    professionalFeesPct: presets?.professionalFeesPct ?? 0.12,
    statutoryFixed: presets?.statutoryFixed ?? 0,
    financePct: presets?.financePct ?? 0.05,
    projectManagementFixed: presets?.projectManagementFixed ?? 0,
    marketingFixed: presets?.marketingFixed ?? 0,
    amenityFitoutFixed: presets?.amenityFitoutFixed ?? 0,
    gstEnabled: project.gstEnabled,
  })

  const landCost = computeLandCost(project.id)
  const gdv = getProjectGDV(project.id)
  const tdc = costResult.totalDevelopmentCost
  const devProfit = gdv - tdc
  const devMargin = tdc > 0 ? devProfit / tdc : 0
  const residualLandValue = project.landValue ?? 0
  const site = project.gba || 0

  // Cost breakdown percentages
  const costBreakdown = useMemo(() => [
    { label: 'Land & acquisition', value: landCost, color: '#8B5CF6' },
    { label: 'Hard costs (build)', value: costResult.construction, color: '#06B6D4' },
    { label: 'Soft costs/fees', value: costResult.professionalFees + costResult.finance, color: '#F59E0B' },
    { label: 'Statutory & consents', value: costResult.posContribution, color: '#EF4444' },
    { label: 'Contingency', value: costResult.contingency, color: '#10B981' },
    { label: 'Mgmt & marketing', value: costResult.projectManagementFixed + costResult.marketingFixed, color: '#14B8A6' },
  ].filter(b => b.value > 0), [costResult, landCost])

  // Phase data (mock for now - should be derived from project timeline)
  const phaseData = [
    { name: 'Pre-acquisition', cost: 0, progress: 100 },
    { name: 'Acquisition/planning', cost: landCost, progress: 50 },
    { name: 'Pre-construction', cost: costResult.professionalFees * 0.3, progress: 45 },
    { name: 'Construction', cost: costResult.construction + costResult.contingency + costResult.prelimsPct, progress: 58 },
    { name: 'Close-out', cost: costResult.finance, progress: 5 },
  ]

  // Value creation
  const valueCreation = [
    { label: 'Land', value: landCost, sublabel: 'Value', subvalue: landCost },
    { label: 'Build + soft', value: costResult.construction + costResult.professionalFees, sublabel: 'Cost', subvalue: costResult.construction + costResult.professionalFees },
    { label: 'PLV uplift', value: devProfit, sublabel: 'Dev uplift', subvalue: devProfit },
  ]

  // Project health (mock)
  const projectHealth = {
    critical: 0,
    delayed: 1,
    onTrack: 0,
    completed: 3,
    notStarted: 43,
  }
  const totalMilestones = Object.values(projectHealth).reduce((a, b) => a + b, 0)
  const healthPercent = totalMilestones > 0 ? (projectHealth.completed + projectHealth.onTrack) / totalMilestones : 0

  return (
    <div style={{ padding: 24, background: 'linear-gradient(135deg, rgba(35,122,82,0.02), rgba(35,122,82,0.04))', minHeight: '100vh' }}>
      {/* Setup Alert */}
      {tdc === 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: 12, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 16, marginTop: -2 }}>⚠️</span>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#92400E' }}>Setup incomplete — equity and revenue inputs required before profit and margin outputs are valid</p>
            <p style={{ margin: 0, fontSize: 11, color: '#B45309' }}>Complete: Build rate · GBA · Feasibility stage · Land costs</p>
          </div>
        </div>
      )}

      {/* ── KPI Header Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20, marginBottom: 32 }}>
        <KpiCard label="Total Dev Cost" value={fmt(tdc)} color="#237A52" />
        <KpiCard label="Gross Asset Value" value={fmt(gdv)} color="#237A52" />
        <KpiCard
          label="Dev Profit"
          value={fmt(devProfit)}
          note={devProfit < 0 ? 'Funding incomplete' : ''}
          color={devProfit < 0 ? '#EF4444' : '#10B981'}
        />
        <KpiCard
          label="Dev Margin"
          value={fmtPercent(devMargin)}
          color={devMargin < 0 ? '#EF4444' : '#10B981'}
        />
        <KpiCard label="Residual Land Value" value={fmt(residualLandValue)} color="#237A52" />
        <KpiCard label="Site" value={site.toLocaleString()} unit="m²" color="#237A52" />
      </div>

      {/* ── Development Cost Stack ────────────────────────────────── */}
      <Section title="Development Cost Stack" action={<span style={{ fontSize: 11, color: '#999' }}>$ {fmt(tdc)} TDC</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {costBreakdown.map((item, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: item.color }}>{fmt(item.value)}</span>
              </div>
              <div style={{ height: 28, background: '#F3F1ED', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(2, (item.value / tdc) * 100)}%`,
                    background: item.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Value Creation ────────────────────────────────────────── */}
      <Section title="Value Creation">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {valueCreation.map((item, i) => (
            <div key={i} style={{ padding: 16, background: '#F9F8F7', borderRadius: 8, border: '1px solid #EAE7E0' }}>
              <p style={{ margin: '0 0 12px', color: '#888', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>{item.label}</p>
              <p style={{ margin: '0 0 8px', fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#237A52' }}>{fmt(item.value)}</p>
              <p style={{ margin: 0, color: '#999', fontSize: 10 }}>{item.sublabel}: {fmt(item.subvalue)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Cost & Time by Phase ───────────────────────────────────── */}
      <Section title="Cost & Time by Phase">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {phaseData.map((phase, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 500 }}>{phase.name}</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{fmt(phase.cost)}</span>
                  <span style={{ fontSize: 11, color: '#999', width: 40, textAlign: 'right' }}>{phase.progress}%</span>
                </div>
              </div>
              <div style={{ height: 8, background: '#E5E3DF', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(1, (phase.progress / 100) * 100)}%`,
                    background: '#237A52',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Finance - Critical Path ───────────────────────────────── */}
      <Section title="Finance - Critical Path Sensitivity">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <p style={{ margin: '0 0 12px', color: '#888', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>On track - Month 6/36</p>
            <div style={{ background: '#F0FDF4', borderRadius: 8, padding: 16, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <p style={{ margin: 0, color: '#059669', fontSize: 12, fontWeight: 600 }}>✓ Funding scenario stable</p>
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 12px', color: '#888', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Sensitivity ranges</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['+0%', '-1%', '-1%', '-0.8%'].map((label, i) => (
                <div key={i} style={{ flex: 1, background: '#F3F1ED', borderRadius: 6, padding: 8, textAlign: 'center', fontSize: 11, color: '#666', fontWeight: 600 }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Project Health ────────────────────────────────────────── */}
      <Section title="Project Health">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>{projectHealth.critical}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Critical</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>{projectHealth.delayed}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Delayed</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>{projectHealth.onTrack}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>On track</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>{projectHealth.completed}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Completed</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#999', marginBottom: 4 }}>{projectHealth.notStarted}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Not started</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#237A52', marginBottom: 4 }}>{fmtPercent(healthPercent)}</div>
            <p style={{ margin: 0, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Health</p>
          </div>
        </div>
      </Section>

      {/* ── Upcoming Milestones ───────────────────────────────────── */}
      <Section title="Upcoming Milestones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { title: 'Planning permit issued', date: 'Nov 28' },
            { title: 'Contractor award', date: 'Nov 28' },
            { title: 'ECI agreement executed', date: 'Nov 28' },
            { title: 'Permit endorsement', date: 'Nov 28' },
            { title: 'Site settlement', date: 'Feb 27' },
            { title: 'Construction start', date: 'Jan 27' },
            { title: 'Practical completion', date: 'Q2 2025' },
          ].map((milestone, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 6 ? '1px solid #EAE7E0' : 'none' }}>
              <span style={{ fontSize: 12, color: '#1A1A1A' }}>✓ {milestone.title}</span>
              <span style={{ fontSize: 11, color: '#999' }}>{milestone.date}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Residuals by Completion ───────────────────────────────– */}
      <Section title="Residuals by Completion">
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#92400E', fontWeight: 500 }}>⚠️ Complete funding stack to unlock returns</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#1A1A1A', fontWeight: 500 }}>HE</span>
          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#EF4444' }}>-17%</span>
        </div>
      </Section>
    </div>
  )
}
